import {
  OcorrenciaEntity,
  VistoriaSessionEntity,
} from "../entities/types";

export interface IVistoriaRepository {
  listarTodas(): Promise<readonly VistoriaSessionEntity[]>;
  salvar(vistoria: VistoriaSessionEntity): Promise<void>;
  adicionarOcorrencia(
    vistoriaId: string,
    ocorrencia: OcorrenciaEntity
  ): Promise<void>;
}

export interface IAuthService {
  obterSessaoLocal(): Promise<{ email: string } | null>;
  entrar(email: string, senha: string): Promise<{ ok: boolean; error?: string }>;
  sair(): Promise<void>;
}

export interface ISyncEngine {
  sincronizarVistoria(
    vistoriaId: string,
    onProgress?: (enviadas: number, total: number) => void
  ): Promise<{ ok: boolean; enviadas: number }>;
}

