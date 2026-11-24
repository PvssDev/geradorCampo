import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CheckCircle2,
  CloudOff,
  CloudUpload,
  ShieldCheck,
  Wifi,
} from "lucide-react-native";
import { useMobileStore } from "../../application/store/useMobileStore";
import { ARPE_COLORS, getConcessionTheme } from "../theme/colors";
import { RADII, SPACING } from "../theme/tokens";

export const SyncQueueScreen: React.FC = () => {
  const {
    isOnline,
    vistorias,
    tipoRelatorio,
    categoriaRelatorio,
    toggleOnlineMode,
    simularSyncVistoria,
  } = useMobileStore();

  const theme = getConcessionTheme(tipoRelatorio, categoriaRelatorio);
  const pendentes = vistorias.filter((v) => v.syncStatus !== "synced");

  const handleSync = (vistoriaId: string) => {
    if (!isOnline) {
      Alert.alert(
        "Dispositivo Offline",
        "Ative a conexão (ou simule Online em Ajustes/Topo) para enviar as fotos para o Storage Temporário."
      );
      return;
    }
    simularSyncVistoria(vistoriaId);
    Alert.alert(
      "Sincronização Concluída",
      "Vistoria e fotos comprimidas enviadas para a fila temporária. Já disponível para importação no Web."
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerKicker}>HANDOFF TEMPORÁRIO · MOBILE → WEB</Text>
        <Text style={styles.headerTitle}>Fila de Sincronização</Text>
        <Pressable onPress={toggleOnlineMode} style={styles.networkPill}>
          {isOnline ? (
            <Wifi size={14} color={ARPE_COLORS.statusOnline} />
          ) : (
            <CloudOff size={14} color={ARPE_COLORS.statusOffline} />
          )}
          <Text style={styles.networkPillText}>
            {isOnline
              ? "Online · Toque para simular Offline"
              : "Offline · Toque para simular Online"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.lgpdBanner}>
          <ShieldCheck size={18} color={ARPE_COLORS.statusSanada} />
          <Text style={styles.lgpdText}>
            Fotos comprimidas (~200 KB) sobem via Presigned URL privada e são
            expurgadas automaticamente após emissão do .docx no Web (TTL 15d).
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          Vistorias no Dispositivo ({pendentes.length} pendente(s))
        </Text>

        <View style={styles.list}>
          {vistorias.map((v) => {
            const vTheme = getConcessionTheme(
              v.tipoRelatorio,
              v.categoriaRelatorio
            );
            const totalFotos = Math.max(v.fotos.length, 1);
            const pct = Math.round((v.fotosEnviadas / totalFotos) * 100);
            const isDone = v.syncStatus === "synced";

            return (
              <View key={v.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardId}>
                      {v.fiscalizacao.idFiscalizacao}
                    </Text>
                    <Text style={styles.cardSub}>
                      {v.tipoRelatorio} · {v.categoriaRelatorio} ·{" "}
                      {v.ocorrencias.length} ocorrência(s)
                    </Text>
                  </View>
                  {isDone ? (
                    <CheckCircle2
                      size={20}
                      color={ARPE_COLORS.statusSanada}
                    />
                  ) : (
                    <CloudUpload size={20} color={vTheme.primary} />
                  )}
                </View>

                <View style={styles.progressMeta}>
                  <Text style={styles.progressLabel}>
                    Fotos enviadas: {v.fotosEnviadas}/{v.fotos.length}
                  </Text>
                  <Text style={styles.progressPct}>{pct}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: isDone
                          ? ARPE_COLORS.statusSanada
                          : vTheme.primary,
                      },
                    ]}
                  />
                </View>

                {!isDone && (
                  <Pressable
                    onPress={() => handleSync(v.id)}
                    style={[
                      styles.syncBtn,
                      {
                        backgroundColor: isOnline
                          ? theme.primary
                          : ARPE_COLORS.borderStrong,
                      },
                    ]}
                  >
                    <Text style={styles.syncBtnText}>
                      {isOnline
                        ? "Sincronizar Agora"
                        : "Aguardando Conexão de Rede"}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ARPE_COLORS.navy,
  },
  header: {
    backgroundColor: ARPE_COLORS.navy,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  headerKicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: "rgba(255,255,255,0.62)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: ARPE_COLORS.white,
    marginTop: 2,
  },
  networkPill: {
    marginTop: SPACING.md,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: ARPE_COLORS.navyElevated,
    borderRadius: RADII.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
  },
  networkPillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: ARPE_COLORS.white,
  },
  body: {
    flex: 1,
    backgroundColor: ARPE_COLORS.surface,
  },
  content: {
    padding: SPACING.xl,
    paddingBottom: 32,
  },
  lgpdBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    backgroundColor: ARPE_COLORS.statusSanadaSoft,
    borderRadius: RADII.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  lgpdText: {
    flex: 1,
    fontSize: 11.5,
    color: ARPE_COLORS.textPrimary,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  list: {
    gap: SPACING.md,
  },
  card: {
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    padding: SPACING.lg,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  cardId: {
    fontSize: 14,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
  },
  cardSub: {
    fontSize: 12,
    color: ARPE_COLORS.textSecondary,
    marginTop: 2,
  },
  progressMeta: {
    marginTop: SPACING.md,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: ARPE_COLORS.textSecondary,
  },
  progressPct: {
    fontSize: 11.5,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
  },
  progressTrack: {
    marginTop: 6,
    height: 8,
    borderRadius: 4,
    backgroundColor: ARPE_COLORS.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  syncBtn: {
    marginTop: SPACING.md,
    minHeight: 44,
    borderRadius: RADII.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  syncBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
});

