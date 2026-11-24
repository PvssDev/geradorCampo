import { create } from "zustand";
import { CONCESSION_CONFIG } from "../../domain/config/concessionConfig";
import {
  CategoriaRelatorio,
  FotoMidiaEntity,
  NetworkMode,
  OcorrenciaEntity,
  TipoAchado,
  TipoRelatorio,
  VistoriaSessionEntity,
} from "../../domain/entities/types";
import {
  construirRelacionamentoValidado,
  podeAutoSincronizar,
} from "../../domain/rules/domainRules";
import { MOCK_VISTORIAS } from "../../infrastructure/mocks/mockData";

export type WizardStep = "modalidade" | "dados_iniciais" | "coleta";

interface MobileAppState {
  isOnline: boolean;
  networkMode: NetworkMode;
  wizardStep: WizardStep;
  usuarioNome: string;
  usuarioEmail: string;
  tipoRelatorio: TipoRelatorio;
  categoriaRelatorio: CategoriaRelatorio;
  vistorias: VistoriaSessionEntity[];
  activeVistoriaId: string;
  toggleOnlineMode: () => void;
  setNetworkMode: (mode: NetworkMode) => void;
  setWizardStep: (step: WizardStep) => void;
  iniciarNovoRelatorioWizard: () => void;
  retomarVistoriaNoWizard: (vistoriaId: string) => void;
  setModalidade: (tipo: TipoRelatorio, categoria: CategoriaRelatorio) => void;
  setActiveVistoriaId: (id: string) => void;
  criarVistoria: (params: {
    idFiscalizacao: string;
    local: string;
    cidade: string;
    equipe: string | string[];
    coordenador: string;
    data?: string;
    periodo?: string;
    hora?: string;
  }) => string;
  atualizarDadosVistoria: (
    vistoriaId: string,
    params: {
      local: string;
      cidade: string;
      equipe: string | string[];
      coordenador: string;
      data: string;
      periodo: string;
      hora: string;
    }
  ) => void;
  adicionarOcorrencia: (
    vistoriaId: string,
    ocorrencia: Omit<OcorrenciaEntity, "numero" | "idFiscalizacao">
  ) => void;
  relacionarOcorrencia: (params: {
    vistoriaId: string;
    ocorrenciaNumero: number;
    sigla: TipoAchado;
    siglas?: readonly string[];
    faixa?: string;
    setorPredial?: string;
    codificacao?: string;
    fotoRelacionadaNome?: string;
    registroReferenciaNumero?: number;
  }) => { ok: true } | { ok: false; erro: string };
  finalizarVistoria: (vistoriaId: string, nomeIdRelatorio: string) => void;
  reabrirVistoria: (vistoriaId: string) => void;
  excluirVistorias: (vistoriaIds: readonly string[]) => void;
  toggleStandbyVistoria: (vistoriaId: string) => void;
  executarAutoSyncFinalizados: () => void;
  atualizarRecomendacoesSocicam: (vistoriaId: string, texto: string) => void;
  simularCapturaFoto: (vistoriaId: string, ocorrenciaNumero?: number) => FotoMidiaEntity;
  vincularFotoUltimaOcorrencia: (vistoriaId: string, fotoId: string, ocorrenciaNumero: number) => void;
  simularSyncVistoria: (vistoriaId: string) => void;
}

export const useMobileStore = create<MobileAppState>((set, get) => ({
  isOnline: false,
  networkMode: "offline_manual",
  wizardStep: "modalidade",
  usuarioNome: "Equipe Técnica CTR",
  usuarioEmail: "equipe.campo@institucional.gov.br",
  tipoRelatorio: "CRA",
  categoriaRelatorio: "Fiscalização",
  vistorias: [...MOCK_VISTORIAS],
  activeVistoriaId: "",

  toggleOnlineMode: () =>
    set((state) => {
      const nextOnline = !state.isOnline;
      return {
        isOnline: nextOnline,
        networkMode: nextOnline ? "online" : "offline_manual",
      };
    }),

  setNetworkMode: (mode) => {
    set({
      networkMode: mode,
      isOnline: mode === "online",
    });
    if (mode === "online") {
      get().executarAutoSyncFinalizados();
    }
  },

  setWizardStep: (step) => set({ wizardStep: step }),

  iniciarNovoRelatorioWizard: () =>
    set({
      activeVistoriaId: "",
      wizardStep: "modalidade",
    }),

  retomarVistoriaNoWizard: (vistoriaId) =>
    set((state) => {
      const target = state.vistorias.find((v) => v.id === vistoriaId);
      if (!target) return {};
      return {
        activeVistoriaId: target.id,
        tipoRelatorio: target.tipoRelatorio,
        categoriaRelatorio: target.categoriaRelatorio,
        wizardStep: "coleta",
      };
    }),

  setModalidade: (tipo, categoria) =>
    set({
      tipoRelatorio: tipo,
      categoriaRelatorio: categoria,
    }),

  setActiveVistoriaId: (id) =>
    set((state) => {
      const target = state.vistorias.find((v) => v.id === id);
      if (!target) return { activeVistoriaId: id };
      return {
        activeVistoriaId: id,
        tipoRelatorio: target.tipoRelatorio,
        categoriaRelatorio: target.categoriaRelatorio,
      };
    }),

  criarVistoria: ({
    idFiscalizacao,
    local,
    cidade,
    equipe,
    coordenador,
    data,
    periodo,
    hora,
  }) => {
    const state = get();
    const cfg = CONCESSION_CONFIG[state.tipoRelatorio];
    const now = new Date();
    const dataBr = data?.trim() || now.toLocaleDateString("pt-BR");
    const periodoFinal = periodo?.trim() || dataBr;
    const horaAtual = now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const horaFinal = cfg.exibeHora ? hora?.trim() || horaAtual : "";
    const newId = `v-${state.tipoRelatorio.toLowerCase()}-${Date.now()}`;
    const seq = String(state.vistorias.length + 1).padStart(3, "0");

    const localFinal =
      state.tipoRelatorio === "SOCICAM"
        ? local.trim() || cfg.localPadrao
        : cfg.localPadrao;
    const cidadeFinal =
      state.tipoRelatorio === "SOCICAM"
        ? localFinal
        : cidade.trim() || cfg.cidadesDisponiveis[0] || "";
    const equipeTexto = Array.isArray(equipe)
      ? equipe.filter(Boolean).join(", ")
      : equipe.trim();

    const nova: VistoriaSessionEntity = {
      id: newId,
      tipoRelatorio: state.tipoRelatorio,
      categoriaRelatorio: state.categoriaRelatorio,
      lifecycleStatus: "em_aberto",
      syncStandby: false,
      fiscalizacao: {
        idFiscalizacao:
          idFiscalizacao.trim() ||
          `${state.categoriaRelatorio === "Monitoramento" ? "MON" : "FISC"}-${state.tipoRelatorio}-${now.getFullYear()}-${seq}`,
        data: dataBr,
        hora: horaFinal,
        cidade: cidadeFinal,
        local: localFinal,
        pessoalResponsavel: equipeTexto || state.usuarioNome,
        coordenador: coordenador.trim() || "Maria Ângela Albuquerque de Freitas",
        contrato: cfg.contratoPadrao,
        periodo: periodoFinal,
      },
      ocorrencias: [],
      fotos: [],
      totalAnteriorMonitoramento:
        state.categoriaRelatorio === "Monitoramento" ? 3 : 0,
      syncStatus: "pending",
      fotosEnviadas: 0,
      atualizadaEm: `Hoje · ${horaAtual}`,
    };

    set({
      vistorias: [nova, ...state.vistorias],
      activeVistoriaId: newId,
      wizardStep: "coleta",
    });
    return newId;
  },

  atualizarDadosVistoria: (
    vistoriaId,
    { local, cidade, equipe, coordenador, data, periodo, hora }
  ) =>
    set((state) => {
      const target = state.vistorias.find((v) => v.id === vistoriaId);
      if (!target) return { wizardStep: "coleta" };
      const cfg = CONCESSION_CONFIG[target.tipoRelatorio];
      const equipeTexto = Array.isArray(equipe)
        ? equipe.filter(Boolean).join(", ")
        : equipe.trim();
      const localFinal =
        target.tipoRelatorio === "SOCICAM"
          ? local.trim() || cfg.localPadrao
          : cfg.localPadrao;
      const cidadeFinal =
        target.tipoRelatorio === "SOCICAM"
          ? localFinal
          : cidade.trim() || cfg.cidadesDisponiveis[0] || "";

      return {
        vistorias: state.vistorias.map((v) =>
          v.id === vistoriaId
            ? {
                ...v,
                fiscalizacao: {
                  ...v.fiscalizacao,
                  data: data.trim() || v.fiscalizacao.data,
                  periodo: periodo.trim() || data.trim() || v.fiscalizacao.periodo,
                  hora: cfg.exibeHora ? hora.trim() || v.fiscalizacao.hora : "",
                  local: localFinal,
                  cidade: cidadeFinal,
                  pessoalResponsavel: equipeTexto || v.fiscalizacao.pessoalResponsavel,
                  coordenador: coordenador.trim() || v.fiscalizacao.coordenador,
                },
                syncStatus: "pending",
              }
            : v
        ),
        wizardStep: "coleta",
      };
    }),

  adicionarOcorrencia: (vistoriaId, ocorrencia) =>
    set((state) => ({
      vistorias: state.vistorias.map((v) => {
        if (v.id !== vistoriaId) return v;
        const numero = v.ocorrencias.length + 1;
        const novaOc: OcorrenciaEntity = {
          ...ocorrencia,
          numero,
          idFiscalizacao: v.fiscalizacao.idFiscalizacao,
        };
        return {
          ...v,
          ocorrencias: [...v.ocorrencias, novaOc],
          syncStatus: "pending",
          atualizadaEm: "Agora · Salvo no dispositivo",
        };
      }),
    })),

  relacionarOcorrencia: ({
    vistoriaId,
    ocorrenciaNumero,
    sigla,
    siglas,
    faixa,
    setorPredial,
    codificacao,
    fotoRelacionadaNome,
    registroReferenciaNumero,
  }) => {
    const state = get();
    const vistoria = state.vistorias.find((v) => v.id === vistoriaId);
    if (!vistoria) {
      return { ok: false, erro: "Sessão de vistoria não encontrada." };
    }
    const alvo = vistoria.ocorrencias.find((o) => o.numero === ocorrenciaNumero);
    if (!alvo) {
      return { ok: false, erro: "Ocorrência não encontrada." };
    }

    const hora = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const validado = construirRelacionamentoValidado({
      tipoRelatorio: vistoria.tipoRelatorio,
      ocorrenciaAlvo: alvo,
      sigla,
      siglas,
      faixa,
      setorPredial,
      codificacao,
      fotoRelacionadaNome,
      registroReferenciaNumero,
      criadoEm: hora,
    });

    if (!validado.ok) {
      return validado;
    }

    set({
      vistorias: state.vistorias.map((v) => {
        if (v.id !== vistoriaId) return v;
        const jaTemFoto =
          fotoRelacionadaNome &&
          v.fotos.some((f) => f.nomeArquivo === fotoRelacionadaNome);
        const novaFotoRel: FotoMidiaEntity | null =
          fotoRelacionadaNome && !jaTemFoto
            ? {
                id: `foto-rel-${Date.now()}`,
                nomeArquivo: fotoRelacionadaNome,
                localUri: `sandbox://vistorias/${vistoriaId}/${fotoRelacionadaNome}`,
                tamanhoKb: 194,
                capturadaEm: hora,
                syncStatus: "pending",
                ocorrenciaNumero,
              }
            : null;
        return {
          ...v,
          fotos: novaFotoRel ? [...v.fotos, novaFotoRel] : v.fotos,
          ocorrencias: v.ocorrencias.map((oc) =>
            oc.numero === ocorrenciaNumero
              ? { ...oc, relacionamento: validado.value }
              : oc
          ),
          syncStatus: "pending",
          atualizadaEm: `Hoje · ${hora}`,
        };
      }),
    });

    return { ok: true };
  },

  finalizarVistoria: (vistoriaId, nomeIdRelatorio) => {
    const state = get();
    const hora = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const idFinal = nomeIdRelatorio.trim();

    set({
      vistorias: state.vistorias.map((v) => {
        if (v.id !== vistoriaId) return v;
        const novoIdFisc = idFinal || v.fiscalizacao.idFiscalizacao;
        return {
          ...v,
          lifecycleStatus: "finalizada",
          syncStandby: false,
          fiscalizacao: {
            ...v.fiscalizacao,
            idFiscalizacao: novoIdFisc,
          },
          ocorrencias: v.ocorrencias.map((oc) => ({
            ...oc,
            idFiscalizacao: novoIdFisc,
          })),
          atualizadaEm: `Finalizado · ${hora}`,
        };
      }),
      activeVistoriaId:
        state.activeVistoriaId === vistoriaId ? "" : state.activeVistoriaId,
      wizardStep:
        state.activeVistoriaId === vistoriaId ? "modalidade" : state.wizardStep,
    });

    if (get().networkMode === "online") {
      get().executarAutoSyncFinalizados();
    }
  },

  reabrirVistoria: (vistoriaId) =>
    set((state) => ({
      vistorias: state.vistorias.map((v) =>
        v.id === vistoriaId
          ? {
              ...v,
              lifecycleStatus: "em_aberto",
              syncStandby: false,
              syncStatus: "pending",
              atualizadaEm: "Reaberto para edição",
            }
          : v
      ),
    })),

  excluirVistorias: (vistoriaIds) =>
    set((state) => {
      const toDelete = new Set(vistoriaIds);
      const deletingActive = toDelete.has(state.activeVistoriaId);
      return {
        vistorias: state.vistorias.filter((v) => !toDelete.has(v.id)),
        activeVistoriaId: deletingActive ? "" : state.activeVistoriaId,
        wizardStep: deletingActive ? "modalidade" : state.wizardStep,
      };
    }),

  toggleStandbyVistoria: (vistoriaId) => {
    set((state) => ({
      vistorias: state.vistorias.map((v) =>
        v.id === vistoriaId ? { ...v, syncStandby: !v.syncStandby } : v
      ),
    }));
    if (get().networkMode === "online") {
      get().executarAutoSyncFinalizados();
    }
  },

  executarAutoSyncFinalizados: () =>
    set((state) => ({
      vistorias: state.vistorias.map((v) => {
        if (!podeAutoSincronizar(v, state.networkMode)) return v;
        return {
          ...v,
          syncStatus: "synced",
          fotosEnviadas: v.fotos.length,
          fotos: v.fotos.map((f) => ({ ...f, syncStatus: "synced" })),
          atualizadaEm: "Sincronizado automaticamente",
        };
      }),
    })),

  atualizarRecomendacoesSocicam: (vistoriaId, texto) =>
    set((state) => ({
      vistorias: state.vistorias.map((v) =>
        v.id === vistoriaId
          ? {
              ...v,
              fiscalizacao: {
                ...v.fiscalizacao,
                recomendacoesSocicam: texto,
              },
              syncStatus: "pending",
            }
          : v
      ),
    })),

  simularCapturaFoto: (vistoriaId, ocorrenciaNumero) => {
    const state = get();
    const target = state.vistorias.find((v) => v.id === vistoriaId);
    const seq = (target?.fotos.length ?? 0) + 1;
    const hora = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const novaFoto: FotoMidiaEntity = {
      id: `foto-${Date.now()}`,
      nomeArquivo: `FOTO_${String(seq).padStart(3, "0")}.jpg`,
      localUri: `sandbox://vistorias/${vistoriaId}/FOTO_${String(seq).padStart(3, "0")}.jpg`,
      tamanhoKb: 180 + (seq % 4) * 14,
      capturadaEm: hora,
      syncStatus: "pending",
      ocorrenciaNumero,
    };

    set({
      vistorias: state.vistorias.map((v) =>
        v.id === vistoriaId
          ? {
              ...v,
              fotos: [...v.fotos, novaFoto],
              syncStatus: "pending",
              atualizadaEm: `Hoje · ${hora}`,
            }
          : v
      ),
    });

    return novaFoto;
  },

  vincularFotoUltimaOcorrencia: (vistoriaId, fotoId, ocorrenciaNumero) =>
    set((state) => ({
      vistorias: state.vistorias.map((v) => {
        if (v.id !== vistoriaId) return v;
        return {
          ...v,
          fotos: v.fotos.map((f) =>
            f.id === fotoId ? { ...f, ocorrenciaNumero } : f
          ),
        };
      }),
    })),

  simularSyncVistoria: (vistoriaId) =>
    set((state) => ({
      vistorias: state.vistorias.map((v) => {
        if (v.id !== vistoriaId) return v;
        return {
          ...v,
          syncStatus: "synced",
          fotosEnviadas: v.fotos.length,
          fotos: v.fotos.map((f) => ({ ...f, syncStatus: "synced" })),
          atualizadaEm: "Sincronizado agora",
        };
      }),
    })),
}));
