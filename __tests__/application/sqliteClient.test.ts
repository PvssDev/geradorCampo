import {
  ISqliteDriver,
  LocalSqliteRepository,
  SqlBindValue,
} from "../../src/infrastructure/database/sqliteClient";
import { VistoriaSessionEntity, GaleriaFotoEntity } from "../../src/domain/entities/types";

class FakeParameterizedSqliteDriver implements ISqliteDriver {
  public readonly executedSqls: { sql: string; params: readonly SqlBindValue[] }[] = [];
  private vistorias: Record<string, SqlBindValue>[] = [];
  private ocorrencias: Record<string, SqlBindValue>[] = [];
  private fotos: Record<string, SqlBindValue>[] = [];
  private galeria: Record<string, SqlBindValue>[] = [];
  private syncQueue: Record<string, SqlBindValue>[] = [];
  private preferences: Record<string, SqlBindValue>[] = [];

  async execAsync(sql: string): Promise<void> {
    this.executedSqls.push({ sql, params: [] });
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    await task();
  }

  async runAsync(sql: string, params: readonly SqlBindValue[]): Promise<void> {
    this.executedSqls.push({ sql, params });
    const trimmed = sql.trim();

    if (trimmed === "DELETE FROM fotos_vistoria") {
      this.fotos = [];
      return;
    }
    if (trimmed === "DELETE FROM ocorrencias") {
      this.ocorrencias = [];
      return;
    }
    if (trimmed === "DELETE FROM vistorias") {
      this.vistorias = [];
      return;
    }
    if (trimmed === "DELETE FROM galeria_fotos") {
      this.galeria = [];
      return;
    }
    if (trimmed.startsWith("INSERT INTO vistorias")) {
      this.vistorias.push({
        id: params[0],
        tipo_relatorio: params[1],
        categoria_relatorio: params[2],
        lifecycle_status: params[3],
        sync_standby: params[4],
        fiscalizacao_json: params[5],
        total_anterior_mon: params[6],
        sync_status: params[7],
        fotos_enviadas: params[8],
        atualizada_em: params[9],
        ordem_idx: params[10],
      });
      return;
    }
    if (trimmed.startsWith("INSERT INTO ocorrencias")) {
      this.ocorrencias.push({
        vistoria_id: params[0],
        numero: params[1],
        dados_json: params[2],
      });
      return;
    }
    if (trimmed.startsWith("INSERT INTO fotos_vistoria")) {
      this.fotos.push({
        id: params[0],
        vistoria_id: params[1],
        nome_arquivo: params[2],
        local_uri: params[3],
        tamanho_kb: params[4],
        capturada_em: params[5],
        sync_status: params[6],
        ocorrencia_numero: params[7],
        ordem_idx: params[8],
      });
      return;
    }
    if (trimmed.startsWith("INSERT INTO galeria_fotos")) {
      this.galeria.push({
        id: params[0],
        vistoria_id: params[1],
        id_fiscalizacao: params[2],
        tipo_relatorio: params[3],
        categoria_relatorio: params[4],
        local_texto: params[5],
        nome_arquivo: params[6],
        local_uri: params[7],
        tamanho_kb: params[8],
        capturada_em: params[9],
        ocorrencia_numero: params[10],
        ordem_idx: params[11],
      });
      return;
    }
    if (trimmed.startsWith("INSERT OR IGNORE INTO sync_queue")) {
      const exists = this.syncQueue.some((item) => item.id === params[0]);
      if (!exists) {
        this.syncQueue.push({
          id: params[0],
          vistoria_id: params[1],
          foto_id: params[2],
          tipo_item: params[3],
          status: params[4],
        });
      }
      return;
    }
    if (trimmed.startsWith("INSERT OR REPLACE INTO app_preferences")) {
      this.preferences = this.preferences.filter((p) => p.chave !== params[0]);
      this.preferences.push({
        chave: params[0],
        valor: params[1],
      });
    }
  }

  async getAllAsync<T>(sql: string, params: readonly SqlBindValue[] = []): Promise<T[]> {
    if (sql.includes("FROM vistorias")) return this.vistorias as unknown as T[];
    if (sql.includes("FROM ocorrencias")) return this.ocorrencias as unknown as T[];
    if (sql.includes("FROM fotos_vistoria")) return this.fotos as unknown as T[];
    if (sql.includes("FROM galeria_fotos")) return this.galeria as unknown as T[];
    if (sql.includes("FROM app_preferences")) {
      return this.preferences.filter((p) => p.chave === params[0]) as unknown as T[];
    }
    return [];
  }

  getSyncQueueCount(): number {
    return this.syncQueue.length;
  }
}

describe("LocalSqliteRepository — Persistência Offline e Segurança SQL (Fase 3)", () => {
  it("Dado uma vistoria finalizada com foto e tentativa de payload malicioso, Quando salvar e recarregar após reinício, Então usa 100% queries parametrizadas (?) e restaura os dados intactos", async () => {
    const fakeDriver = new FakeParameterizedSqliteDriver();
    const repo = new LocalSqliteRepository(async () => fakeDriver);

    const textoComAspasSql = " Asfalto cedendo'; DROP TABLE vistorias; -- ";
    const vistoria: VistoriaSessionEntity = {
      id: "v-cra-001",
      tipoRelatorio: "CRA",
      categoriaRelatorio: "Fiscalização",
      lifecycleStatus: "finalizada",
      syncStandby: false,
      fiscalizacao: {
        idFiscalizacao: "FISC-CRA-2026-001",
        data: "19/08/2026",
        hora: "10:04",
        cidade: "Cabo de Santo Agostinho",
        local: "PE-009 KM 28",
        pessoalResponsavel: "Fiscal Teste",
        coordenador: "Coord Teste",
        contrato: "CT-001",
        periodo: "19/08/2026",
      },
      ocorrencias: [
        {
          numero: 1,
          idFiscalizacao: "FISC-CRA-2026-001",
          tipoAchado: "NC",
          identificacao: "Pavimento",
          codificacao: "CRA.ST601.0028-0029/2026.001",
          descricao: textoComAspasSql,
          pista: "Pista Norte",
          direcaoFaixa: "Faixa 1",
          determinacaoOuInfo: "Recompor camada asfáltica",
          constatacao: "PA",
          analiseArpe: "Item contratual",
          situacao: "Pendente",
          fotoAtualNome: "FOTO_001.jpg",
        },
      ],
      fotos: [
        {
          id: "foto-001",
          nomeArquivo: "FOTO_001.jpg",
          localUri: "file:///data/user/0/br.gov.pe.arpe/files/arpe_galeria/FOTO_001.jpg",
          tamanhoKb: 198,
          capturadaEm: "10:04",
          syncStatus: "pending",
          ocorrenciaNumero: 1,
        },
      ],
      totalAnteriorMonitoramento: 0,
      syncStatus: "pending",
      fotosEnviadas: 0,
      atualizadaEm: "Finalizado · 10:05",
    };

    const galeria: GaleriaFotoEntity[] = [
      {
        id: "gal-foto-001",
        vistoriaId: "v-cra-001",
        idFiscalizacao: "FISC-CRA-2026-001",
        tipoRelatorio: "CRA",
        categoriaRelatorio: "Fiscalização",
        local: "Cabo de Santo Agostinho",
        nomeArquivo: "FOTO_001.jpg",
        localUri: "file:///data/user/0/br.gov.pe.arpe/files/arpe_galeria/FOTO_001.jpg",
        tamanhoKb: 198,
        capturadaEm: "10:04",
        ocorrenciaNumero: 1,
      },
    ];

    const ok = await repo.salvarSnapshot({ vistorias: [vistoria], galeriaFotos: galeria });
    expect(ok).toBe(true);

    // Verifica que NENHUM comando INSERT interpolou texto diretamente no SQL
    const inserts = fakeDriver.executedSqls.filter((q) => q.sql.includes("INSERT"));
    expect(inserts.length).toBeGreaterThanOrEqual(4);
    for (const query of inserts) {
      expect(query.sql).toContain("?");
      expect(query.sql).not.toContain("DROP TABLE");
      expect(query.sql).not.toContain("FISC-CRA-2026-001");
    }

    // Verifica enfileiramento automático na sync_queue (1 foto + 1 vistoria_json)
    expect(fakeDriver.getSyncQueueCount()).toBe(2);

    const restaurado = await repo.carregarSnapshot();
    expect(restaurado).not.toBeNull();
    expect(restaurado?.vistorias).toHaveLength(1);
    expect(restaurado?.vistorias[0].ocorrencias[0].descricao).toBe(textoComAspasSql);
    expect(restaurado?.galeriaFotos[0].tamanhoKb).toBe(198);
  });

  it("Dado preferência salvar_galeria_celular sem registro prévio, Quando consultar e depois alterar para false, Então retorna true por padrão e persiste false após reinício", async () => {
    const fakeDriver = new FakeParameterizedSqliteDriver();
    const repo = new LocalSqliteRepository(async () => fakeDriver);

    const inicial = await repo.carregarPreferenciaBooleana("salvar_galeria_celular", true);
    expect(inicial).toBe(true);

    await repo.salvarPreferenciaBooleana("salvar_galeria_celular", false);
    const aposDesativar = await repo.carregarPreferenciaBooleana("salvar_galeria_celular", true);
    expect(aposDesativar).toBe(false);

    await repo.salvarPreferenciaBooleana("salvar_galeria_celular", true);
    const aposReativar = await repo.carregarPreferenciaBooleana("salvar_galeria_celular", true);
    expect(aposReativar).toBe(true);
  });
});
