import {
  CONCESSION_CONFIG,
  COORDENADORES_OFICIAIS,
  MAP_SIGLAS_OFICIAL,
  RESPONSAVEIS_OFICIAIS,
} from "../../src/domain/config/concessionConfig";
import {
  alternarFiltroOpcional,
  alternarSelecaoIds,
  aplicarEdicaoRelacionamento,
  aplicarFiltrosVistoriasAbertas,
  aplicarToquePeriodo,
  calcularCodificacaoCra,
  calcularEstatisticasMonitoramento,
  calcularProgressoSync,
  construirRelacionamentoValidado,
  contarFiltrosAtivosVistorias,
  contarFiltrosModal,
  criarFotoGaleriaDeVistoria,
  extrairOpcoesFiltroVistorias,
  extrairSessoesUnicasGaleria,
  FILTRO_GALERIA_SEM_VISTORIA,
  FILTRO_VISTORIAS_INICIAL,
  filtrarFotosGaleriaPorSessao,
  filtrarVistoriasEmAberto,
  filtrarVistoriasFinalizadas,
  formatarPeriodoIsoParaBr,
  obterSiglasPorConcessao,
  podeAutoSincronizar,
  podeRelacionarOcorrencia,
  removerFotoDeOcorrencia,
  resolverModoRede,
  resumirContagensVistoria,
  sugerirCodificacaoPorConcessao,
} from "../../src/domain/rules/domainRules";
import { useMobileStore } from "../../src/application/store/useMobileStore";
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

  it("Dado 2 sessões em aberto e 1 finalizada, Quando filtrar sessões em aberto, Então retorna estritamente as 2 em aberto", () => {
    const criarSessao = (
      id: string,
      lifecycleStatus: "em_aberto" | "finalizada"
    ): VistoriaSessionEntity => ({
      id,
      tipoRelatorio: "CRA",
      categoriaRelatorio: "Fiscalização",
      lifecycleStatus,
      syncStandby: false,
      fiscalizacao: {
        idFiscalizacao: `ID-${id}`,
        data: "25/11/2026",
        hora: "09:00",
        cidade: "Ipojuca",
        local: "Rota do Atlântico",
        pessoalResponsavel: "Equipe",
        coordenador: "Coord",
        contrato: "CT",
        periodo: "25/11/2026",
      },
      ocorrencias: [
        {
          numero: 1,
          idFiscalizacao: `ID-${id}`,
          tipoAchado: "NC",
          identificacao: "NC-01",
          descricao: "Trinca",
          determinacaoOuInfo: "",
          constatacao: "",
          analiseArpe: "",
          situacao: "Pendente",
        },
        {
          numero: 2,
          idFiscalizacao: `ID-${id}`,
          tipoAchado: "PA",
          identificacao: "PA-02",
          descricao: "Drenagem",
          determinacaoOuInfo: "",
          constatacao: "",
          analiseArpe: "",
          situacao: "Pendente",
        },
      ],
      fotos: [],
      totalAnteriorMonitoramento: 0,
      syncStatus: "pending",
      fotosEnviadas: 0,
      atualizadaEm: "Hoje · 09:00",
    });

    const lista = [
      criarSessao("a1", "em_aberto"),
      criarSessao("f1", "finalizada"),
      criarSessao("a2", "em_aberto"),
    ];

    const abertas = filtrarVistoriasEmAberto(lista);
    expect(abertas.map((v) => v.id)).toEqual(["a1", "a2"]);

    const resumo = resumirContagensVistoria(abertas[0]);
    expect(resumo).toEqual({
      totalFotos: 0,
      totalOcorrencias: 2,
      totalNcs: 1,
      totalPas: 1,
    });
  });

  it("Dado modo seleção múltipla, Quando alternar seleção de IDs, Então marca e desmarca de forma imutável", () => {
    const s1 = alternarSelecaoIds([], "v-1");
    expect(s1).toEqual(["v-1"]);

    const s2 = alternarSelecaoIds(s1, "v-2");
    expect(s2).toEqual(["v-1", "v-2"]);

    const s3 = alternarSelecaoIds(s2, "v-1");
    expect(s3).toEqual(["v-2"]);
    expect(s2).toEqual(["v-1", "v-2"]);
  });

  it("Dado vistorias em aberto de concessões, datas e locais distintos, Quando aplicar filtros, Então filtra corretamente e extrai opções únicas", () => {
    const makeSession = (
      id: string,
      tipoRelatorio: "CRA" | "CRC" | "SOCICAM",
      categoriaRelatorio: "Fiscalização" | "Monitoramento",
      data: string,
      local: string,
      lifecycleStatus: "em_aberto" | "finalizada" = "em_aberto"
    ): VistoriaSessionEntity => ({
      id,
      tipoRelatorio,
      categoriaRelatorio,
      lifecycleStatus,
      syncStandby: false,
      fiscalizacao: {
        idFiscalizacao: id,
        data,
        hora: "09:00",
        cidade: "Recife",
        local,
        pessoalResponsavel: "Equipe",
        coordenador: "Coord",
        contrato: "CT",
        periodo: data,
      },
      ocorrencias: [],
      fotos: [],
      totalAnteriorMonitoramento: 0,
      syncStatus: "pending",
      fotosEnviadas: 0,
      atualizadaEm: "Hoje",
    });

    const sessoes = [
      makeSession("s1", "CRA", "Fiscalização", "23/11/2026", "Rota do Atlântico"),
      makeSession("s2", "SOCICAM", "Monitoramento", "23/11/2026", "Terminal Rodoviário de Caruaru"),
      makeSession("s3", "CRA", "Monitoramento", "25/11/2026", "Rota do Atlântico"),
      makeSession("s4", "CRC", "Monitoramento", "23/11/2026", "Sistema Viário do Paiva", "finalizada"),
    ];

    expect(contarFiltrosAtivosVistorias(FILTRO_VISTORIAS_INICIAL)).toBe(0);
    expect(contarFiltrosModal(FILTRO_VISTORIAS_INICIAL)).toBe(0);
    expect(alternarFiltroOpcional<string>(null, "CRA")).toBe("CRA");
    expect(alternarFiltroOpcional<string>("CRA", "CRA")).toBeNull();
    expect(aplicarFiltrosVistoriasAbertas(sessoes, FILTRO_VISTORIAS_INICIAL).map((s) => s.id)).toEqual([
      "s1",
      "s2",
      "s3",
    ]);

    const filtroCraFisc = {
      ...FILTRO_VISTORIAS_INICIAL,
      concessao: "CRA" as const,
      modalidade: "Fiscalização" as const,
    };
    expect(contarFiltrosModal(filtroCraFisc)).toBe(2);
    expect(contarFiltrosAtivosVistorias(filtroCraFisc)).toBe(2);
    expect(aplicarFiltrosVistoriasAbertas(sessoes, filtroCraFisc).map((s) => s.id)).toEqual(["s1"]);

    const filtroDataLocal = {
      ...FILTRO_VISTORIAS_INICIAL,
      concessao: "SOCICAM" as const,
      data: "23/11/2026",
      local: "Terminal Rodoviário de Caruaru",
    };
    expect(contarFiltrosModal(filtroDataLocal)).toBe(1);
    expect(contarFiltrosAtivosVistorias(filtroDataLocal)).toBe(3);
    expect(aplicarFiltrosVistoriasAbertas(sessoes, filtroDataLocal).map((s) => s.id)).toEqual(["s2"]);

    const opcoes = extrairOpcoesFiltroVistorias(filtrarVistoriasEmAberto(sessoes));
    expect(opcoes.datas).toEqual(["23/11/2026", "25/11/2026"]);
    expect(opcoes.locais).toEqual([
      "Rota do Atlântico",
      "Terminal Rodoviário de Caruaru",
    ]);
  });

  it("Dado fotos na Galeria Local, Quando apagar uma vistoria, Então fotos permanecem intactas na Galeria e só são removidas pela ação da Galeria", () => {
    const store = useMobileStore.getState();
    const vistoriaAlvo = store.vistorias[0];
    const totalInicialGaleria = store.galeriaFotos.length;

    const fotoNova = store.simularCapturaFoto(vistoriaAlvo.id);
    const aposCaptura = useMobileStore.getState();
    expect(aposCaptura.galeriaFotos.length).toBe(totalInicialGaleria + 1);

    const fotoNaGaleria = aposCaptura.galeriaFotos.find(
      (f) => f.nomeArquivo === fotoNova.nomeArquivo
    );
    expect(fotoNaGaleria).toBeDefined();
    expect(fotoNaGaleria?.localUri).toContain("sandbox://galeria/");

    // Apaga a vistoria na aba Vistorias — fotos DEVEM sobreviver na Galeria como "sem vistoria"
    aposCaptura.excluirVistorias([vistoriaAlvo.id]);
    const aposExcluirVistoria = useMobileStore.getState();
    expect(
      aposExcluirVistoria.vistorias.some((v) => v.id === vistoriaAlvo.id)
    ).toBe(false);
    expect(aposExcluirVistoria.galeriaFotos.length).toBe(
      totalInicialGaleria + 1
    );
    const fotoOrfa = aposExcluirVistoria.galeriaFotos.find(
      (f) => f.id === fotoNaGaleria?.id
    );
    expect(fotoOrfa?.vistoriaId).toBeNull();
    expect(fotoOrfa?.idFiscalizacao).toBeNull();

    // Filtro de sessões lista apenas vistorias existentes + contagem de "Fotos sem vistoria"
    const opcoesGaleria = extrairSessoesUnicasGaleria(
      aposExcluirVistoria.galeriaFotos,
      aposExcluirVistoria.vistorias.map((v) => v.id)
    );
    expect(
      opcoesGaleria.sessoes.some(
        (s) => s.idFiscalizacao === vistoriaAlvo.fiscalizacao.idFiscalizacao
      )
    ).toBe(false);
    expect(opcoesGaleria.totalSemVistoria).toBeGreaterThanOrEqual(1);

    const somenteOrfas = filtrarFotosGaleriaPorSessao(
      aposExcluirVistoria.galeriaFotos,
      [FILTRO_GALERIA_SEM_VISTORIA]
    );
    expect(somenteOrfas.some((f) => f.id === fotoNaGaleria?.id)).toBe(true);

    // Multi-seleção no filtro: combina uma sessão existente + fotos sem vistoria
    const primeiraSessaoAtiva = opcoesGaleria.sessoes[0]?.idFiscalizacao;
    if (primeiraSessaoAtiva) {
      const combinadas = filtrarFotosGaleriaPorSessao(
        aposExcluirVistoria.galeriaFotos,
        [primeiraSessaoAtiva, FILTRO_GALERIA_SEM_VISTORIA]
      );
      expect(combinadas.some((f) => f.id === fotoNaGaleria?.id)).toBe(true);
      expect(
        combinadas.some((f) => f.idFiscalizacao === primeiraSessaoAtiva)
      ).toBe(true);
    }

    // Exclusão explícita na Galeria remove apenas o ID selecionado
    if (fotoNaGaleria) {
      aposExcluirVistoria.excluirFotosGaleria([fotoNaGaleria.id]);
      const aposExcluirGaleria = useMobileStore.getState();
      expect(aposExcluirGaleria.galeriaFotos.length).toBe(totalInicialGaleria);
      expect(
        aposExcluirGaleria.galeriaFotos.some((f) => f.id === fotoNaGaleria.id)
      ).toBe(false);
    }

    // Verifica helper puro criarFotoGaleriaDeVistoria
    const criada = criarFotoGaleriaDeVistoria(vistoriaAlvo, fotoNova);
    expect(criada.tipoRelatorio).toBe(vistoriaAlvo.tipoRelatorio);
    expect(criada.categoriaRelatorio).toBe(vistoriaAlvo.categoriaRelatorio);
  });

  it("Dado ocorrência com foto relacionada, Quando editar fundamento/determinação ou remover uma foto, Então compartilha entre ambas e promove/exclui corretamente", () => {
    const ocBase: OcorrenciaEntity = {
      numero: 1,
      idFiscalizacao: "FISC-CRA-2026-001",
      tipoAchado: "NC",
      identificacao: "CRA.ST601.0010-0020/2026.001",
      codificacao: "CRA.ST601.0010-0020/2026.001",
      descricao: "FI (fissuras)",
      pista: "Sul",
      direcaoFaixa: "Direita",
      determinacaoOuInfo: "Determinação inicial",
      constatacao: "FI",
      analiseArpe: "Fundamento inicial",
      situacao: "Pendente",
      fotoAtualNome: "FOTO_001.jpg",
      relacionamento: {
        sigla: "PA",
        siglas: ["TTC"],
        faixa: "Esquerda",
        codificacao: "CRA.ST601.0010-0020/2026.002",
        fotoRelacionadaNome: "FOTO_002.jpg",
        criadoEm: "10:15",
      },
    };

    // Edição pela 2ª foto compartilha fundamento e determinação na raiz
    const editada = aplicarEdicaoRelacionamento({
      tipoRelatorio: "CRA",
      ocorrencia: ocBase,
      sigla: "NC",
      siglas: ["TTC", "FI"],
      faixa: "Direita",
      codificacao: "CRA.ST601.0010-0020/2026.002",
      fundamento: "Fundamento atualizado para ambas",
      determinacao: "Determinação atualizada 15 dias",
    });
    expect(editada.analiseArpe).toBe("Fundamento atualizado para ambas");
    expect(editada.determinacaoOuInfo).toBe("Determinação atualizada 15 dias");
    expect(editada.relacionamento?.sigla).toBe("NC");
    expect(editada.relacionamento?.faixa).toBe("Direita");

    // Remover 2ª foto remove apenas a relação
    const semRelacao = removerFotoDeOcorrencia(editada, "relacionada");
    expect(semRelacao.acao).toBe("atualizar");
    if (semRelacao.acao === "atualizar") {
      expect(semRelacao.ocorrencia.relacionamento).toBeUndefined();
      expect(semRelacao.ocorrencia.fotoAtualNome).toBe("FOTO_001.jpg");
    }

    // Remover 1ª foto promove a 2ª preservando fundamento e determinação compartilhados
    const promovida = removerFotoDeOcorrencia(editada, "principal");
    expect(promovida.acao).toBe("atualizar");
    if (promovida.acao === "atualizar") {
      expect(promovida.ocorrencia.relacionamento).toBeUndefined();
      expect(promovida.ocorrencia.fotoAtualNome).toBe("FOTO_002.jpg");
      expect(promovida.ocorrencia.analiseArpe).toBe("Fundamento atualizado para ambas");
      expect(promovida.ocorrencia.determinacaoOuInfo).toBe("Determinação atualizada 15 dias");
    }

    // Remover 1ª foto quando não há relação sinaliza exclusão da ocorrência inteira
    if (semRelacao.acao === "atualizar") {
      expect(removerFotoDeOcorrencia(semRelacao.ocorrencia, "principal")).toEqual({
        acao: "excluir_ocorrencia",
      });
    }
  });

  it("Dado sessões finalizadas com Standby e modo Online, Quando sincronizar ou reabrir, Então respeita Standby e devolve reaberta para em_aberto", () => {
    const s = useMobileStore.getState();
    s.setNetworkMode("offline_manual");

    const idNormal = s.criarVistoria({
      idFiscalizacao: "FISC-CRA-TEST-01",
      local: "Rota do Atlântico",
      cidade: "Ipojuca",
      equipe: "Equipe A",
      coordenador: "Coord",
    });
    const idStandby = s.criarVistoria({
      idFiscalizacao: "FISC-SOC-TEST-02",
      local: "Terminal Rodoviário de Caruaru",
      cidade: "Caruaru",
      equipe: "Equipe B",
      coordenador: "Coord",
    });

    const st1 = useMobileStore.getState();
    st1.finalizarVistoria(idNormal, "FISC-CRA-TEST-01");
    st1.finalizarVistoria(idStandby, "FISC-SOC-TEST-02");
    st1.toggleStandbyVistoria(idStandby);

    const finalizadasAntes = filtrarVistoriasFinalizadas(
      useMobileStore.getState().vistorias
    );
    expect(finalizadasAntes.some((v) => v.id === idNormal)).toBe(true);
    expect(finalizadasAntes.some((v) => v.id === idStandby)).toBe(true);

    // Ativa Online: apenas a sessão normal deve subir; a em Standby permanece pendente
    useMobileStore.getState().setNetworkMode("online");
    const aposSync = useMobileStore.getState().vistorias;
    const vNormal = aposSync.find((v) => v.id === idNormal);
    const vStandby = aposSync.find((v) => v.id === idStandby);
    expect(vNormal?.syncStatus).toBe("synced");
    expect(vStandby?.syncStatus).toBe("pending");
    expect(vStandby?.syncStandby).toBe(true);
    if (vNormal) {
      expect(calcularProgressoSync(vNormal).percentual).toBe(100);
    }

    // Reabrir Finalizado devolve para em_aberto e limpa standby
    useMobileStore.getState().reabrirVistoria(idStandby);
    const reaberta = useMobileStore
      .getState()
      .vistorias.find((v) => v.id === idStandby);
    expect(reaberta?.lifecycleStatus).toBe("em_aberto");
    expect(reaberta?.syncStandby).toBe(false);

    // Resolução automática de 3 estados (Online/Offline manual + Desconectado automático)
    expect(resolverModoRede(true, true)).toBe("offline_manual");
    expect(resolverModoRede(true, false)).toBe("offline_manual");
    expect(resolverModoRede(false, true)).toBe("online");
    expect(resolverModoRede(false, false)).toBe("disconnected");
  });
});
