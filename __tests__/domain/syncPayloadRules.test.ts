import { VistoriaSessionEntity } from "../../src/domain/entities/types";
import { serializarVistoriaParaSyncPayload } from "../../src/domain/rules/syncPayloadRules";

function criarVistoriaBase(
  overrides: Partial<VistoriaSessionEntity>
): VistoriaSessionEntity {
  return {
    id: "v-base-001",
    tipoRelatorio: "CRA",
    categoriaRelatorio: "Fiscalização",
    lifecycleStatus: "finalizada",
    syncStandby: false,
    fiscalizacao: {
      idFiscalizacao: "FISC-CRA-2026-001",
      data: "26/11/2026",
      hora: "10:15",
      cidade: "Cabo de Santo Agostinho",
      local: "PE-009",
      pessoalResponsavel: "Fiscal ARPE",
      coordenador: "Maria Ângela",
      contrato: "CT-001",
      periodo: "26/11/2026",
    },
    ocorrencias: [],
    fotos: [],
    totalAnteriorMonitoramento: 0,
    syncStatus: "pending",
    fotosEnviadas: 0,
    atualizadaEm: "Finalizado",
    ...overrides,
  };
}

describe("syncPayloadRules — Paridade de Contrato workTree nos 6 Estados (Fase 4)", () => {
  it("Dado uma vistoria (CRA, Fiscalização) com ocorrência e foto relacionada, Quando serializar, Então gera state_key, RegistroNcItem com is_relacionado/grupo_relacao e fotos vinculadas", () => {
    const vistoria = criarVistoriaBase({
      id: "v-cra-001",
      ocorrencias: [
        {
          numero: 1,
          idFiscalizacao: "FISC-CRA-2026-001",
          tipoAchado: "NC",
          identificacao: "Pavimento",
          codificacao: "CRA.ST601.0028-0029/2026.001",
          descricao: "Desgaste na faixa 1",
          pista: "Pista Norte",
          direcaoFaixa: "Faixa 1",
          determinacaoOuInfo: "Recompor pavimento",
          constatacao: "PA",
          analiseArpe: "Cláusula 4.2",
          situacao: "Pendente",
          fotoAtualNome: "FOTO_001.jpg",
          relacionamento: {
            sigla: "PA",
            siglas: ["SN"],
            faixa: "Acostamento",
            fotoRelacionadaNome: "FOTO_002.jpg",
            criadoEm: "10:18",
          },
        },
      ],
      fotos: [
        {
          id: "f-1",
          nomeArquivo: "FOTO_001.jpg",
          localUri: "file:///sandbox/FOTO_001.jpg",
          tamanhoKb: 190,
          capturadaEm: "10:15",
          syncStatus: "synced",
          ocorrenciaNumero: 1,
        },
        {
          id: "f-2",
          nomeArquivo: "FOTO_002.jpg",
          localUri: "file:///sandbox/FOTO_002.jpg",
          tamanhoKb: 205,
          capturadaEm: "10:18",
          syncStatus: "synced",
          ocorrenciaNumero: 1,
        },
      ],
    });

    const payload = serializarVistoriaParaSyncPayload(vistoria, {
      "f-1": "v-cra-001/abc1.jpg",
      "f-2": "v-cra-001/abc2.jpg",
    });

    expect(payload.payload_json.state_key).toBe("CRA_Fiscalização");
    expect(payload.payload_json.registros_nc).toHaveLength(2);
    expect(payload.payload_json.registros_nc[0]).toMatchObject({
      "Nº": 1,
      Pista: "Pista Norte",
      "Direção (faixa)": "Faixa 1",
      Foto: "FOTO_001.jpg",
      is_relacionado: false,
    });
    expect(payload.payload_json.registros_nc[1]).toMatchObject({
      "Nº": 2,
      "Direção (faixa)": "Acostamento",
      Foto: "FOTO_002.jpg",
      is_relacionado: true,
      grupo_relacao: payload.payload_json.registros_nc[0].grupo_relacao,
    });
    expect(payload.fotos).toHaveLength(2);
    expect(payload.fotos[0].storage_key).toBe("v-cra-001/abc1.jpg");
  });

  it("Dado uma vistoria (SOCICAM, Monitoramento) com recomendações, Quando serializar, Então preserva Terminal/Recomendações e garante Pista e Direção vazias", () => {
    const vistoria = criarVistoriaBase({
      id: "v-soc-002",
      tipoRelatorio: "SOCICAM",
      categoriaRelatorio: "Monitoramento",
      fiscalizacao: {
        idFiscalizacao: "MON-SOC-2026-002",
        data: "26/11/2026",
        hora: "14:00",
        cidade: "Caruaru",
        local: "Terminal Rodoviário de Caruaru",
        pessoalResponsavel: "Fiscal ARPE",
        coordenador: "Maria Ângela",
        contrato: "CT. Nº 1.041.080/08",
        periodo: "26/11/2026",
        recomendacoesSocicam: "Substituir luminárias do setor de embarque.",
      },
      ocorrencias: [
        {
          numero: 1,
          idFiscalizacao: "MON-SOC-2026-002",
          tipoAchado: "NC",
          identificacao: "Sanitários",
          descricao: "Torneira vazando",
          terminal: "Terminal Rodoviário de Caruaru",
          pista: "Pista Norte",
          direcaoFaixa: "Faixa 1",
          determinacaoOuInfo: "Informação SOCICAM: em manutenção",
          constatacao: "SANITÁRIOS",
          analiseArpe: "Pendência parcial",
          situacao: "Parcialmente Sanada",
          fotoAtualNome: "FOTO_001.jpg",
        },
      ],
    });

    const payload = serializarVistoriaParaSyncPayload(vistoria, {});

    expect(payload.payload_json.state_key).toBe("SOCICAM_Monitoramento");
    expect(payload.payload_json.fiscalizacao["Recomendações à SOCICAM"]).toBe(
      "Substituir luminárias do setor de embarque."
    );
    expect(payload.payload_json.registros_nc[0].Pista).toBe("");
    expect(payload.payload_json.registros_nc[0]["Direção (faixa)"]).toBe("");
    expect(payload.payload_json.registros_nc[0].Terminal).toBe(
      "Terminal Rodoviário de Caruaru"
    );
  });
});
