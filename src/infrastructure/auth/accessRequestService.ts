import {
  AccessRequestEntity,
  AuthUserProfile,
  RequestableRole,
  UserRole,
} from "../../domain/entities/authTypes";
import {
  filtrarSolicitacoesPendentes,
  normalizarUsuarioLogin,
  validarDecisaoAcesso,
  validarForcaSenha,
  validarFormatoUsuario,
} from "../../domain/rules/authRules";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ?? "";

interface LocalPendingEntry {
  readonly request: AccessRequestEntity;
  readonly senhaTemp: string;
}

const localRequests: LocalPendingEntry[] = [];
const localApprovedUsers = new Map<
  string,
  { readonly senha: string; readonly perfil: AuthUserProfile }
>();

function canCallRemoteApi(): boolean {
  return API_BASE_URL.length > 0 && !API_BASE_URL.includes("sua-api-arpe");
}

export function buscarUsuarioAprovadoLocal(
  usuarioRaw: string,
  senha: string
): AuthUserProfile | null {
  const usuario = normalizarUsuarioLogin(usuarioRaw);
  const entry = localApprovedUsers.get(usuario);
  if (!entry || entry.senha !== senha) return null;
  return entry.perfil;
}

export function contarSolicitacoesPendentesLocal(): number {
  return filtrarSolicitacoesPendentes(localRequests.map((item) => item.request)).length;
}

export async function solicitarAcesso(input: {
  readonly nomeCompleto: string;
  readonly usuario: string;
  readonly roleSolicitado: RequestableRole;
  readonly senha: string;
}): Promise<
  | { readonly ok: true; readonly modo: "api" | "local" }
  | { readonly ok: false; readonly erro: string }
> {
  const nome = input.nomeCompleto.trim();
  const usuario = normalizarUsuarioLogin(input.usuario);
  if (nome.length < 3) {
    return { ok: false, erro: "Informe seu nome completo." };
  }
  if (!validarFormatoUsuario(usuario)) {
    return { ok: false, erro: "Usuário deve ter 3 a 32 caracteres (letras, números, . _ -)." };
  }
  const forca = validarForcaSenha(input.senha);
  if (!forca.ok) return forca;

  if (canCallRemoteApi()) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/solicitar-acesso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome_completo: nome,
          usuario,
          role_solicitado: input.roleSolicitado,
          senha: input.senha,
        }),
      });
      if (res.ok) {
        return { ok: true, modo: "api" };
      }
      const errBody = (await res.json().catch(() => null)) as { detail?: string } | null;
      return { ok: false, erro: errBody?.detail ?? "Não foi possível enviar a solicitação." };
    } catch {
      // Backend FastAPI indisponível: segue para fila local de teste
    }
  }

  const jaExiste = localRequests.some(
    (item) => item.request.usuario === usuario && item.request.status === "pendente"
  );
  if (jaExiste) {
    return { ok: false, erro: "Já existe uma solicitação pendente para este usuário." };
  }

  localRequests.unshift({
    request: {
      id: `req-${Date.now()}-${localRequests.length + 1}`,
      usuario,
      nomeCompleto: nome,
      roleSolicitado: input.roleSolicitado,
      status: "pendente",
      criadoEm: new Date().toISOString(),
    },
    senhaTemp: input.senha,
  });
  return { ok: true, modo: "local" };
}

export async function listarSolicitacoesPendentes(
  accessToken: string
): Promise<readonly AccessRequestEntity[]> {
  if (canCallRemoteApi() && !accessToken.startsWith("local-dev-")) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/solicitacoes`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const rows = (await res.json()) as Array<{
          id: string;
          usuario: string;
          nome_completo: string;
          role_solicitado: RequestableRole;
          status: AccessRequestEntity["status"];
          criado_em: string;
        }>;
        return filtrarSolicitacoesPendentes(
          rows.map((row) => ({
            id: row.id,
            usuario: row.usuario,
            nomeCompleto: row.nome_completo,
            roleSolicitado: row.role_solicitado,
            status: row.status,
            criadoEm: row.criado_em,
          }))
        );
      }
    } catch {
      // Fallback para fila local
    }
  }

  return filtrarSolicitacoesPendentes(localRequests.map((item) => item.request));
}

export async function decidirSolicitacaoAcesso(input: {
  readonly accessToken: string;
  readonly roleAtual: UserRole;
  readonly solicitacao: AccessRequestEntity;
  readonly decisao: "aprovada" | "rejeitada";
  readonly decisorUsuario: string;
  readonly senhaConfirmacao?: string;
}): Promise<{ readonly ok: true } | { readonly ok: false; readonly erro: string }> {
  const guard = validarDecisaoAcesso(input.roleAtual, input.solicitacao);
  if (!guard.ok) return guard;
  if (input.roleAtual === "adm" && (!input.senhaConfirmacao || input.senhaConfirmacao.length < 6)) {
    return {
      ok: false,
      erro: "Confirme sua senha de Administrador para concluir esta decisão.",
    };
  }

  if (canCallRemoteApi() && !input.accessToken.startsWith("local-dev-")) {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/auth/solicitacoes/${encodeURIComponent(input.solicitacao.id)}/decidir`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${input.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            decisao: input.decisao,
            ...(input.senhaConfirmacao
              ? { senha_confirmacao: input.senhaConfirmacao }
              : {}),
          }),
        }
      );
      if (res.ok) return { ok: true };
      const errBody = (await res.json().catch(() => null)) as { detail?: string } | null;
      return { ok: false, erro: errBody?.detail ?? "Falha ao registrar decisão." };
    } catch {
      // Fallback local quando FastAPI não estiver rodando
    }
  }

  const idx = localRequests.findIndex((item) => item.request.id === input.solicitacao.id);
  if (idx === -1) {
    return { ok: false, erro: "Solicitação não encontrada." };
  }

  const entry = localRequests[idx];
  localRequests[idx] = {
    ...entry,
    request: {
      ...entry.request,
      status: input.decisao,
      decididoPor: input.decisorUsuario,
    },
  };

  if (input.decisao === "aprovada") {
    localApprovedUsers.set(entry.request.usuario, {
      senha: entry.senhaTemp,
      perfil: {
        id: `local-${entry.request.roleSolicitado}-${Date.now()}`,
        usuario: entry.request.usuario,
        nomeCompleto: entry.request.nomeCompleto,
        role: entry.request.roleSolicitado,
        ativo: true,
      },
    });
  }

  return { ok: true };
}
