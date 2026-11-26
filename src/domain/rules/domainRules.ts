import {
  CategoriaRelatorio,
  FotoMidiaEntity,
  GaleriaFotoEntity,
  NetworkMode,
  OcorrenciaEntity,
  RelacionamentoOcorrenciaEntity,
  TipoRelatorio,
  VistoriaSessionEntity,
} from "../entities/types";
import {
  CONCESSION_CONFIG,
  MAP_SIGLAS_OFICIAL,
  SIGLAS_RODOVIAS_OPCOES,
  SIGLAS_SOCICAM_OPCOES,
} from "../config/concessionConfig";

export interface MonitoringStats {
  readonly totalAnterior: number;
  readonly registradas: number;
  readonly sanadas: number;
  readonly parcialmenteSanadas: number;
  readonly pendentes: number;
  readonly totalPendentesConclusao: number;
  readonly pctSanadas: number;
  readonly pctParciais: number;
  readonly pctPendentes: number;
  readonly pctCobertura: number;
}

/**
 * Gera a codificação determinística oficial da CRA:
 * CRA.ST{subtrecho}.{estaca_ini}-{estaca_fim}/{ano}.{seq:03d}
 */
export function calcularCodificacaoCra(params: {
  subtrecho: string;
  estacaIni: string;
  estacaFim: string;
  ano: number;
  sequencial: number;
}): string {
  const st = params.subtrecho.replace(/\D/g, "") || "601";
  const ini = params.estacaIni.replace(/\D/g, "").padStart(4, "0");
  const fim = (params.estacaFim || params.estacaIni)
    .replace(/\D/g, "")
    .padStart(4, "0");
  const seq = String(Math.max(1, params.sequencial)).padStart(3, "0");
  return `CRA.ST${st}.${ini}-${fim}/${params.ano}.${seq}`;
}

/**
 * Calcula estatísticas comparativas puras para Monitoramento (espelhando o Web).
 */
export function calcularEstatisticasMonitoramento(
  ocorrencias: readonly OcorrenciaEntity[],
  totalAnteriorInformado: number
): MonitoringStats {
  const ncs = ocorrencias.filter((o) => o.tipoAchado === "NC");
  const registradas = ncs.length;
  const totalAnterior = Math.max(totalAnteriorInformado, registradas);
  const base = Math.max(totalAnterior, 1);

  let sanadas = 0;
  let parcialmenteSanadas = 0;
  let pendentes = 0;

  for (const nc of ncs) {
    if (nc.situacao === "Sanada") sanadas += 1;
    else if (nc.situacao === "Parcialmente Sanada") parcialmenteSanadas += 1;
    else pendentes += 1;
  }

  const totalPendentesConclusao = pendentes + parcialmenteSanadas;

  return {
    totalAnterior,
    registradas,
    sanadas,
    parcialmenteSanadas,
    pendentes,
    totalPendentesConclusao,
    pctSanadas: totalAnterior > 0 ? Math.round((sanadas / base) * 100) : 0,
    pctParciais:
      totalAnterior > 0 ? Math.round((parcialmenteSanadas / base) * 100) : 0,
    pctPendentes: totalAnterior > 0 ? Math.round((pendentes / base) * 100) : 0,
    pctCobertura:
      totalAnterior > 0
        ? Math.min(100, Math.round((registradas / base) * 100))
        : 0,
  };
}

/**
 * Regra 1:1 de relacionamento: cada ocorrência só pode receber uma única relação.
 */
export function podeRelacionarOcorrencia(ocorrencia: OcorrenciaEntity): boolean {
  return ocorrencia.relacionamento === undefined;
}

/**
 * Valida e sanitiza os campos do relacionamento conforme a concessão:
 * - Rodovias (CRA / CRC): exige faixa e sigla (NC | PA), codificação opcional, sem setorPredial.
 * - Terminais (SOCICAM): NUNCA aceita faixa rodoviária; exige setorPredial e sigla (NC | PA).
 */
export function construirRelacionamentoValidado(params: {
  tipoRelatorio: TipoRelatorio;
  ocorrenciaAlvo: OcorrenciaEntity;
  sigla: "NC" | "PA";
  siglas?: readonly string[];
  faixa?: string;
  setorPredial?: string;
  codificacao?: string;
  fotoRelacionadaNome?: string;
  registroReferenciaNumero?: number;
  criadoEm: string;
}): { ok: true; value: RelacionamentoOcorrenciaEntity } | { ok: false; erro: string } {
  if (!podeRelacionarOcorrencia(params.ocorrenciaAlvo)) {
    return {
      ok: false,
      erro: "Esta ocorrência já possui um relacionamento registrado.",
    };
  }

  const cfg = CONCESSION_CONFIG[params.tipoRelatorio];
  const codificacaoLimpa = params.codificacao?.trim() || undefined;
  const siglasLimpas = params.siglas?.filter(Boolean);

  if (cfg.exibePistaFaixa) {
    const faixaLimpa = params.faixa?.trim();
    if (params.tipoRelatorio === "CRA" && !faixaLimpa) {
      return { ok: false, erro: "Selecione a faixa para relacionar o registro." };
    }
    return {
      ok: true,
      value: {
        sigla: params.sigla,
        siglas: siglasLimpas && siglasLimpas.length > 0 ? siglasLimpas : undefined,
        faixa: params.tipoRelatorio === "CRA" ? faixaLimpa : undefined,
        codificacao: codificacaoLimpa,
        fotoRelacionadaNome: params.fotoRelacionadaNome,
        registroReferenciaNumero: params.registroReferenciaNumero,
        criadoEm: params.criadoEm,
      },
    };
  }

  const setorLimpo = params.setorPredial?.trim();
  if (!setorLimpo && (!siglasLimpas || siglasLimpas.length === 0)) {
    return {
      ok: false,
      erro: "Selecione o setor predial ou ao menos uma irregularidade para relacionar.",
    };
  }

  return {
    ok: true,
    value: {
      sigla: params.sigla,
      siglas: siglasLimpas && siglasLimpas.length > 0 ? siglasLimpas : undefined,
      setorPredial: setorLimpo || undefined,
      codificacao: codificacaoLimpa,
      fotoRelacionadaNome: params.fotoRelacionadaNome,
      registroReferenciaNumero: params.registroReferenciaNumero,
      criadoEm: params.criadoEm,
    },
  };
}

/**
 * Define se uma sessão está apta para sincronização automática em background.
 */
export function podeAutoSincronizar(
  vistoria: VistoriaSessionEntity,
  networkMode: NetworkMode
): boolean {
  return (
    networkMode === "online" &&
    vistoria.lifecycleStatus === "finalizada" &&
    !vistoria.syncStandby &&
    vistoria.syncStatus !== "synced"
  );
}

/**
 * Resolve o estado efetivo do Wi-Fi:
 * - Se o usuário ativou Offline Manual -> "offline_manual" (cinza).
 * - Caso contrário (preferência Online): "online" (verde) se há rede, ou "disconnected" (vermelho) se sem sinal.
 */
export function resolverModoRede(
  offlineManualAtivo: boolean,
  dispositivoComInternet: boolean
): NetworkMode {
  if (offlineManualAtivo) return "offline_manual";
  return dispositivoComInternet ? "online" : "disconnected";
}

export interface DateRangeSelection {
  readonly inicioIso: string | null;
  readonly fimIso: string | null;
}

/**
 * Máquina de estados de 2 toques para seleção de período na agenda (espelhando o DateRangePicker do Web):
 * - 1º toque (sem início ou intervalo já fechado): define início e aguarda término (fimIso = null).
 * - 2º toque: fecha o intervalo, invertendo início/fim caso o 2º toque seja anterior ao 1º.
 */
export function aplicarToquePeriodo(
  atual: DateRangeSelection,
  dataIsoTocada: string
): DateRangeSelection {
  if (!atual.inicioIso || (atual.inicioIso && atual.fimIso)) {
    return { inicioIso: dataIsoTocada, fimIso: null };
  }

  if (dataIsoTocada < atual.inicioIso) {
    return { inicioIso: dataIsoTocada, fimIso: atual.inicioIso };
  }

  return { inicioIso: atual.inicioIso, fimIso: dataIsoTocada };
}

export function isoParaBr(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatarPeriodoIsoParaBr(range: DateRangeSelection): string {
  if (!range.inicioIso) return "";
  const iniBr = isoParaBr(range.inicioIso);
  if (!range.fimIso || range.fimIso === range.inicioIso) return iniBr;
  return `${iniBr} - ${isoParaBr(range.fimIso)}`;
}

/**
 * Retorna a lista oficial de siglas de patologias/irregularidades da concessão.
 */
export function obterSiglasPorConcessao(tipo: TipoRelatorio): readonly string[] {
  return tipo === "SOCICAM" ? SIGLAS_SOCICAM_OPCOES : SIGLAS_RODOVIAS_OPCOES;
}

/**
 * Gera a sugestão oficial de codificação espelhando exatamente o RegistroNcForm do Web.
 */
export function sugerirCodificacaoPorConcessao(
  tipo: TipoRelatorio,
  ano: number,
  sequencial: number
): string {
  const seqStr = String(Math.max(1, sequencial)).padStart(3, "0");
  if (tipo === "CRA") return `CRA.ST601.2794-2834/${ano}.${seqStr}`;
  if (tipo === "CRC") return `CRC.SH015.0646+0648/${ano}.${seqStr}`;
  return `SOCICAM/${ano}.${seqStr}`;
}

/**
 * Filtra estritamente as sessões com ciclo de vida "em_aberto" para a aba Vistorias.
 */
export function filtrarVistoriasEmAberto(
  vistorias: readonly VistoriaSessionEntity[]
): readonly VistoriaSessionEntity[] {
  return vistorias.filter((v) => v.lifecycleStatus === "em_aberto");
}

/**
 * Filtra estritamente as sessões com ciclo de vida "finalizada" para a aba Finalizados.
 */
export function filtrarVistoriasFinalizadas(
  vistorias: readonly VistoriaSessionEntity[]
): readonly VistoriaSessionEntity[] {
  return vistorias.filter((v) => v.lifecycleStatus === "finalizada");
}

export interface ProgressoSyncVistoria {
  readonly enviadas: number;
  readonly total: number;
  readonly percentual: number;
}

/**
 * Calcula o progresso de envio das fotos de uma vistoria finalizada.
 */
export function calcularProgressoSync(
  vistoria: VistoriaSessionEntity
): ProgressoSyncVistoria {
  const total = vistoria.fotos.length;
  const enviadas = Math.min(vistoria.fotosEnviadas, total);
  if (total === 0) {
    return {
      enviadas: 0,
      total: 0,
      percentual: vistoria.syncStatus === "synced" ? 100 : 0,
    };
  }
  return {
    enviadas,
    total,
    percentual: Math.round((enviadas / total) * 100),
  };
}

/**
 * Alterna um ID na lista de seleção múltipla de forma imutável.
 */
export function alternarSelecaoIds(
  selecionados: readonly string[],
  id: string
): readonly string[] {
  if (selecionados.includes(id)) {
    return selecionados.filter((item) => item !== id);
  }
  return [...selecionados, id];
}

export interface ResumoContagensVistoria {
  readonly totalFotos: number;
  readonly totalOcorrencias: number;
  readonly totalNcs: number;
  readonly totalPas: number;
}

/**
 * Calcula contadores puros de uma sessão para exibição nos cards (evitando lógica no JSX).
 */
export function resumirContagensVistoria(
  vistoria: VistoriaSessionEntity
): ResumoContagensVistoria {
  let totalNcs = 0;
  let totalPas = 0;

  for (const oc of vistoria.ocorrencias) {
    if (oc.tipoAchado === "NC") totalNcs += 1;
    else totalPas += 1;
  }

  return {
    totalFotos: vistoria.fotos.length,
    totalOcorrencias: vistoria.ocorrencias.length,
    totalNcs,
    totalPas,
  };
}

export interface VistoriasFiltroState {
  readonly concessao: TipoRelatorio | null;
  readonly modalidade: CategoriaRelatorio | null;
  readonly data: string | null;
  readonly local: string | null;
}

export const FILTRO_VISTORIAS_INICIAL: VistoriasFiltroState = {
  concessao: null,
  modalidade: null,
  data: null,
  local: null,
};

export interface OpcoesFiltroVistorias {
  readonly datas: readonly string[];
  readonly locais: readonly string[];
}

/**
 * Alterna um filtro opcional: se já estiver ativo, desmarca (null = todos).
 */
export function alternarFiltroOpcional<T>(atual: T | null, valor: T): T | null {
  return atual === valor ? null : valor;
}

/**
 * Extrai datas e locais únicos presentes nas sessões em aberto para popular o filtro sem poluição.
 */
export function extrairOpcoesFiltroVistorias(
  vistoriasAbertas: readonly VistoriaSessionEntity[]
): OpcoesFiltroVistorias {
  const datasSet = new Set<string>();
  const locaisSet = new Set<string>();

  for (const v of vistoriasAbertas) {
    if (v.fiscalizacao.data.trim()) datasSet.add(v.fiscalizacao.data.trim());
    if (v.fiscalizacao.local.trim()) locaisSet.add(v.fiscalizacao.local.trim());
  }

  return {
    datas: Array.from(datasSet),
    locais: Array.from(locaisSet).sort((a, b) => a.localeCompare(b, "pt-BR")),
  };
}

/**
 * Conta filtros estruturais do modal (Concessão e Modalidade) para o badge do botão "Filtros".
 */
export function contarFiltrosModal(filtro: VistoriasFiltroState): number {
  return (filtro.concessao ? 1 : 0) + (filtro.modalidade ? 1 : 0);
}

/**
 * Conta quantos critérios de filtro estão ativos no estado atual.
 */
export function contarFiltrosAtivosVistorias(
  filtro: VistoriasFiltroState
): number {
  return (
    contarFiltrosModal(filtro) +
    (filtro.data ? 1 : 0) +
    (filtro.local ? 1 : 0)
  );
}

/**
 * Aplica filtro estrito de sessões em aberto combinado com concessão, modalidade, data e local.
 */
export function aplicarFiltrosVistoriasAbertas(
  vistorias: readonly VistoriaSessionEntity[],
  filtro: VistoriasFiltroState
): readonly VistoriaSessionEntity[] {
  return filtrarVistoriasEmAberto(vistorias).filter((v) => {
    if (filtro.concessao && v.tipoRelatorio !== filtro.concessao) return false;
    if (filtro.modalidade && v.categoriaRelatorio !== filtro.modalidade) {
      return false;
    }
    if (filtro.data && v.fiscalizacao.data.trim() !== filtro.data) return false;
    if (filtro.local && v.fiscalizacao.local.trim() !== filtro.local) {
      return false;
    }
    return true;
  });
}

export const FILTRO_GALERIA_SEM_VISTORIA = "__sem_vistoria__";

export interface SessaoGaleriaResumo {
  readonly idFiscalizacao: string;
  readonly tipoRelatorio: TipoRelatorio;
  readonly categoriaRelatorio: CategoriaRelatorio;
  readonly totalFotos: number;
}

export interface OpcoesSessaoGaleria {
  readonly sessoes: readonly SessaoGaleriaResumo[];
  readonly totalSemVistoria: number;
}

/**
 * Cria um registro imutável da foto para o cofre independente da Galeria (pasta privada à parte).
 */
export function criarFotoGaleriaDeVistoria(
  vistoria: VistoriaSessionEntity,
  foto: FotoMidiaEntity
): GaleriaFotoEntity {
  return {
    id: `gal-${foto.id}`,
    vistoriaId: vistoria.id,
    idFiscalizacao: vistoria.fiscalizacao.idFiscalizacao,
    tipoRelatorio: vistoria.tipoRelatorio,
    categoriaRelatorio: vistoria.categoriaRelatorio,
    local: vistoria.fiscalizacao.local,
    nomeArquivo: foto.nomeArquivo,
    localUri: foto.localUri || `sandbox://galeria/${vistoria.id}/${foto.nomeArquivo}`,
    tamanhoKb: foto.tamanhoKb,
    capturadaEm: foto.capturadaEm,
    ocorrenciaNumero: foto.ocorrenciaNumero,
  };
}

/**
 * Desvincula fotos de vistorias excluídas sem apagá-las da Galeria (viram fotos sem vistoria).
 */
export function desvincularFotosDeVistorias(
  fotos: readonly GaleriaFotoEntity[],
  vistoriaIds: readonly string[]
): GaleriaFotoEntity[] {
  const removed = new Set(vistoriaIds);
  return fotos.map((f) =>
    f.vistoriaId && removed.has(f.vistoriaId)
      ? { ...f, vistoriaId: null, idFiscalizacao: null }
      : f
  );
}

/**
 * Filtra fotos da galeria por uma ou mais sessões existentes e/ou "sem vistoria". Array vazio retorna todas.
 */
export function filtrarFotosGaleriaPorSessao(
  fotos: readonly GaleriaFotoEntity[],
  filtrosSessao: readonly string[]
): readonly GaleriaFotoEntity[] {
  if (filtrosSessao.length === 0) return fotos;
  const set = new Set(filtrosSessao);
  const incluiSemVistoria = set.has(FILTRO_GALERIA_SEM_VISTORIA);

  return fotos.filter((f) => {
    if (f.vistoriaId === null) return incluiSemVistoria;
    return f.idFiscalizacao !== null && set.has(f.idFiscalizacao);
  });
}

/**
 * Extrai apenas as sessões de vistorias ainda existentes + contagem de fotos sem vistoria.
 */
export function extrairSessoesUnicasGaleria(
  fotos: readonly GaleriaFotoEntity[],
  vistoriasExistentesIds: readonly string[]
): OpcoesSessaoGaleria {
  const existentes = new Set(vistoriasExistentesIds);
  const map = new Map<string, SessaoGaleriaResumo>();
  let totalSemVistoria = 0;

  for (const f of fotos) {
    if (!f.vistoriaId || !f.idFiscalizacao || !existentes.has(f.vistoriaId)) {
      totalSemVistoria += 1;
      continue;
    }
    const existing = map.get(f.idFiscalizacao);
    if (existing) {
      map.set(f.idFiscalizacao, {
        ...existing,
        totalFotos: existing.totalFotos + 1,
      });
    } else {
      map.set(f.idFiscalizacao, {
        idFiscalizacao: f.idFiscalizacao,
        tipoRelatorio: f.tipoRelatorio,
        categoriaRelatorio: f.categoriaRelatorio,
        totalFotos: 1,
      });
    }
  }

  return {
    sessoes: Array.from(map.values()),
    totalSemVistoria,
  };
}

export type FotoOcorrenciaAlvo = "principal" | "relacionada";

export type ResultadoRemocaoFotoOcorrencia =
  | { readonly acao: "atualizar"; readonly ocorrencia: OcorrenciaEntity }
  | { readonly acao: "excluir_ocorrencia" };

/**
 * Remove uma das fotos da ocorrência:
 * - "relacionada": remove apenas o relacionamento, preservando a ocorrência principal.
 * - "principal" com relacionamento: promove a 2ª foto para principal preservando Fundamento e Determinação compartilhados.
 * - "principal" sem relacionamento: sinaliza exclusão da ocorrência inteira.
 */
export function removerFotoDeOcorrencia(
  ocorrencia: OcorrenciaEntity,
  alvo: FotoOcorrenciaAlvo
): ResultadoRemocaoFotoOcorrencia {
  if (alvo === "relacionada") {
    return {
      acao: "atualizar",
      ocorrencia: { ...ocorrencia, relacionamento: undefined },
    };
  }

  const rel = ocorrencia.relacionamento;
  if (!rel) {
    return { acao: "excluir_ocorrencia" };
  }

  const descPromovida =
    rel.siglas && rel.siglas.length > 0
      ? rel.siglas
          .map((s) => `${s} (${(MAP_SIGLAS_OFICIAL[s] || s).toLowerCase()})`)
          .join("; ")
      : ocorrencia.descricao;

  return {
    acao: "atualizar",
    ocorrencia: {
      ...ocorrencia,
      tipoAchado: rel.sigla,
      identificacao: rel.codificacao || ocorrencia.identificacao,
      codificacao: rel.codificacao || ocorrencia.codificacao,
      descricao: descPromovida,
      direcaoFaixa: rel.faixa ?? ocorrencia.direcaoFaixa,
      setorPredial: rel.setorPredial ?? ocorrencia.setorPredial,
      constatacao:
        rel.siglas && rel.siglas.length > 0
          ? rel.siglas.join(", ")
          : ocorrencia.constatacao,
      fotoAtualNome: rel.fotoRelacionadaNome || ocorrencia.fotoAtualNome,
      relacionamento: undefined,
    },
  };
}

/**
 * Atualiza a 2ª foto relacionada e sincroniza Fundamento (analiseArpe) e Determinação (determinacaoOuInfo)
 * compartilhados na raiz da ocorrência para ambas as fotos.
 */
export function aplicarEdicaoRelacionamento(params: {
  tipoRelatorio: TipoRelatorio;
  ocorrencia: OcorrenciaEntity;
  sigla: "NC" | "PA";
  siglas?: readonly string[];
  faixa?: string;
  setorPredial?: string;
  codificacao?: string;
  fundamento: string;
  determinacao: string;
}): OcorrenciaEntity {
  const relAtual = params.ocorrencia.relacionamento;
  if (!relAtual) return params.ocorrencia;

  const cfg = CONCESSION_CONFIG[params.tipoRelatorio];
  const siglasLimpas = params.siglas?.filter(Boolean);

  return {
    ...params.ocorrencia,
    analiseArpe: params.fundamento.trim(),
    determinacaoOuInfo: params.determinacao.trim(),
    relacionamento: {
      ...relAtual,
      sigla: params.sigla,
      siglas: siglasLimpas && siglasLimpas.length > 0 ? siglasLimpas : undefined,
      faixa:
        cfg.exibePistaFaixa && params.tipoRelatorio === "CRA"
          ? params.faixa?.trim() || undefined
          : undefined,
      setorPredial: !cfg.exibePistaFaixa
        ? params.setorPredial?.trim() || undefined
        : undefined,
      codificacao: params.codificacao?.trim() || undefined,
    },
  };
}

