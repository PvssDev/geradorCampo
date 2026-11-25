import { AccessRequestEntity, UserRole } from "../entities/authTypes";

const USUARIO_REGEX = /^[a-z0-9._-]{3,32}$/;
const DOMINIO_INTERNO = "arpe.internal";

export function normalizarUsuarioLogin(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validarFormatoUsuario(usuario: string): boolean {
  return USUARIO_REGEX.test(normalizarUsuarioLogin(usuario));
}

export function montarEmailSintetico(usuario: string): string {
  return `${normalizarUsuarioLogin(usuario)}@${DOMINIO_INTERNO}`;
}

export function validarForcaSenha(
  senha: string
): { readonly ok: true } | { readonly ok: false; readonly erro: string } {
  if (senha.length < 10) {
    return { ok: false, erro: "A senha deve ter no mínimo 10 caracteres." };
  }
  if (!/[A-Z]/.test(senha) || !/[a-z]/.test(senha) || !/[0-9]/.test(senha)) {
    return {
      ok: false,
      erro: "Use letras maiúsculas, minúsculas e ao menos um número.",
    };
  }
  return { ok: true };
}

export function podeAprovarAcessos(role: UserRole): boolean {
  return role === "adm" || role === "coordenador";
}

export function podeAcessarPainelAdm(role: UserRole): boolean {
  return role === "adm";
}

export const AVATAR_PALETTE = [
  "#1D4ED8",
  "#0E7490",
  "#047857",
  "#4338CA",
  "#B45309",
  "#9F1239",
  "#0F766E",
  "#6D28D9",
] as const;

const PREPOSICOES_NOME = new Set(["da", "de", "do", "das", "dos", "e"]);

export function extrairIniciaisAvatar(
  nomeCompleto: string,
  fallbackUsuario?: string
): string {
  const tokens = (nomeCompleto || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    const fb = normalizarUsuarioLogin(fallbackUsuario ?? "");
    return fb ? fb[0].toUpperCase() : "A";
  }

  if (tokens.length === 1) {
    return tokens[0][0].toUpperCase();
  }

  const relevantes = tokens.filter((t) => !PREPOSICOES_NOME.has(t.toLowerCase()));
  const base = relevantes.length >= 2 ? relevantes : tokens;
  const primeiro = base[0][0] ?? "";
  const ultimo = base[base.length - 1][0] ?? "";
  return `${primeiro}${ultimo}`.toUpperCase();
}

export function obterCorAvatar(identificador: string): string {
  const norm = normalizarUsuarioLogin(identificador || "arpe");
  let hash = 5381;
  for (let i = 0; i < norm.length; i += 1) {
    hash = ((hash << 5) - hash + norm.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function obterLabelPerfil(role: UserRole): string {
  if (role === "adm") return "Administrador (ADM)";
  if (role === "coordenador") return "Coordenador";
  return "Analista";
}

export function filtrarSolicitacoesPendentes(
  solicitacoes: readonly AccessRequestEntity[]
): AccessRequestEntity[] {
  return solicitacoes.filter((item) => item.status === "pendente");
}

export function validarDecisaoAcesso(
  roleAtual: UserRole,
  solicitacao: AccessRequestEntity
): { readonly ok: true } | { readonly ok: false; readonly erro: string } {
  if (!podeAprovarAcessos(roleAtual)) {
    return { ok: false, erro: "Apenas ADM ou Coordenador podem decidir solicitações." };
  }
  if (solicitacao.status !== "pendente") {
    return { ok: false, erro: "Esta solicitação já foi decidida." };
  }
  return { ok: true };
}
