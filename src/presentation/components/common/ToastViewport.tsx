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

const ToastCard: React.FC<{ item: ToastItem; onDismiss: (id: string) => void }> = ({
  item,
  onDismiss,
}) => {
  const anim = useRef(new Animated.Value(0)).current;
  const meta = VARIANT_META[item.variant];
  const Icon = meta.icon;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 210,
      easing: FLUID_EASE,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [anim]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-14, 0],
  });
  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          borderColor: meta.border,
          opacity: anim,
          transform: [{ translateY }, { scale }],
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
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={dismiss} />
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
    gap: 8,
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

