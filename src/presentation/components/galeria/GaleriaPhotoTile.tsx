import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Camera } from "lucide-react-native";
import { GaleriaFotoEntity } from "../../../domain/entities/types";
import { ARPE_COLORS, getGaleriaFotoTheme } from "../../theme/colors";
import { RADII, SPACING } from "../../theme/tokens";
import {
  AnimatedCheckBadge,
  AnimatedScalePressable,
  FadeSlideView,
  FLUID_EASE,
  NATIVE_DRIVER,
  useAnimatedColor,
} from "../common/MotionPrimitives";

interface GaleriaPhotoTileProps {
  readonly foto: GaleriaFotoEntity;
  readonly index: number;
  readonly selectionMode: boolean;
  readonly selected: boolean;
  readonly selectionAccentColor: string;
  readonly onPress: (foto: GaleriaFotoEntity) => void;
  readonly onLongPress: (foto: GaleriaFotoEntity) => void;
}

export const GaleriaPhotoTile: React.FC<GaleriaPhotoTileProps> = ({
  foto,
  index,
  selectionMode,
  selected,
  selectionAccentColor,
  onPress,
  onLongPress,
}) => {
  const isOrphan = foto.vistoriaId === null;
  const itemTheme = getGaleriaFotoTheme(foto);
  const shortName = foto.nomeArquivo.replace(/\.[^.]+$/, "").slice(-9);
  const tagLabel = isOrphan
    ? "Sem vistoria"
    : foto.tipoRelatorio === "SOCICAM"
      ? "SOC"
      : foto.tipoRelatorio;

  const tileScale = useRef(new Animated.Value(1)).current;
  const checkAnim = useRef(new Animated.Value(selectionMode ? 1 : 0)).current;
  const animatedColor = useAnimatedColor(
    selected ? selectionAccentColor : itemTheme.primary,
    180
  );

  useEffect(() => {
    Animated.timing(tileScale, {
      toValue: selected ? 0.93 : 1,
      duration: 170,
      easing: FLUID_EASE,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [selected, tileScale]);

  useEffect(() => {
    Animated.timing(checkAnim, {
      toValue: selectionMode ? 1 : 0,
      duration: 165,
      easing: FLUID_EASE,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [selectionMode, checkAnim]);

  const checkScale = checkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  return (
    <FadeSlideView
      delay={Math.min(index * 28, 160)}
      distance={8}
      duration={210}
      style={styles.tileWrap}
    >
      <Animated.View style={{ transform: [{ scale: tileScale }] }}>
        <AnimatedScalePressable
          onPress={() => onPress(foto)}
          onLongPress={() => onLongPress(foto)}
          accessibilityRole={selectionMode ? "checkbox" : "button"}
          accessibilityState={selectionMode ? { checked: selected } : undefined}
          accessibilityLabel={`Foto ${foto.nomeArquivo}`}
        >
          <Animated.View
            style={[
              styles.tile,
              {
                backgroundColor: itemTheme.primarySoft,
                borderColor: animatedColor,
              },
            ]}
          >
            <Animated.View
              style={[styles.tileTopBar, { backgroundColor: animatedColor }]}
            />

            <Animated.View
              pointerEvents="none"
              style={[
                styles.tileCheck,
                selected && {
                  backgroundColor: selectionAccentColor,
                  borderColor: selectionAccentColor,
                },
                { opacity: checkAnim, transform: [{ scale: checkScale }] },
              ]}
            >
              <AnimatedCheckBadge
                visible={selected}
                color={ARPE_COLORS.white}
                size={12}
              />
            </Animated.View>

            <Camera size={22} color={itemTheme.primary} />
            <Text
              style={[styles.tileName, { color: itemTheme.primary }]}
              numberOfLines={1}
            >
              {shortName}
            </Text>
            <View
              style={[styles.tileTag, { backgroundColor: itemTheme.primary }]}
            >
              <Text style={styles.tileTagText} numberOfLines={1}>
                {tagLabel}
              </Text>
            </View>
          </Animated.View>
        </AnimatedScalePressable>
      </Animated.View>
    </FadeSlideView>
  );
};

const styles = StyleSheet.create({
  tileWrap: { flex: 1 / 3 },
  tile: {
    aspectRatio: 1,
    borderRadius: RADII.md,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: SPACING.xs,
    overflow: "hidden",
    position: "relative",
  },
  tileTopBar: { position: "absolute", top: 0, left: 0, right: 0, height: 4 },
  tileCheck: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 20,
    height: 20,
    borderRadius: RADII.pill,
    borderWidth: 1.5,
    borderColor: ARPE_COLORS.borderStrong,
    backgroundColor: ARPE_COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  tileName: { fontSize: 10, fontWeight: "800" },
  tileTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADII.pill },
  tileTagText: { fontSize: 8.5, fontWeight: "800", color: ARPE_COLORS.white },
});
