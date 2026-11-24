export type TipoRelatorio = "CRA" | "CRC" | "SOCICAM";
export type CategoriaRelatorio = "Fiscalização" | "Monitoramento";
export type SituacaoNC = "Pendente" | "Parcialmente Sanada" | "Sanada";
export type TipoAchado = "NC" | "PA";
export type SyncStatus = "synced" | "pending" | "uploading" | "error";

export interface FiscalizacaoEntity {
  readonly idFiscalizacao: string;
  readonly data: string;
  readonly hora: string;
  readonly cidade: string;
  readonly local: string;
  readonly pessoalResponsavel: string;
  readonly coordenador: string;
  readonly contrato: string;
  readonly periodo: string;
  readonly recomendacoesSocicam?: string;
}

export interface FotoMidiaEntity {
  readonly id: string;
  readonly nomeArquivo: string;
  readonly localUri: string;
  readonly tamanhoKb: number;
  readonly capturadaEm: string;
  readonly syncStatus: SyncStatus;
  readonly ocorrenciaNumero?: number;
}

export interface OcorrenciaEntity {
  readonly numero: number;
  readonly idFiscalizacao: string;
  readonly tipoAchado: TipoAchado;
  readonly identificacao: string;
  readonly codificacao?: string;
  readonly descricao: string;
  readonly terminal?: string;
  readonly setorPredial?: string;
  readonly pista?: string;
  readonly trecho?: string;
  readonly direcaoFaixa?: string;
  readonly determinacaoOuInfo: string;
  readonly constatacao: string;
  readonly analiseArpe: string;
  readonly situacao: SituacaoNC;
  readonly fotoAtualNome?: string;
  readonly fotoAnteriorRef?: string;
  readonly legendaAnterior?: string;
}

export interface VistoriaSessionEntity {
  readonly id: string;
  readonly tipoRelatorio: TipoRelatorio;
  readonly categoriaRelatorio: CategoriaRelatorio;
  readonly fiscalizacao: FiscalizacaoEntity;
  readonly ocorrencias: readonly OcorrenciaEntity[];
  readonly fotos: readonly FotoMidiaEntity[];
  readonly totalAnteriorMonitoramento: number;
  readonly syncStatus: SyncStatus;
  readonly fotosEnviadas: number;
  readonly atualizadaEm: string;
}

