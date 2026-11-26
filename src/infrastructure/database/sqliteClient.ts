import type * as SQLiteTypes from "expo-sqlite";
import {
  CategoriaRelatorio,
  FiscalizacaoEntity,
  FotoMidiaEntity,
  GaleriaFotoEntity,
  OcorrenciaEntity,
  SessionLifecycleStatus,
  SyncStatus,
  TipoRelatorio,
  VistoriaSessionEntity,
} from "../../domain/entities/types";

export type SqlBindValue = string | number | null;

export interface ISqliteDriver {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: readonly SqlBindValue[]): Promise<void>;
  getAllAsync<T>(sql: string, params?: readonly SqlBindValue[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

interface VistoriaRow {
  readonly id: string;
  readonly tipo_relatorio: TipoRelatorio;
  readonly categoria_relatorio: CategoriaRelatorio;
  readonly lifecycle_status: SessionLifecycleStatus;
  readonly sync_standby: number;
  readonly fiscalizacao_json: string;
  readonly total_anterior_mon: number;
  readonly sync_status: SyncStatus;
  readonly fotos_enviadas: number;
  readonly atualizada_em: string;
  readonly ordem_idx: number;
}

interface OcorrenciaRow {
  readonly vistoria_id: string;
  readonly numero: number;
  readonly dados_json: string;
}

interface FotoVistoriaRow {
  readonly id: string;
  readonly vistoria_id: string;
  readonly nome_arquivo: string;
  readonly local_uri: string;
  readonly tamanho_kb: number;
  readonly capturada_em: string;
  readonly sync_status: SyncStatus;
  readonly ocorrencia_numero: number | null;
  readonly ordem_idx: number;
}

interface GaleriaFotoRow {
  readonly id: string;
  readonly vistoria_id: string | null;
  readonly id_fiscalizacao: string | null;
  readonly tipo_relatorio: TipoRelatorio;
  readonly categoria_relatorio: CategoriaRelatorio;
  readonly local_texto: string;
  readonly nome_arquivo: string;
  readonly local_uri: string;
  readonly tamanho_kb: number;
  readonly capturada_em: string;
  readonly ocorrencia_numero: number | null;
  readonly ordem_idx: number;
}

export interface LocalDatabaseSnapshot {
  readonly vistorias: VistoriaSessionEntity[];
  readonly galeriaFotos: GaleriaFotoEntity[];
}

const DB_NAME = "arpe_fiscalizacao_v1.db";
export const PREF_SALVAR_GALERIA_CELULAR = "salvar_galeria_celular";

interface AppPreferenceRow {
  readonly chave: string;
  readonly valor: string;
}

interface SyncQueueFotoRow {
  readonly foto_id: string | null;
  readonly storage_key: string | null;
  readonly status: string;
}

const SCHEMA_DDL = `
CREATE TABLE IF NOT EXISTS vistorias (
  id TEXT PRIMARY KEY NOT NULL,
  tipo_relatorio TEXT NOT NULL,
  categoria_relatorio TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL,
  sync_standby INTEGER NOT NULL DEFAULT 0,
  fiscalizacao_json TEXT NOT NULL,
  total_anterior_mon INTEGER NOT NULL DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  fotos_enviadas INTEGER NOT NULL DEFAULT 0,
  atualizada_em TEXT NOT NULL,
  ordem_idx INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ocorrencias (
  vistoria_id TEXT NOT NULL,
  numero INTEGER NOT NULL,
  dados_json TEXT NOT NULL,
  PRIMARY KEY (vistoria_id, numero),
  FOREIGN KEY (vistoria_id) REFERENCES vistorias(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fotos_vistoria (
  id TEXT PRIMARY KEY NOT NULL,
  vistoria_id TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  local_uri TEXT NOT NULL,
  tamanho_kb INTEGER NOT NULL,
  capturada_em TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  ocorrencia_numero INTEGER,
  ordem_idx INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (vistoria_id) REFERENCES vistorias(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS galeria_fotos (
  id TEXT PRIMARY KEY NOT NULL,
  vistoria_id TEXT,
  id_fiscalizacao TEXT,
  tipo_relatorio TEXT NOT NULL,
  categoria_relatorio TEXT NOT NULL,
  local_texto TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  local_uri TEXT NOT NULL,
  tamanho_kb INTEGER NOT NULL,
  capturada_em TEXT NOT NULL,
  ocorrencia_numero INTEGER,
  ordem_idx INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  vistoria_id TEXT NOT NULL,
  foto_id TEXT,
  tipo_item TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  tentativas INTEGER NOT NULL DEFAULT 0,
  storage_key TEXT,
  atualizado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_preferences (
  chave TEXT PRIMARY KEY NOT NULL,
  valor TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ocorrencias_vistoria ON ocorrencias(vistoria_id);
CREATE INDEX IF NOT EXISTS idx_fotos_vistoria_id ON fotos_vistoria(vistoria_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(vistoria_id, status);
`;

class ExpoSqliteDriver implements ISqliteDriver {
  constructor(private readonly db: SQLiteTypes.SQLiteDatabase) {}

  async execAsync(sql: string): Promise<void> {
    await this.db.execAsync(sql);
  }

  async runAsync(sql: string, params: readonly SqlBindValue[]): Promise<void> {
    await this.db.runAsync(sql, [...params]);
  }

  async getAllAsync<T>(
    sql: string,
    params: readonly SqlBindValue[] = []
  ): Promise<T[]> {
    return this.db.getAllAsync<T>(sql, [...params]);
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    await this.db.withTransactionAsync(task);
  }
}

export class LocalSqliteRepository {
  private initPromise: Promise<ISqliteDriver | null> | null = null;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(private readonly driverProvider: () => Promise<ISqliteDriver | null>) {}

  private async ensureDriver(): Promise<ISqliteDriver | null> {
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const driver = await this.driverProvider();
        if (!driver) return null;
        await driver.execAsync(SCHEMA_DDL);
        return driver;
      })().catch((err) => {
        this.initPromise = null;
        throw err;
      });
    }
    return this.initPromise;
  }

  private enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
    const next = this.writeQueue.then(task, task);
    this.writeQueue = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }

  async carregarSnapshot(): Promise<LocalDatabaseSnapshot | null> {
    const driver = await this.ensureDriver();
    if (!driver) return null;

    const vistoriaRows = await driver.getAllAsync<VistoriaRow>(
      "SELECT * FROM vistorias ORDER BY ordem_idx ASC"
    );
    const ocorrenciaRows = await driver.getAllAsync<OcorrenciaRow>(
      "SELECT vistoria_id, numero, dados_json FROM ocorrencias ORDER BY vistoria_id ASC, numero ASC"
    );
    const fotoRows = await driver.getAllAsync<FotoVistoriaRow>(
      "SELECT * FROM fotos_vistoria ORDER BY vistoria_id ASC, ordem_idx ASC"
    );
    const galeriaRows = await driver.getAllAsync<GaleriaFotoRow>(
      "SELECT * FROM galeria_fotos ORDER BY ordem_idx ASC"
    );

    const ocorrenciasPorVistoria = new Map<string, OcorrenciaEntity[]>();
    for (const row of ocorrenciaRows) {
      const parsed = JSON.parse(row.dados_json) as OcorrenciaEntity;
      const lista = ocorrenciasPorVistoria.get(row.vistoria_id) ?? [];
      lista.push(parsed);
      ocorrenciasPorVistoria.set(row.vistoria_id, lista);
    }

    const fotosPorVistoria = new Map<string, FotoMidiaEntity[]>();
    for (const row of fotoRows) {
      const item: FotoMidiaEntity = {
        id: row.id,
        nomeArquivo: row.nome_arquivo,
        localUri: row.local_uri,
        tamanhoKb: row.tamanho_kb,
        capturadaEm: row.capturada_em,
        syncStatus: row.sync_status,
        ocorrenciaNumero: row.ocorrencia_numero ?? undefined,
      };
      const lista = fotosPorVistoria.get(row.vistoria_id) ?? [];
      lista.push(item);
      fotosPorVistoria.set(row.vistoria_id, lista);
    }

    const vistorias: VistoriaSessionEntity[] = vistoriaRows.map((row) => ({
      id: row.id,
      tipoRelatorio: row.tipo_relatorio,
      categoriaRelatorio: row.categoria_relatorio,
      lifecycleStatus: row.lifecycle_status,
      syncStandby: row.sync_standby === 1,
      fiscalizacao: JSON.parse(row.fiscalizacao_json) as FiscalizacaoEntity,
      ocorrencias: ocorrenciasPorVistoria.get(row.id) ?? [],
      fotos: fotosPorVistoria.get(row.id) ?? [],
      totalAnteriorMonitoramento: row.total_anterior_mon,
      syncStatus: row.sync_status,
      fotosEnviadas: row.fotos_enviadas,
      atualizadaEm: row.atualizada_em,
    }));

    const galeriaFotos: GaleriaFotoEntity[] = galeriaRows.map((row) => ({
      id: row.id,
      vistoriaId: row.vistoria_id,
      idFiscalizacao: row.id_fiscalizacao,
      tipoRelatorio: row.tipo_relatorio,
      categoriaRelatorio: row.categoria_relatorio,
      local: row.local_texto,
      nomeArquivo: row.nome_arquivo,
      localUri: row.local_uri,
      tamanhoKb: row.tamanho_kb,
      capturadaEm: row.capturada_em,
      ocorrenciaNumero: row.ocorrencia_numero ?? undefined,
    }));

    return { vistorias, galeriaFotos };
  }

  /**
   * Grava atomicamente o snapshot completo usando exclusivamente queries parametrizadas (?).
   */
  async salvarSnapshot(snapshot: LocalDatabaseSnapshot): Promise<boolean> {
    return this.enqueueWrite(async () => {
      const driver = await this.ensureDriver();
      if (!driver) return false;

      const agoraIso = new Date().toISOString();

      await driver.withTransactionAsync(async () => {
        await driver.runAsync("DELETE FROM fotos_vistoria", []);
        await driver.runAsync("DELETE FROM ocorrencias", []);
        await driver.runAsync("DELETE FROM vistorias", []);
        await driver.runAsync("DELETE FROM galeria_fotos", []);

        for (let i = 0; i < snapshot.vistorias.length; i += 1) {
          const v = snapshot.vistorias[i];
          await driver.runAsync(
            `INSERT INTO vistorias (
              id, tipo_relatorio, categoria_relatorio, lifecycle_status,
              sync_standby, fiscalizacao_json, total_anterior_mon,
              sync_status, fotos_enviadas, atualizada_em, ordem_idx
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              v.id,
              v.tipoRelatorio,
              v.categoriaRelatorio,
              v.lifecycleStatus,
              v.syncStandby ? 1 : 0,
              JSON.stringify(v.fiscalizacao),
              v.totalAnteriorMonitoramento,
              v.syncStatus,
              v.fotosEnviadas,
              v.atualizadaEm,
              i,
            ]
          );

          for (const oc of v.ocorrencias) {
            await driver.runAsync(
              "INSERT INTO ocorrencias (vistoria_id, numero, dados_json) VALUES (?, ?, ?)",
              [v.id, oc.numero, JSON.stringify(oc)]
            );
          }

          for (let fIdx = 0; fIdx < v.fotos.length; fIdx += 1) {
            const f = v.fotos[fIdx];
            await driver.runAsync(
              `INSERT INTO fotos_vistoria (
                id, vistoria_id, nome_arquivo, local_uri, tamanho_kb,
                capturada_em, sync_status, ocorrencia_numero, ordem_idx
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                f.id,
                v.id,
                f.nomeArquivo,
                f.localUri,
                f.tamanhoKb,
                f.capturadaEm,
                f.syncStatus,
                f.ocorrenciaNumero ?? null,
                fIdx,
              ]
            );

            if (v.lifecycleStatus === "finalizada" && f.syncStatus !== "synced") {
              await driver.runAsync(
                `INSERT OR IGNORE INTO sync_queue (
                  id, vistoria_id, foto_id, tipo_item, status, tentativas, storage_key, atualizado_em
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  `sq-foto-${f.id}`,
                  v.id,
                  f.id,
                  "foto",
                  f.syncStatus,
                  0,
                  null,
                  agoraIso,
                ]
              );
            }
          }

          if (v.lifecycleStatus === "finalizada" && v.syncStatus !== "synced") {
            await driver.runAsync(
              `INSERT OR IGNORE INTO sync_queue (
                id, vistoria_id, foto_id, tipo_item, status, tentativas, storage_key, atualizado_em
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                `sq-vist-${v.id}`,
                v.id,
                null,
                "vistoria_json",
                v.syncStatus,
                0,
                null,
                agoraIso,
              ]
            );
          }
        }

        for (let gIdx = 0; gIdx < snapshot.galeriaFotos.length; gIdx += 1) {
          const g = snapshot.galeriaFotos[gIdx];
          await driver.runAsync(
            `INSERT INTO galeria_fotos (
              id, vistoria_id, id_fiscalizacao, tipo_relatorio, categoria_relatorio,
              local_texto, nome_arquivo, local_uri, tamanho_kb, capturada_em,
              ocorrencia_numero, ordem_idx
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              g.id,
              g.vistoriaId,
              g.idFiscalizacao,
              g.tipoRelatorio,
              g.categoriaRelatorio,
              g.local,
              g.nomeArquivo,
              g.localUri,
              g.tamanhoKb,
              g.capturadaEm,
              g.ocorrenciaNumero ?? null,
              gIdx,
            ]
          );
        }
      });

      return true;
    });
  }

  async carregarPreferenciaBooleana(
    chave: string,
    padrao: boolean
  ): Promise<boolean> {
    const driver = await this.ensureDriver();
    if (!driver) return padrao;

    const rows = await driver.getAllAsync<AppPreferenceRow>(
      "SELECT chave, valor FROM app_preferences WHERE chave = ? LIMIT 1",
      [chave]
    );
    if (rows.length === 0) return padrao;
    return rows[0].valor === "1";
  }

  async salvarPreferenciaBooleana(
    chave: string,
    valor: boolean
  ): Promise<boolean> {
    const driver = await this.ensureDriver();
    if (!driver) return false;

    await driver.runAsync(
      "INSERT OR REPLACE INTO app_preferences (chave, valor) VALUES (?, ?)",
      [chave, valor ? "1" : "0"]
    );
    return true;
  }

  async obterStorageKeysSincronizados(
    vistoriaId: string
  ): Promise<Record<string, string>> {
    const driver = await this.ensureDriver();
    if (!driver) return {};

    const rows = await driver.getAllAsync<SyncQueueFotoRow>(
      "SELECT foto_id, storage_key, status FROM sync_queue WHERE vistoria_id = ? AND tipo_item = ? AND status = ?",
      [vistoriaId, "foto", "synced"]
    );
    const mapa: Record<string, string> = {};
    for (const row of rows) {
      if (row.foto_id && row.storage_key) {
        mapa[row.foto_id] = row.storage_key;
      }
    }
    return mapa;
  }

  async marcarFotoSincronizada(
    vistoriaId: string,
    fotoId: string,
    storageKey: string
  ): Promise<void> {
    return this.enqueueWrite(async () => {
      const driver = await this.ensureDriver();
      if (!driver) return;

      const agoraIso = new Date().toISOString();
      await driver.withTransactionAsync(async () => {
        await driver.runAsync(
          `INSERT OR REPLACE INTO sync_queue (
            id, vistoria_id, foto_id, tipo_item, status, tentativas, storage_key, atualizado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `sq-foto-${fotoId}`,
            vistoriaId,
            fotoId,
            "foto",
            "synced",
            0,
            storageKey,
            agoraIso,
          ]
        );
        await driver.runAsync(
          "UPDATE fotos_vistoria SET sync_status = ? WHERE id = ? AND vistoria_id = ?",
          ["synced", fotoId, vistoriaId]
        );
      });
    });
  }

  async limparSyncQueueVistoria(vistoriaId: string): Promise<void> {
    return this.enqueueWrite(async () => {
      const driver = await this.ensureDriver();
      if (!driver) return;

      await driver.withTransactionAsync(async () => {
        await driver.runAsync(
          "DELETE FROM sync_queue WHERE vistoria_id = ?",
          [vistoriaId]
        );
        await driver.runAsync(
          "UPDATE fotos_vistoria SET sync_status = ? WHERE vistoria_id = ?",
          ["pending", vistoriaId]
        );
      });
    });
  }
}

let cachedNativeDriverPromise: Promise<ISqliteDriver | null> | null = null;

export function isNativeSqliteSupported(): boolean {
  if (
    typeof process !== "undefined" &&
    typeof process.env?.JEST_WORKER_ID === "string"
  ) {
    return false;
  }
  if (typeof document !== "undefined") {
    return false;
  }
  return true;
}

async function getNativeSqliteDriver(): Promise<ISqliteDriver | null> {
  if (!isNativeSqliteSupported()) return null;
  if (!cachedNativeDriverPromise) {
    const SQLite = require("expo-sqlite") as typeof SQLiteTypes;
    cachedNativeDriverPromise = SQLite.openDatabaseAsync(DB_NAME)
      .then((db) => new ExpoSqliteDriver(db))
      .catch(() => {
        cachedNativeDriverPromise = null;
        return null;
      });
  }
  return cachedNativeDriverPromise;
}

export const sqliteClient = new LocalSqliteRepository(getNativeSqliteDriver);
