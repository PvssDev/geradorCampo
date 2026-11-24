import {
  CONCESSION_CONFIG,
  COORDENADORES_OFICIAIS,
  MAP_SIGLAS_OFICIAL,
  RESPONSAVEIS_OFICIAIS,
} from "../../src/domain/config/concessionConfig";
import {
  aplicarToquePeriodo,
  calcularCodificacaoCra,
  calcularEstatisticasMonitoramento,
  construirRelacionamentoValidado,
  formatarPeriodoIsoParaBr,
  obterSiglasPorConcessao,
  podeAutoSincronizar,
  podeRelacionarOcorrencia,
  sugerirCodificacaoPorConcessao,
} from "../../src/domain/rules/domainRules";
import {
  OcorrenciaEntity,
  VistoriaSessionEntity,
} from "../../src/domain/entities/types";

describe("Domínio Mobile — Regras Puras dos 6 Estados e Fluxo Limpo (BDD)", () => {
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

  it("Dado uma ocorrência em rodovia (CRA), Quando relacionar pela 1ª vez com Faixa e Sigla, Então permite e bloqueia uma 2ª relação", () => {
    const ocorrenciaInicial: OcorrenciaEntity = {
      numero: 1,
      idFiscalizacao: "FISC-CRA-2026-001",
      tipoAchado: "NC",
      identificacao: "CRA.ST601.0010-0020/2026.001",
      descricao: "Trinca longitudinal",
      determinacaoOuInfo: "",
      constatacao: "",
      analiseArpe: "",
      situacao: "Pendente",
    };

    expect(podeRelacionarOcorrencia(ocorrenciaInicial)).toBe(true);

    const primeiraRelacao = construirRelacionamentoValidado({
      tipoRelatorio: "CRA",
      ocorrenciaAlvo: ocorrenciaInicial,
      sigla: "PA",
      faixa: "Faixa 1",
      codificacao: "CRA.ST601.0010-0020/2026.001",
      criadoEm: "10:15",
    });

    expect(primeiraRelacao.ok).toBe(true);
    if (!primeiraRelacao.ok) return;

    expect(primeiraRelacao.value.faixa).toBe("Faixa 1");
    expect(primeiraRelacao.value.sigla).toBe("PA");
    expect(primeiraRelacao.value.setorPredial).toBeUndefined();

    const ocorrenciaJaRelacionada: OcorrenciaEntity = {
      ...ocorrenciaInicial,
      relacionamento: primeiraRelacao.value,
    };

    expect(podeRelacionarOcorrencia(ocorrenciaJaRelacionada)).toBe(false);

    const segundaTentativa = construirRelacionamentoValidado({
      tipoRelatorio: "CRA",
      ocorrenciaAlvo: ocorrenciaJaRelacionada,
      sigla: "NC",
      faixa: "Faixa 2",
      criadoEm: "10:16",
    });

    expect(segundaTentativa.ok).toBe(false);
  });

  it("Dado uma ocorrência SOCICAM, Quando relacionar, Então exige setor predial e NUNCA grava faixa rodoviária", () => {
    const ocSocicam: OcorrenciaEntity = {
      numero: 1,
      idFiscalizacao: "FISC-SOCICAM-2026-001",
      tipoAchado: "NC",
      identificacao: "NC_01",
      descricao: "Piso tátil",
      determinacaoOuInfo: "",
      constatacao: "",
      analiseArpe: "",
      situacao: "Pendente",
    };

    const semSetor = construirRelacionamentoValidado({
      tipoRelatorio: "SOCICAM",
      ocorrenciaAlvo: ocSocicam,
      sigla: "NC",
      faixa: "Faixa 1",
      criadoEm: "10:20",
    });
    expect(semSetor.ok).toBe(false);

    const comSetor = construirRelacionamentoValidado({
      tipoRelatorio: "SOCICAM",
      ocorrenciaAlvo: ocSocicam,
      sigla: "NC",
      faixa: "Faixa 1",
      setorPredial: "Plataformas de Embarque",
      criadoEm: "10:21",
    });
    expect(comSetor.ok).toBe(true);
    if (comSetor.ok) {
      expect(comSetor.value.faixa).toBeUndefined();
      expect(comSetor.value.setorPredial).toBe("Plataformas de Embarque");
    }
  });

  it("Dado sessões finalizadas e em standby, Quando checar auto-sync, Então só permite online + finalizada + sem standby + não sincronizada", () => {
    const baseSession: VistoriaSessionEntity = {
      id: "v-1",
      tipoRelatorio: "CRA",
      categoriaRelatorio: "Fiscalização",
      lifecycleStatus: "finalizada",
      syncStandby: false,
      fiscalizacao: {
        idFiscalizacao: "FISC-CRA-01",
        data: "24/11/2026",
        hora: "10:00",
        cidade: "Ipojuca",
        local: "PE-009",
        pessoalResponsavel: "Equipe",
        coordenador: "Coord",
        contrato: "CT",
        periodo: "24/11/2026",
      },
      ocorrencias: [],
      fotos: [],
      totalAnteriorMonitoramento: 0,
      syncStatus: "pending",
      fotosEnviadas: 0,
      atualizadaEm: "Agora",
    };

    expect(podeAutoSincronizar(baseSession, "online")).toBe(true);
    expect(podeAutoSincronizar(baseSession, "offline_manual")).toBe(false);
    expect(podeAutoSincronizar(baseSession, "disconnected")).toBe(false);
    expect(
      podeAutoSincronizar({ ...baseSession, syncStandby: true }, "online")
    ).toBe(false);
    expect(
      podeAutoSincronizar({ ...baseSession, lifecycleStatus: "em_aberto" }, "online")
    ).toBe(false);
  });

  it("Dado paridade com a aplicação Web no Passo 2, Quando consultar CONCESSION_CONFIG, Então CRA tem Hora e municípios corretos, CRC e SOCICAM não têm Hora", () => {
    expect(CONCESSION_CONFIG.CRA.exibeHora).toBe(true);
    expect(CONCESSION_CONFIG.CRA.localPadrao).toBe("Rota do Atlântico");
    expect(CONCESSION_CONFIG.CRA.cidadesDisponiveis).toEqual([
      "Cabo de Santo Agostinho",
      "Ipojuca",
    ]);

    expect(CONCESSION_CONFIG.CRC.exibeHora).toBe(false);
    expect(CONCESSION_CONFIG.CRC.localPadrao).toBe("Sistema Viário do Paiva");
    expect(CONCESSION_CONFIG.CRC.cidadesDisponiveis).toEqual([
      "Jaboatão dos Guararapes",
      "Cabo de Santo Agostinho",
    ]);

    expect(CONCESSION_CONFIG.SOCICAM.exibeHora).toBe(false);
    expect(CONCESSION_CONFIG.SOCICAM.cidadesDisponiveis).toEqual([]);
    expect(RESPONSAVEIS_OFICIAIS.length).toBeGreaterThanOrEqual(6);
    expect(COORDENADORES_OFICIAIS.length).toBeGreaterThanOrEqual(2);
  });

  it("Dado a agenda por período (2 toques), Quando tocar início e término (inclusive invertido), Então calcula e formata corretamente", () => {
    const toque1 = aplicarToquePeriodo(
      { inicioIso: null, fimIso: null },
      "2026-11-24"
    );
    expect(toque1).toEqual({ inicioIso: "2026-11-24", fimIso: null });
    expect(formatarPeriodoIsoParaBr(toque1)).toBe("24/11/2026");

    const toque2Normal = aplicarToquePeriodo(toque1, "2026-11-27");
    expect(toque2Normal).toEqual({
      inicioIso: "2026-11-24",
      fimIso: "2026-11-27",
    });
    expect(formatarPeriodoIsoParaBr(toque2Normal)).toBe(
      "24/11/2026 - 27/11/2026"
    );

    const novoCiclo = aplicarToquePeriodo(toque2Normal, "2026-11-25");
    expect(novoCiclo).toEqual({ inicioIso: "2026-11-25", fimIso: null });

    const toque2Invertido = aplicarToquePeriodo(novoCiclo, "2026-11-20");
    expect(toque2Invertido).toEqual({
      inicioIso: "2026-11-20",
      fimIso: "2026-11-25",
    });
  });

  it("Dado as siglas e codificações oficiais do Web (Passo 3), Quando consultar por concessão, Então retorna dicionário DNIT 005/2003 para CRA/CRC e catálogo SOCICAM", () => {
    expect(obterSiglasPorConcessao("CRA")).toContain("FI");
    expect(obterSiglasPorConcessao("CRC")).toContain("TTC");
    expect(obterSiglasPorConcessao("SOCICAM")).toEqual([
      "PINTURA",
      "QUEBRADO",
      "VEGETAÇÃO",
      "FERRAGENS",
      "SINALIZAÇÃO",
      "CONDIÇÕES INADEQUADAS",
      "BURACO",
    ]);
    expect(MAP_SIGLAS_OFICIAL.FI).toBe("Fissuras");
    expect(sugerirCodificacaoPorConcessao("CRA", 2026, 1)).toBe(
      "CRA.ST601.2794-2834/2026.001"
    );
    expect(sugerirCodificacaoPorConcessao("CRC", 2026, 2)).toBe(
      "CRC.SH015.0646+0648/2026.002"
    );
    expect(sugerirCodificacaoPorConcessao("SOCICAM", 2026, 3)).toBe(
      "SOCICAM/2026.003"
    );
  });
});
