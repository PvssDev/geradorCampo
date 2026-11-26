import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { AlertTriangle, Trash2 } from "lucide-react-native";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import {
  AnimatedModalBox,
  AnimatedScalePressable,
  FLUID_EASE,
  NATIVE_DRIVER,
} from "../common/MotionPrimitives";

interface ConfirmarExclusaoModalProps {
  readonly visible: boolean;
  readonly quantidade: number;
  readonly entidadeSingular?: string;
  readonly entidadePlural?: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export const ConfirmarExclusaoModal: React.FC<ConfirmarExclusaoModalProps> = ({
  visible,
  quantidade,
  entidadeSingular = "sessão em aberto",
  entidadePlural = "sessões em aberto",
  onCancel,
  onConfirm,
}) => {
  const plural = quantidade > 1;
  const labelEntidade = plural ? entidadePlural : entidadeSingular;
  const shakeX = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (!visible) return;
    shakeX.setValue(0);
    badgeScale.setValue(0.85);

    Animated.parallel([
      Animated.timing(badgeScale, {
        toValue: 1,
        duration: 210,
        easing: FLUID_EASE,
        useNativeDriver: NATIVE_DRIVER,
      }),
      Animated.sequence([
        Animated.timing(shakeX, {
          toValue: -4,
          duration: 55,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(shakeX, {
          toValue: 4,
          duration: 55,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(shakeX, {
          toValue: -2,
          duration: 50,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(shakeX, {
          toValue: 0,
          duration: 50,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]),
    ]).start();
  }, [visible, shakeX, badgeScale]);

  return (
    <AnimatedModalBox
      visible={visible}
      variant="center"
      cardStyle={styles.card}
      onClose={onCancel}
    >
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.iconBadge,
            { transform: [{ translateX: shakeX }, { scale: badgeScale }] },
          ]}
        >
          <AlertTriangle size={22} color={ARPE_COLORS.danger} />
        </Animated.View>

        <Text style={styles.title}>
          Apagar {quantidade} {labelEntidade}?
        </Text>

        <Text style={styles.subtitle}>
          Tem certeza que deseja apagar {quantidade} {labelEntidade}? Esta ação
          não pode ser desfeita.
        </Text>

        <View style={styles.actionsRow}>
          <View style={styles.secondaryCol}>
            <AnimatedScalePressable
              onPress={onCancel}
              style={styles.secondaryBtn}
              accessibilityRole="button"
              accessibilityLabel="Cancelar exclusão"
            >
              <Text style={styles.secondaryBtnText}>Cancelar</Text>
            </AnimatedScalePressable>
          </View>

          <View style={styles.primaryCol}>
            <AnimatedScalePressable
              onPress={onConfirm}
              style={styles.dangerBtn}
              accessibilityRole="button"
              accessibilityLabel="Confirmar exclusão"
            >
              <Trash2 size={16} color={ARPE_COLORS.white} />
              <Text style={styles.dangerBtnText}>Apagar ({quantidade})</Text>
            </AnimatedScalePressable>
          </View>
        </View>
      </View>
    </AnimatedModalBox>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: ARPE_COLORS.white,
    borderRadius: RADII.xl,
    padding: SPACING.xl,
  },
  content: {
    gap: SPACING.md,
  },
  iconBadge: {
    width: TOUCH_TARGET_MIN,
    height: TOUCH_TARGET_MIN,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: ARPE_COLORS.dangerBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18.5,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    color: ARPE_COLORS.textSecondary,
  },
  actionsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  secondaryCol: {
    flex: 1,
  },
  primaryCol: {
    flex: 1.3,
  },
  secondaryBtn: {
    minHeight: TOUCH_TARGET_MIN + 4,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: ARPE_COLORS.textSecondary,
  },
  dangerBtn: {
    minHeight: TOUCH_TARGET_MIN + 4,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.danger,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dangerBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
});
