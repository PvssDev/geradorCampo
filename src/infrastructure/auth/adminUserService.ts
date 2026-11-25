import { RequestableRole } from "../../domain/entities/authTypes";
import {
  normalizarUsuarioLogin,
  validarForcaSenha,
  validarFormatoUsuario,
} from "../../domain/rules/authRules";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ?? "";

export interface ManagedUserItem {
  readonly id: string;
  readonly usuario: string;
  readonly nomeCompleto: string;
  readonly role: RequestableRole;
  readonly ativo: boolean;
  readonly criadoEm: string;
}

export interface TelemetryDayPoint {
  readonly dia: string;
  readonly mobile: number;
  readonly web: number;
}

export interface TelemetryActivityItem {
  readonly usuario: string;
  readonly acao: string;
  readonly canal: "mobile" | "web" | "sistema";
  readonly status: "ok" | "alerta";
  readonly criadoEm: string;
}

export interface AdminTelemetryData {
  readonly equipeAtiva: number;
  readonly solicitacoesPendentes: number;
  readonly loginsMobile7d: number;
  readonly loginsWeb7d: number;
  readonly alertas7d: number;
  readonly serieDiaria: readonly TelemetryDayPoint[];
  readonly atividadeRecente: readonly TelemetryActivityItem[];
}

type ActionResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly erro: string };

function guardRemoteAdmin(accessToken: string): string | null {
  if (!API_BASE_URL || accessToken.startsWith("local-dev-")) {
    return "Esta ação exige conexão com uma conta ADM real no servidor.";
  }
  return null;
}

async function parseError(res: Response, fallback: string): Promise<string> {
  const err = (await res.json().catch(() => null)) as { detail?: string } | null;
  return err?.detail ?? fallback;
}

export async function listarUsuariosGerenciaveis(
  accessToken: string
): Promise<
  | { readonly ok: true; readonly usuarios: readonly ManagedUserItem[] }
  | { readonly ok: false; readonly erro: string }
> {
  const guard = guardRemoteAdmin(accessToken);
  if (guard) return { ok: false, erro: guard };

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/admin/usuarios`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      return {
        ok: false,
        erro: await parseError(res, "Não foi possível carregar os usuários."),
      };
    }
    const rows = (await res.json()) as Array<{
      id: string;
      usuario: string;
      nome_completo: string;
      role: RequestableRole;
      ativo: boolean;
      criado_em: string;
    }>;
    return {
      ok: true,
      usuarios: rows.map((r) => ({
        id: r.id,
        usuario: r.usuario,
        nomeCompleto: r.nome_completo,
        role: r.role,
        ativo: r.ativo,
        criadoEm: r.criado_em,
      })),
    };
  } catch {
    return {
      ok: false,
      erro: "Sem conexão com o servidor. Verifique sua internet.",
    };
  }
}

export async function criarUsuarioAdmin(input: {
  readonly accessToken: string;
  readonly nomeCompleto: string;
  readonly usuario: string;
  readonly role: RequestableRole;
  readonly senha: string;
  readonly senhaConfirmacaoAdm: string;
}): Promise<ActionResult> {
  const guard = guardRemoteAdmin(input.accessToken);
  if (guard) return { ok: false, erro: guard };
  if (input.nomeCompleto.trim().length < 3) {
    return { ok: false, erro: "Informe o nome completo." };
  }
  const usuario = normalizarUsuarioLogin(input.usuario);
  if (!validarFormatoUsuario(usuario)) {
    return {
      ok: false,
      erro: "Usuário deve ter 3 a 32 caracteres (letras, números, . _ -).",
    };
  }
  const forca = validarForcaSenha(input.senha);
  if (!forca.ok) return forca;
  if (input.senhaConfirmacaoAdm.trim().length < 6) {
    return { ok: false, erro: "Confirme sua senha de Administrador." };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/admin/usuarios`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome_completo: input.nomeCompleto.trim(),
        usuario,
        role: input.role,
        senha: input.senha,
        senha_confirmacao: input.senhaConfirmacaoAdm,
      }),
    });
    if (res.ok) return { ok: true };
    return { ok: false, erro: await parseError(res, "Falha ao criar usuário.") };
  } catch {
    return { ok: false, erro: "Sem conexão com o servidor." };
  }
}

export async function atualizarUsuarioAdmin(input: {
  readonly accessToken: string;
  readonly userId: string;
  readonly nomeCompleto: string;
  readonly role: RequestableRole;
  readonly ativo: boolean;
  readonly novaSenha?: string;
  readonly senhaConfirmacaoAdm: string;
}): Promise<ActionResult> {
  const guard = guardRemoteAdmin(input.accessToken);
  if (guard) return { ok: false, erro: guard };
  if (input.nomeCompleto.trim().length < 3) {
    return { ok: false, erro: "Informe o nome completo." };
  }
  const novaSenhaLimpa = input.novaSenha?.trim() ?? "";
  if (novaSenhaLimpa.length > 0) {
    const forca = validarForcaSenha(novaSenhaLimpa);
    if (!forca.ok) return forca;
  }
  if (input.senhaConfirmacaoAdm.trim().length < 6) {
    return { ok: false, erro: "Confirme sua senha de Administrador." };
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/auth/admin/usuarios/${encodeURIComponent(input.userId)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome_completo: input.nomeCompleto.trim(),
          role: input.role,
          ativo: input.ativo,
          ...(novaSenhaLimpa.length > 0 ? { nova_senha: novaSenhaLimpa } : {}),
          senha_confirmacao: input.senhaConfirmacaoAdm,
        }),
      }
    );
    if (res.ok) return { ok: true };
    return { ok: false, erro: await parseError(res, "Falha ao salvar alterações.") };
  } catch {
    return { ok: false, erro: "Sem conexão com o servidor." };
  }
}

export async function deletarUsuarioAdmin(input: {
  readonly accessToken: string;
  readonly userId: string;
  readonly senhaConfirmacaoAdm: string;
}): Promise<ActionResult> {
  const guard = guardRemoteAdmin(input.accessToken);
  if (guard) return { ok: false, erro: guard };
  if (input.senhaConfirmacaoAdm.trim().length < 6) {
    return { ok: false, erro: "Confirme sua senha de Administrador." };
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/auth/admin/usuarios/${encodeURIComponent(
        input.userId
      )}/deletar`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ senha_confirmacao: input.senhaConfirmacaoAdm }),
      }
    );
    if (res.ok) return { ok: true };
    return { ok: false, erro: await parseError(res, "Falha ao excluir usuário.") };
  } catch {
    return { ok: false, erro: "Sem conexão com o servidor." };
  }
}

export async function obterTelemetriaAdm(
  accessToken: string
): Promise<
  | { readonly ok: true; readonly data: AdminTelemetryData }
  | { readonly ok: false; readonly erro: string }
> {
  const guard = guardRemoteAdmin(accessToken);
  if (guard) return { ok: false, erro: guard };

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/admin/telemetria`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      return {
        ok: false,
        erro: await parseError(res, "Não foi possível carregar a telemetria."),
      };
    }
    const raw = (await res.json()) as {
      equipe_ativa: number;
      solicitacoes_pendentes: number;
      logins_mobile_7d: number;
      logins_web_7d: number;
      alertas_7d: number;
      serie_diaria: Array<{ dia: string; mobile: number; web: number }>;
      atividade_recente: Array<{
        usuario: string;
        acao: string;
        canal: "mobile" | "web" | "sistema";
        status: "ok" | "alerta";
        criado_em: string;
      }>;
    };
    return {
      ok: true,
      data: {
        equipeAtiva: raw.equipe_ativa,
        solicitacoesPendentes: raw.solicitacoes_pendentes,
        loginsMobile7d: raw.logins_mobile_7d,
        loginsWeb7d: raw.logins_web_7d,
        alertas7d: raw.alertas_7d,
        serieDiaria: raw.serie_diaria ?? [],
        atividadeRecente: (raw.atividade_recente ?? []).map((a) => ({
          usuario: a.usuario,
          acao: a.acao,
          canal: a.canal,
          status: a.status,
          criadoEm: a.criado_em,
        })),
      },
    };
  } catch {
    return { ok: false, erro: "Sem conexão com o servidor." };
  }
}
