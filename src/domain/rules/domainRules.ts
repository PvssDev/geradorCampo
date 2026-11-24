import { OcorrenciaEntity } from "../entities/types";

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

