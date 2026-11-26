import React, { useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { CloudOff, Wifi, WifiOff } from "lucide-react-native";
import { NetworkMode } from "../../../domain/entities/types";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import {
  AnimatedModalBox,
  AnimatedScalePressable,
  FadeSlideView,
  useAnimatedColor,
} from "../common/MotionPrimitives";

interface WifiStatusPillProps {
  readonly mode: NetworkMode;
  readonly onToggleOfflineManual: (ativarOffline: boolean) => void;
}

const MODE_META: Record<
  NetworkMode,
  { readonly label: string; readonly color: string; readonly icon: typeof Wifi }
> = {
  online: {
    label: "Online",
    color: ARPE_COLORS.statusOnline,
    icon: Wifi,
  },
  disconnected: {
    label: "Desconectado",
    color: ARPE_COLORS.danger,
    icon: WifiOff,
  },
  offline_manual: {
    label: "Offline",
    color: "#64748b",
    icon: CloudOff,
  },
};

export const WifiStatusPill: React.FC<WifiStatusPillProps> = ({
  mode,
  onToggleOfflineManual,
}) => {
  const [offlineAlertVisible, setOfflineAlertVisible] = useState(false);

  const meta = MODE_META[mode];
  const ActiveIcon = meta.icon;
  const animatedBg = useAnimatedColor(meta.color, 220);

  const handlePress = () => {
    const indoParaOffline = mode !== "offline_manual";
    onToggleOfflineManual(indoParaOffline);
    if (indoParaOffline) {
      setOfflineAlertVisible(true);
    }
  };

  return (
    <>
      <AnimatedScalePressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`Status de rede: ${meta.label}. Toque para alternar entre Online e Offline`}
      >
        <Animated.View style={[styles.pill, { backgroundColor: animatedBg }]}>
          <FadeSlideView
            animKey={mode}
            distance={4}
            duration={160}
            style={styles.pillInner}
          >
            <ActiveIcon size={14} color={ARPE_COLORS.white} />
            <Text style={styles.pillText}>{meta.label}</Text>
          </FadeSlideView>
        </Animated.View>
      </AnimatedScalePressable>

      <AnimatedModalBox
        visible={offlineAlertVisible}
        variant="center"
        cardStyle={styles.alertCard}
        onClose={() => setOfflineAlertVisible(false)}
      >
        <View style={styles.alertContent}>
          <View style={styles.alertIconWrap}>
            <CloudOff size={22} color="#64748b" />
          </View>
          <Text style={styles.alertTitle}>Modo Offline ativado</Text>
          <Text style={styles.alertText}>
            O aplicativo não tentará se conectar nem enviar relatórios
            finalizados até você reativar o modo Online.
          </Text>
          <AnimatedScalePressable
            onPress={() => setOfflineAlertVisible(false)}
            style={styles.alertBtn}
          >
            <Text style={styles.alertBtnText}>Entendi</Text>
          </AnimatedScalePressable>
        </View>
      </AnimatedModalBox>
    </>
  );
};

const styles = StyleSheet.create({
  pill: {
    minHeight: TOUCH_TARGET_MIN - 8,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.pill,
    justifyContent: "center",
  },
  pillInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pillText: { fontSize: 12, fontWeight: "800", color: ARPE_COLORS.white },
  alertCard: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: ARPE_COLORS.white,
    borderRadius: RADII.xl,
    padding: SPACING.xl,
  },
  alertContent: { gap: SPACING.md },
  alertIconWrap: {
    width: TOUCH_TARGET_MIN,
    height: TOUCH_TARGET_MIN,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: ARPE_COLORS.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  alertTitle: { fontSize: 18, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  alertText: { fontSize: 13.5, lineHeight: 20, color: ARPE_COLORS.textSecondary },
  alertBtn: {
    minHeight: TOUCH_TARGET_MIN + 2,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  alertBtnText: { fontSize: 14, fontWeight: "800", color: ARPE_COLORS.white },
});
