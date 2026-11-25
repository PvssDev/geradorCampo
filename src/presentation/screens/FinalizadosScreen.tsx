import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NetInfo from "@react-native-community/netinfo";
import { CheckCircle2, ShieldCheck } from "lucide-react-native";
import { VistoriaSessionEntity } from "../../domain/entities/types";
import {
  filtrarVistoriasFinalizadas,
  resolverModoRede,
} from "../../domain/rules/domainRules";
import { useMobileStore } from "../../application/store/useMobileStore";
import { toast } from "../../application/store/useToastStore";
import { ARPE_COLORS } from "../theme/colors";
import { RADII, SPACING } from "../theme/tokens";
import {
  AnimatedValueText,
  FadeSlideView,
} from "../components/common/MotionPrimitives";
import { WifiStatusPill } from "../components/finalizados/WifiStatusPill";
import { FinalizadoCard } from "../components/finalizados/FinalizadoCard";
import { FinalizadoDetalheModal } from "../components/finalizados/FinalizadoDetalheModal";

interface FinalizadosScreenProps {
  readonly onReabrirSuccess?: () => void;
}

export const FinalizadosScreen: React.FC<FinalizadosScreenProps> = ({
  onReabrirSuccess,
}) => {
  const vistorias = useMobileStore((s) => s.vistorias);
  const networkMode = useMobileStore((s) => s.networkMode);
  const setNetworkMode = useMobileStore((s) => s.setNetworkMode);
  const toggleStandbyVistoria = useMobileStore((s) => s.toggleStandbyVistoria);
  const reabrirVistoria = useMobileStore((s) => s.reabrirVistoria);

  const [detalheId, setDetalheId] = useState<string | null>(null);
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

  const finalizadas = useMemo(
    () => filtrarVistoriasFinalizadas(vistorias),
    [vistorias]
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
    } else if (resolved === "disconnected") {
      toast.warning(
        "Sem conexão Wi-Fi/rede",
        "Tentará enviar automaticamente assim que a internet voltar."
      );
    }
  };

  const handleToggleStandby = (v: VistoriaSessionEntity) => {
    const ativando = !v.syncStandby;
    toggleStandbyVistoria(v.id);
    toast.info(
      ativando ? "Sessão em Standby" : "Envio liberado",
      ativando
        ? "Auto-sync pausado para este relatório."
        : networkMode === "online"
          ? "Sincronizado automaticamente."
          : "Aguardando conexão para enviar."
    );
  };

  const handleReabrir = (vistoriaId: string) => {
    setDetalheId(null);
    reabrirVistoria(vistoriaId);
    toast.success(
      "Relatório reaberto",
      "Movido de volta para a aba Vistorias para edição."
    );
    onReabrirSuccess?.();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.kicker}>ENVIO & HISTÓRICO LOCAL</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Finalizados</Text>
            <View style={styles.countPill}>
              <AnimatedValueText
                inline
                valueKey={String(finalizadas.length)}
                style={styles.countPillText}
              >
                {finalizadas.length}
              </AnimatedValueText>
            </View>
          </View>
        </View>

        <WifiStatusPill
          mode={networkMode}
          onToggleOfflineManual={handleToggleOfflineManual}
        />
      </View>

      <View style={styles.body}>
        <FlatList
          data={finalizadas}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.lgpdBanner}>
              <ShieldCheck size={16} color={ARPE_COLORS.statusSanada} />
              <Text style={styles.lgpdText}>
                Fotos sobem via URL privada temporária e são expurgadas após a
                emissão do .docx no Web (TTL 15d).
              </Text>
            </View>
          }
          ListEmptyComponent={
            <FadeSlideView distance={10} duration={220} style={styles.emptyBox}>
              <CheckCircle2 size={28} color={ARPE_COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Nenhum relatório finalizado</Text>
              <Text style={styles.emptySub}>
                Ao finalizar uma vistoria na aba Início, ela aparecerá aqui para
                acompanhamento e sincronização automática.
              </Text>
            </FadeSlideView>
          }
          renderItem={({ item, index }) => (
            <FinalizadoCard
              vistoria={item}
              index={index}
              onPress={setDetalheId}
              onToggleStandby={handleToggleStandby}
            />
          )}
        />
      </View>

      <FinalizadoDetalheModal
        vistoria={vistoriaDetalhe}
        onClose={() => setDetalheId(null)}
        onReabrir={handleReabrir}
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
    paddingBottom: SPACING.lg,
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
