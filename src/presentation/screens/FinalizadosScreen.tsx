import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { CheckCircle2, Cloud, HardDrive, ShieldCheck } from "lucide-react-native";
import { VistoriaSessionEntity } from "../../domain/entities/types";
import {
  filtrarVistoriasFinalizadas,
  resolverModoRede,
} from "../../domain/rules/domainRules";
import { useAuthStore } from "../../application/store/useAuthStore";
import { useMobileStore } from "../../application/store/useMobileStore";
import { toast } from "../../application/store/useToastStore";
import { NuvemVistoriaItem } from "../../infrastructure/sync/syncEngine";
import { ARPE_COLORS } from "../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../theme/tokens";
import { AnimatedValueText, FadeSlideView } from "../components/common/MotionPrimitives";
import { WifiStatusPill } from "../components/finalizados/WifiStatusPill";
import { FinalizadoCard } from "../components/finalizados/FinalizadoCard";
import { FinalizadoDetalheModal } from "../components/finalizados/FinalizadoDetalheModal";
import { NuvemAcoesModal } from "../components/finalizados/NuvemAcoesModal";

interface FinalizadosScreenProps {
  readonly onReabrirSuccess?: () => void;
}

type AbaFinalizados = "local" | "nuvem";

function nuvemItemParaCardSession(item: NuvemVistoriaItem): VistoriaSessionEntity {
  const fisc = item.payload_json?.fiscalizacao;
  const totalFotos = Math.max(0, item.total_fotos);
  return {
    id: item.id,
    autorId: item.autor_id,
    autorUsuario: item.autor_usuario,
    autorNome: item.autor_nome,
    tipoRelatorio: item.concessao,
    categoriaRelatorio: item.modalidade,
    lifecycleStatus: "finalizada",
    syncStandby: false,
    fiscalizacao: {
      idFiscalizacao: item.id_fiscalizacao,
      data: fisc?.Data || item.atualizado_em.slice(0, 10),
      hora: fisc?.Hora || "",
      cidade: fisc?.Cidade || "",
      local: fisc?.Local || item.autor_nome || `@${item.autor_usuario}`,
      pessoalResponsavel: fisc?.["Pessoal Responsável"] || item.autor_nome,
      coordenador: fisc?.Coordenador || "",
      contrato: fisc?.Contrato || "",
      periodo: fisc?.Período || "",
    },
    ocorrencias: [],
    fotos: Array.from({ length: totalFotos }, (_, idx) => ({
      id: `${item.id}-f-${idx}`,
      nomeArquivo: `FOTO_${idx + 1}.jpg`,
      localUri: "",
      tamanhoKb: 0,
      capturadaEm: "",
      syncStatus: "synced",
    })),
    totalAnteriorMonitoramento: 0,
    syncStatus: "synced",
    fotosEnviadas: totalFotos,
    atualizadaEm: item.atualizado_em,
  };
}

export const FinalizadosScreen: React.FC<FinalizadosScreenProps> = ({
  onReabrirSuccess,
}) => {
  const vistorias = useMobileStore((s) => s.vistorias);
  const nuvemVistorias = useMobileStore((s) => s.nuvemVistorias);
  const nuvemLoading = useMobileStore((s) => s.nuvemLoading);
  const nuvemErro = useMobileStore((s) => s.nuvemErro);
  const networkMode = useMobileStore((s) => s.networkMode);
  const setNetworkMode = useMobileStore((s) => s.setNetworkMode);
  const carregarVistoriasNuvem = useMobileStore((s) => s.carregarVistoriasNuvem);
  const sincronizarVistoriaAgora = useMobileStore((s) => s.sincronizarVistoriaAgora);
  const reabrirVistoria = useMobileStore((s) => s.reabrirVistoria);
  const puxarVistoriaDaNuvem = useMobileStore((s) => s.puxarVistoriaDaNuvem);
  const apagarVistoriaDaNuvem = useMobileStore((s) => s.apagarVistoriaDaNuvem);
  const redirecionarVistoriaNuvem = useMobileStore((s) => s.redirecionarVistoriaNuvem);
  const perfilAtual = useAuthStore((s) => s.session?.perfil);

  const [aba, setAba] = useState<AbaFinalizados>("local");
  const [detalheId, setDetalheId] = useState<string | null>(null);
  const [nuvemSelecionada, setNuvemSelecionada] = useState<NuvemVistoriaItem | null>(
    null
  );
  const [deviceConnected, setDeviceConnected] = useState<boolean>(
    Platform.OS === "web" && typeof navigator !== "undefined"
      ? navigator.onLine
      : true
  );

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const syncWebNet = () => {
        const connected = navigator.onLine;
        setDeviceConnected(connected);
        if (networkMode !== "offline_manual") {
          setNetworkMode(resolverModoRede(false, connected));
        }
      };
      window.addEventListener("online", syncWebNet);
      window.addEventListener("offline", syncWebNet);
      return () => {
        window.removeEventListener("online", syncWebNet);
        window.removeEventListener("offline", syncWebNet);
      };
    }

    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = Boolean(
        state.isConnected && state.isInternetReachable !== false
      );
      setDeviceConnected(connected);
      if (networkMode !== "offline_manual") {
        setNetworkMode(resolverModoRede(false, connected));
      }
    });
    return () => unsubscribe();
  }, [networkMode, setNetworkMode]);

  useEffect(() => {
    if (aba === "nuvem") {
      void carregarVistoriasNuvem();
    }
  }, [aba, carregarVistoriasNuvem]);

  const finalizadas = useMemo(
    () => filtrarVistoriasFinalizadas(vistorias),
    [vistorias]
  );
  const finalizadasLocais = useMemo(
    () => finalizadas.filter((v) => v.syncStatus !== "synced"),
    [finalizadas]
  );
  const vistoriaDetalhe = useMemo(
    () => finalizadas.find((v) => v.id === detalheId) ?? null,
    [finalizadas, detalheId]
  );

  const handleToggleOfflineManual = (ativarOffline: boolean) => {
    const resolved = resolverModoRede(ativarOffline, deviceConnected);
    setNetworkMode(resolved);
    if (resolved === "online") {
      toast.success(
        "Modo Online ativo",
        "Relatórios finalizados fora de standby sincronizados."
      );
      void carregarVistoriasNuvem();
    } else if (resolved === "disconnected") {
      toast.warning(
        "Sem conexão Wi-Fi/rede",
        "Tentará enviar automaticamente assim que a internet voltar."
      );
    }
  };

  const handleReabrir = async (vistoriaId: string) => {
    const res = await reabrirVistoria(vistoriaId);
    if (!res.ok) {
      toast.error(
        "Não foi possível reabrir",
        res.erro ?? "Falha ao remover vistoria da nuvem."
      );
      return;
    }
    setDetalheId(null);
    setNuvemSelecionada(null);
    toast.success(
      "Relatório reaberto",
      "Removido da nuvem (se sincronizado) e movido para Vistorias locais."
    );
    onReabrirSuccess?.();
  };

  const handlePuxar = async (vistoriaId: string) => {
    const res = await puxarVistoriaDaNuvem(vistoriaId);
    if (!res.ok) {
      toast.error("Falha ao puxar", res.erro ?? "Não foi possível baixar a vistoria.");
      return;
    }
    setNuvemSelecionada(null);
    setAba("local");
    toast.success(
      "Puxada para Local",
      "Removida da nuvem. Você pode reabrir ou reenviar na aba Local."
    );
  };

  const handleApagarNuvem = async (vistoriaId: string) => {
    const res = await apagarVistoriaDaNuvem(vistoriaId);
    if (!res.ok) {
      toast.error("Falha ao apagar", res.erro ?? "Erro ao remover da nuvem.");
      return;
    }
    setNuvemSelecionada(null);
    toast.success("Vistoria apagada", "Removida do banco e do bucket na nuvem.");
  };

  const handleRedirecionar = async (vistoriaId: string, novoAutorId: string) => {
    const res = await redirecionarVistoriaNuvem(vistoriaId, novoAutorId);
    if (!res.ok) {
      toast.error("Falha ao redirecionar", res.erro ?? "Erro ao atribuir responsável.");
      return;
    }
    setNuvemSelecionada(null);
    toast.success("Vistoria redirecionada", "Responsável atualizado na nuvem.");
  };

  const totalBadge =
    aba === "local" ? finalizadasLocais.length : nuvemVistorias.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.kicker}>ENVIO & HISTÓRICO NA NUVEM</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Finalizados</Text>
            <View style={styles.countPill}>
              <AnimatedValueText
                inline
                valueKey={String(totalBadge)}
                style={styles.countPillText}
              >
                {totalBadge}
              </AnimatedValueText>
            </View>
          </View>
        </View>

        <WifiStatusPill
          mode={networkMode}
          onToggleOfflineManual={handleToggleOfflineManual}
        />
      </View>

      <View style={styles.tabsBar}>
        <Pressable
          onPress={() => setAba("local")}
          style={[styles.tabBtn, aba === "local" && styles.tabBtnActive]}
        >
          <HardDrive
            size={15}
            color={aba === "local" ? ARPE_COLORS.white : ARPE_COLORS.textSecondary}
          />
          <Text style={[styles.tabText, aba === "local" && styles.tabTextActive]}>
            Local ({finalizadasLocais.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setAba("nuvem")}
          style={[styles.tabBtn, aba === "nuvem" && styles.tabBtnActive]}
        >
          <Cloud
            size={15}
            color={aba === "nuvem" ? ARPE_COLORS.white : ARPE_COLORS.textSecondary}
          />
          <Text style={[styles.tabText, aba === "nuvem" && styles.tabTextActive]}>
            Nuvem ({nuvemVistorias.length})
          </Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {aba === "local" ? (
          <FlatList
            data={finalizadasLocais}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.lgpdBanner}>
                <ShieldCheck size={16} color={ARPE_COLORS.statusSanada} />
                <Text style={styles.lgpdText}>
                  Fotos enviadas por URL privada autenticada para o bucket do
                  projeto, mantendo os registros e imagens vinculados à vistoria.
                </Text>
              </View>
            }
            ListEmptyComponent={
              <FadeSlideView distance={10} duration={220} style={styles.emptyBox}>
                <CheckCircle2 size={28} color={ARPE_COLORS.textMuted} />
                <Text style={styles.emptyTitle}>Nenhuma pendente local</Text>
                <Text style={styles.emptySub}>
                  Vistorias finalizadas que já subiram aparecem na aba Nuvem.
                </Text>
              </FadeSlideView>
            }
            renderItem={({ item, index }) => (
              <FinalizadoCard
                vistoria={item}
                index={index}
                onPress={setDetalheId}
                onRetrySync={(v) => sincronizarVistoriaAgora(v.id)}
              />
            )}
          />
        ) : (
          <FlatList
            data={nuvemVistorias}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={nuvemLoading}
                onRefresh={() => void carregarVistoriasNuvem()}
              />
            }
            ListHeaderComponent={
              nuvemErro ? (
                <View style={styles.errBanner}>
                  <Text style={styles.errText}>{nuvemErro}</Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <FadeSlideView distance={10} duration={220} style={styles.emptyBox}>
                <Cloud size={28} color={ARPE_COLORS.textMuted} />
                <Text style={styles.emptyTitle}>
                  {nuvemLoading
                    ? "Carregando nuvem..."
                    : "Nenhuma vistoria na nuvem"}
                </Text>
                <Text style={styles.emptySub}>
                  Arraste para baixo para atualizar a lista de vistorias enviadas pela equipe.
                </Text>
              </FadeSlideView>
            }
            renderItem={({ item, index }) => {
              const localMatch = vistorias.find((v) => v.id === item.id);
              const autorNome =
                item.autor_nome ||
                localMatch?.autorNome ||
                (item.autor_id === perfilAtual?.id ? perfilAtual.nomeCompleto : "") ||
                item.autor_usuario;
              const autorUsuario =
                item.autor_usuario ||
                localMatch?.autorUsuario ||
                (item.autor_id === perfilAtual?.id ? perfilAtual.usuario : "");
              return (
                <FinalizadoCard
                  vistoria={nuvemItemParaCardSession(item)}
                  index={index}
                  statusOverrideLabel="Sincronizado"
                  hideLocalControls
                  autorDiscreto={{
                    nomeCompleto: autorNome,
                    usuario: autorUsuario,
                  }}
                  onPress={() => setNuvemSelecionada(item)}
                />
              );
            }}
          />
        )}
      </View>

      <FinalizadoDetalheModal
        vistoria={vistoriaDetalhe}
        onClose={() => setDetalheId(null)}
        onReabrir={(id) => void handleReabrir(id)}
      />

      <NuvemAcoesModal
        item={nuvemSelecionada}
        callerId={perfilAtual?.id}
        callerRole={perfilAtual?.role}
        onClose={() => setNuvemSelecionada(null)}
        onPuxar={handlePuxar}
        onApagarNuvem={handleApagarNuvem}
        onRedirecionar={handleRedirecionar}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: ARPE_COLORS.navy },
  header: {
    backgroundColor: ARPE_COLORS.navy,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  headerTextWrap: { flex: 1 },
  kicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    color: "rgba(255,255,255,0.62)",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginTop: 2 },
  title: { fontSize: 20, fontWeight: "800", color: ARPE_COLORS.white },
  countPill: {
    minWidth: 26,
    height: 24,
    borderRadius: RADII.pill,
    paddingHorizontal: SPACING.sm,
    backgroundColor: ARPE_COLORS.navyElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  countPillText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "800",
    color: ARPE_COLORS.white,
    includeFontPadding: false,
  },
  tabsBar: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    backgroundColor: ARPE_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: ARPE_COLORS.border,
  },
  tabBtn: {
    flex: 1,
    minHeight: TOUCH_TARGET_MIN - 8,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: ARPE_COLORS.borderStrong,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: ARPE_COLORS.navy,
    borderColor: ARPE_COLORS.navy,
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: ARPE_COLORS.textSecondary,
  },
  tabTextActive: {
    color: ARPE_COLORS.white,
  },
  body: { flex: 1, backgroundColor: ARPE_COLORS.surfaceMuted },
  listContent: { padding: SPACING.xl, gap: SPACING.md, paddingBottom: SPACING.xxl },
  lgpdBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: ARPE_COLORS.statusSanadaSoft,
    borderRadius: RADII.md,
    padding: SPACING.md,
  },
  lgpdText: { flex: 1, fontSize: 11.5, lineHeight: 16, color: ARPE_COLORS.textPrimary },
  errBanner: {
    backgroundColor: ARPE_COLORS.dangerSoft,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.dangerBorder,
    padding: SPACING.md,
  },
  errText: { fontSize: 12, fontWeight: "700", color: ARPE_COLORS.danger },
  emptyBox: {
    marginTop: SPACING.lg,
    backgroundColor: ARPE_COLORS.surface,
    borderRadius: RADII.xl,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    padding: SPACING.xxl,
    alignItems: "center",
    gap: SPACING.sm,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  emptySub: { fontSize: 13, lineHeight: 19, color: ARPE_COLORS.textSecondary, textAlign: "center" },
});
