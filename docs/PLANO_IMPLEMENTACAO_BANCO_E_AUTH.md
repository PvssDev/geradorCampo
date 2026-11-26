# Plano de Implementação — Banco de Dados, Perfis (ADM / Coordenador / Analista) e Integração Mobile ↔ Web

> **Documento complementar a:** [ARQUITETURA_BANCO_INTEGRACAO_SEGURANCA.md](./ARQUITETURA_BANCO_INTEGRACAO_SEGURANCA.md)
> **Como executar:** Execute **uma Fase por vez** na ordem exata (`Fase 0` → `Fase 6`). Cada fase possui entregas claras, critérios de aceite BDD, verificações de segurança/LGPD e recomendação de perfil Gemini.

---

## Mapa Geral das Fases

| Fase | Escopo Principal | Repositório(s) | Perfil Gemini |
| :---: | :--- | :--- | :---: |
| **Fase 0** | Schema SQL Único (PostgreSQL + RLS + Triggers anti-escalação + Storage Privado R2/Supabase + Seed do `ADM`) | Infra / Supabase | **Carbon** |
| **Fase 1** | API de Auth Sem E-mail, Aprovação Individual (`ADM` ou `Coordenador`), Rate Limit, Lockout e Presigned URLs | Backend FastAPI (Web) | **Carbon** |
| **Fase 2** | Login Seguro (`expo-secure-store`), Solicitação de Acesso, Guarda por Perfil e Tela de Aprovação no App | App Android (Mobile) | **Carbon** |
| **Fase 3** | Persistência Offline Real (`expo-sqlite`) + Câmera/Compressão Real (~200 KB) no Sandbox Privado | App Android (Mobile) | **Carbon** |
| **Fase 4** | Motor de Sync Incremental Real na Aba `Finalizados` (1–3 fotos por vez + Retomada + Standby) | App Android (Mobile) | **Carbon** |
| **Fase 5** | Integração no Web: Login `HttpOnly`, Painel de Aprovação, "Importar do Campo", Emissão `.docx` e Histórico | Web React + FastAPI | **Orquestrador** |
| **Fase 6** | Auditoria OWASP + LGPD + Testes BDD/E2E nos 6 Estados (CRA, CRC, SOCICAM × Fisc., Monit.) | Mobile + Web | **Carbon** |

---

## Fase 0 — Fundação do Banco Único (PostgreSQL + RLS + Storage Privado)

### Objetivo
Provisionar 1 projeto Supabase (PostgreSQL + Auth) e 1 bucket privado (Cloudflare R2 10 GB Free ou Supabase Storage) com todas as tabelas, travas de segurança do `ADM` e políticas **Row Level Security (`RLS`)**.

### Tabelas a Criar (`supabase/migrations/001_init_arpe.sql`)
1. **`perfis`**:
   * `id UUID PRIMARY KEY REFERENCES auth.users(id)`
   * `usuario TEXT UNIQUE NOT NULL` *(login corporativo sem e-mail, ex.: `pedro.souza`)*
   * `nome_completo TEXT NOT NULL`
   * `role TEXT NOT NULL CHECK (role IN ('adm', 'coordenador', 'analista'))`
   * `ativo BOOLEAN NOT NULL DEFAULT true`
   * `tentativas_falhas INT NOT NULL DEFAULT 0`
   * `bloqueado_ate TIMESTAMPTZ`
   * `criado_em TIMESTAMPTZ NOT NULL DEFAULT now()`
2. **`solicitacoes_acesso`**:
   * `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   * `usuario TEXT UNIQUE NOT NULL`
   * `nome_completo TEXT NOT NULL`
   * `role_solicitado TEXT NOT NULL CHECK (role_solicitado IN ('coordenador', 'analista'))` *(**bloqueia `'adm'` no próprio banco!**)*
   * `senha_hash_temp TEXT NOT NULL`
   * `decidido_por UUID REFERENCES perfis(id)`
   * `decidido_em TIMESTAMPTZ`
   * `status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada'))`
   * `criado_em TIMESTAMPTZ NOT NULL DEFAULT now()`
3. **`vistorias_transito`**:
   * `id TEXT PRIMARY KEY` *(ex.: `v-cra-fisc-003`)*
   * `id_fiscalizacao TEXT NOT NULL`
   * `autor_id UUID NOT NULL REFERENCES perfis(id)`
   * `concessao TEXT NOT NULL CHECK (concessao IN ('CRA', 'CRC', 'SOCICAM'))`
   * `modalidade TEXT NOT NULL CHECK (modalidade IN ('Fiscalização', 'Monitoramento'))`
   * `status_handoff TEXT NOT NULL DEFAULT 'aguardando_web' CHECK (status_handoff IN ('aguardando_web', 'em_revisao', 'emitida'))`
   * `payload_json JSONB NOT NULL` *(contrato oficial das 6 modalidades)*
   * `total_fotos INT NOT NULL DEFAULT 0`
   * `atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()`
4. **`vistorias_fotos_temp`**:
   * `id TEXT PRIMARY KEY`
   * `vistoria_id TEXT NOT NULL REFERENCES vistorias_transito(id) ON DELETE CASCADE`
   * `storage_key TEXT NOT NULL` *(caminho privado no R2/Storage — nunca URL pública)*
   * `nome_arquivo TEXT NOT NULL`
   * `tamanho_kb INT NOT NULL CHECK (tamanho_kb <= 500)`
   * `ocorrencia_numero INT`
   * `criado_em TIMESTAMPTZ NOT NULL DEFAULT now()`
5. **`historico_achados`** *(Permanente · Sem Fotos · Zero PII)*:
   * `id BIGSERIAL PRIMARY KEY`, `id_vistoria`, `concessao`, `modalidade`, `data_vistoria`, `local_ou_trecho`, `tipo_achado ('NC'|'PA')`, `categoria_nc`, `situacao`, `criado_em`.
6. **`audit_logs`** *(Append-Only)*:
   * `id BIGSERIAL PRIMARY KEY`, `ator_id UUID`, `acao TEXT NOT NULL`, `alvo TEXT`, `ip TEXT`, `detalhes JSONB`, `criado_em TIMESTAMPTZ NOT NULL DEFAULT now()`.

### Travas SQL Obrigatórias
* `ENABLE ROW LEVEL SECURITY` em **100% das 6 tabelas**.
* **Trigger anti-escalação:** proíbe `UPDATE` de `perfis.role` para `'adm'` por sessões não-service-role e proíbe desativar o último `adm` ativo.
* **Script de Bootstrap (`scripts/seed_admin.py`):** cria a primeira conta `ADM` diretamente via servidor (nunca via rota HTTP).

### Critérios de Aceite (BDD)
* **Dado** um `analista` tentando inserir em `solicitacoes_acesso` com `role_solicitado = 'adm'`, **Então** o `CHECK` do PostgreSQL rejeita a operação.
* **Dado** um `coordenador` tentando promover a si mesmo para `adm`, **Então** o Trigger + RLS bloqueiam a atualização.

---

## Fase 1 — Backend FastAPI (Auth Sem E-mail + Aprovação Individual + Presigned URLs)

### Endpoints a Implementar (`backend/src/server/`)
1. `POST /api/auth/login` — recebe `{ usuario, senha }`, aplica **rate limit** + **lockout (5 erros → 15 min)**, mapeia internamente para `${usuario}@arpe.internal`, valida via Supabase Auth, grava em `audit_logs` e retorna:
   * **Mobile:** `{ access_token, refresh_token, perfil }` (para salvar em `expo-secure-store`).
   * **Web:** define cookies `HttpOnly; Secure; SameSite=Strict` + retorna `{ perfil }`.
2. `POST /api/auth/solicitar-acesso` — registra solicitação com `role_solicitado ∈ {'analista', 'coordenador'}` (nunca `'adm'`), valida força de senha (≥ 10 chars) e grava `senha_hash_temp`.
3. `GET /api/auth/solicitacoes` — acessível apenas para `adm` e `coordenador`.
4. `POST /api/auth/solicitacoes/{id}/decidir` — acessível para `adm` ou `coordenador` (exige reconfirmação de senha quando `role === 'adm'`); ao aprovar individualmente, cria imediatamente o usuário real no Supabase Auth + `perfis`, registra `decidido_por`, limpa `senha_hash_temp` e grava em `audit_logs`.
5. `POST /api/sync/presign-upload` — autenticado; valida extensão/tamanho (≤ 500 KB) e devolve **Presigned PUT URL** (validade ≤ 10 min).
6. `POST /api/sync/vistorias` — autenticado; valida schema JSON das 6 modalidades (Pydantic) e faz *upsert* em `vistorias_transito` + `vistorias_fotos_temp`.
7. `GET /api/sync/vistorias` e `GET /api/sync/vistorias/{id}/fotos-urls` — autenticado (Web); retorna lista de finalizados e Presigned GET URLs (≤ 10 min) para revisão e geração do `.docx`.

### Critérios de Aceite (BDD)
* **Dado** 5 senhas erradas seguidas na conta `adm`, **Quando** tentar a 6ª vez, **Então** retorna `429 Too Many Requests` / conta bloqueada por 15 min e registra evento em `audit_logs`.
* **Dado** uma solicitação pendente, **Quando** o `adm` OU um `coordenador` aprovar, **Então** a conta é ativada imediatamente, `decidido_por` é registrado e o evento entra em `audit_logs`.

---

## Fase 2 — Autenticação, Perfis e Aprovações no App Android

### Arquivos a Criar/Alterar no Repositório Mobile
* `src/domain/entities/authTypes.ts` (`UserRole = "adm" | "coordenador" | "analista"`, `AuthUserProfile`, `AccessRequestEntity`)
* `src/infrastructure/auth/secureAuthService.ts` *(salva/lê JWT exclusivamente via `expo-secure-store`, zero `AsyncStorage`, zero logs de token)*
* `src/application/store/useAuthStore.ts` *(estado de sessão offline-tolerante + refresh automático quando online)*
* `src/presentation/screens/LoginScreen.tsx` *(campos `Usuário` + `Senha` — **sem e-mail** — + botão `"Solicitar Acesso"`)*
* `src/presentation/components/auth/SolicitarAcessoModal.tsx` *(nome, usuário, perfil `Analista` ou `Coordenador`, senha forte)*
* `src/presentation/components/config/AprovacoesPendentesCard.tsx` *(exibido na aba `Configuração` exclusivamente para `adm` e `coordenador`, permitindo assinar aprovação/rejeição com confirmação)*
* `App.tsx` *(guarda de sessão: sem token válido → `LoginScreen`; autenticado → `RootNavigator`)*

### Critérios de Aceite (BDD)
* **Dado** um fiscal já autenticado que entrou em Modo Avião, **Quando** reabrir o app, **Então** a sessão persistida no `expo-secure-store` libera o uso 100% offline sem pedir login novamente.
* **Dado** um usuário com perfil `analista`, **Quando** abrir a aba `Configuração`, **Então** o painel de aprovação de contas **não** é exibido.

---

## Fase 3 — Persistência Offline Real (`expo-sqlite`) & Mídia Real (`expo-camera`)

### Arquivos a Criar/Alterar no Repositório Mobile
* `src/infrastructure/database/sqliteClient.ts` *(100% queries parametrizadas `?`, tabelas `vistorias`, `ocorrencias`, `galeria_fotos`, `sync_queue`)*
* `src/infrastructure/media/mediaService.ts`:
  * Captura via `expo-camera`
  * Compressão obrigatória via `expo-image-manipulator` (**máx. 1600px, JPEG 80%, alvo ≤ 250 KB**)
  * Gravação na pasta privada do app (`FileSystem.documentDirectory + "arpe_galeria/"`) — **fora da galeria pública do Android (LGPD)**
* Conectar `useMobileStore.ts` ao repositório SQLite (substituindo mocks em produção, mantendo mocks apenas em testes).

### Critérios de Aceite (BDD)
* **Dado** uma foto capturada de 4 MB pela câmera Android, **Quando** salva no app, **Então** é comprimida para ≤ 250 KB em `FileSystem.documentDirectory/arpe_galeria/` e sobrevive ao fechamento completo do app.

---

## Fase 4 — Motor de Sync Incremental Real na Aba `Finalizados`

### Arquivos a Criar/Alterar no Repositório Mobile
* `src/infrastructure/sync/syncEngine.ts`:
  * Lê `sync_queue` no `expo-sqlite` respeitando `podeAutoSincronizar(vistoria, networkMode)` (`online` + `finalizada` + `!syncStandby`).
  * Solicita Presigned PUT URL ao FastAPI e sobe **1 a 3 fotos por vez** atualizando `fotosEnviadas` no SQLite e na barra de progresso animada de `FinalizadoCard.tsx`.
  * Se a rede cair na foto `N`, marca o item como `pending` e retoma da foto `N + 1` na reconexão (idempotente, sem duplicar).
  * Após subir todas as fotos da vistoria, envia o JSON estruturado para `POST /api/sync/vistorias`.

### Critérios de Aceite (BDD)
* **Dado** uma vistoria finalizada com 50 fotos e queda de rede na foto 32, **Quando** o Wi-Fi/4G voltar, **Então** o motor retoma na foto 33 e conclui com 50/50 sem duplicação.

---

## Fase 5 — Integração no Sistema Web (`Importar do Campo` + Emissão `.docx`)

### Entregas no Repositório Web + FastAPI
1. **Login Web (`usuario + senha`, sem e-mail)** com cookies `HttpOnly; Secure; SameSite=Strict` + tela de **Aprovação de Acessos** para `ADM` e `Coordenador`.
2. **Botão "Importar do Campo" no Web:** lista as vistorias em `vistorias_transito` (`aguardando_web`), baixa o JSON + Presigned GET URLs das fotos e carrega diretamente no editor Web (compatível com os 6 estados).
3. **Emissão do `.docx` no FastAPI:** compila o relatório oficial com `python-docx`, grava os dados estruturados (sem fotos, sem PII) em `historico_achados` e marca a vistoria como `emitida` (com expurgo das fotos temporárias no Storage).

---

## Fase 6 — Auditoria Final (OWASP + LGPD + Regressão nos 6 Estados)

### Checklist Bloqueante de Go-Live
- [ ] **Zero e-mails** exibidos ou solicitados em qualquer tela (Mobile e Web).
- [ ] Conta `ADM` criada apenas via bootstrap de servidor, com senha ≥ 12 chars, lockout ativo e auditoria em `audit_logs`.
- [ ] Aprovação individual (`ADM` ou `Coordenador`) obrigatória para toda nova conta (com auditoria de `decidido_por`).
- [ ] **RLS** validado no Supabase para todas as 6 tabelas (teste negativo com token de `analista`).
- [ ] **Zero `SERVICE_ROLE_KEY`** no bundle Mobile ou Web.
- [ ] Bucket Storage **100% privado** (teste de acesso direto sem assinatura retornando `403`).
- [ ] `tsc --noEmit`, `jest` (Mobile) e `pytest` (Backend FastAPI) 100% verdes nos 6 estados.
