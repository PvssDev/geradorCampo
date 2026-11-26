import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ClipboardList, FilterX, Plus } from "lucide-react-native";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import {
  AnimatedScalePressable,
  FadeSlideView,
} from "../common/MotionPrimitives";

interface VistoriasEmptyStateProps {
  readonly accentColor: string;
  readonly isFilteredEmpty?: boolean;
  readonly onNovaVistoria: () => void;
  readonly onLimparFiltros?: () => void;
}

export const VistoriasEmptyState: React.FC<VistoriasEmptyStateProps> = ({
  accentColor,
  isFilteredEmpty = false,
  onNovaVistoria,
  onLimparFiltros,
}) => {
  if (isFilteredEmpty && onLimparFiltros) {
    return (
      <FadeSlideView distance={12} duration={240} style={styles.container}>
        <View style={styles.iconCircle}>
          <FilterX size={26} color={ARPE_COLORS.textMuted} />
        </View>

        <Text style={styles.title}>Nenhuma vistoria corresponde aos filtros</Text>
        <Text style={styles.subtitle}>
          Ajuste ou limpe os critérios selecionados para visualizar suas sessões
          em aberto.
        </Text>

        <AnimatedScalePressable
          onPress={onLimparFiltros}
          style={[styles.ctaBtn, { backgroundColor: accentColor }]}
          accessibilityRole="button"
          accessibilityLabel="Limpar filtros"
        >
          <Text style={styles.ctaText}>Limpar filtros</Text>
        </AnimatedScalePressable>
      </FadeSlideView>
    );
  }

  return (
    <FadeSlideView distance={12} duration={240} style={styles.container}>
      <View style={styles.iconCircle}>
        <ClipboardList size={28} color={ARPE_COLORS.textMuted} />
      </View>

      <Text style={styles.title}>Nenhuma vistoria em aberto</Text>
      <Text style={styles.subtitle}>
        Todas as suas sessões foram finalizadas ou ainda não há coleta iniciada
        neste dispositivo.
      </Text>

      <AnimatedScalePressable
        onPress={onNovaVistoria}
        style={[styles.ctaBtn, { backgroundColor: accentColor }]}
        accessibilityRole="button"
        accessibilityLabel="Iniciar nova vistoria"
      >
        <Plus size={18} color={ARPE_COLORS.white} />
        <Text style={styles.ctaText}>Iniciar nova vistoria</Text>
      </AnimatedScalePressable>
    </FadeSlideView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.xxl,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderRadius: RADII.xl,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    padding: SPACING.xxl,
    alignItems: "center",
    gap: SPACING.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.white,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: 16.5,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: ARPE_COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  ctaBtn: {
    minHeight: TOUCH_TARGET_MIN + 2,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADII.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
});
