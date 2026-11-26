import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import {
  Building2,
  Camera,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
} from "lucide-react-native";
import { CONCESSION_CONFIG } from "../../../domain/config/concessionConfig";
import { VistoriaSessionEntity } from "../../../domain/entities/types";
import { resumirContagensVistoria } from "../../../domain/rules/domainRules";
import { ARPE_COLORS, getConcessionTheme } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import {
  AnimatedCheckBadge,
  AnimatedScalePressable,
  FadeSlideView,
  FLUID_EASE,
  NATIVE_DRIVER,
  useAnimatedColor,
} from "../common/MotionPrimitives";

interface VistoriaAbertaCardProps {
  readonly vistoria: VistoriaSessionEntity;
  readonly index: number;
  readonly selectionMode: boolean;
  readonly selected: boolean;
  readonly isDeleting: boolean;
  readonly onPress: (vistoriaId: string) => void;
  readonly onLongPress: (vistoriaId: string) => void;
}

const STAGGER_STEP_MS = 45;
const STAGGER_MAX_MS = 220;

export const VistoriaAbertaCard: React.FC<VistoriaAbertaCardProps> = ({
  vistoria,
  index,
  selectionMode,
  selected,
  isDeleting,
  onPress,
  onLongPress,
}) => {
  const theme = getConcessionTheme(
    vistoria.tipoRelatorio,
    vistoria.categoriaRelatorio
  );
  const cfg = CONCESSION_CONFIG[vistoria.tipoRelatorio];
  const counts = resumirContagensVistoria(vistoria);

  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitTranslateX = useRef(new Animated.Value(0)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  const isHighlightedDanger = selected || isDeleting;
  const animatedAccentColor = useAnimatedColor(
    isHighlightedDanger ? ARPE_COLORS.danger : theme.primary,
    180
  );
  const animatedBorderColor = useAnimatedColor(
    isHighlightedDanger ? ARPE_COLORS.danger : ARPE_COLORS.border,
    180
  );
  const animatedBgColor = useAnimatedColor(
    isHighlightedDanger ? ARPE_COLORS.dangerSoft : ARPE_COLORS.surface,
    180
  );

  useEffect(() => {
    if (!isDeleting) return;

    Animated.sequence([
      Animated.timing(exitScale, {
        toValue: 0.96,
        duration: 65,
        easing: FLUID_EASE,
        useNativeDriver: NATIVE_DRIVER,
      }),
      Animated.parallel([
        Animated.timing(exitTranslateX, {
          toValue: -64,
          duration: 215,
          easing: FLUID_EASE,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(exitScale, {
          toValue: 0.88,
          duration: 215,
          easing: FLUID_EASE,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(exitOpacity, {
          toValue: 0,
          duration: 200,
          easing: FLUID_EASE,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]),
    ]).start();
  }, [isDeleting, exitOpacity, exitScale, exitTranslateX]);

  const entryDelay = Math.min(index * STAGGER_STEP_MS, STAGGER_MAX_MS);

  return (
    <FadeSlideView delay={entryDelay} distance={10} duration={220}>
      <Animated.View
        style={{
          opacity: exitOpacity,
          transform: [{ translateX: exitTranslateX }, { scale: exitScale }],
        }}
      >
        <AnimatedScalePressable
          onPress={() => onPress(vistoria.id)}
          onLongPress={() => onLongPress(vistoria.id)}
          disabled={isDeleting}
          accessibilityRole={selectionMode ? "checkbox" : "button"}
          accessibilityState={selectionMode ? { checked: selected } : undefined}
          accessibilityLabel={`Vistoria ${vistoria.fiscalizacao.idFiscalizacao}`}
        >
          <Animated.View
            style={[
              styles.card,
              {
                borderColor: animatedBorderColor,
                backgroundColor: animatedBgColor,
              },
            ]}
          >
            <Animated.View
              style={[styles.accentBar, { backgroundColor: animatedAccentColor }]}
            />

            <View style={styles.content}>
              <View style={styles.topRow}>
                <View
                  style={[
                    styles.modalityBadge,
                    {
                      backgroundColor: theme.primarySoft,
                      borderColor: theme.primaryBorder,
                    },
                  ]}
                >
                  {cfg.exibePistaFaixa ? (
                    <MapPin size={12} color={theme.primary} />
                  ) : (
                    <Building2 size={12} color={theme.primary} />
                  )}
                  <Text style={[styles.modalityText, { color: theme.primary }]}>
                    {vistoria.tipoRelatorio} · {vistoria.categoriaRelatorio}
                  </Text>
                </View>

                <FadeSlideView
                  animKey={selectionMode ? "select" : "resume"}
                  distance={4}
                  duration={150}
                >
                  {selectionMode ? (
                    <View
                      style={[
                        styles.checkbox,
                        selected && styles.checkboxSelected,
                      ]}
                    >
                      <AnimatedCheckBadge
                        visible={selected}
                        color={ARPE_COLORS.white}
                        size={14}
                      />
                    </View>
                  ) : (
                    <View style={styles.resumeChip}>
                      <Text
                        style={[styles.resumeText, { color: theme.primary }]}
                      >
                        Retomar
                      </Text>
                      <ChevronRight size={14} color={theme.primary} />
                    </View>
                  )}
                </FadeSlideView>
              </View>

              <Text style={styles.title} numberOfLines={1}>
                {vistoria.fiscalizacao.idFiscalizacao}
              </Text>
              <Text style={styles.localText} numberOfLines={1}>
                {vistoria.fiscalizacao.local}
              </Text>

              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Camera size={13} color={ARPE_COLORS.textSecondary} />
                  <Text style={styles.metricValue}>{counts.totalFotos}</Text>
                  <Text style={styles.metricLabel}>fotos</Text>
                </View>

                <View style={styles.metricDivider} />

                <View style={styles.metricItem}>
                  <FileText size={13} color={theme.primary} />
                  <Text style={styles.metricValue}>{counts.totalNcs}</Text>
                  <Text style={styles.metricLabel}>NCs</Text>
                </View>

                {counts.totalPas > 0 && (
                  <>
                    <View style={styles.metricDivider} />
                    <View style={styles.metricItem}>
                      <Text style={styles.metricValue}>{counts.totalPas}</Text>
                      <Text style={styles.metricLabel}>PAs</Text>
                    </View>
                  </>
                )}

                <View style={styles.spacer} />

                <View style={styles.timeRow}>
                  <Clock size={11.5} color={ARPE_COLORS.textMuted} />
                  <Text style={styles.timeText} numberOfLines={1}>
                    {vistoria.atualizadaEm}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </AnimatedScalePressable>
      </Animated.View>
    </FadeSlideView>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: RADII.lg,
    borderWidth: 1,
    overflow: "hidden",
    minHeight: TOUCH_TARGET_MIN * 2,
  },
  accentBar: {
    width: 5,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    gap: SPACING.xs,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
    marginBottom: 2,
  },
  modalityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  modalityText: {
    fontSize: 11,
    fontWeight: "800",
  },
  resumeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  resumeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: RADII.sm,
    borderWidth: 2,
    borderColor: ARPE_COLORS.borderStrong,
    backgroundColor: ARPE_COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: {
    backgroundColor: ARPE_COLORS.danger,
    borderColor: ARPE_COLORS.danger,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
  },
  localText: {
    fontSize: 12.5,
    color: ARPE_COLORS.textSecondary,
  },
  metricsRow: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: ARPE_COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricValue: {
    fontSize: 12.5,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
  },
  metricLabel: {
    fontSize: 11.5,
    color: ARPE_COLORS.textSecondary,
  },
  metricDivider: {
    width: 1,
    height: 12,
    backgroundColor: ARPE_COLORS.borderStrong,
  },
  spacer: {
    flex: 1,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: ARPE_COLORS.textMuted,
  },
});
