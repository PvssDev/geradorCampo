import { TipoRelatorio } from "../entities/types";

export interface PessoaCatalogo {
  readonly nome: string;
  readonly funcao: string;
}

export const RESPONSAVEIS_OFICIAIS: readonly PessoaCatalogo[] = [
  { nome: "Alcides Vieira de Azevedo Bezerra", funcao: "Especialista em Regulação" },
  { nome: "Enildo Manoel da Silva Júnior", funcao: "Especialista em Regulação" },
  { nome: "Cícero Ronaldo Mendes de Andrade Júnior", funcao: "Especialista em Regulação" },
  { nome: "Maria Fernanda da Silva Novaes", funcao: "Especialista em Regulação" },
  { nome: "Eulina Menezes Maciel", funcao: "Especialista em Regulação" },
  { nome: "Manuel Lucas Nascimento do Espírito Santo", funcao: "Especialista em Regulação" },
];

export const COORDENADORES_OFICIAIS: readonly PessoaCatalogo[] = [
  { nome: "Maria Ângela Albuquerque de Freitas", funcao: "Coordenadora de Transportes e Rodovias" },
  { nome: "Enildo Manoel da Silva Júnior", funcao: "Coordenador em Exercício" },
];

export const DIRECOES_CRA = ["Direita", "Esquerda"] as const;
export const PISTAS_SUGESTOES = ["Sul", "Norte", "Ambos"] as const;

export const SIGLAS_RODOVIAS_OPCOES: readonly string[] = [
  "FI", "TTC", "TTL", "TLC", "TLL", "TRR", "J", "TB",
  "JE", "TBE", "ALP", "ATP", "O", "P", "EX", "D", "R",
  "ALC", "ATC", "E",
];

export const SIGLAS_SOCICAM_OPCOES: readonly string[] = [
  "PINTURA",
  "QUEBRADO",
  "VEGETAÇÃO",
  "FERRAGENS",
  "SINALIZAÇÃO",
  "CONDIÇÕES INADEQUADAS",
  "BURACO",
];

export const MAP_SIGLAS_OFICIAL: Readonly<Record<string, string>> = {
  FI: "Fissuras",
  TTC: "Trincas isoladas transversais curtas",
  TTL: "Trincas isoladas transversais longas",
  TLC: "Trincas isoladas longitudinais curtas",
  TLL: "Trincas isoladas longitudinais longas",
  J: "Trincas interligadas sem erosão acentuada nas bordas das trincas",
  JE: "Trincas interligadas com erosão acentuada nas bordas das trincas",
  TRR: "Trincas isoladas no revestimento devido à retração térmica ou dissecação da base (solo-cimento) ou do revestimento",
  TB: "Trincas interligadas sem erosão acentuada nas bordas das trincas",
  TBE: "Trincas interligadas com erosão acentuada nas bordas das trincas",
  ALP: "Afundamento local plástico devido à fluência plástica de uma ou mais camadas do pavimento ou do subleito",
  ATP: "Afundamento da trilha plástico devido à fluência plástica de uma ou mais camadas do pavimento ou do subleito",
  ALC: "Afundamento local de consolidação devido à consolidação diferencial ocorrente em camadas do pavimento ou do subleito",
  ATC: "Afundamento da trilha de consolidação devido à consolidação diferencial ocorrente em camadas do pavimento ou do subleito",
  O: "Ondulação/Corrugação, caracterizada por ondulações transversais causadas por instabilidade da mistura betuminosa constituinte do revestimento ou da base",
  E: "Escorregamento do revestimento betuminoso",
  EX: "Exsudação do ligante betuminoso no revestimento",
  D: "Desgaste acentuado na superfície do revestimento",
  P: "Buracos decorrentes da desagregação do revestimento e às vezes de camadas inferiores",
  R: "Remendo",
  PINTURA: "Pintura da tampa da bomba de água faltando pintura",
  QUEBRADO: "Vidraças quebradas",
  VEGETAÇÃO: "Vegetação no telhado",
  FERRAGENS: "Ferragens expostas na viga do terminal",
  SINALIZAÇÃO: "Sinalização apagada na entrada do terminal",
  "CONDIÇÕES INADEQUADAS": "Banheiro em condições inadequadas",
  BURACO: "Buraco no teto do terminal",
};

export interface ConcessionDomainConfig {
  readonly key: TipoRelatorio;
  readonly nomeCurto: string;
  readonly nomeCompleto: string;
  readonly contratoPadrao: string;
  readonly exibePistaFaixa: boolean;
  readonly exibeHora: boolean;
  readonly localPadrao: string;
  readonly labelLocal: string;
  readonly labelPosicionamento: string;
  readonly cidadesDisponiveis: readonly string[];
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
    exibeHora: true,
    localPadrao: "Rota do Atlântico",
    labelLocal: "Município",
    labelPosicionamento: "Posicionamento CRA",
    cidadesDisponiveis: ["Cabo de Santo Agostinho", "Ipojuca"],
    locaisSugeridos: ["Cabo de Santo Agostinho", "Ipojuca"],
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
    exibeHora: false,
    localPadrao: "Sistema Viário do Paiva",
    labelLocal: "Município",
    labelPosicionamento: "Posicionamento CRC",
    cidadesDisponiveis: ["Jaboatão dos Guararapes", "Cabo de Santo Agostinho"],
    locaisSugeridos: ["Jaboatão dos Guararapes", "Cabo de Santo Agostinho"],
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
    exibeHora: false,
    localPadrao: "TIP Recife",
    labelLocal: "Terminal Rodoviário",
    labelPosicionamento: "Informação SOCICAM",
    cidadesDisponiveis: [],
    locaisSugeridos: [
      "TIP Recife",
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
