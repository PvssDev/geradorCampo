import {
  CategoriaRelatorio,
  FotoMidiaEntity,
  OcorrenciaEntity,
  SituacaoNC,
  TipoRelatorio,
  VistoriaSessionEntity,
} from "../entities/types";

export type WorkTreeStateKey = `${TipoRelatorio}_${CategoriaRelatorio}`;

export interface WorkTreeFiscalizacaoPayload {
  readonly "ID da Fiscalização": string;
  readonly Data: string;
  readonly Hora: string;
  readonly Cidade: string;
  readonly Local: string;
  readonly "Pessoal Responsável": string;
  readonly Coordenador: string;
  readonly Contrato: string;
  readonly Período: string;
  readonly "Recomendações à SOCICAM"?: string;
  readonly "Relatório Gerado": boolean;
}

export interface WorkTreeRegistroNcPayload {
  readonly "ID da Fiscalização": string;
  readonly "Nº": number;
  readonly Terminal: string;
  readonly Pista: string;
  readonly Trecho: string;
  readonly "Não Conformidade": string;
  readonly "Ponto de Atenção": string;
  readonly Foto: string;
  readonly "Foto Anterior": string;
  readonly "Legenda Anterior": string;
  readonly "Legenda da Foto"?: string;
  readonly Observações: string;
  readonly Identificação: string;
  readonly Codificação?: string;
  readonly "Direção (faixa)": string;
  readonly "Fundamento da infração": string;
  readonly Determinação: string;
  readonly Situação: SituacaoNC;
  readonly "Análise ARPE": string;
  readonly is_relacionado: boolean;
  readonly grupo_relacao?: string;
}

export interface WorkTreeVistoriaPayloadJson {
  readonly state_key: WorkTreeStateKey;
  readonly tipo_relatorio: TipoRelatorio;
  readonly categoria_relatorio: CategoriaRelatorio;
  readonly total_anterior_monitoramento: number;
  readonly fiscalizacao: WorkTreeFiscalizacaoPayload;
  readonly registros_nc: readonly WorkTreeRegistroNcPayload[];
}

export interface SyncFotoMetadataPayload {
  readonly id: string;
  readonly storage_key: string;
  readonly nome_arquivo: string;
  readonly tamanho_kb: number;
  readonly ocorrencia_numero: number | null;
}

export interface VistoriaSyncApiRequest {
  readonly id: string;
  readonly id_fiscalizacao: string;
  readonly concessao: TipoRelatorio;
  readonly modalidade: CategoriaRelatorio;
  readonly payload_json: WorkTreeVistoriaPayloadJson;
  readonly fotos: readonly SyncFotoMetadataPayload[];
}

function construirRegistrosDeOcorrencia(
  vistoria: VistoriaSessionEntity,
  oc: OcorrenciaEntity,
  numeroBase: number,
  numeroRelacionado?: number
): WorkTreeRegistroNcPayload[] {
  const isSocicam = vistoria.tipoRelatorio === "SOCICAM";
  const temRelacao = Boolean(oc.relacionamento);
  const grupo = temRelacao
    ? `grp_${vistoria.fiscalizacao.idFiscalizacao}_${oc.numero}`
    : undefined;

  const principal: WorkTreeRegistroNcPayload = {
    "ID da Fiscalização": vistoria.fiscalizacao.idFiscalizacao,
    "Nº": numeroBase,
    Terminal: isSocicam ? oc.terminal || vistoria.fiscalizacao.local : "",
    Pista: isSocicam ? "" : oc.pista ?? "",
    Trecho: oc.trecho ?? "",
    "Não Conformidade": oc.tipoAchado === "NC" ? oc.constatacao || oc.descricao : "",
    "Ponto de Atenção": oc.tipoAchado === "PA" ? oc.constatacao || oc.descricao : "",
    Foto: oc.fotoAtualNome ?? "",
    "Foto Anterior": oc.fotoAnteriorRef ?? "",
    "Legenda Anterior": oc.legendaAnterior ?? "",
    "Legenda da Foto": oc.descricao,
    Observações: oc.descricao,
    Identificação: oc.identificacao,
    Codificação: oc.codificacao,
    "Direção (faixa)": isSocicam ? "" : oc.direcaoFaixa ?? "",
    "Fundamento da infração": oc.analiseArpe,
    Determinação: oc.determinacaoOuInfo,
    Situação: oc.situacao,
    "Análise ARPE": oc.analiseArpe,
    is_relacionado: false,
    grupo_relacao: grupo,
  };

  if (!oc.relacionamento || numeroRelacionado === undefined) {
    return [principal];
  }

  const rel = oc.relacionamento;
  const textoSiglas =
    rel.siglas && rel.siglas.length > 0 ? rel.siglas.join(", ") : oc.constatacao;

  const relacionada: WorkTreeRegistroNcPayload = {
    "ID da Fiscalização": vistoria.fiscalizacao.idFiscalizacao,
    "Nº": numeroRelacionado,
    Terminal: isSocicam
      ? rel.setorPredial || oc.terminal || vistoria.fiscalizacao.local
      : "",
    Pista: isSocicam ? "" : oc.pista ?? "",
    Trecho: oc.trecho ?? "",
    "Não Conformidade": rel.sigla === "NC" ? textoSiglas || oc.descricao : "",
    "Ponto de Atenção": rel.sigla === "PA" ? textoSiglas || oc.descricao : "",
    Foto: rel.fotoRelacionadaNome ?? "",
    "Foto Anterior": "",
    "Legenda Anterior": "",
    "Legenda da Foto": oc.descricao,
    Observações: oc.descricao,
    Identificação: oc.identificacao,
    Codificação: rel.codificacao ?? oc.codificacao,
    "Direção (faixa)": isSocicam ? "" : rel.faixa ?? oc.direcaoFaixa ?? "",
    "Fundamento da infração": oc.analiseArpe,
    Determinação: oc.determinacaoOuInfo,
    Situação: oc.situacao,
    "Análise ARPE": oc.analiseArpe,
    is_relacionado: true,
    grupo_relacao: grupo,
  };

  return [principal, relacionada];
}

/**
 * Serializa uma vistoria finalizada do Mobile para o contrato exato do Backend FastAPI + Web (workTree).
 */
export function serializarVistoriaParaSyncPayload(
  vistoria: VistoriaSessionEntity,
  storageKeyPorFotoId: Readonly<Record<string, string>>
): VistoriaSyncApiRequest {
  const registrosNc: WorkTreeRegistroNcPayload[] = [];
  let seq = 1;

  for (const oc of vistoria.ocorrencias) {
    const temRel = Boolean(oc.relacionamento);
    const numBase = seq;
    const numRel = temRel ? seq + 1 : undefined;
    seq += temRel ? 2 : 1;
    registrosNc.push(...construirRegistrosDeOcorrencia(vistoria, oc, numBase, numRel));
  }

  const stateKey: WorkTreeStateKey = `${vistoria.tipoRelatorio}_${vistoria.categoriaRelatorio}`;
  const isSocicam = vistoria.tipoRelatorio === "SOCICAM";

  const fiscalizacao: WorkTreeFiscalizacaoPayload = {
    "ID da Fiscalização": vistoria.fiscalizacao.idFiscalizacao,
    Data: vistoria.fiscalizacao.data,
    Hora: vistoria.fiscalizacao.hora,
    Cidade: vistoria.fiscalizacao.cidade,
    Local: vistoria.fiscalizacao.local,
    "Pessoal Responsável": vistoria.fiscalizacao.pessoalResponsavel,
    Coordenador: vistoria.fiscalizacao.coordenador,
    Contrato: vistoria.fiscalizacao.contrato,
    Período: vistoria.fiscalizacao.periodo,
    ...(isSocicam && vistoria.fiscalizacao.recomendacoesSocicam
      ? { "Recomendações à SOCICAM": vistoria.fiscalizacao.recomendacoesSocicam }
      : {}),
    "Relatório Gerado": false,
  };

  const fotos: SyncFotoMetadataPayload[] = vistoria.fotos
    .filter((f) => Boolean(storageKeyPorFotoId[f.id]))
    .map((f) => ({
      id: f.id,
      storage_key: storageKeyPorFotoId[f.id],
      nome_arquivo: f.nomeArquivo,
      tamanho_kb: Math.max(1, Math.min(500, Math.round(f.tamanhoKb || 180))),
      ocorrencia_numero: f.ocorrenciaNumero ?? null,
    }));

  return {
    id: vistoria.id,
    id_fiscalizacao: vistoria.fiscalizacao.idFiscalizacao,
    concessao: vistoria.tipoRelatorio,
    modalidade: vistoria.categoriaRelatorio,
    payload_json: {
      state_key: stateKey,
      tipo_relatorio: vistoria.tipoRelatorio,
      categoria_relatorio: vistoria.categoriaRelatorio,
      total_anterior_monitoramento: vistoria.totalAnteriorMonitoramento,
      fiscalizacao,
      registros_nc: registrosNc,
    },
    fotos,
  };
}

/**
 * Reconstrói uma VistoriaSessionEntity local em aberto a partir do payload JSON da nuvem
 * (usado ao "Puxar vistoria" por Coordenador ou ADM).
 */
export function desserializarVistoriaDaNuvem(params: {
  readonly id: string;
  readonly id_fiscalizacao: string;
  readonly concessao: TipoRelatorio;
  readonly modalidade: CategoriaRelatorio;
  readonly autorId: string;
  readonly autorUsuario: string;
  readonly autorNome: string;
  readonly payload_json: Partial<WorkTreeVistoriaPayloadJson>;
  readonly fotosLocais: readonly FotoMidiaEntity[];
}): VistoriaSessionEntity {
  const fisc = params.payload_json.fiscalizacao;
  const registros = params.payload_json.registros_nc ?? [];

  const ocorrencias: OcorrenciaEntity[] = [];
  const gruposVistos = new Map<string, number>();

  for (const reg of registros) {
    if (reg.is_relacionado && reg.grupo_relacao && gruposVistos.has(reg.grupo_relacao)) {
      const idxBase = gruposVistos.get(reg.grupo_relacao)!;
      const base = ocorrencias[idxBase];
      const isNc = Boolean(reg["Não Conformidade"]);
      ocorrencias[idxBase] = {
        ...base,
        relacionamento: {
          sigla: isNc ? "NC" : "PA",
          siglas: (reg["Não Conformidade"] || reg["Ponto de Atenção"] || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          faixa: params.concessao === "CRA" ? reg["Direção (faixa)"] || undefined : undefined,
          setorPredial: params.concessao === "SOCICAM" ? reg.Terminal || undefined : undefined,
          codificacao: reg.Codificação,
          fotoRelacionadaNome: reg.Foto || undefined,
          criadoEm: fisc?.Hora || "",
        },
      };
      continue;
    }

    const numero = ocorrencias.length + 1;
    const isNc = Boolean(reg["Não Conformidade"]);
    if (reg.grupo_relacao) {
      gruposVistos.set(reg.grupo_relacao, ocorrencias.length);
    }

    ocorrencias.push({
      numero,
      idFiscalizacao: params.id_fiscalizacao,
      tipoAchado: isNc ? "NC" : "PA",
      identificacao: reg.Identificação || "",
      codificacao: reg.Codificação,
      descricao: reg.Observações || reg["Legenda da Foto"] || "",
      terminal: params.concessao === "SOCICAM" ? reg.Terminal || undefined : undefined,
      pista: params.concessao !== "SOCICAM" ? reg.Pista || undefined : undefined,
      trecho: reg.Trecho || undefined,
      direcaoFaixa:
        params.concessao !== "SOCICAM" ? reg["Direção (faixa)"] || undefined : undefined,
      determinacaoOuInfo: reg.Determinação || "",
      constatacao: reg["Não Conformidade"] || reg["Ponto de Atenção"] || "",
      analiseArpe: reg["Análise ARPE"] || reg["Fundamento da infração"] || "",
      situacao: reg.Situação || "Pendente",
      fotoAtualNome: reg.Foto || undefined,
      fotoAnteriorRef: reg["Foto Anterior"] || undefined,
      legendaAnterior: reg["Legenda Anterior"] || undefined,
    });
  }

  return {
    id: params.id,
    autorId: params.autorId,
    autorUsuario: params.autorUsuario,
    autorNome: params.autorNome,
    tipoRelatorio: params.concessao,
    categoriaRelatorio: params.modalidade,
    lifecycleStatus: "finalizada",
    syncStandby: true,
    fiscalizacao: {
      idFiscalizacao: params.id_fiscalizacao,
      data: fisc?.Data ?? "",
      hora: fisc?.Hora ?? "",
      cidade: fisc?.Cidade ?? "",
      local: fisc?.Local ?? "",
      pessoalResponsavel: fisc?.["Pessoal Responsável"] ?? "",
      coordenador: fisc?.Coordenador ?? "",
      contrato: fisc?.Contrato ?? "",
      periodo: fisc?.Período ?? "",
      recomendacoesSocicam: fisc?.["Recomendações à SOCICAM"],
    },
    ocorrencias,
    fotos: params.fotosLocais,
    totalAnteriorMonitoramento:
      params.payload_json.total_anterior_monitoramento ?? 0,
    syncStatus: "pending",
    fotosEnviadas: 0,
    atualizadaEm: "Puxada para local",
  };
}
