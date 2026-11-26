import { create } from "zustand";
import { CONCESSION_CONFIG } from "../../domain/config/concessionConfig";
import {
  CategoriaRelatorio,
  FotoMidiaEntity,
  GaleriaFotoEntity,
  NetworkMode,
  OcorrenciaEntity,
  TipoAchado,
  TipoRelatorio,
  VistoriaSessionEntity,
} from "../../domain/entities/types";
import {
  aplicarEdicaoRelacionamento,
  construirRelacionamentoValidado,
  criarFotoGaleriaDeVistoria,
  desvincularFotosDeVistorias,
  FotoOcorrenciaAlvo,
  podeAutoSincronizar,
  removerFotoDeOcorrencia,
} from "../../domain/rules/domainRules";
import {
  isNativeSqliteSupported,
  PREF_SALVAR_GALERIA_CELULAR,
  sqliteClient,
} from "../../infrastructure/database/sqliteClient";
import type * as MediaServiceModule from "../../infrastructure/media/mediaService";
import type * as SyncEngineModule from "../../infrastructure/sync/syncEngine";
import type { NuvemVistoriaItem } from "../../infrastructure/sync/syncEngine";
import { MOCK_VISTORIAS } from "../../infrastructure/mocks/mockData";
import { toast } from "./useToastStore";
import type * as AuthStoreModule from "./useAuthStore";

function obterAutorAtual(): {
  readonly autorId?: string;
  readonly autorUsuario?: string;
  readonly autorNome?: string;
} {
  try {
    const { useAuthStore } = require("./useAuthStore") as typeof AuthStoreModule;
    const perfil = useAuthStore.getState().session?.perfil;
    if (!perfil) return {};
    return {
      autorId: perfil.id,
      autorUsuario: perfil.usuario,
      autorNome: perfil.nomeCompleto,
    };
  } catch {
    return {};
  }
}

const USAR_SQLITE_NATIVO = isNativeSqliteSupported();

const INITIAL_VISTORIAS: readonly VistoriaSessionEntity[] = USAR_SQLITE_NATIVO
  ? []
  : MOCK_VISTORIAS;

const INITIAL_GALERIA_FOTOS: readonly GaleriaFotoEntity[] = USAR_SQLITE_NATIVO
  ? []
  : MOCK_VISTORIAS.flatMap((v) =>
    v.fotos.map((f) => criarFotoGaleriaDeVistoria(v, f))
  );

export type WizardStep = "modalidade" | "dados_iniciais" | "coleta";

interface MobileAppState {
  dbHydrated: boolean;
  salvarCopiaGaleriaCelular: boolean;
  isOnline: boolean;
  networkMode: NetworkMode;
  wizardStep: WizardStep;
  usuarioNome: string;
  tipoRelatorio: TipoRelatorio;
  categoriaRelatorio: CategoriaRelatorio;
  vistorias: VistoriaSessionEntity[];
  galeriaFotos: GaleriaFotoEntity[];
  nuvemVistorias: NuvemVistoriaItem[];
  nuvemLoading: boolean;
  nuvemErro: string | null;
  activeVistoriaId: string;
  hidratarBancoLocal: () => Promise<void>;
  carregarVistoriasNuvem: () => Promise<void>;
  setSalvarCopiaGaleriaCelular: (ativo: boolean) => void;
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
  atualizarOcorrencia: (
    vistoriaId: string,
    ocorrenciaNumero: number,
    dados: Omit<OcorrenciaEntity, "numero" | "idFiscalizacao" | "relacionamento">
  ) => void;
  atualizarRelacionamentoOcorrencia: (params: {
    vistoriaId: string;
    ocorrenciaNumero: number;
    sigla: TipoAchado;
    siglas?: readonly string[];
    faixa?: string;
    setorPredial?: string;
    codificacao?: string;
    fundamento: string;
    determinacao: string;
  }) => void;
  removerFotoOcorrencia: (
    vistoriaId: string,
    ocorrenciaNumero: number,
    alvo: FotoOcorrenciaAlvo
  ) => "atualizada" | "ocorrencia_excluida";
  excluirOcorrencia: (vistoriaId: string, ocorrenciaNumero: number) => void;
  relacionarOcorrencia: (params: {
    vistoriaId: string;
    ocorrenciaNumero: number;
    sigla: TipoAchado;
    siglas?: readonly string[];
    faixa?: string;
    setorPredial?: string;
    codificacao?: string;
    fotoRelacionadaNome?: string;
    fotoRelacionadaUri?: string;
    fotoRelacionadaTamanhoKb?: number;
    registroReferenciaNumero?: number;
  }) => { ok: true } | { ok: false; erro: string };
  finalizarVistoria: (vistoriaId: string, nomeIdRelatorio: string) => void;
  reabrirVistoria: (vistoriaId: string) => Promise<{ ok: boolean; erro?: string }>;
  puxarVistoriaDaNuvem: (vistoriaId: string) => Promise<{ ok: boolean; erro?: string }>;
  apagarVistoriaDaNuvem: (vistoriaId: string) => Promise<{ ok: boolean; erro?: string }>;
  redirecionarVistoriaNuvem: (
    vistoriaId: string,
    novoAutorId: string
  ) => Promise<{ ok: boolean; erro?: string }>;
  excluirVistorias: (vistoriaIds: readonly string[]) => void;
  excluirFotosGaleria: (fotoIds: readonly string[]) => void;
  toggleStandbyVistoria: (vistoriaId: string) => void;
  executarAutoSyncFinalizados: () => void;
  sincronizarVistoriaAgora: (vistoriaId: string) => void;
  atualizarRecomendacoesSocicam: (vistoriaId: string, texto: string) => void;
  registrarFotoCapturada: (
    vistoriaId: string,
    params: {
      nomeArquivo: string;
      localUri?: string;
      tamanhoKb: number;
      horario: string;
      ocorrenciaNumero?: number;
    }
  ) => FotoMidiaEntity;
  simularCapturaFoto: (vistoriaId: string, ocorrenciaNumero?: number) => FotoMidiaEntity;
  vincularFotoUltimaOcorrencia: (vistoriaId: string, fotoId: string, ocorrenciaNumero: number) => void;
  simularSyncVistoria: (vistoriaId: string) => void;
}

export const useMobileStore = create<MobileAppState>((set, get) => ({
  dbHydrated: !USAR_SQLITE_NATIVO,
  salvarCopiaGaleriaCelular: true,
  isOnline: false,
  networkMode: "offline_manual",
  wizardStep: "modalidade",
  usuarioNome: "Equipe Técnica CTR",
  tipoRelatorio: "CRA",
  categoriaRelatorio: "Fiscalização",
  vistorias: [...INITIAL_VISTORIAS],
  galeriaFotos: [...INITIAL_GALERIA_FOTOS],
  nuvemVistorias: [],
  nuvemLoading: false,
  nuvemErro: null,
  activeVistoriaId: "",

  hidratarBancoLocal: async () => {
    const [snapshot, salvarGaleria] = await Promise.all([
      sqliteClient.carregarSnapshot(),
      sqliteClient.carregarPreferenciaBooleana(PREF_SALVAR_GALERIA_CELULAR, true),
    ]);
    if (!snapshot) {
      set({ dbHydrated: true, salvarCopiaGaleriaCelular: salvarGaleria });
      return;
    }
    set({
      vistorias: snapshot.vistorias,
      galeriaFotos: snapshot.galeriaFotos,
      salvarCopiaGaleriaCelular: salvarGaleria,
      dbHydrated: true,
    });
  },

  carregarVistoriasNuvem: async () => {
    if (!USAR_SQLITE_NATIVO) return;
    set({ nuvemLoading: true, nuvemErro: null });
    const { syncEngine } =
      require("../../infrastructure/sync/syncEngine") as typeof SyncEngineModule;
    const res = await syncEngine.listarVistoriasNuvem();
    if (!res.ok) {
      set({ nuvemLoading: false, nuvemErro: res.erro ?? "Erro ao carregar nuvem." });
      return;
    }
    set({ nuvemVistorias: res.vistorias, nuvemLoading: false, nuvemErro: null });
  },

  setSalvarCopiaGaleriaCelular: (ativo) => {
    set({ salvarCopiaGaleriaCelular: ativo });
    void sqliteClient.salvarPreferenciaBooleana(
      PREF_SALVAR_GALERIA_CELULAR,
      ativo
    );
  },

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
    const seq = String(state.vistorias.length + 1).padStart(3, "0");
    const newId = `v-${state.tipoRelatorio.toLowerCase()}-${Date.now()}-${seq}`;

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

    const autor = obterAutorAtual();
    const nova: VistoriaSessionEntity = {
      id: newId,
      autorId: autor.autorId,
      autorUsuario: autor.autorUsuario,
      autorNome: autor.autorNome,
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

  atualizarOcorrencia: (vistoriaId, ocorrenciaNumero, dados) =>
    set((state) => ({
      vistorias: state.vistorias.map((v) => {
        if (v.id !== vistoriaId) return v;
        return {
          ...v,
          ocorrencias: v.ocorrencias.map((oc) =>
            oc.numero === ocorrenciaNumero
              ? {
                ...oc,
                ...dados,
                numero: oc.numero,
                idFiscalizacao: oc.idFiscalizacao,
                relacionamento: oc.relacionamento,
              }
              : oc
          ),
          syncStatus: "pending",
          atualizadaEm: "Agora · Ocorrência editada",
        };
      }),
    })),

  atualizarRelacionamentoOcorrencia: ({
    vistoriaId,
    ocorrenciaNumero,
    sigla,
    siglas,
    faixa,
    setorPredial,
    codificacao,
    fundamento,
    determinacao,
  }) =>
    set((state) => ({
      vistorias: state.vistorias.map((v) => {
        if (v.id !== vistoriaId) return v;
        return {
          ...v,
          ocorrencias: v.ocorrencias.map((oc) =>
            oc.numero === ocorrenciaNumero
              ? aplicarEdicaoRelacionamento({
                tipoRelatorio: v.tipoRelatorio,
                ocorrencia: oc,
                sigla,
                siglas,
                faixa,
                setorPredial,
                codificacao,
                fundamento,
                determinacao,
              })
              : oc
          ),
          syncStatus: "pending",
          atualizadaEm: "Agora · Relação atualizada",
        };
      }),
    })),

  removerFotoOcorrencia: (vistoriaId, ocorrenciaNumero, alvo) => {
    const vistoria = get().vistorias.find((v) => v.id === vistoriaId);
    const oc = vistoria?.ocorrencias.find((o) => o.numero === ocorrenciaNumero);
    if (!vistoria || !oc) return "atualizada";

    const resultado = removerFotoDeOcorrencia(oc, alvo);
    if (resultado.acao === "excluir_ocorrencia") {
      get().excluirOcorrencia(vistoriaId, ocorrenciaNumero);
      return "ocorrencia_excluida";
    }

    set((state) => ({
      vistorias: state.vistorias.map((v) => {
        if (v.id !== vistoriaId) return v;
        return {
          ...v,
          ocorrencias: v.ocorrencias.map((item) =>
            item.numero === ocorrenciaNumero ? resultado.ocorrencia : item
          ),
          syncStatus: "pending",
          atualizadaEm: "Agora · Foto removida da ocorrência",
        };
      }),
    }));
    return "atualizada";
  },

  excluirOcorrencia: (vistoriaId, ocorrenciaNumero) =>
    set((state) => ({
      vistorias: state.vistorias.map((v) => {
        if (v.id !== vistoriaId) return v;
        return {
          ...v,
          ocorrencias: v.ocorrencias.filter(
            (oc) => oc.numero !== ocorrenciaNumero
          ),
          syncStatus: "pending",
          atualizadaEm: "Agora · Ocorrência excluída",
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
    fotoRelacionadaUri,
    fotoRelacionadaTamanhoKb,
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

    const jaTemFoto =
      fotoRelacionadaNome &&
      vistoria.fotos.some((f) => f.nomeArquivo === fotoRelacionadaNome);
    const novaFotoRel: FotoMidiaEntity | null =
      fotoRelacionadaNome && !jaTemFoto
        ? {
          id: `foto-rel-${Date.now()}`,
          nomeArquivo: fotoRelacionadaNome,
          localUri:
            fotoRelacionadaUri ||
            `sandbox://vistorias/${vistoriaId}/${fotoRelacionadaNome}`,
          tamanhoKb: fotoRelacionadaTamanhoKb ?? 194,
          capturadaEm: hora,
          syncStatus: "pending",
          ocorrenciaNumero,
        }
        : null;

    set({
      vistorias: state.vistorias.map((v) => {
        if (v.id !== vistoriaId) return v;
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
      galeriaFotos: novaFotoRel
        ? [criarFotoGaleriaDeVistoria(vistoria, novaFotoRel), ...state.galeriaFotos]
        : state.galeriaFotos,
    });

    return { ok: true };
  },

  finalizarVistoria: (vistoriaId, nomeIdRelatorio) => {
    const state = get();
    const autor = obterAutorAtual();
    const hora = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const idFinal = nomeIdRelatorio.trim();
    const estaOnline = state.networkMode === "online";

    set({
      vistorias: state.vistorias.map((v) => {
        if (v.id !== vistoriaId) return v;
        const novoIdFisc = idFinal || v.fiscalizacao.idFiscalizacao;
        // Trava para envio manual se finalizada offline ou se veio de reabrir/puxar
        const deveTravarParaEnvioManual = !estaOnline || v.syncStandby;
        return {
          ...v,
          autorId: v.autorId ?? autor.autorId,
          autorUsuario: v.autorUsuario ?? autor.autorUsuario,
          autorNome: v.autorNome ?? autor.autorNome,
          lifecycleStatus: "finalizada",
          syncStandby: deveTravarParaEnvioManual,
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

    if (estaOnline) {
      get().executarAutoSyncFinalizados();
    }
  },

  reabrirVistoria: async (vistoriaId) => {
    const alvo = get().vistorias.find((v) => v.id === vistoriaId);
    if (USAR_SQLITE_NATIVO && alvo?.syncStatus === "synced") {
      const { syncEngine } =
        require("../../infrastructure/sync/syncEngine") as typeof SyncEngineModule;
      const res = await syncEngine.removerVistoriaDaNuvem(vistoriaId);
      if (!res.ok) {
        return {
          ok: false,
          erro: res.erro ?? "Não foi possível remover a vistoria da nuvem.",
        };
      }
      await sqliteClient.limparSyncQueueVistoria(vistoriaId);
    }

    set((state) => ({
      vistorias: state.vistorias.map((v) =>
        v.id === vistoriaId
          ? {
              ...v,
              lifecycleStatus: "em_aberto",
              syncStandby: true,
              syncStatus: "pending",
              fotosEnviadas: 0,
              fotos: v.fotos.map((f) => ({ ...f, syncStatus: "pending" })),
              atualizadaEm: "Reaberto para edição local",
            }
          : v
      ),
      nuvemVistorias: state.nuvemVistorias.filter((n) => n.id !== vistoriaId),
    }));
    return { ok: true };
  },

  puxarVistoriaDaNuvem: async (vistoriaId) => {
    const { syncEngine } =
      require("../../infrastructure/sync/syncEngine") as typeof SyncEngineModule;
    const res = await syncEngine.puxarVistoriaDaNuvem(vistoriaId);
    if (!res.ok || !res.vistoria) {
      return { ok: false, erro: res.erro ?? "Falha ao puxar vistoria." };
    }
    const puxada: VistoriaSessionEntity = {
      ...res.vistoria,
      syncStandby: true,
    };
    await sqliteClient.limparSyncQueueVistoria(vistoriaId);

    set((state) => {
      const jaExiste = state.vistorias.some((v) => v.id === puxada.id);
      const novasVistorias = jaExiste
        ? state.vistorias.map((v) => (v.id === puxada.id ? puxada : v))
        : [puxada, ...state.vistorias];
      const novasFotosGaleria = puxada.fotos
        .filter((f) => !state.galeriaFotos.some((g) => g.id === `gal-${f.id}`))
        .map((f) => criarFotoGaleriaDeVistoria(puxada, f));

      return {
        vistorias: novasVistorias,
        galeriaFotos: [...novasFotosGaleria, ...state.galeriaFotos],
        nuvemVistorias: state.nuvemVistorias.filter((n) => n.id !== vistoriaId),
      };
    });
    return { ok: true };
  },

  apagarVistoriaDaNuvem: async (vistoriaId) => {
    const { syncEngine } =
      require("../../infrastructure/sync/syncEngine") as typeof SyncEngineModule;
    const res = await syncEngine.removerVistoriaDaNuvem(vistoriaId);
    if (!res.ok) {
      return { ok: false, erro: res.erro ?? "Falha ao apagar da nuvem." };
    }
    set((state) => ({
      nuvemVistorias: state.nuvemVistorias.filter((n) => n.id !== vistoriaId),
      vistorias: state.vistorias.map((v) =>
        v.id === vistoriaId
          ? { ...v, syncStatus: "pending", fotosEnviadas: 0 }
          : v
      ),
    }));
    return { ok: true };
  },

  redirecionarVistoriaNuvem: async (vistoriaId, novoAutorId) => {
    const { syncEngine } =
      require("../../infrastructure/sync/syncEngine") as typeof SyncEngineModule;
    const res = await syncEngine.redirecionarVistoriaNuvem(vistoriaId, novoAutorId);
    if (!res.ok) {
      return { ok: false, erro: res.erro ?? "Falha ao redirecionar vistoria." };
    }
    await get().carregarVistoriasNuvem();
    return { ok: true };
  },

  excluirVistorias: (vistoriaIds) =>
    set((state) => {
      const toDelete = new Set(vistoriaIds);
      const deletingActive = toDelete.has(state.activeVistoriaId);
      return {
        vistorias: state.vistorias.filter((v) => !toDelete.has(v.id)),
        galeriaFotos: desvincularFotosDeVistorias(state.galeriaFotos, vistoriaIds),
        activeVistoriaId: deletingActive ? "" : state.activeVistoriaId,
        wizardStep: deletingActive ? "modalidade" : state.wizardStep,
      };
    }),

  excluirFotosGaleria: (fotoIds) => {
    const state = get();
    const toDelete = new Set(fotoIds);
    const removidas = state.galeriaFotos.filter((f) => toDelete.has(f.id));
    const restantesGaleria = state.galeriaFotos.filter((f) => !toDelete.has(f.id));

    const urisEmUsoNasVistorias = new Set(
      state.vistorias.flatMap((v) => v.fotos.map((f) => f.localUri))
    );
    const urisRestantesNaGaleria = new Set(
      restantesGaleria.map((f) => f.localUri)
    );
    const urisParaApagarNoDisco = removidas
      .map((f) => f.localUri)
      .filter(
        (uri) => !urisEmUsoNasVistorias.has(uri) && !urisRestantesNaGaleria.has(uri)
      );

    set({ galeriaFotos: restantesGaleria });

    if (USAR_SQLITE_NATIVO && urisParaApagarNoDisco.length > 0) {
      const { mediaService } =
        require("../../infrastructure/media/mediaService") as typeof MediaServiceModule;
      void mediaService.removerArquivosPrivados(urisParaApagarNoDisco);
    }
  },

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

  executarAutoSyncFinalizados: () => {
    const state = get();
    const elegiveis = state.vistorias.filter(
      (v) =>
        podeAutoSincronizar(v, state.networkMode) &&
        v.syncStatus !== "uploading"
    );
    if (elegiveis.length === 0) return;

    if (!USAR_SQLITE_NATIVO) {
      set((curr) => ({
        vistorias: curr.vistorias.map((v) => {
          if (!podeAutoSincronizar(v, curr.networkMode)) return v;
          return {
            ...v,
            syncStatus: "synced",
            fotosEnviadas: v.fotos.length,
            fotos: v.fotos.map((f) => ({ ...f, syncStatus: "synced" })),
            atualizadaEm: "Sincronizado automaticamente",
          };
        }),
      }));
      return;
    }

    const { syncEngine } =
      require("../../infrastructure/sync/syncEngine") as typeof SyncEngineModule;

    for (const alvo of elegiveis) {
      set((curr) => ({
        vistorias: curr.vistorias.map((v) =>
          v.id === alvo.id
            ? {
                ...v,
                syncStatus: "uploading",
                atualizadaEm: "Enviando para a nuvem...",
              }
            : v
        ),
      }));

      void syncEngine
        .sincronizarVistoriaCompleta(alvo, (enviadas, _total, fotoId) => {
          set((curr) => ({
            vistorias: curr.vistorias.map((v) => {
              if (v.id !== alvo.id) return v;
              return {
                ...v,
                fotosEnviadas: enviadas,
                fotos: fotoId
                  ? v.fotos.map((f) =>
                      f.id === fotoId ? { ...f, syncStatus: "synced" } : f
                    )
                  : v.fotos,
              };
            }),
          }));
        })
        .then((res) => {
          set((curr) => ({
            vistorias: curr.vistorias.map((v) => {
              if (v.id !== alvo.id) return v;
              if (res.ok) {
                const idFinal =
                  res.idFiscalizacaoFinal || alvo.fiscalizacao.idFiscalizacao;
                toast.success(
                  "Vistoria sincronizada",
                  `${idFinal} enviada para a nuvem.`
                );
                return {
                  ...v,
                  syncStatus: "synced",
                  fotosEnviadas: v.fotos.length,
                  fiscalizacao: {
                    ...v.fiscalizacao,
                    idFiscalizacao: idFinal,
                  },
                  ocorrencias: v.ocorrencias.map((oc) => ({
                    ...oc,
                    idFiscalizacao: idFinal,
                  })),
                  fotos: v.fotos.map((f) => ({ ...f, syncStatus: "synced" })),
                  atualizadaEm: "Sincronizado na nuvem",
                };
              }
              const msgErro = res.erro || "Falha ao enviar para a nuvem.";
              toast.error("Erro no envio", msgErro);
              return {
                ...v,
                syncStatus: curr.networkMode === "online" ? "error" : "pending",
                fotosEnviadas: res.enviadas,
                atualizadaEm: msgErro,
              };
            }),
          }));
          if (res.ok) {
            void get().carregarVistoriasNuvem();
          }
        });
    }
  },

  sincronizarVistoriaAgora: (vistoriaId) => {
    set((state) => ({
      networkMode: "online",
      isOnline: true,
      vistorias: state.vistorias.map((v) =>
        v.id === vistoriaId
          ? { ...v, syncStandby: false, syncStatus: "pending" }
          : v
      ),
    }));
    get().executarAutoSyncFinalizados();
  },

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

  registrarFotoCapturada: (
    vistoriaId,
    { nomeArquivo, localUri, tamanhoKb, horario, ocorrenciaNumero }
  ) => {
    const state = get();
    const target = state.vistorias.find((v) => v.id === vistoriaId);
    const novaFoto: FotoMidiaEntity = {
      id: `foto-${Date.now()}`,
      nomeArquivo,
      localUri: localUri || `sandbox://vistorias/${vistoriaId}/${nomeArquivo}`,
      tamanhoKb,
      capturadaEm: horario,
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
            atualizadaEm: `Hoje · ${horario}`,
          }
          : v
      ),
      galeriaFotos: target
        ? [criarFotoGaleriaDeVistoria(target, novaFoto), ...state.galeriaFotos]
        : state.galeriaFotos,
    });

    return novaFoto;
  },

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
      galeriaFotos: target
        ? [criarFotoGaleriaDeVistoria(target, novaFoto), ...state.galeriaFotos]
        : state.galeriaFotos,
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

useMobileStore.subscribe((state, prevState) => {
  if (!state.dbHydrated) return;
  if (
    state.vistorias !== prevState.vistorias ||
    state.galeriaFotos !== prevState.galeriaFotos
  ) {
    void sqliteClient.salvarSnapshot({
      vistorias: state.vistorias,
      galeriaFotos: state.galeriaFotos,
    });
  }
});
