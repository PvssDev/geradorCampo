import { TipoRelatorio } from "../entities/types";

export interface ConcessionDomainConfig {
  readonly key: TipoRelatorio;
  readonly nomeCurto: string;
  readonly nomeCompleto: string;
  readonly contratoPadrao: string;
  readonly exibePistaFaixa: boolean;
  readonly labelLocal: string;
  readonly labelPosicionamento: string;
  readonly locaisSugeridos: readonly string[];
  readonly setoresPrediais: readonly string[];
  readonly ncsSugeridas: readonly string[];
}

export const CONCESSION_CONFIG: Record<TipoRelatorio, ConcessionDomainConfig> = {
  CRA: {
    key: "CRA",
    nomeCurto: "CRA",
    nomeCompleto: "Concessionária Rota do Atlântico",
    contratoPadrao: "CT. nº 043/2011",
    exibePistaFaixa: true,
    labelLocal: "Cidade / Trecho Rodoviário",
    labelPosicionamento: "Posicionamento CRA",
    locaisSugeridos: [
      "Cabo de Santo Agostinho / Ipojuca (PE-009)",
      "Complexo Industrial Portuário de Suape",
      "Praça de Pedágio P1 - PE-009",
    ],
    setoresPrediais: [],
    ncsSugeridas: [
      "Fissura ou trinca no pavimento asfáltico",
      "Sinalização horizontal desgastada",
      "Drenagem superficial obstruída",
      "Defensa metálica avariada",
    ],
  },
  CRC: {
    key: "CRC",
    nomeCurto: "CRC",
    nomeCompleto: "Concessionária Rota dos Coqueiros",
    contratoPadrao: "CGPE-001/2006",
    exibePistaFaixa: true,
    labelLocal: "Segmento Homogêneo / Via Parque",
    labelPosicionamento: "Posicionamento CRC",
    locaisSugeridos: [
      "Sistema Viário do Paiva (PE-024)",
      "Ponte do Paiva - SH01",
      "Praça de Pedágio Paiva",
    ],
    setoresPrediais: [],
    ncsSugeridas: [
      "Junta de dilatação com desgaste",
      "Iluminação viária inoperante",
      "Sinalização vertical inclinada",
      "Vegetação invadindo acostamento",
    ],
  },
  SOCICAM: {
    key: "SOCICAM",
    nomeCurto: "SOCICAM",
    nomeCompleto: "Terminais Rodoviários Intermunicipais",
    contratoPadrao: "CT. nº 1.041.080/08",
    exibePistaFaixa: false,
    labelLocal: "Terminal Rodoviário",
    labelPosicionamento: "Informação SOCICAM",
    locaisSugeridos: [
      "Terminal Rodoviário de Passageiros do Recife (TIP)",
      "Terminal Rodoviário de Caruaru",
      "Terminal Rodoviário de Garanhuns",
      "Terminal Rodoviário de Petrolina",
      "Terminal Rodoviário de Arcoverde",
      "Terminal Rodoviário de Serra Talhada",
    ],
    setoresPrediais: [
      "Plataformas de Embarque",
      "Sanitários Públicos",
      "Saguão Principal",
      "Acessibilidade / Rampas",
      "Bilheterias",
      "Estacionamento",
    ],
    ncsSugeridas: [
      "Piso tátil solto ou ausente",
      "Sanitário com louça ou porta danificada",
      "Iluminação insuficiente na plataforma",
      "Infiltração ou vazamento na cobertura",
      "Sinalização informativa deteriorada",
    ],
  },
};

