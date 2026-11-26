import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { ARPE_COLORS } from "../../theme/colors";
import { NATIVE_DRIVER } from "./MotionPrimitives";

const LOGO_ICONE = require("../../../../assets/logo/logo_icone.png");
const LOGO_ARPE = require("../../../../assets/logo/logo_arpe_completo.png");
const LOGO_SUB = require("../../../../assets/logo/logo_arpe.png");

const EASE_OUT = Easing.out(Easing.cubic);

export const ArpeSplashOverlay: React.FC = () => {
  const { width: winWidth } = useWindowDimensions();
  const [visible, setVisible] = useState(true);

  const totalWidth = Math.min(Math.max(winWidth * 0.86, 300), 620);
  const iconW = Math.round(totalWidth * 0.23);
  const iconH = Math.round(iconW * 0.82);
  const arpeW = Math.round(totalWidth * 0.4);
  const subW = Math.round(totalWidth * 0.34);
  const textH = Math.round(iconH * 0.9);
  const gap1 = Math.max(4, Math.round(totalWidth * 0.014));
  const gap2 = Math.max(5, Math.round(totalWidth * 0.016));
  const iconCenterOffset = Math.round((arpeW + subW + gap1 + gap2) / 2);

  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const groupY = useRef(new Animated.Value(0)).current;
  const iconEntry = useRef(new Animated.Value(0)).current;
  const iconSlide = useRef(new Animated.Value(0)).current;
  const arpeAnim = useRef(new Animated.Value(0)).current;
  const subAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    iconEntry.setValue(0);
    iconSlide.setValue(0);
    arpeAnim.setValue(0);
    subAnim.setValue(0);

    const sequence = Animated.sequence([
      // Aguarda 1º frame pintar para o fade-in do "A" ser sempre 100% visível
      Animated.delay(160),
      // 1. Símbolo "A" surge com fade-in + zoom suave exatamente no centro
      Animated.timing(iconEntry, {
        toValue: 1,
        duration: 680,
        easing: EASE_OUT,
        useNativeDriver: NATIVE_DRIVER,
      }),
      Animated.delay(280),
      // 2. "A" desliza para a esquerda enquanto o nome entra com ease-out
      Animated.parallel([
        Animated.timing(iconSlide, {
          toValue: 1,
          duration: 640,
          easing: EASE_OUT,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.sequence([
          Animated.delay(150),
          Animated.timing(arpeAnim, {
            toValue: 1,
            duration: 580,
            easing: EASE_OUT,
            useNativeDriver: NATIVE_DRIVER,
          }),
        ]),
        Animated.sequence([
          Animated.delay(280),
          Animated.timing(subAnim, {
            toValue: 1,
            duration: 560,
            easing: EASE_OUT,
            useNativeDriver: NATIVE_DRIVER,
          }),
        ]),
      ]),
      // 3. Pausa confortável de leitura da marca completa
      Animated.delay(680),
      // 4. Saída suave revelando o app
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 480,
          easing: EASE_OUT,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(groupY, {
          toValue: -14,
          duration: 480,
          easing: EASE_OUT,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]),
    ]);

    sequence.start(({ finished }) => {
      if (finished) setVisible(false);
    });

    return () => sequence.stop();
  }, [iconEntry, iconSlide, arpeAnim, subAnim, overlayOpacity, groupY]);

  if (!visible) return null;

  const iconScale = iconEntry.interpolate({
    inputRange: [0, 1],
    outputRange: [0.68, 1],
  });
  const iconEntryY = iconEntry.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
  });
  const iconX = iconSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [iconCenterOffset, 0],
  });
  const arpeX = arpeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-22, 0],
  });
  const subX = subAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-18, 0],
  });

  return (
    <Animated.View
      pointerEvents="auto"
      style={[styles.overlay, { opacity: overlayOpacity }]}
    >
      <Animated.View
        style={[styles.logoRow, { transform: [{ translateY: groupY }] }]}
      >
        <Animated.View
          style={{
            opacity: iconEntry,
            transform: [
              { translateX: iconX },
              { translateY: iconEntryY },
              { scale: iconScale },
            ],
          }}
        >
          <Image
            source={LOGO_ICONE}
            style={{ width: iconW, height: iconH }}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View
          style={{
            marginLeft: gap1,
            opacity: arpeAnim,
            transform: [{ translateX: arpeX }],
          }}
        >
          <Image
            source={LOGO_ARPE}
            style={{ width: arpeW, height: textH }}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View
          style={{
            marginLeft: gap2,
            opacity: subAnim,
            transform: [{ translateX: subX }],
          }}
        >
          <Image
            source={LOGO_SUB}
            style={{ width: subW, height: textH }}
            resizeMode="contain"
          />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    backgroundColor: ARPE_COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
