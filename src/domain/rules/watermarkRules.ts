export interface CoordenadasGps {
  readonly latitude: number;
  readonly longitude: number;
}

export interface MarcaDaguaInput {
  readonly dataHora: Date;
  readonly coordenadas?: CoordenadasGps | null;
  readonly municipioGps?: string | null;
  readonly cidadeVistoria?: string | null;
  readonly localVistoria?: string | null;
}

export interface MarcaDaguaLinhas {
  readonly linhaDataHora: string;
  readonly linhaCoordenadas: string;
  readonly linhaLocal: string;
  readonly todasLinhas: readonly [string, string, string];
}

export interface RecorteQuadradoSpec {
  readonly originX: number;
  readonly originY: number;
  readonly width: number;
  readonly height: number;
  readonly resizeSide: number;
}

const MESES_ABREV_PT = [
  "jan.",
  "fev.",
  "mar.",
  "abr.",
  "mai.",
  "jun.",
  "jul.",
  "ago.",
  "set.",
  "out.",
  "nov.",
  "dez.",
] as const;

export const LADO_MAXIMO_FOTO_PX = 1440;
export const ALVO_MAXIMO_FOTO_KB = 250;
export const LIMITE_HARD_BACKEND_KB = 500;

function pad2(n: number): string {
  return String(Math.trunc(Math.abs(n))).padStart(2, "0");
}

/**
 * Replica exatamente o formato de data/hora da referência de campo ARPE:
 * Ex.: "19 de ago. de 2026 10:04:02"
 */
export function formatarDataHoraMarcaDagua(date: Date): string {
  const dia = date.getDate();
  const mes = MESES_ABREV_PT[date.getMonth()] ?? "jan.";
  const ano = date.getFullYear();
  const horas = pad2(date.getHours());
  const minutos = pad2(date.getMinutes());
  const segundos = pad2(date.getSeconds());
  return `${dia} de ${mes} de ${ano} ${horas}:${minutos}:${segundos}`;
}

function converterDecimalParaGms(
  valor: number,
  hemisferioPositivo: "N" | "E",
  hemisferioNegativo: "S" | "W"
): string {
  const hemisferio = valor < 0 ? hemisferioNegativo : hemisferioPositivo;
  const abs = Math.abs(valor);

  let graus = Math.floor(abs);
  const restoMinutos = (abs - graus) * 60;
  let minutos = Math.floor(restoMinutos);
  let segundos = (restoMinutos - minutos) * 60;

  if (segundos >= 59.999995) {
    segundos = 0;
    minutos += 1;
  }
  if (minutos >= 60) {
    minutos = 0;
    graus += 1;
  }

  const segundosFormatados = segundos.toFixed(5).replace(".", ",");
  return `${graus}°${minutos}'${segundosFormatados}"${hemisferio}`;
}

/**
 * Converte par decimal WGS84 para o formato GMS exato da referência de campo:
 * Ex.: `8°15'24,92071"S 35°0'20,64628"W`
 */
export function formatarCoordenadasGms(
  coordenadas?: CoordenadasGps | null
): string | null {
  if (!coordenadas) return null;
  const { latitude, longitude } = coordenadas;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }
  const latGms = converterDecimalParaGms(latitude, "N", "S");
  const lonGms = converterDecimalParaGms(longitude, "E", "W");
  return `${latGms} ${lonGms}`;
}

export function resolverLocalMarcaDagua(params: {
  readonly municipioGps?: string | null;
  readonly cidadeVistoria?: string | null;
  readonly localVistoria?: string | null;
}): string {
  const candidatos = [
    params.municipioGps,
    params.cidadeVistoria,
    params.localVistoria,
  ];
  for (const item of candidatos) {
    const limpo = item?.trim();
    if (limpo) return limpo;
  }
  return "Pernambuco";
}

export function montarLinhasMarcaDagua(
  input: MarcaDaguaInput
): MarcaDaguaLinhas {
  const linhaDataHora = formatarDataHoraMarcaDagua(input.dataHora);
  const linhaCoordenadas =
    formatarCoordenadasGms(input.coordenadas) ?? "Sem sinal GPS";
  const linhaLocal = resolverLocalMarcaDagua({
    municipioGps: input.municipioGps,
    cidadeVistoria: input.cidadeVistoria,
    localVistoria: input.localVistoria,
  });

  return {
    linhaDataHora,
    linhaCoordenadas,
    linhaLocal,
    todasLinhas: [linhaDataHora, linhaCoordenadas, linhaLocal],
  };
}

/**
 * Calcula o corte central quadrado (1:1) e o lado final redimensionado.
 */
export function calcularRecorteQuadradoCentral(
  width: number,
  height: number,
  ladoMaximoPx: number = LADO_MAXIMO_FOTO_PX
): RecorteQuadradoSpec {
  const safeW = Math.max(1, Math.floor(width));
  const safeH = Math.max(1, Math.floor(height));
  const side = Math.min(safeW, safeH);
  const originX = Math.floor((safeW - side) / 2);
  const originY = Math.floor((safeH - side) / 2);
  const resizeSide = Math.min(side, Math.max(1, Math.floor(ladoMaximoPx)));

  return {
    originX,
    originY,
    width: side,
    height: side,
    resizeSide,
  };
}

/**
 * Identifica se a URI aponta para mídia real renderizável (arquivo local no sandbox,
 * blob/data web ou URL assinada), diferenciando dos mocks `sandbox://`.
 */
export function ehUriFotoReal(localUri?: string | null): boolean {
  if (!localUri) return false;
  return (
    localUri.startsWith("file://") ||
    localUri.startsWith("content://") ||
    localUri.startsWith("data:image/") ||
    localUri.startsWith("blob:") ||
    localUri.startsWith("https://") ||
    localUri.startsWith("http://")
  );
}

export function resolverUriPorNomeArquivo(
  fotos: readonly { readonly nomeArquivo: string; readonly localUri: string }[],
  nomeArquivo?: string | null
): string | undefined {
  if (!nomeArquivo) return undefined;
  const encontrada = fotos.find((f) => f.nomeArquivo === nomeArquivo);
  return encontrada?.localUri;
}
