import * as FileSystem from "expo-file-system";
import { UserRole } from "../../domain/entities/authTypes";
import { FotoMidiaEntity, VistoriaSessionEntity } from "../../domain/entities/types";
import { ISyncEngine } from "../../domain/ports/repositories";
import {
  desserializarVistoriaDaNuvem,
  serializarVistoriaParaSyncPayload,
  WorkTreeVistoriaPayloadJson,
} from "../../domain/rules/syncPayloadRules";
import { ehUriFotoReal } from "../../domain/rules/watermarkRules";
import { carregarSessaoSalva } from "../auth/secureAuthService";
import { sqliteClient } from "../database/sqliteClient";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") ?? "";
const UPLOAD_CONCURRENCY = 2;

export interface SyncRunResult {
  readonly ok: boolean;
  readonly enviadas: number;
  readonly idFiscalizacaoFinal?: string;
  readonly erro?: string;
}

export interface NuvemVistoriaItem {
  readonly id: string;
  readonly id_fiscalizacao: string;
  readonly autor_id: string;
  readonly autor_usuario: string;
  readonly autor_nome: string;
  readonly autor_role: UserRole;
  readonly concessao: "CRA" | "CRC" | "SOCICAM";
  readonly modalidade: "Fiscalização" | "Monitoramento";
  readonly status_handoff: string;
  readonly payload_json?: Partial<WorkTreeVistoriaPayloadJson>;
  readonly total_fotos: number;
  readonly atualizado_em: string;
}

function isApiSyncConfigured(): boolean {
  return API_BASE_URL.length > 0 && !API_BASE_URL.includes("sua-api-arpe");
}

async function solicitarPresignUpload(params: {
  readonly token: string;
  readonly vistoriaId: string;
  readonly foto: FotoMidiaEntity;
}): Promise<{ readonly storageKey: string; readonly uploadUrl: string }> {
  const tamanhoKb = Math.max(1, Math.min(500, Math.round(params.foto.tamanhoKb || 180)));
  const res = await fetch(`${API_BASE_URL}/api/sync/presign-upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({
      vistoria_id: params.vistoriaId,
      nome_arquivo: params.foto.nomeArquivo,
      content_type: "image/jpeg",
      tamanho_kb: tamanhoKb,
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(err?.detail ?? `Falha ao obter URL de upload (${res.status}).`);
  }

  const data = (await res.json()) as {
    storage_key: string;
    upload_url: string;
  };
  return {
    storageKey: data.storage_key,
    uploadUrl: data.upload_url,
  };
}

async function enviarArquivoParaPresignedUrl(
  uploadUrl: string,
  localUri: string
): Promise<void> {
  const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
    httpMethod: "PUT",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      "Content-Type": "image/jpeg",
    },
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Falha no upload da imagem (HTTP ${result.status}).`);
  }
}

export class CloudSyncEngine implements ISyncEngine {
  async sincronizarVistoria(): Promise<{ ok: boolean; enviadas: number }> {
    return { ok: false, enviadas: 0 };
  }

  /**
   * Executa upload incremental de 2 fotos por vez com retomada idempotente via SQLite
   * e envia o estado completo da vistoria (6 estados workTree) para /api/sync/vistorias.
   */
  async sincronizarVistoriaCompleta(
    vistoria: VistoriaSessionEntity,
    onProgress?: (enviadas: number, total: number, fotoIdSincronizada?: string) => void
  ): Promise<SyncRunResult> {
    if (!isApiSyncConfigured()) {
      return {
        ok: false,
        enviadas: vistoria.fotosEnviadas,
        erro: "API de sincronização não configurada no ambiente.",
      };
    }

    const session = await carregarSessaoSalva();
    if (!session?.accessToken || session.accessToken.startsWith("local-dev-")) {
      return {
        ok: false,
        enviadas: vistoria.fotosEnviadas,
        erro: "Faça login online com usuário corporativo para sincronizar na nuvem.",
      };
    }

    const storageKeys = await sqliteClient.obterStorageKeysSincronizados(vistoria.id);
    const fotosReais = vistoria.fotos.filter((f) => ehUriFotoReal(f.localUri));
    const total = fotosReais.length;

    const pendentes = fotosReais.filter(
      (f) => f.syncStatus !== "synced" && !storageKeys[f.id]
    );
    let enviadas = total - pendentes.length;
    onProgress?.(enviadas, total);

    let cursor = 0;
    let erroCapturado: string | undefined;

    const worker = async () => {
      while (cursor < pendentes.length && !erroCapturado) {
        const idx = cursor;
        cursor += 1;
        const foto = pendentes[idx];

        try {
          const { storageKey, uploadUrl } = await solicitarPresignUpload({
            token: session.accessToken,
            vistoriaId: vistoria.id,
            foto,
          });
          await enviarArquivoParaPresignedUrl(uploadUrl, foto.localUri);
          storageKeys[foto.id] = storageKey;
          await sqliteClient.marcarFotoSincronizada(vistoria.id, foto.id, storageKey);
          enviadas += 1;
          onProgress?.(enviadas, total, foto.id);
        } catch (err) {
          erroCapturado =
            err instanceof Error ? err.message : "Falha de rede durante upload.";
        }
      }
    };

    const workersCount = Math.min(UPLOAD_CONCURRENCY, Math.max(1, pendentes.length));
    if (pendentes.length > 0) {
      await Promise.all(Array.from({ length: workersCount }, () => worker()));
    }

    if (erroCapturado) {
      return {
        ok: false,
        enviadas,
        erro: erroCapturado,
      };
    }

    const payloadSync = serializarVistoriaParaSyncPayload(vistoria, storageKeys);
    const syncRes = await fetch(`${API_BASE_URL}/api/sync/vistorias`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify(payloadSync),
    });

    if (!syncRes.ok) {
      const err = (await syncRes.json().catch(() => null)) as { detail?: string } | null;
      return {
        ok: false,
        enviadas,
        erro: err?.detail ?? `Erro ao registrar vistoria na nuvem (${syncRes.status}).`,
      };
    }

    const syncData = (await syncRes.json().catch(() => null)) as {
      id_fiscalizacao?: string;
    } | null;

    return {
      ok: true,
      enviadas: vistoria.fotos.length,
      idFiscalizacaoFinal: syncData?.id_fiscalizacao,
    };
  }

  async listarVistoriasNuvem(): Promise<{
    readonly ok: boolean;
    readonly vistorias: NuvemVistoriaItem[];
    readonly erro?: string;
  }> {
    if (!isApiSyncConfigured()) {
      return { ok: false, vistorias: [], erro: "API não configurada." };
    }
    const session = await carregarSessaoSalva();
    if (!session?.accessToken || session.accessToken.startsWith("local-dev-")) {
      return {
        ok: false,
        vistorias: [],
        erro: "Faça login online para visualizar as vistorias na nuvem.",
      };
    }

    const res = await fetch(`${API_BASE_URL}/api/sync/vistorias`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { detail?: string } | null;
      return {
        ok: false,
        vistorias: [],
        erro: err?.detail ?? `Erro ao listar nuvem (${res.status}).`,
      };
    }
    const data = (await res.json()) as { vistorias?: NuvemVistoriaItem[] };
    return { ok: true, vistorias: data.vistorias ?? [] };
  }

  async removerVistoriaDaNuvem(
    vistoriaId: string
  ): Promise<{ readonly ok: boolean; readonly erro?: string }> {
    if (!isApiSyncConfigured()) return { ok: true };
    const session = await carregarSessaoSalva();
    if (!session?.accessToken || session.accessToken.startsWith("local-dev-")) {
      return {
        ok: false,
        erro: "Conecte-se com login online para remover esta vistoria da nuvem.",
      };
    }

    const res = await fetch(
      `${API_BASE_URL}/api/sync/vistorias/${encodeURIComponent(vistoriaId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      }
    );
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { detail?: string } | null;
      return {
        ok: false,
        erro: err?.detail ?? `Erro ao remover vistoria da nuvem (${res.status}).`,
      };
    }
    return { ok: true };
  }

  async puxarVistoriaDaNuvem(vistoriaId: string): Promise<{
    readonly ok: boolean;
    readonly vistoria?: VistoriaSessionEntity;
    readonly erro?: string;
  }> {
    if (!isApiSyncConfigured()) {
      return { ok: false, erro: "API não configurada." };
    }
    const session = await carregarSessaoSalva();
    if (!session?.accessToken || session.accessToken.startsWith("local-dev-")) {
      return { ok: false, erro: "Faça login online para puxar vistorias." };
    }

    const res = await fetch(
      `${API_BASE_URL}/api/sync/vistorias/${encodeURIComponent(vistoriaId)}/puxar`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      }
    );
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { detail?: string } | null;
      return { ok: false, erro: err?.detail ?? `Erro ao puxar vistoria (${res.status}).` };
    }

    const data = (await res.json()) as {
      vistoria: NuvemVistoriaItem;
      fotos: Array<{
        id: string;
        nome_arquivo: string;
        ocorrencia_numero?: number | null;
        tamanho_kb: number;
        download_url: string;
      }>;
    };

    const dirPrivado = FileSystem.documentDirectory
      ? `${FileSystem.documentDirectory}arpe_galeria/`
      : null;
    if (dirPrivado) {
      await FileSystem.makeDirectoryAsync(dirPrivado, { intermediates: true });
    }

    const fotosLocais: FotoMidiaEntity[] = [];
    const hora = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    for (const f of data.fotos ?? []) {
      let localUri = `sandbox://vistorias/${vistoriaId}/${f.nome_arquivo}`;
      if (dirPrivado && f.download_url) {
        const dest = `${dirPrivado}${Date.now()}_${f.nome_arquivo.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const dl = await FileSystem.downloadAsync(f.download_url, dest);
        if (dl.status >= 200 && dl.status < 300) {
          localUri = dl.uri;
        }
      }
      fotosLocais.push({
        id: f.id,
        nomeArquivo: f.nome_arquivo,
        localUri,
        tamanhoKb: f.tamanho_kb,
        capturadaEm: hora,
        syncStatus: "pending",
        ocorrenciaNumero: f.ocorrencia_numero ?? undefined,
      });
    }

    const vistoriaLocal = desserializarVistoriaDaNuvem({
      id: data.vistoria.id,
      id_fiscalizacao: data.vistoria.id_fiscalizacao,
      concessao: data.vistoria.concessao,
      modalidade: data.vistoria.modalidade,
      autorId: session.perfil.id,
      autorUsuario: session.perfil.usuario,
      autorNome: session.perfil.nomeCompleto,
      payload_json: data.vistoria.payload_json ?? {},
      fotosLocais,
    });

    await this.removerVistoriaDaNuvem(vistoriaId);
    return { ok: true, vistoria: vistoriaLocal };
  }

  async redirecionarVistoriaNuvem(
    vistoriaId: string,
    novoAutorId: string
  ): Promise<{ readonly ok: boolean; readonly erro?: string }> {
    if (!isApiSyncConfigured()) return { ok: false, erro: "API não configurada." };
    const session = await carregarSessaoSalva();
    if (!session?.accessToken || session.accessToken.startsWith("local-dev-")) {
      return { ok: false, erro: "Faça login online como ADM para redirecionar." };
    }

    const res = await fetch(
      `${API_BASE_URL}/api/sync/vistorias/${encodeURIComponent(vistoriaId)}/atribuir`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ novo_autor_id: novoAutorId }),
      }
    );
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { detail?: string } | null;
      return { ok: false, erro: err?.detail ?? `Erro ao redirecionar (${res.status}).` };
    }
    return { ok: true };
  }
}

export const syncEngine = new CloudSyncEngine();
