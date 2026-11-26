-- ============================================================================
-- ARPE Fiscalização — Fase 0: Schema Único, RBAC, Blindagem ADM e RLS (LGPD)
-- Execute este script no SQL Editor do Supabase (Run).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. TABELA DE PERFIS (Sem e-mail exposto · RBAC: adm | coordenador | analista)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  usuario TEXT UNIQUE NOT NULL CHECK (usuario ~ '^[a-z0-9._-]{3,32}$'),
  nome_completo TEXT NOT NULL CHECK (length(trim(nome_completo)) >= 3),
  role TEXT NOT NULL CHECK (role IN ('adm', 'coordenador', 'analista')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  tentativas_falhas INT NOT NULL DEFAULT 0 CHECK (tentativas_falhas >= 0),
  bloqueado_ate TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. SOLICITAÇÕES DE ACESSO (Aprovação individual por ADM ou Coordenador)
--    OBS: CHECK bloqueia solicitação de perfil 'adm' no próprio banco!
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.solicitacoes_acesso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario TEXT UNIQUE NOT NULL CHECK (usuario ~ '^[a-z0-9._-]{3,32}$'),
  nome_completo TEXT NOT NULL CHECK (length(trim(nome_completo)) >= 3),
  role_solicitado TEXT NOT NULL CHECK (role_solicitado IN ('coordenador', 'analista')),
  senha_hash_temp TEXT NOT NULL,
  decidido_por UUID REFERENCES public.perfis(id),
  decidido_em TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. VISTORIAS EM TRÂNSITO (Handoff Mobile Finalizados -> Web Revisão/.docx)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vistorias_transito (
  id TEXT PRIMARY KEY,
  id_fiscalizacao TEXT NOT NULL,
  autor_id UUID NOT NULL REFERENCES public.perfis(id),
  concessao TEXT NOT NULL CHECK (concessao IN ('CRA', 'CRC', 'SOCICAM')),
  modalidade TEXT NOT NULL CHECK (modalidade IN ('Fiscalização', 'Monitoramento')),
  status_handoff TEXT NOT NULL DEFAULT 'aguardando_web'
    CHECK (status_handoff IN ('aguardando_web', 'em_revisao', 'emitida')),
  payload_json JSONB NOT NULL,
  total_fotos INT NOT NULL DEFAULT 0 CHECK (total_fotos >= 0),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vistorias_transito_status
  ON public.vistorias_transito (status_handoff, atualizado_em DESC);
CREATE INDEX IF NOT EXISTS idx_vistorias_transito_concessao_mod
  ON public.vistorias_transito (concessao, modalidade);

-- ----------------------------------------------------------------------------
-- 4. METADADOS DAS FOTOS TEMPORÁRIAS (Storage Privado · Zero binário no banco)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vistorias_fotos_temp (
  id TEXT PRIMARY KEY,
  vistoria_id TEXT NOT NULL REFERENCES public.vistorias_transito(id) ON DELETE CASCADE,
  storage_key TEXT UNIQUE NOT NULL,
  nome_arquivo TEXT NOT NULL,
  tamanho_kb INT NOT NULL CHECK (tamanho_kb > 0 AND tamanho_kb <= 500),
  ocorrencia_numero INT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vistorias_fotos_vistoria
  ON public.vistorias_fotos_temp (vistoria_id);

-- ----------------------------------------------------------------------------
-- 5. HISTÓRICO ANALÍTICO PERMANENTE (LGPD: Somente NCs/PAs · Zero Fotos/PII)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.historico_achados (
  id BIGSERIAL PRIMARY KEY,
  id_vistoria TEXT NOT NULL,
  concessao TEXT NOT NULL CHECK (concessao IN ('CRA', 'CRC', 'SOCICAM')),
  modalidade TEXT NOT NULL CHECK (modalidade IN ('Fiscalização', 'Monitoramento')),
  data_vistoria DATE NOT NULL,
  local_ou_trecho TEXT NOT NULL,
  tipo_achado TEXT NOT NULL CHECK (tipo_achado IN ('NC', 'PA')),
  categoria_nc TEXT NOT NULL,
  situacao TEXT NOT NULL CHECK (situacao IN ('Sanada', 'Parcialmente Sanada', 'Pendente', 'Nova')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historico_achados_filtros
  ON public.historico_achados (concessao, modalidade, data_vistoria DESC);

-- ----------------------------------------------------------------------------
-- 6. AUDITORIA IMUTÁVEL (Append-Only para ações críticas e segurança do ADM)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  ator_id UUID REFERENCES public.perfis(id),
  acao TEXT NOT NULL,
  alvo TEXT,
  ip TEXT,
  detalhes JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_criado
  ON public.audit_logs (criado_em DESC);

-- ----------------------------------------------------------------------------
-- 7. FUNÇÕES AUXILIARES E TRIGGER DE BLINDAGEM DA CONTA ADM
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.usuario_role_atual()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.perfis WHERE id = auth.uid() AND ativo = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.proteger_conta_adm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role TEXT := coalesce(current_setting('request.jwt.claim.role', true), '');
  total_adms_ativos INT;
BEGIN
  -- Impede qualquer sessão autenticada comum de promover ou alterar uma conta ADM
  IF jwt_role <> 'service_role' AND (NEW.role = 'adm' OR OLD.role = 'adm') THEN
    RAISE EXCEPTION 'Operação bloqueada: contas ADM só podem ser gerenciadas pelo servidor.';
  END IF;

  -- Impede desativar ou rebaixar o último ADM ativo do sistema
  IF OLD.role = 'adm' AND OLD.ativo = true AND (NEW.role <> 'adm' OR NEW.ativo = false) THEN
    SELECT count(*) INTO total_adms_ativos
    FROM public.perfis
    WHERE role = 'adm' AND ativo = true AND id <> OLD.id;

    IF total_adms_ativos = 0 THEN
      RAISE EXCEPTION 'Operação bloqueada: o sistema deve manter ao menos 1 ADM ativo.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proteger_conta_adm ON public.perfis;
CREATE TRIGGER trg_proteger_conta_adm
  BEFORE UPDATE ON public.perfis
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_conta_adm();

-- ----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS OBRIGATÓRIO EM 100% DAS TABELAS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vistorias_transito ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vistorias_fotos_temp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_achados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- perfis: usuário lê o próprio; adm/coordenador leem todos; escritas apenas via backend (service_role)
DROP POLICY IF EXISTS perfis_select ON public.perfis;
CREATE POLICY perfis_select ON public.perfis
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.usuario_role_atual() IN ('adm', 'coordenador'));

-- solicitacoes_acesso: apenas adm e coordenador visualizam; escrita/decisão via backend
DROP POLICY IF EXISTS solicitacoes_select ON public.solicitacoes_acesso;
CREATE POLICY solicitacoes_select ON public.solicitacoes_acesso
  FOR SELECT TO authenticated
  USING (public.usuario_role_atual() IN ('adm', 'coordenador'));

-- vistorias_transito: autor gerencia as próprias; adm e coordenador visualizam todas
DROP POLICY IF EXISTS vistorias_transito_select ON public.vistorias_transito;
CREATE POLICY vistorias_transito_select ON public.vistorias_transito
  FOR SELECT TO authenticated
  USING (autor_id = auth.uid() OR public.usuario_role_atual() IN ('adm', 'coordenador'));

DROP POLICY IF EXISTS vistorias_transito_insert ON public.vistorias_transito;
CREATE POLICY vistorias_transito_insert ON public.vistorias_transito
  FOR INSERT TO authenticated
  WITH CHECK (autor_id = auth.uid() AND public.usuario_role_atual() IS NOT NULL);

DROP POLICY IF EXISTS vistorias_transito_update ON public.vistorias_transito;
CREATE POLICY vistorias_transito_update ON public.vistorias_transito
  FOR UPDATE TO authenticated
  USING (autor_id = auth.uid() OR public.usuario_role_atual() IN ('adm', 'coordenador'))
  WITH CHECK (autor_id = auth.uid() OR public.usuario_role_atual() IN ('adm', 'coordenador'));

-- vistorias_fotos_temp: segue a permissão da vistoria pai
DROP POLICY IF EXISTS vistorias_fotos_select ON public.vistorias_fotos_temp;
CREATE POLICY vistorias_fotos_select ON public.vistorias_fotos_temp
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vistorias_transito v
      WHERE v.id = vistoria_id
        AND (v.autor_id = auth.uid() OR public.usuario_role_atual() IN ('adm', 'coordenador'))
    )
  );

-- historico_achados: leitura para todos os perfis ativos (gráficos); gravação apenas pelo backend
DROP POLICY IF EXISTS historico_select ON public.historico_achados;
CREATE POLICY historico_select ON public.historico_achados
  FOR SELECT TO authenticated
  USING (public.usuario_role_atual() IS NOT NULL);

-- audit_logs: leitura EXCLUSIVA do ADM; append-only (sem UPDATE/DELETE)
DROP POLICY IF EXISTS audit_logs_select_adm ON public.audit_logs;
CREATE POLICY audit_logs_select_adm ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.usuario_role_atual() = 'adm');
