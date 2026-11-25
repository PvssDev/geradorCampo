import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useToastStore } from "../../../application/store/useToastStore";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII } from "../../theme/tokens";
import { ToastViewport } from "./ToastViewport";

export const NATIVE_DRIVER = Platform.OS !== "web";
export const FLUID_EASE = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * Swipe horizontal entre abas sem interferir em onLongPress (nunca captura início do toque)
 * nem em scroll vertical (exige movimento horizontal claro: |dx| > 28 e |dx| > |dy| * 1.8).
 */
export function useHorizontalSwipe(params: {
  readonly onSwipeLeft: () => void;
  readonly onSwipeRight: () => void;
}) {
  const callbacksRef = useRef(params);
  callbacksRef.current = params;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 28 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.8,
      onPanResponderRelease: (_, gs) => {
        const passedDistance = Math.abs(gs.dx) >= 64;
        const passedFlick = Math.abs(gs.dx) >= 32 && Math.abs(gs.vx) >= 0.45;
        if (!passedDistance && !passedFlick) return;

        if (gs.dx < 0) callbacksRef.current.onSwipeLeft();
        else callbacksRef.current.onSwipeRight();
      },
    })
  ).current;

  return responder.panHandlers;
}

/**
 * Interpola suavemente a troca entre duas cores hexadecimais (~240ms).
 */
export function useAnimatedColor(targetColor: string, duration = 240) {
  const prevRef = useRef(targetColor);
  const currRef = useRef(targetColor);
  const anim = useRef(new Animated.Value(1)).current;

  if (currRef.current !== targetColor) {
    prevRef.current = currRef.current;
    currRef.current = targetColor;
    anim.setValue(0);
  }

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration,
      easing: FLUID_EASE,
      useNativeDriver: false,
    }).start();
  }, [targetColor, duration, anim]);

  return anim.interpolate({
    inputRange: [0, 1],
    outputRange: [prevRef.current, currRef.current],
  });
}

/**
 * Entrada suave com curva bezier [0.22, 1, 0.36, 1] (sem pulos artificiais).
 */
export const FadeSlideView: React.FC<{
  animKey?: string | number;
  delay?: number;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}> = ({
  animKey,
  delay = 0,
  distance = 8,
  duration = 220,
  style,
  children,
}) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(distance)).current;

    useEffect(() => {
      opacity.setValue(0);
      translateY.setValue(distance);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          delay,
          easing: FLUID_EASE,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: duration + 30,
          delay,
          easing: FLUID_EASE,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]).start();
    }, [animKey, delay, distance, duration, opacity, translateY]);

    return (
      <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
        {children}
      </Animated.View>
    );
  };

/**
 * Transição direcional limpa (sem dupla montagem):
 * reseta os valores antes da pintura quando `stepKey` muda, evitando o flash de 1 frame.
 */
export const DirectionalTransition: React.FC<{
  stepKey: string;
  stepIndex: number;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}> = ({
  stepKey,
  stepIndex,
  distance = 20,
  duration = 220,
  style,
  children,
}) => {
    const prevKeyRef = useRef(stepKey);
    const prevIndexRef = useRef(stepIndex);
    const enterOpacity = useRef(new Animated.Value(1)).current;
    const enterX = useRef(new Animated.Value(0)).current;

    if (prevKeyRef.current !== stepKey) {
      const dir = stepIndex >= prevIndexRef.current ? 1 : -1;
      enterOpacity.setValue(0);
      enterX.setValue(dir * distance);
      prevKeyRef.current = stepKey;
      prevIndexRef.current = stepIndex;
    }

    useEffect(() => {
      Animated.parallel([
        Animated.timing(enterOpacity, {
          toValue: 1,
          duration,
          easing: FLUID_EASE,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(enterX, {
          toValue: 0,
          duration: duration + 20,
          easing: FLUID_EASE,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]).start();
    }, [stepKey, duration, enterOpacity, enterX]);

    return (
      <View style={[styles.transitionClip, style]}>
        <Animated.View
          style={[
            styles.transitionFill,
            { opacity: enterOpacity, transform: [{ translateX: enterX }] },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    );
  };

/**
 * Transição fluida de abas em 2 tempos (sem piscar nem corte seco):
 * ao trocar, o conteúdo/cabeçalho sobe suavemente saindo (130ms) e a nova aba desce suave (240ms).
 */
export function AnimatedTabStage<T extends string>({
  activeKey,
  style,
  renderScreen,
}: {
  readonly activeKey: T;
  readonly style?: StyleProp<ViewStyle>;
  readonly renderScreen: (key: T) => React.ReactNode;
}) {
  const [displayedKey, setDisplayedKey] = useState<T>(activeKey);
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (activeKey === displayedKey) return;

    const exitAnim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 130,
        easing: FLUID_EASE,
        useNativeDriver: NATIVE_DRIVER,
      }),
      Animated.timing(translateY, {
        toValue: -12,
        duration: 130,
        easing: FLUID_EASE,
        useNativeDriver: NATIVE_DRIVER,
      }),
    ]);

    exitAnim.start(({ finished }) => {
      if (!finished) return;
      setDisplayedKey(activeKey);
      translateY.setValue(-14);
      opacity.setValue(0);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 240,
          easing: FLUID_EASE,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 260,
          easing: FLUID_EASE,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]).start();
    });

    return () => exitAnim.stop();
  }, [activeKey, displayedKey, opacity, translateY]);

  return (
    <View style={[styles.transitionClip, style]}>
      <Animated.View
        style={[
          styles.transitionFill,
          { opacity, transform: [{ translateY }] },
        ]}
      >
        {renderScreen(displayedKey)}
      </Animated.View>
    </View>
  );
}

/**
 * Fade ultraleve para troca de abas (zero deslocamento, zero piscar).
 */
export const TabFadeView: React.FC<{
  animKey: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}> = ({ animKey, style, children }) => {
  const prevKey = useRef(animKey);
  const opacity = useRef(new Animated.Value(1)).current;

  if (prevKey.current !== animKey) {
    opacity.setValue(0.6);
    prevKey.current = animKey;
  }

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 130,
      easing: FLUID_EASE,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [animKey, opacity]);

  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
};

/**
 * Barra de progresso contínua e minimalista para os 3 passos da Aba Início.
 */
export const WizardProgressBar: React.FC<{
  currentStep: 1 | 2 | 3;
  accentColor: string;
}> = ({ currentStep, accentColor }) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const progress = useRef(new Animated.Value(currentStep / 3)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: currentStep / 3,
      duration: 280,
      easing: FLUID_EASE,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [currentStep, progress]);

  const translateX =
    trackWidth > 0
      ? progress.interpolate({
        inputRange: [0, 1],
        outputRange: [-trackWidth, 0],
      })
      : 0;

  return (
    <View
      style={styles.progressTrack}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
    >
      {trackWidth > 0 && (
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: trackWidth,
              transform: [{ translateX }],
            },
          ]}
        >
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="wizardProgressFade" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor={accentColor} stopOpacity="1" />
                <Stop offset="95%" stopColor={accentColor} stopOpacity="1" />
                <Stop offset="100%" stopColor={accentColor} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="url(#wizardProgressFade)"
            />
          </Svg>
        </Animated.View>
      )}
    </View>
  );
};

/**
 * Micro-transição suave quando o texto de um campo/select muda de valor.
 */
export const AnimatedValueText: React.FC<{
  valueKey: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  inline?: boolean;
  children: React.ReactNode;
}> = ({ valueKey, style, numberOfLines = 1, inline = false, children }) => {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    opacity.setValue(0);
    translateY.setValue(4);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        easing: FLUID_EASE,
        useNativeDriver: NATIVE_DRIVER,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 170,
        easing: FLUID_EASE,
        useNativeDriver: NATIVE_DRIVER,
      }),
    ]).start();
  }, [valueKey, opacity, translateY]);

  return (
    <Animated.View
      style={[
        inline ? styles.valueTextWrapInline : styles.valueTextWrap,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <Text style={style} numberOfLines={numberOfLines}>
        {children}
      </Text>
    </Animated.View>
  );
};

/**
 * Ícone de check que surge com escala suave ao selecionar uma opção ou card.
 */
export const AnimatedCheckBadge: React.FC<{
  visible: boolean;
  color: string;
  size?: number;
}> = ({ visible, color, size = 16 }) => {
  const anim = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: 160,
      easing: FLUID_EASE,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [visible, anim]);

  if (!visible) return null;

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 1],
  });

  return (
    <Animated.View style={{ opacity: anim, transform: [{ scale }] }}>
      <Check size={size} color={color} strokeWidth={2.6} />
    </Animated.View>
  );
};

/**
 * Feedback tátil sutil e natural (sem exagero).
 */
export const AnimatedScalePressable: React.FC<
  PressableProps & {
    style?: StyleProp<ViewStyle>;
    scaleTo?: number;
    children: React.ReactNode;
  }
> = ({ style, scaleTo = 0.982, onPressIn, onPressOut, children, ...rest }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handleIn: PressableProps["onPressIn"] = (e) => {
    Animated.timing(scale, {
      toValue: scaleTo,
      duration: 110,
      easing: FLUID_EASE,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
    onPressIn?.(e);
  };

  const handleOut: PressableProps["onPressOut"] = (e) => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 160,
      easing: FLUID_EASE,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
    onPressOut?.(e);
  };

  return (
    <Pressable onPressIn={handleIn} onPressOut={handleOut} {...rest}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

export const AnimatedChevron: React.FC<{ open: boolean; color: string }> = ({
  open,
  color,
}) => {
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: 190,
      easing: FLUID_EASE,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [open, progress]);

  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <ChevronDown size={17} color={color} />
    </Animated.View>
  );
};

export interface AnchorRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Popover flutuante estilo HeroUI com abertura E fechamento suaves (zero corte seco).
 */
export const AnchoredPopover: React.FC<{
  visible: boolean;
  anchor: AnchorRect | null;
  estimatedHeight?: number;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ visible, anchor, estimatedHeight = 280, onClose, children }) => {
  const { height: winHeight, width: winWidth } = useWindowDimensions();
  const [rendered, setRendered] = useState(visible);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 185,
        easing: FLUID_EASE,
        useNativeDriver: NATIVE_DRIVER,
      }).start();
    } else if (rendered) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 135,
        easing: FLUID_EASE,
        useNativeDriver: NATIVE_DRIVER,
      }).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
  }, [visible, rendered, anim]);

  if (!rendered || !anchor) return null;

  const openUpwards =
    anchor.y + anchor.height + estimatedHeight > winHeight - 20 &&
    anchor.y > estimatedHeight;

  const left = Math.max(12, Math.min(anchor.x, winWidth - anchor.width - 12));
  const positionStyle: ViewStyle = openUpwards
    ? { bottom: winHeight - anchor.y + 6, left, width: anchor.width }
    : { top: anchor.y + anchor.height + 6, left, width: anchor.width };

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [openUpwards ? 6 : -6, 0],
  });
  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlayRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.popoverCard,
            positionStyle,
            {
              opacity: anim,
              transform: [{ translateY }, { scale }],
            },
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

/**
 * Container de Modal/Sheet com backdrop desacoplado e entrada/saída suaves.
 */
export const AnimatedModalBox: React.FC<{
  visible: boolean;
  variant?: "center" | "sheet";
  cardStyle?: StyleProp<ViewStyle>;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ visible, variant = "center", cardStyle, onClose, children }) => {
  const [rendered, setRendered] = useState(visible);
  const anim = useRef(new Animated.Value(0)).current;
  const enterModal = useToastStore((s) => s.enterModal);
  const leaveModal = useToastStore((s) => s.leaveModal);

  useEffect(() => {
    if (!rendered) return;
    enterModal();
    return () => leaveModal();
  }, [rendered, enterModal, leaveModal]);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 215,
        easing: FLUID_EASE,
        useNativeDriver: NATIVE_DRIVER,
      }).start();
    } else if (rendered) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 150,
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
    outputRange: [variant === "sheet" ? 36 : 12, 0],
  });
  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [variant === "sheet" ? 1 : 0.965, 1],
  });

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View
        style={[
          styles.modalRoot,
          variant === "sheet" ? styles.modalRootSheet : styles.modalRootCenter,
        ]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.modalBackdrop,
            { opacity: anim },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            cardStyle,
            {
              opacity: anim,
              transform: [{ translateY }, { scale }],
            },
          ]}
        >
          {children}
        </Animated.View>
        <ToastViewport inModal />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  transitionClip: {
    flex: 1,
    overflow: "hidden",
  },
  transitionFill: {
    flex: 1,
  },
  progressTrack: {
    height: 4,
    width: "100%",
    backgroundColor: ARPE_COLORS.inputBg,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  valueTextWrap: {
    flex: 1,
  },
  valueTextWrapInline: {
    alignItems: "center",
    justifyContent: "center",
  },
  overlayRoot: {
    flex: 1,
  },
  popoverCard: {
    position: "absolute",
    backgroundColor: ARPE_COLORS.white,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: ARPE_COLORS.borderStrong,
    padding: 6,
    shadowColor: "#071d36",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 12,
  },
  modalRoot: {
    flex: 1,
  },
  modalRootCenter: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalRootSheet: {
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    backgroundColor: "rgba(7, 29, 54, 0.56)",
  },
});
