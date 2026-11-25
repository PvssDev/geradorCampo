import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera, Share2, Trash2, X } from "lucide-react-native";
import { GaleriaFotoEntity } from "../../../domain/entities/types";
import { ARPE_COLORS, getGaleriaFotoTheme } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import {
  AnimatedScalePressable,
  FLUID_EASE,
  NATIVE_DRIVER,
} from "../common/MotionPrimitives";

interface GaleriaFotoViewerModalProps {
  readonly fotos: readonly GaleriaFotoEntity[];
  readonly initialFotoId: string | null;
  readonly onClose: () => void;
  readonly onShare: (foto: GaleriaFotoEntity) => void;
  readonly onRequestDelete: (foto: GaleriaFotoEntity) => void;
}

export const GaleriaFotoViewerModal: React.FC<GaleriaFotoViewerModalProps> = ({
  fotos,
  initialFotoId,
  onClose,
  onShare,
  onRequestDelete,
}) => {
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const visible = initialFotoId !== null && fotos.length > 0;

  const [rendered, setRendered] = useState(visible);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [chromeVisible, setChromeVisible] = useState(true);

  const openAnim = useRef(new Animated.Value(0)).current;
  const chromeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      const idx = Math.max(
        0,
        fotos.findIndex((f) => f.id === initialFotoId)
      );
      setCurrentIndex(idx);
      setChromeVisible(true);
      chromeAnim.setValue(1);
      setRendered(true);
      openAnim.setValue(0);
      Animated.timing(openAnim, {
        toValue: 1,
        duration: 240,
        easing: FLUID_EASE,
        useNativeDriver: NATIVE_DRIVER,
      }).start();
      return;
    }

    if (rendered) {
      Animated.timing(openAnim, {
        toValue: 0,
        duration: 175,
        easing: FLUID_EASE,
        useNativeDriver: NATIVE_DRIVER,
      }).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
  }, [visible, initialFotoId, fotos, rendered, openAnim, chromeAnim]);

  useEffect(() => {
    Animated.timing(chromeAnim, {
      toValue: chromeVisible ? 1 : 0,
      duration: 220,
      easing: FLUID_EASE,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [chromeVisible, chromeAnim]);

  if (!rendered || fotos.length === 0) return null;

  const safeIndex = Math.min(currentIndex, fotos.length - 1);
  const fotoAtual = fotos[safeIndex];
  const isOrphan = fotoAtual.vistoriaId === null;
  const theme = getGaleriaFotoTheme(fotoAtual);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIdx = Math.round(e.nativeEvent.contentOffset.x / winWidth);
    if (nextIdx >= 0 && nextIdx < fotos.length && nextIdx !== currentIndex) {
      setCurrentIndex(nextIdx);
    }
  };

  const canvasScale = openAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1],
  });
  const topBarY = chromeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-28, 0],
  });
  const bottomBarY = chromeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0],
  });

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: openAnim }]}>
        {/* Carrossel horizontal edge-to-edge (100% largura lateral) */}
        <Animated.View
          style={[styles.carouselWrap, { transform: [{ scale: canvasScale }] }]}
        >
          <FlatList
            data={fotos}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={safeIndex}
            getItemLayout={(_, index) => ({
              length: winWidth,
              offset: winWidth * index,
              index,
            })}
            onScroll={handleScrollEnd}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleScrollEnd}
            renderItem={({ item }) => {
              const itemTheme = getGaleriaFotoTheme(item);
              return (
                <Pressable
                  onPress={() => setChromeVisible((prev) => !prev)}
                  style={[styles.slide, { width: winWidth, height: winHeight }]}
                  accessibilityRole="button"
                  accessibilityLabel="Alternar modo apenas foto"
                >
                  <View
                    style={[
                      styles.edgeCanvas,
                      {
                        width: winWidth,
                        height: Math.round(winHeight * 0.68),
                        backgroundColor: itemTheme.primarySoft,
                      },
                    ]}
                  >
                    <Camera
                      size={72}
                      color={itemTheme.primary}
                      strokeWidth={1.5}
                    />
                    <Text
                      style={[styles.canvasFile, { color: itemTheme.primary }]}
                    >
                      {item.nomeArquivo}
                    </Text>
                    <Text style={styles.canvasInfo}>
                      {item.tamanhoKb} KB · {item.capturadaEm} · Pasta privada
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />
        </Animated.View>

        {/* Barra superior flutuante (some suavemente no modo apenas foto) */}
        <Animated.View
          pointerEvents={chromeVisible ? "box-none" : "none"}
          style={[
            styles.topOverlay,
            { opacity: chromeAnim, transform: [{ translateY: topBarY }] },
          ]}
        >
          <SafeAreaView edges={["top"]} style={styles.topBar}>
            <View style={styles.topMeta}>
              <View style={styles.topBadgeRow}>
                <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.badgeText}>
                    {isOrphan
                      ? "Sem vistoria"
                      : `${fotoAtual.tipoRelatorio} · ${fotoAtual.categoriaRelatorio}`}
                  </Text>
                </View>
                <Text style={styles.counterText}>
                  {safeIndex + 1} / {fotos.length}
                </Text>
              </View>
              <Text style={styles.fileName} numberOfLines={1}>
                {fotoAtual.nomeArquivo}
              </Text>
            </View>

            <AnimatedScalePressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Fechar visualização em tela inteira"
            >
              <X size={20} color={ARPE_COLORS.white} />
            </AnimatedScalePressable>
          </SafeAreaView>
        </Animated.View>

        {/* Barra inferior flutuante (some suavemente no modo apenas foto) */}
        <Animated.View
          pointerEvents={chromeVisible ? "box-none" : "none"}
          style={[
            styles.bottomOverlay,
            { opacity: chromeAnim, transform: [{ translateY: bottomBarY }] },
          ]}
        >
          <SafeAreaView edges={["bottom"]} style={styles.bottomBar}>
            <Text style={styles.bottomMeta} numberOfLines={1}>
              {isOrphan
                ? "Foto sem vistoria vinculada"
                : `${fotoAtual.idFiscalizacao} · ${fotoAtual.local}`}
            </Text>

            <View style={styles.actionsRow}>
              <AnimatedScalePressable
                onPress={() => onShare(fotoAtual)}
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel="Compartilhar foto"
              >
                <Share2 size={22} color={ARPE_COLORS.white} />
              </AnimatedScalePressable>

              <AnimatedScalePressable
                onPress={() => onRequestDelete(fotoAtual)}
                style={styles.iconBtn}
                accessibilityRole="button"
                accessibilityLabel="Apagar foto"
              >
                <Trash2 size={22} color={ARPE_COLORS.white} />
              </AnimatedScalePressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#000000" },
  carouselWrap: { flex: 1 },
  slide: { alignItems: "center", justifyContent: "center" },
  edgeCanvas: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  canvasFile: { fontSize: 16, fontWeight: "800", textAlign: "center" },
  canvasInfo: {
    fontSize: 12.5,
    color: ARPE_COLORS.textSecondary,
    textAlign: "center",
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  topBar: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  topMeta: { flex: 1, gap: 4 },
  topBadgeRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  badge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADII.pill,
  },
  badgeText: { fontSize: 11, fontWeight: "800", color: ARPE_COLORS.white },
  counterText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
  },
  fileName: { fontSize: 13.5, fontWeight: "700", color: ARPE_COLORS.white },
  closeBtn: {
    width: TOUCH_TARGET_MIN,
    height: TOUCH_TARGET_MIN,
    borderRadius: RADII.pill,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  bottomBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    gap: SPACING.xs,
  },
  bottomMeta: {
    fontSize: 12,
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xxl,
  },
  iconBtn: {
    width: TOUCH_TARGET_MIN + 4,
    height: TOUCH_TARGET_MIN + 4,
    alignItems: "center",
    justifyContent: "center",
  },
});
