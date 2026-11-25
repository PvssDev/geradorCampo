import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { Trash2 } from "lucide-react-native";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import {
  AnimatedScalePressable,
  AnimatedValueText,
  FLUID_EASE,
  NATIVE_DRIVER,
} from "../common/MotionPrimitives";

interface SelectionActionBarProps {
  readonly visible: boolean;
  readonly totalSelecionadas: number;
  readonly isDeleting: boolean;
  readonly onRequestDelete: () => void;
}

const ENTER_DURATION_MS = 200;
const EXIT_DURATION_MS = 150;

export const SelectionActionBar: React.FC<SelectionActionBarProps> = ({
  visible,
  totalSelecionadas,
  isDeleting,
  onRequestDelete,
}) => {
  const [rendered, setRendered] = useState(visible);
  const anim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: ENTER_DURATION_MS,
        easing: FLUID_EASE,
        useNativeDriver: NATIVE_DRIVER,
      }).start();
      return;
    }

    if (rendered) {
      Animated.timing(anim, {
        toValue: 0,
        duration: EXIT_DURATION_MS,
        easing: FLUID_EASE,
        useNativeDriver: NATIVE_DRIVER,
      }).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
  }, [visible, rendered, anim]);

  if (!rendered) return null;

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 0],
  });

  const disabled = totalSelecionadas === 0 || isDeleting;
  const infoText = isDeleting
    ? "Removendo sessões..."
    : totalSelecionadas === 0
      ? "Toque nas sessões que deseja apagar"
      : `${totalSelecionadas} ${
          totalSelecionadas > 1 ? "selecionadas" : "selecionada"
        }`;

  return (
    <Animated.View
      style={[
        styles.bar,
        { opacity: anim, transform: [{ translateY }] },
      ]}
    >
      <AnimatedValueText
        valueKey={`${isDeleting}-${totalSelecionadas}`}
        style={styles.selectionInfo}
      >
        {infoText}
      </AnimatedValueText>

      <AnimatedScalePressable
        onPress={onRequestDelete}
        disabled={disabled}
        style={[styles.deleteBtn, disabled && styles.deleteBtnDisabled]}
        accessibilityRole="button"
        accessibilityLabel={`Apagar ${totalSelecionadas} sessões`}
      >
        <Trash2 size={15} color={ARPE_COLORS.white} />
        <Text style={styles.deleteBtnText}>Apagar ({totalSelecionadas})</Text>
      </AnimatedScalePressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bar: {
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: ARPE_COLORS.border,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  selectionInfo: {
    fontSize: 12.5,
    fontWeight: "700",
    color: ARPE_COLORS.textSecondary,
  },
  deleteBtn: {
    minHeight: TOUCH_TARGET_MIN - 6,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.danger,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  deleteBtnDisabled: {
    opacity: 0.45,
  },
  deleteBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
});
