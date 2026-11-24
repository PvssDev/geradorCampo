import { create } from "zustand";
import { CONCESSION_CONFIG } from "../../domain/config/concessionConfig";
import {
  CategoriaRelatorio,
  FotoMidiaEntity,
  OcorrenciaEntity,
  TipoRelatorio,
  VistoriaSessionEntity,
} from "../../domain/entities/types";
import { MOCK_VISTORIAS } from "../../infrastructure/mocks/mockData";

interface MobileAppState {
  isOnline: boolean;
  usuarioNome: string;
  usuarioEmail: string;
  tipoRelatorio: TipoRelatorio;
  categoriaRelatorio: CategoriaRelatorio;
  vistorias: VistoriaSessionEntity[];
  activeVistoriaId: string;
  toggleOnlineMode: () => void;
  setModalidade: (tipo: TipoRelatorio, categoria: CategoriaRelatorio) => void;
  setActiveVistoriaId: (id: string) => void;
  criarVistoria: (params: {
    idFiscalizacao: string;
    local: string;
    cidade: string;
    equipe: string;
    coordenador: string;
  }) => string;
  adicionarOcorrencia: (
    vistoriaId: string,
    ocorrencia: Omit<OcorrenciaEntity, "numero" | "idFiscalizacao">
  ) => void;
  atualizarRecomendacoesSocicam: (vistoriaId: string, texto: string) => void;
  simularCapturaFoto: (vistoriaId: string, ocorrenciaNumero?: number) => FotoMidiaEntity;
  simularSyncVistoria: (vistoriaId: string) => void;
}

export const useMobileStore = create<MobileAppState>((set, get) => ({
  isOnline: false, // Inicia em modo offline-first para evidenciar o comportamento de campo
  usuarioNome: "Equipe Técnica CTR",
  usuarioEmail: "fiscalizacao@arpe.pe.gov.br",
  tipoRelatorio: "CRA",
  categoriaRelatorio: "Fiscalização",
  vistorias: [...MOCK_VISTORIAS],
  activeVistoriaId: MOCK_VISTORIAS[0].id,

  toggleOnlineMode: () => set((state) => ({ isOnline: !state.isOnline })),

  setModalidade: (tipo, categoria) =>
    set((state) => {
      const match = state.vistorias.find(
        (v) => v.tipoRelatorio === tipo && v.categoriaRelatorio === categoria
      );
      return {
        tipoRelatorio: tipo,
        categoriaRelatorio: categoria,
        activeVistoriaId: match ? match.id : state.activeVistoriaId,
      };
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

  criarVistoria: ({ idFiscalizacao, local, cidade, equipe, coordenador }) => {
    const state = get();
    const cfg = CONCESSION_CONFIG[state.tipoRelatorio];
    const now = new Date();
    const dataBr = now.toLocaleDateString("pt-BR");
    const horaBr = now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const newId = `v-${state.tipoRelatorio.toLowerCase()}-${Date.now()}`;

    const nova: VistoriaSessionEntity = {
      id: newId,
      tipoRelatorio: state.tipoRelatorio,
      categoriaRelatorio: state.categoriaRelatorio,
      fiscalizacao: {
        idFiscalizacao:
          idFiscalizacao.trim() ||
          `${state.categoriaRelatorio === "Monitoramento" ? "MON" : "FISC"}-${state.tipoRelatorio}-${now.getFullYear()}-001`,
        data: dataBr,
        hora: horaBr,
        cidade: cidade.trim() || local.trim(),
        local: local.trim() || cfg.locaisSugeridos[0],
        pessoalResponsavel: equipe.trim() || state.usuarioNome,
        coordenador: coordenador.trim() || "Maria Ângela Albuquerque de Freitas",
        contrato: cfg.contratoPadrao,
        periodo: `${dataBr} - ${dataBr}`,
      },
      ocorrencias: [],
      fotos: [],
      totalAnteriorMonitoramento:
        state.categoriaRelatorio === "Monitoramento" ? 3 : 0,
      syncStatus: "pending",
      fotosEnviadas: 0,
      atualizadaEm: `Hoje · ${horaBr}`,
    };

    set({
      vistorias: [nova, ...state.vistorias],
      activeVistoriaId: newId,
    });
    return newId;
  },

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
          atualizadaEm: "Agora · Salvo offline",
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

