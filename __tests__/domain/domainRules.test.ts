import { CONCESSION_CONFIG } from "../../src/domain/config/concessionConfig";
import {
  calcularCodificacaoCra,
  calcularEstatisticasMonitoramento,
} from "../../src/domain/rules/domainRules";
import { OcorrenciaEntity } from "../../src/domain/entities/types";

describe("Domínio Mobile ARPE — Regras Puras dos 6 Estados (BDD)", () => {
  it("Dado CRA Fiscalização, Quando calcular codificação, Então retorna padrão CRA.ST{st}.{ini}-{fim}/{ano}.{seq:03d}", () => {
    const code = calcularCodificacaoCra({
      subtrecho: "601",
      estacaIni: "2794",
      estacaFim: "2834",
      ano: 2026,
      sequencial: 1,
    });
    expect(code).toBe("CRA.ST601.2794-2834/2026.001");
  });

  it("Dado SOCICAM, Quando consultar configuração da concessão, Então NÃO exibe pista/faixa e possui setores prediais", () => {
    expect(CONCESSION_CONFIG.SOCICAM.exibePistaFaixa).toBe(false);
    expect(CONCESSION_CONFIG.SOCICAM.setoresPrediais.length).toBeGreaterThan(0);
    expect(CONCESSION_CONFIG.CRA.exibePistaFaixa).toBe(true);
    expect(CONCESSION_CONFIG.CRC.exibePistaFaixa).toBe(true);
  });

  it("Dado SOCICAM Monitoramento com 3 NCs (1 Sanada, 1 Parcial, 1 Pendente) de 4 anteriores, Então calcula estatísticas corretamente", () => {
    const mockOcorrencias: OcorrenciaEntity[] = [
      {
        numero: 1,
        idFiscalizacao: "MON-SOCICAM-2026-002",
        tipoAchado: "NC",
        identificacao: "NC_01_CAR",
        descricao: "Piso tátil",
        determinacaoOuInfo: "",
        constatacao: "",
        analiseArpe: "",
        situacao: "Sanada",
      },
      {
        numero: 2,
        idFiscalizacao: "MON-SOCICAM-2026-002",
        tipoAchado: "NC",
        identificacao: "NC_02_CAR",
        descricao: "Sanitário",
        determinacaoOuInfo: "",
        constatacao: "",
        analiseArpe: "",
        situacao: "Parcialmente Sanada",
      },
      {
        numero: 3,
        idFiscalizacao: "MON-SOCICAM-2026-002",
        tipoAchado: "NC",
        identificacao: "NC_03_CAR",
        descricao: "Iluminação",
        determinacaoOuInfo: "",
        constatacao: "",
        analiseArpe: "",
        situacao: "Pendente",
      },
    ];

    const stats = calcularEstatisticasMonitoramento(mockOcorrencias, 4);
    expect(stats.totalAnterior).toBe(4);
    expect(stats.registradas).toBe(3);
    expect(stats.sanadas).toBe(1);
    expect(stats.parcialmenteSanadas).toBe(1);
    expect(stats.pendentes).toBe(1);
    expect(stats.totalPendentesConclusao).toBe(2);
    expect(stats.pctSanadas).toBe(25);
    expect(stats.pctCobertura).toBe(75);
  });
});

