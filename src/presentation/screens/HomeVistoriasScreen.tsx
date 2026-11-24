import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Building2,
  Camera,
  ChevronDown,
  CloudOff,
  FileText,
  MapPin,
  Plus,
  Wifi,
} from "lucide-react-native";
import { CONCESSION_CONFIG } from "../../domain/config/concessionConfig";
import { VistoriaSessionEntity } from "../../domain/entities/types";
import { useMobileStore } from "../../application/store/useMobileStore";
import { ARPE_COLORS, getConcessionTheme } from "../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../theme/tokens";
import { ArpeMonogram } from "../components/common/ArpeMonogram";
import { ModalitySheetModal } from "../components/common/ModalitySheetModal";

interface HomeVistoriasScreenProps {
  onOpenVistoria: (vistoriaId: string) => void;
  onNovaVistoria: () => void;
}

export const HomeVistoriasScreen: React.FC<HomeVistoriasScreenProps> = ({
  onOpenVistoria,
  onNovaVistoria,
}) => {
  const {
    isOnline,
    tipoRelatorio,
    categoriaRelatorio,
    vistorias,
    toggleOnlineMode,
    setModalidade,
    setActiveVistoriaId,
  } = useMobileStore();

  const [sheetVisible, setSheetVisible] = useState(false);
  const theme = getConcessionTheme(tipoRelatorio, categoriaRelatorio);
  const cfg = CONCESSION_CONFIG[tipoRelatorio];

  const vistoriasFiltradas = useMemo(() => {
    const exact = vistorias.filter(
      (v) =>
        v.tipoRelatorio === tipoRelatorio &&
        v.categoriaRelatorio === categoriaRelatorio
    );
    return exact.length > 0 ? exact : vistorias;
  }, [vistorias, tipoRelatorio, categoriaRelatorio]);

  const handleOpen = (item: VistoriaSessionEntity) => {
    setActiveVistoriaId(item.id);
    onOpenVistoria(item.id);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Institucional Azul-Marinho (#071d36) — Inspirado na referência mobile + za.PNG */}
        <View style={styles.heroHeader}>
          <View style={styles.brandRow}>
            <ArpeMonogram size={34} />
            <View style={styles.brandTextWrap}>
              <Text style={styles.brandKicker}>ARPE · CTR FISCALIZAÇÃO</Text>
              <Text style={styles.heroTitle}>Qual vistoria vamos realizar?</Text>
            </View>
          </View>

          {/* Linha central: [Botão Circular Offline/Online] — [Pílula Seletor Modalidade] — [Botão Circular +] */}
          <View style={styles.heroControls}>
            <Pressable
              onPress={toggleOnlineMode}
              style={styles.circleIconBtn}
              accessibilityLabel={
                isOnline ? "Modo Online ativo" : "Modo Offline ativo"
              }
            >
              {isOnline ? (
                <Wifi size={18} color={ARPE_COLORS.statusOnline} />
              ) : (
                <CloudOff size={18} color={ARPE_COLORS.statusOffline} />
              )}
            </Pressable>

            <Pressable
              onPress={() => setSheetVisible(true)}
              style={[styles.modalityPill, { backgroundColor: theme.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Alterar concessão e modalidade"
            >
              <Text style={styles.modalityPillText} numberOfLines={1}>
                {tipoRelatorio} · {categoriaRelatorio}
              </Text>
              <ChevronDown size={16} color={ARPE_COLORS.white} />
            </Pressable>

            <Pressable
              onPress={onNovaVistoria}
              style={styles.circleIconBtn}
              accessibilityLabel="Criar nova vistoria"
            >
              <Plus size={20} color={ARPE_COLORS.navy} />
            </Pressable>
          </View>

          <View style={styles.statusStrip}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isOnline
                    ? ARPE_COLORS.statusOnline
                    : ARPE_COLORS.statusOffline,
                },
              ]}
            />
            <Text style={styles.statusStripText}>
              {isOnline
                ? "Conectado · Pronto para sincronizar com a nuvem"
                : "Modo Offline · Dados e fotos salvos localmente no dispositivo"}
            </Text>
          </View>
        </View>

        {/* Corpo Branco Limpo */}
        <View style={styles.body}>
          {/* Seção 1: Vistorias Ativas (Carrossel horizontal igual à referência) */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Vistorias em Campo</Text>
              <Text style={styles.sectionSub}>
                {cfg.nomeCompleto} · {cfg.contratoPadrao}
              </Text>
            </View>
          </View>

          <FlatList
            horizontal
            data={vistoriasFiltradas}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
            renderItem={({ item }) => {
              const itemTheme = getConcessionTheme(
                item.tipoRelatorio,
                item.categoriaRelatorio
              );
              const ncsCount = item.ocorrencias.filter(
                (o) => o.tipoAchado === "NC"
              ).length;
              return (
                <View style={styles.activeCard}>
                  <View style={styles.activeCardTop}>
                    <View style={styles.cardTitleWrap}>
                      <Text style={styles.cardId} numberOfLines={1}>
                        {item.fiscalizacao.idFiscalizacao}
                      </Text>
                      <Text style={styles.cardLocal} numberOfLines={1}>
                        {item.fiscalizacao.local}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.syncBadge,
                        {
                          backgroundColor:
                            item.syncStatus === "synced"
                              ? ARPE_COLORS.statusSanadaSoft
                              : itemTheme.primarySoft,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.syncBadgeText,
                          {
                            color:
                              item.syncStatus === "synced"
                                ? ARPE_COLORS.statusSanada
                                : itemTheme.primary,
                          },
                        ]}
                      >
                        {item.syncStatus === "synced" ? "Sync" : "Local"}
                      </Text>
                    </View>
                  </View>

                  {/* Área visual limpa de resumo (sem fotos de terceiros / LGPD) */}
                  <View style={styles.cardVisualBox}>
                    <View style={styles.metricPair}>
                      <Camera size={16} color={ARPE_COLORS.textSecondary} />
                      <Text style={styles.metricValue}>{item.fotos.length}</Text>
                      <Text style={styles.metricLabel}>fotos</Text>
                    </View>
                    <View style={styles.metricDivider} />
                    <View style={styles.metricPair}>
                      <FileText size={16} color={itemTheme.primary} />
                      <Text style={styles.metricValue}>{ncsCount}</Text>
                      <Text style={styles.metricLabel}>NCs</Text>
                    </View>
                  </View>

                  <View style={styles.cardActionsRow}>
                    <Pressable
                      onPress={() => handleOpen(item)}
                      style={styles.cardSecondaryBtn}
                    >
                      <Text style={styles.cardSecondaryBtnText}>Detalhes</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleOpen(item)}
                      style={[
                        styles.cardPrimaryBtn,
                        { backgroundColor: itemTheme.primary },
                      ]}
                    >
                      <Text style={styles.cardPrimaryBtnText}>Coletar</Text>
                    </Pressable>
                  </View>
                </View>
              );
            }}
          />

          {/* Seção 2: Todas as Vistorias Locais (Grade 2 colunas igual à base da Tela 1 da referência) */}
          <View style={[styles.sectionHeader, { marginTop: SPACING.xl }]}>
            <View>
              <Text style={styles.sectionTitle}>Sessões no Dispositivo</Text>
              <Text style={styles.sectionSub}>
                Toque para retomar a coleta offline
              </Text>
            </View>
            <Pressable
              onPress={onNovaVistoria}
              style={styles.inlineActionBtn}
            >
              <Text style={[styles.inlineActionText, { color: theme.primary }]}>
                + Nova
              </Text>
            </Pressable>
          </View>

          <View style={styles.gridContainer}>
            {vistorias.map((item) => {
              const itemTheme = getConcessionTheme(
                item.tipoRelatorio,
                item.categoriaRelatorio
              );
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleOpen(item)}
                  style={styles.gridCard}
                >
                  <View
                    style={[
                      styles.gridIconBox,
                      { backgroundColor: itemTheme.primarySoft },
                    ]}
                  >
                    {item.tipoRelatorio === "SOCICAM" ? (
                      <Building2 size={22} color={itemTheme.primary} />
                    ) : (
                      <MapPin size={22} color={itemTheme.primary} />
                    )}
                    <Text
                      style={[
                        styles.gridModalityTag,
                        { color: itemTheme.primary },
                      ]}
                    >
                      {item.tipoRelatorio} ·{" "}
                      {item.categoriaRelatorio === "Monitoramento"
                        ? "Monit."
                        : "Fisc."}
                    </Text>
                  </View>
                  <Text style={styles.gridCardTitle} numberOfLines={1}>
                    {item.fiscalizacao.idFiscalizacao}
                  </Text>
                  <Text style={styles.gridCardSub} numberOfLines={1}>
                    {item.fotos.length} fotos · {item.ocorrencias.length} reg.
                  </Text>
                  <Text style={styles.gridCardTime} numberOfLines={1}>
                    {item.atualizadaEm}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <ModalitySheetModal
        visible={sheetVisible}
        tipoAtual={tipoRelatorio}
        categoriaAtual={categoriaRelatorio}
        onSelect={setModalidade}
        onClose={() => setSheetVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ARPE_COLORS.navy,
  },
  container: {
    flex: 1,
    backgroundColor: ARPE_COLORS.surface,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  heroHeader: {
    backgroundColor: ARPE_COLORS.navy,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  brandTextWrap: {
    flex: 1,
  },
  brandKicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    color: "rgba(255,255,255,0.62)",
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: ARPE_COLORS.white,
    marginTop: 2,
  },
  heroControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  circleIconBtn: {
    width: TOUCH_TARGET_MIN,
    height: TOUCH_TARGET_MIN,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  modalityPill: {
    flex: 1,
    minHeight: TOUCH_TARGET_MIN,
    borderRadius: RADII.pill,
    paddingHorizontal: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  modalityPillText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
  statusStrip: {
    marginTop: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusStripText: {
    fontSize: 11.5,
    color: "rgba(255,255,255,0.75)",
    flex: 1,
  },
  body: {
    paddingTop: SPACING.xl,
  },
  sectionHeader: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
  },
  sectionSub: {
    fontSize: 12,
    color: ARPE_COLORS.textSecondary,
    marginTop: 2,
  },
  horizontalList: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  activeCard: {
    width: 248,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    padding: SPACING.lg,
  },
  activeCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardId: {
    fontSize: 13.5,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
  },
  cardLocal: {
    fontSize: 11.5,
    color: ARPE_COLORS.textSecondary,
    marginTop: 2,
  },
  syncBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.pill,
  },
  syncBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  cardVisualBox: {
    marginTop: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: ARPE_COLORS.white,
    borderRadius: RADII.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
  },
  metricPair: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
  },
  metricLabel: {
    fontSize: 11.5,
    color: ARPE_COLORS.textSecondary,
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: ARPE_COLORS.border,
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  cardSecondaryBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.white,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cardSecondaryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: ARPE_COLORS.textPrimary,
  },
  cardPrimaryBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: RADII.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  cardPrimaryBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
  inlineActionBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  inlineActionText: {
    fontSize: 13,
    fontWeight: "800",
  },
  gridContainer: {
    paddingHorizontal: SPACING.xl,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  gridCard: {
    width: "47.8%",
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    padding: SPACING.md,
  },
  gridIconBox: {
    height: 76,
    borderRadius: RADII.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: SPACING.sm,
  },
  gridModalityTag: {
    fontSize: 11,
    fontWeight: "800",
  },
  gridCardTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
  },
  gridCardSub: {
    fontSize: 11.5,
    color: ARPE_COLORS.textSecondary,
    marginTop: 2,
  },
  gridCardTime: {
    fontSize: 10.5,
    color: ARPE_COLORS.textMuted,
    marginTop: 4,
  },
});

