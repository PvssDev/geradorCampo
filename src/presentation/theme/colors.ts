import {
  CategoriaRelatorio,
  GaleriaFotoEntity,
  TipoRelatorio,
} from "../../domain/entities/types";

export interface ConcessionTheme {
  readonly primary: string;
  readonly primarySoft: string;
  readonly primaryBorder: string;
  readonly onPrimary: string;
}

/**
 * Tokens institucionais ARPE alinhados ao sistema Web (za.PNG) e à estrutura mobile (ref/).
 * Sem gradientes chamativos: superfícies limpas, alto contraste e legibilidade em campo.
 */
export const ARPE_COLORS = {
  navy: "#071d36",
  navyElevated: "#0f2b4d",
  navyMuted: "#1a3a5f",
  surface: "#ffffff",
  surfaceMuted: "#f4f7fb",
  inputBg: "#eef3f8",
  border: "#e2e8f0",
  borderStrong: "#cbd5e1",
  textPrimary: "#071d36",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  white: "#ffffff",
  statusSanada: "#10b981",
  statusSanadaSoft: "#ecfdf5",
  statusParcial: "#6366f1",
  statusParcialSoft: "#eef2ff",
  statusOffline: "#f59e0b",
  statusOfflineSoft: "#fffbeb",
  statusOnline: "#10b981",
  statusOnlineSoft: "#ecfdf5",
  danger: "#dc2626",
  dangerSoft: "#fef2f2",
  dangerBorder: "#fecaca",
} as const;

export function getConcessionTheme(
  tipo: TipoRelatorio,
  categoria: CategoriaRelatorio
): ConcessionTheme {
  if (categoria === "Monitoramento") {
    switch (tipo) {
      case "SOCICAM":
        return {
          primary: "#ea580c",
          primarySoft: "#fff7ed",
          primaryBorder: "#fed7aa",
          onPrimary: "#ffffff",
        };
      case "CRC":
        return {
          primary: "#e11d48",
          primarySoft: "#fff1f2",
          primaryBorder: "#fecdd3",
          onPrimary: "#ffffff",
        };
      case "CRA":
      default:
        return {
          primary: "#dc2626",
          primarySoft: "#fef2f2",
          primaryBorder: "#fecaca",
          onPrimary: "#ffffff",
        };
    }
  }

  switch (tipo) {
    case "CRC":
      return {
        primary: "#0095c4",
        primarySoft: "#f0f9ff",
        primaryBorder: "#bae6fd",
        onPrimary: "#ffffff",
      };
    case "SOCICAM":
      return {
        primary: "#5b52c6",
        primarySoft: "#f5f3ff",
        primaryBorder: "#ddd6fe",
        onPrimary: "#ffffff",
      };
    case "CRA":
    default:
      return {
        primary: "#2563eb",
        primarySoft: "#eff6ff",
        primaryBorder: "#bfdbfe",
        onPrimary: "#ffffff",
      };
  }
}

const ORPHAN_PHOTO_THEME: ConcessionTheme = {
  primary: "#64748b",
  primarySoft: "#f1f5f9",
  primaryBorder: "#cbd5e1",
  onPrimary: "#ffffff",
};

/**
 * Retorna a paleta da foto na Galeria: cor da modalidade se vinculada, ou cinza neutro se sem vistoria.
 */
export function getGaleriaFotoTheme(foto: GaleriaFotoEntity): ConcessionTheme {
  if (foto.vistoriaId === null) return ORPHAN_PHOTO_THEME;
  return getConcessionTheme(foto.tipoRelatorio, foto.categoriaRelatorio);
}

