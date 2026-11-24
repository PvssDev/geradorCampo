import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SituacaoNC } from "../../../domain/entities/types";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";

interface SituacaoChipsProps {
  value: SituacaoNC;
  accentColor: string;
  onChange: (sit: SituacaoNC) => void;
}

const OPTIONS: readonly { key: SituacaoNC; label: string }[] = [
  { key: "Sanada", label: "Sanada" },
  { key: "Parcialmente Sanada", label: "Parcial" },
  { key: "Pendente", label: "Pendente" },
];

export const SituacaoChips: React.FC<SituacaoChipsProps> = ({
  value,
  accentColor,
  onChange,
}) => {
  const getColor = (key: SituacaoNC) => {
    if (key === "Sanada") return ARPE_COLORS.statusSanada;
    if (key === "Parcialmente Sanada") return ARPE_COLORS.statusParcial;
    return accentColor;
  };

  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const selected = value === opt.key;
        const activeColor = getColor(opt.key);
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[
              styles.chip,
              selected && {
                backgroundColor: activeColor,
                borderColor: activeColor,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Text
              style={[
                styles.label,
                selected && { color: ARPE_COLORS.white },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  chip: {
    flex: 1,
    minHeight: TOUCH_TARGET_MIN,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: ARPE_COLORS.textPrimary,
  },
});

