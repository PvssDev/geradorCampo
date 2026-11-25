import { create } from "zustand";
import { AuthSession } from "../../domain/entities/authTypes";
import {
  autenticarComUsuarioSenha,
  carregarSessaoSalva,
  encerrarSessaoLocal,
} from "../../infrastructure/auth/secureAuthService";

interface AuthStoreState {
  hydrated: boolean;
  loading: boolean;
  session: AuthSession | null;
  hidratarSessao: () => Promise<void>;
  login: (
    usuario: string,
    senha: string
  ) => Promise<{ readonly ok: true } | { readonly ok: false; readonly erro: string }>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  hydrated: false,
  loading: false,
  session: null,

  hidratarSessao: async () => {
    const saved = await carregarSessaoSalva();
    set({ session: saved, hydrated: true });
  },

  login: async (usuario, senha) => {
    set({ loading: true });
    const result = await autenticarComUsuarioSenha(usuario, senha);
    if (!result.ok) {
      set({ loading: false });
      return result;
    }
    set({ session: result.session, loading: false });
    return { ok: true };
  },

  logout: async () => {
    await encerrarSessaoLocal();
    set({ session: null });
  },
}));
