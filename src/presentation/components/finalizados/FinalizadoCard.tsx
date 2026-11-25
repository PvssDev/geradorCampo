import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { ChevronRight, PauseCircle, PlayCircle } from "lucide-react-native";
import { VistoriaSessionEntity } from "../../../domain/entities/types";
import { calcularProgressoSync } from "../../../domain/rules/domainRules";
import { ARPE_COLORS, getConcessionTheme } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import {
  AnimatedScalePressable,
  AnimatedValueText,
  FadeSlideView,
  FLUID_EASE,
  useAnimatedColor,
} from "../common/MotionPrimitives";

interface FinalizadoCardProps {
  readonly vistoria: VistoriaSessionEntity;
  readonly index: number;
  readonly onPress: (id: string) => void;
  readonly onToggleStandby: (vistoria: VistoriaSessionEntity) => void;
}

export const FinalizadoCard: React.FC<FinalizadoCardProps> = ({
  vistoria,
  index,
  onPress,
  onToggleStandby,
}) => {
  const vTheme = getConcessionTheme(
    vistoria.tipoRelatorio,
    vistoria.categoriaRelatorio
  );
  const prog = calcularProgressoSync(vistoria);
  const isSynced = vistoria.syncStatus === "synced";
  const statusLabel = isSynced
    ? "Sincronizado"
    : vistoria.syncStandby
      ? "Em Standby"
      : "Pendente";
  const statusColor = isSynced
    ? ARPE_COLORS.statusSanada
    : vistoria.syncStandby
      ? "#64748b"
      : ARPE_COLORS.statusOffline;
  const barTargetColor = isSynced
    ? ARPE_COLORS.statusSanada
    : vistoria.syncStandby
      ? "#94a3b8"
      : vTheme.primary;

  const progressAnim = useRef(new Animated.Value(prog.percentual)).current;
  const animatedBarColor = useAnimatedColor(barTargetColor, 260);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: prog.percentual,
      duration: 420,
      easing: FLUID_EASE,
      useNativeDriver: false,
    }).start();
  }, [prog.percentual, progressAnim]);

  const widthPct = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  return (
    <FadeSlideView
      delay={Math.min(index * 45, 200)}
      distance={8}
      duration={220}
    >
      <AnimatedScalePressable
        onPress={() => onPress(vistoria.id)}
        style={styles.card}
      >
        <View style={[styles.accentBar, { backgroundColor: vTheme.primary }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <View
              style={[
                styles.modPill,
                {
                  backgroundColor: vTheme.primarySoft,
                  borderColor: vTheme.primaryBorder,
                },
              ]}
            >
              <Text style={[styles.modPillText, { color: vTheme.primary }]}>
                {vistoria.tipoRelatorio} · {vistoria.categoriaRelatorio}
              </Text>
            </View>

            <FadeSlideView
              animKey={statusLabel}
              distance={4}
              duration={160}
              style={[
                styles.statusBadge,
                { backgroundColor: `${statusColor}18` },
              ]}
            >
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </FadeSlideView>
          </View>

          <View style={styles.cardTitleRow}>
            <View style={styles.flex1}>
              <Text style={styles.cardId} numberOfLines={1}>
                {vistoria.fiscalizacao.idFiscalizacao}
              </Text>
              <Text style={styles.cardSub} numberOfLines={1}>
                {vistoria.fiscalizacao.data} · {vistoria.fiscalizacao.local}
              </Text>
            </View>
            <ChevronRight size={17} color={ARPE_COLORS.textMuted} />
          </View>

          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>
              Fotos: {prog.enviadas}/{prog.total}
            </Text>
            <AnimatedValueText
              inline
              valueKey={String(prog.percentual)}
              style={styles.progressPct}
            >
              {`${prog.percentual}%`}
            </AnimatedValueText>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: widthPct, backgroundColor: animatedBarColor },
              ]}
            />
          </View>

          {!isSynced && (
            <AnimatedScalePressable
              onPress={() => onToggleStandby(vistoria)}
              style={[
                styles.standbyBtn,
                vistoria.syncStandby && styles.standbyBtnActive,
              ]}
            >
              <FadeSlideView
                animKey={vistoria.syncStandby ? "liberar" : "standby"}
                distance={4}
                duration={160}
                style={styles.standbyInner}
              >
                {vistoria.syncStandby ? (
                  <PlayCircle size={15} color={vTheme.primary} />
                ) : (
                  <PauseCircle size={15} color={ARPE_COLORS.textSecondary} />
                )}
                <Text
                  style={[
                    styles.standbyText,
                    vistoria.syncStandby && { color: vTheme.primary },
                  ]}
                >
                  {vistoria.syncStandby ? "Liberar Envio" : "Standby"}
                </Text>
              </FadeSlideView>
            </AnimatedScalePressable>
          )}
        </View>
      </AnimatedScalePressable>
    </FadeSlideView>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: ARPE_COLORS.surface,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    overflow: "hidden",
  },
  accentBar: { width: 5 },
  cardContent: { flex: 1, padding: SPACING.lg, gap: SPACING.xs },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  modPill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  modPillText: { fontSize: 10.5, fontWeight: "800" },
  statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADII.pill },
  statusText: { fontSize: 10.5, fontWeight: "800" },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: 2,
  },
  flex1: { flex: 1 },
  cardId: { fontSize: 15, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  cardSub: { fontSize: 12, color: ARPE_COLORS.textSecondary, marginTop: 2 },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  progressLabel: { fontSize: 11.5, fontWeight: "600", color: ARPE_COLORS.textSecondary },
  progressPct: { fontSize: 11.5, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: ARPE_COLORS.border,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },
  standbyBtn: {
    marginTop: SPACING.sm,
    minHeight: TOUCH_TARGET_MIN - 6,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.borderStrong,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  standbyInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  standbyBtnActive: { backgroundColor: ARPE_COLORS.white },
  standbyText: { fontSize: 12.5, fontWeight: "800", color: ARPE_COLORS.textSecondary },
});
