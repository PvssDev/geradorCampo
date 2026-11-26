import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react-native";
import {
  ToastItem,
  ToastVariant,
  useToastStore,
} from "../../../application/store/useToastStore";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING } from "../../theme/tokens";
import { FLUID_EASE, NATIVE_DRIVER } from "./MotionPrimitives";

const VARIANT_META: Record<
  ToastVariant,
  { color: string; soft: string; border: string; icon: typeof CheckCircle2 }
> = {
  success: {
    color: "#059669",
    soft: "#ecfdf5",
    border: "#a7f3d0",
    icon: CheckCircle2,
  },
  error: {
    color: "#dc2626",
    soft: "#fef2f2",
    border: "#fecaca",
    icon: AlertCircle,
  },
  warning: {
    color: "#d97706",
    soft: "#fffbeb",
    border: "#fde68a",
    icon: AlertTriangle,
  },
  info: {
    color: "#2563eb",
    soft: "#eff6ff",
    border: "#bfdbfe",
    icon: Info,
  },
};

const ToastCard: React.FC<{
  item: ToastItem;
  depth: number;
  zIndex: number;
  onDismiss: (id: string) => void;
}> = ({ item, depth, zIndex, onDismiss }) => {
  const enterAnim = useRef(new Animated.Value(0)).current;
  const depthAnim = useRef(new Animated.Value(depth)).current;
  const meta = VARIANT_META[item.variant];
  const Icon = meta.icon;

  useEffect(() => {
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 210,
      easing: FLUID_EASE,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [enterAnim]);

  useEffect(() => {
    Animated.timing(depthAnim, {
      toValue: depth,
      duration: 220,
      easing: FLUID_EASE,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [depth, depthAnim]);

  const enterY = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-14, 0],
  });
  const depthY = depthAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, 8, 16],
    extrapolate: "clamp",
  });
  const depthScale = depthAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [1, 0.95, 0.9],
    extrapolate: "clamp",
  });
  const depthOpacity = depthAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [1, 0.78, 0.55],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      pointerEvents={depth === 0 ? "auto" : "none"}
      style={[
        styles.cardSlot,
        {
          zIndex,
          opacity: enterAnim,
          transform: [{ translateY: enterY }],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.card,
          {
            borderColor: meta.border,
            opacity: depthOpacity,
            transform: [{ translateY: depthY }, { scale: depthScale }],
          },
        ]}
      >
        <View style={[styles.iconBadge, { backgroundColor: meta.soft }]}>
          <Icon size={17} color={meta.color} />
        </View>

        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>

        <Pressable
          onPress={() => onDismiss(item.id)}
          hitSlop={8}
          style={styles.closeBtn}
        >
          <X size={14} color={ARPE_COLORS.textMuted} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

export const ToastViewport: React.FC<{ inModal?: boolean }> = ({
  inModal = false,
}) => {
  const insets = useSafeAreaInsets();
  const { toasts, modalDepth, dismiss } = useToastStore();

  // Evita duplicidade: renderiza no App quando não há modal aberto, e no modal quando há modal aberto
  if (!inModal && modalDepth > 0) return null;
  if (toasts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.viewport, { top: Math.max(insets.top, 12) + 8 }]}
    >
      {toasts.map((item, idx) => (
        <ToastCard
          key={item.id}
          item={item}
          depth={toasts.length - 1 - idx}
          zIndex={idx + 1}
          onDismiss={dismiss}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  viewport: {
    position: "absolute",
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 9999,
    alignItems: "center",
  },
  cardSlot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: RADII.lg,
    borderWidth: 1,
    backgroundColor: ARPE_COLORS.white,
    shadowColor: "#071d36",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: RADII.md,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
  },
  description: {
    fontSize: 11.5,
    lineHeight: 15,
    color: ARPE_COLORS.textSecondary,
  },
  closeBtn: {
    padding: 4,
  },
});

