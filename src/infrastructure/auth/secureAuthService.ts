import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { AuthSession, AuthUserProfile } from "../../domain/entities/authTypes";
import {
  montarEmailSintetico,
  normalizarUsuarioLogin,
  validarFormatoUsuario,
} from "../../domain/rules/authRules";
import { buscarUsuarioAprovadoLocal } from "./accessRequestService";

const SESSION_STORAGE_KEY = "arpe_auth_session_v1";
const GENERIC_AUTH_ERROR = "Usuário ou senha inválidos.";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ?? "";
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

async function persistSession(session: AuthSession): Promise<void> {
  const serialized = JSON.stringify(session);
  if (Platform.OS === "web") {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
    }
    return;
  }
  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, serialized);
}

export async function carregarSessaoSalva(): Promise<AuthSession | null> {
  try {
    const raw =
      Platform.OS === "web"
        ? typeof sessionStorage !== "undefined"
          ? sessionStorage.getItem(SESSION_STORAGE_KEY)
          : null
        : await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.accessToken || !parsed?.perfil?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function encerrarSessaoLocal(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
      return;
    }
    await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
  } catch {
    // silencioso
  }
}

const LOCAL_PREVIEW_USERS: Readonly<
  Record<string, { readonly senha: string; readonly perfil: AuthUserProfile }>
> = {
  pedro: {
    senha: "Arpe@2026!",
    perfil: {
      id: "adee179d-9c41-4387-aedf-7e25bac8155e",
      usuario: "pedro",
      nomeCompleto: "Pedro Souza (ADM)",
      role: "adm",
      ativo: true,
    },
  },
  "adm.teste": {
    senha: "Arpe@2026!",
    perfil: {
      id: "adee179d-9c41-4387-aedf-7e25bac8155e",
      usuario: "adm.teste",
      nomeCompleto: "Administrador Teste ARPE",
      role: "adm",
      ativo: true,
    },
  },
  "coord.teste": {
    senha: "Arpe@2026!",
    perfil: {
      id: "local-coord-001",
      usuario: "coord.teste",
      nomeCompleto: "Coordenador Teste CTR",
      role: "coordenador",
      ativo: true,
    },
  },
  "analista.teste": {
    senha: "Arpe@2026!",
    perfil: {
      id: "local-analista-001",
      usuario: "analista.teste",
      nomeCompleto: "Analista Fiscal Teste",
      role: "analista",
      ativo: true,
    },
  },
};

export async function autenticarComUsuarioSenha(
  usuarioRaw: string,
  senha: string
): Promise<
  { readonly ok: true; readonly session: AuthSession } | { readonly ok: false; readonly erro: string }
> {
  const usuario = normalizarUsuarioLogin(usuarioRaw);
  if (!validarFormatoUsuario(usuario) || senha.length < 6) {
    return { ok: false, erro: GENERIC_AUTH_ERROR };
  }

  // Modo preview local caso .env do Supabase ainda não tenha sido configurado
  if (!isSupabaseConfigured) {
    const localAccount = LOCAL_PREVIEW_USERS[usuario];
    const approvedLocal = buscarUsuarioAprovadoLocal(usuario, senha);
    const perfilLocal =
      localAccount && localAccount.senha === senha
        ? localAccount.perfil
        : approvedLocal;

    if (perfilLocal) {
      const demoSession: AuthSession = {
        accessToken: `local-dev-${perfilLocal.role}`,
        refreshToken: "local-dev-refresh",
        perfil: perfilLocal,
      };
      await persistSession(demoSession);
      return { ok: true, session: demoSession };
    }
    return { ok: false, erro: GENERIC_AUTH_ERROR };
  }

  // Prioriza o Backend FastAPI (Fase 1: Rate Limit + Lockout + Audit Logs) quando acessível
  if (API_BASE_URL.length > 0 && !API_BASE_URL.includes("sua-api-arpe")) {
    try {
      const apiRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha, client_type: "mobile" }),
      });
      if (apiRes.ok) {
        const data = (await apiRes.json()) as {
          access_token: string;
          refresh_token: string;
          perfil: {
            id: string;
            usuario: string;
            nome_completo: string;
            role: AuthUserProfile["role"];
            ativo: boolean;
          };
        };
        const session: AuthSession = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          perfil: {
            id: data.perfil.id,
            usuario: data.perfil.usuario,
            nomeCompleto: data.perfil.nome_completo,
            role: data.perfil.role,
            ativo: data.perfil.ativo,
          },
        };
        await persistSession(session);
        return { ok: true, session };
      }
      if (apiRes.status === 401 || apiRes.status === 403 || apiRes.status === 429) {
        const errJson = (await apiRes.json().catch(() => null)) as {
          detail?: string;
        } | null;
        return { ok: false, erro: errJson?.detail ?? GENERIC_AUTH_ERROR };
      }
    } catch {
      // Backend local offline -> segue para autenticação direta no Supabase Auth
    }
  }

  try {
    const tokenRes = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: montarEmailSintetico(usuario),
          password: senha,
        }),
      }
    );

    if (!tokenRes.ok) {
      const approvedLocal = buscarUsuarioAprovadoLocal(usuario, senha);
      if (approvedLocal) {
        const localSession: AuthSession = {
          accessToken: `local-dev-${approvedLocal.role}`,
          refreshToken: "local-dev-refresh",
          perfil: approvedLocal,
        };
        await persistSession(localSession);
        return { ok: true, session: localSession };
      }
      return { ok: false, erro: GENERIC_AUTH_ERROR };
    }

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      user?: { id?: string };
    };
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token ?? "";
    const userId = tokenData.user?.id;

    if (!accessToken || !userId) {
      return { ok: false, erro: GENERIC_AUTH_ERROR };
    }

    const perfilRes = await fetch(
      `${SUPABASE_URL}/rest/v1/perfis?id=eq.${encodeURIComponent(
        userId
      )}&select=id,usuario,nome_completo,role,ativo`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!perfilRes.ok) {
      return { ok: false, erro: "Perfil corporativo não encontrado." };
    }

    const rows = (await perfilRes.json()) as Array<{
      id: string;
      usuario: string;
      nome_completo: string;
      role: AuthUserProfile["role"];
      ativo: boolean;
    }>;
    const row = rows[0];
    if (!row || !row.ativo) {
      return { ok: false, erro: "Conta inativa ou sem permissão de acesso." };
    }

    const session: AuthSession = {
      accessToken,
      refreshToken,
      perfil: {
        id: row.id,
        usuario: row.usuario,
        nomeCompleto: row.nome_completo,
        role: row.role,
        ativo: row.ativo,
      },
    };
    await persistSession(session);
    return { ok: true, session };
  } catch {
    return {
      ok: false,
      erro: "Sem conexão com o servidor. Conecte-se à internet para o primeiro login.",
    };
  }
}
