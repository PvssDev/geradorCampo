import {
  NetworkMode,
  OcorrenciaEntity,
  RelacionamentoOcorrenciaEntity,
  TipoRelatorio,
  VistoriaSessionEntity,
} from "../entities/types";
import {
  CONCESSION_CONFIG,
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

