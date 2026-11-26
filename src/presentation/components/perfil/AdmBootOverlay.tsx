import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { ADM_DARK, ADM_SHADOWS } from "../../theme/admDarkTheme";
import { NATIVE_DRIVER } from "../common/MotionPrimitives";

interface AdmBootOverlayProps {
  readonly accentColor: string;
  readonly onFinish: () => void;
}

export const AdmBootOverlay: React.FC<AdmBootOverlayProps> = ({
  accentColor,
  onFinish,
}) => {
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const scanX = useRef(new Animated.Value(-150)).current;
  const badgeScale = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.parallel([
        Animated.timing(badgeScale, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(scanX, {
          toValue: 165,
          duration: 500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]),
      Animated.delay(100),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: NATIVE_DRIVER,
      }),
    ]);

    anim.start(({ finished }) => {
      if (finished) onFinish();
    });
    return () => anim.stop();
  }, [badgeScale, onFinish, overlayOpacity, scanX]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.overlay, { opacity: overlayOpacity }]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id="bootGlow" cx="50%" cy="46%" r="44%">
              <Stop offset="0%" stopColor={accentColor} stopOpacity="0.22" />
              <Stop offset="100%" stopColor={ADM_DARK.bgDeep} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={ADM_DARK.bgDeep} />
          <Rect width="100%" height="100%" fill="url(#bootGlow)" />
        </Svg>
      </View>

      <Animated.View
        style={[
          styles.badge,
          ADM_SHADOWS.card,
          { borderColor: accentColor, transform: [{ scale: badgeScale }] },
        ]}
      >
        <ShieldCheck size={28} color={accentColor} />
      </Animated.View>
      <Text style={styles.kicker}>ARPE · PAINEL ADM</Text>
      <Text style={styles.status}>Sessão administrativa verificada</Text>
      <View style={styles.scanTrack}>
        <Animated.View
          style={[
            styles.scanBeam,
            { backgroundColor: accentColor, transform: [{ translateX: scanX }] },
          ]}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: ADM_DARK.surface,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 2,
    color: ADM_DARK.textSecondary,
    marginTop: 4,
  },
  status: {
    fontSize: 13.5,
    fontWeight: "600",
    color: ADM_DARK.textPrimary,
  },
  scanTrack: {
    width: 156,
    height: 3,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    marginTop: 4,
  },
  scanBeam: {
    width: 70,
    height: 3,
    borderRadius: 99,
  },
});
