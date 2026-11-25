import React from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { ADM_DARK, ADM_SHADOWS } from "../../theme/admDarkTheme";
import { RADII, TOUCH_TARGET_MIN } from "../../theme/tokens";
import { AnimatedScalePressable } from "../common/MotionPrimitives";

export const AdmDarkBackdrop: React.FC<{ readonly accentColor: string }> = ({
  accentColor,
}) => (
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="admBgGrad" x1="0" y1="0" x2="0.25" y2="1">
          <Stop offset="0%" stopColor="#0a2545" />
          <Stop offset="55%" stopColor={ADM_DARK.bg} />
          <Stop offset="100%" stopColor={ADM_DARK.bgDeep} />
        </LinearGradient>
        <RadialGradient id="admAccentGlow" cx="86%" cy="6%" r="48%">
          <Stop offset="0%" stopColor={accentColor} stopOpacity="0.22" />
          <Stop offset="65%" stopColor={accentColor} stopOpacity="0.04" />
          <Stop offset="100%" stopColor={ADM_DARK.bg} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#admBgGrad)" />
      <Rect width="100%" height="100%" fill="url(#admAccentGlow)" />
    </Svg>
  </View>
);

interface AdmSurfaceCardProps {
  readonly children: React.ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

export const AdmSurfaceCard: React.FC<AdmSurfaceCardProps> = ({
  children,
  style,
}) => (
  <View style={[styles.cardShell, ADM_SHADOWS.card, style]}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="admCardGrad" x1="0" y1="0" x2="0.5" y2="1">
            <Stop offset="0%" stopColor={ADM_DARK.surfaceTop} stopOpacity="0.95" />
            <Stop offset="100%" stopColor={ADM_DARK.surfaceBottom} stopOpacity="0.98" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#admCardGrad)" />
      </Svg>
    </View>
    {children}
  </View>
);

interface AdmGradientButtonProps {
  readonly label: string;
  readonly accentColor: string;
  readonly icon?: React.ReactNode;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly compact?: boolean;
  readonly tone?: "accent" | "danger";
  readonly accessibilityLabel?: string;
}

export const AdmGradientButton: React.FC<AdmGradientButtonProps> = ({
  label,
  accentColor,
  icon,
  onPress,
  disabled = false,
  loading = false,
  compact = false,
  tone = "accent",
  accessibilityLabel,
}) => {
  const from = tone === "danger" ? "#ef4444" : accentColor;
  const to = tone === "danger" ? "#b91c1c" : "#0f2b4d";
  const gradId = tone === "danger" ? "btnDangerGrad" : "btnAccentGrad";

  return (
    <AnimatedScalePressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.btnShell,
        compact ? styles.btnCompact : styles.btnFull,
        ADM_SHADOWS.cta,
        disabled && styles.btnDisabled,
      ]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={from} />
              <Stop offset="100%" stopColor={to} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${gradId})`} />
        </Svg>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={ADM_DARK.textPrimary} />
      ) : (
        <View style={styles.btnContent}>
          {icon}
          <Text style={[styles.btnText, compact && styles.btnTextCompact]}>
            {label}
          </Text>
        </View>
      )}
    </AnimatedScalePressable>
  );
};

const styles = StyleSheet.create({
  cardShell: {
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: ADM_DARK.border,
    borderTopColor: ADM_DARK.borderHighlight,
    overflow: "hidden",
  },
  btnShell: {
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  btnFull: {
    minHeight: TOUCH_TARGET_MIN + 2,
    paddingHorizontal: 18,
  },
  btnCompact: {
    minHeight: 38,
    paddingHorizontal: 14,
  },
  btnDisabled: { opacity: 0.55 },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  btnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: ADM_DARK.textPrimary,
    letterSpacing: 0.2,
  },
  btnTextCompact: {
    fontSize: 12.5,
  },
});
