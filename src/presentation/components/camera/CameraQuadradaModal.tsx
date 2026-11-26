import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  GestureResponderEvent,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CameraType,
  CameraView,
  FlashMode,
  FocusMode,
  useCameraPermissions,
} from "expo-camera";
import { captureRef } from "react-native-view-shot";
import { Camera, MapPin, RefreshCw, X, Zap, ZapOff } from "lucide-react-native";
import { montarLinhasMarcaDagua } from "../../../domain/rules/watermarkRules";
import { useMobileStore } from "../../../application/store/useMobileStore";
import { toast } from "../../../application/store/useToastStore";
import {
  GpsWatermarkContext,
  mediaService,
} from "../../../infrastructure/media/mediaService";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import { SimulatedPhotoDraft } from "../inicio/FotoPreviewModal";
import { FotoWatermarkStamp } from "./FotoWatermarkStamp";
import { LiveWatermarkStamp } from "./LiveWatermarkStamp";

interface CameraQuadradaModalProps {
  readonly visible: boolean;
  readonly proximoSequencialFoto: number;
  readonly cidadeVistoria?: string;
  readonly localVistoria?: string;
  readonly accentColor: string;
  readonly onClose: () => void;
  readonly onPhotoCaptured: (draft: SimulatedPhotoDraft) => void;
}

interface PendingStampJob {
  readonly croppedUri: string;
  readonly rawUri: string;
  readonly nomeArquivo: string;
  readonly horario: string;
  readonly linhas: readonly string[];
}

const COMPOSITOR_SIDE_PX = 1080;
const ZOOM_PRESETS = [
  { label: "1x", value: 0 },
  { label: "2x", value: 0.25 },
  { label: "3x", value: 0.5 },
] as const;

function distanciaEntreToques(
  touches: readonly { pageX: number; pageY: number }[]
): number {
  if (touches.length < 2) return 0;
  const dx = touches[0].pageX - touches[1].pageX;
  const dy = touches[0].pageY - touches[1].pageY;
  return Math.hypot(dx, dy);
}

export const CameraQuadradaModal: React.FC<CameraQuadradaModalProps> = ({
  visible,
  proximoSequencialFoto,
  cidadeVistoria,
  localVistoria,
  accentColor,
  onClose,
  onPhotoCaptured,
}) => {
  const { width: winWidth } = useWindowDimensions();
  const squareSide = Math.max(260, Math.min(winWidth - SPACING.lg * 2, 460));
  const salvarCopiaGaleriaCelular = useMobileStore(
    (s) => s.salvarCopiaGaleriaCelular
  );

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<FlashMode>("off");
  const [zoom, setZoom] = useState(0);
  const [autofocus, setAutofocus] = useState<FocusMode>("on");
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [gpsCtx, setGpsCtx] = useState<GpsWatermarkContext>({
    coordenadas: null,
    municipioGps: null,
  });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [capturando, setCapturando] = useState(false);
  const [pendingJob, setPendingJob] = useState<PendingStampJob | null>(null);

  const cameraRef = useRef<CameraView | null>(null);
  const compositorRef = useRef<View | null>(null);
  const jobFinalizadoRef = useRef(false);
  const pinchBaseDistRef = useRef<number | null>(null);
  const pinchBaseZoomRef = useRef<number>(0);
  const lastZoomEmitTsRef = useRef<number>(0);
  const lastZoomValueRef = useRef<number>(0);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setCapturando(false);
      setPendingJob(null);
      setZoom(0);
      lastZoomValueRef.current = 0;
      setFocusPoint(null);
      setAutofocus("on");
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      return;
    }

    setGpsLoading(true);
    void mediaService
      .obterContextoGpsMarcaDagua()
      .then((ctx) => setGpsCtx(ctx))
      .finally(() => setGpsLoading(false));
  }, [visible]);

  const concluirComposicao = useCallback(
    async (job: PendingStampJob) => {
      if (jobFinalizadoRef.current) return;
      jobFinalizadoRef.current = true;

      try {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        );
        let stampedUri = job.croppedUri;
        if (compositorRef.current) {
          stampedUri = await captureRef(compositorRef, {
            format: "jpg",
            quality: 0.86,
            width: COMPOSITOR_SIDE_PX,
            height: COMPOSITOR_SIDE_PX,
            result: "tmpfile",
          });
        }

        const salvo = await mediaService.finalizarFotoNoSandboxPrivado({
          stampedTempUri: stampedUri,
          nomeArquivo: job.nomeArquivo,
          rawTempUrisToClean: [job.rawUri, job.croppedUri],
          salvarNaGaleriaCelular: salvarCopiaGaleriaCelular,
        });

        if (salvarCopiaGaleriaCelular && !salvo.salvoNaGaleriaCelular) {
          toast.info(
            "Salva apenas no app",
            "Permissão de galeria negada ou restrita neste dispositivo."
          );
        }

        setPendingJob(null);
        setCapturando(false);
        onPhotoCaptured({
          nomeArquivo: job.nomeArquivo,
          horario: job.horario,
          tamanhoKb: salvo.tamanhoKb,
          localUri: salvo.localUri,
          watermarkLinhas: job.linhas,
        });
      } catch {
        setPendingJob(null);
        setCapturando(false);
        onPhotoCaptured({
          nomeArquivo: job.nomeArquivo,
          horario: job.horario,
          tamanhoKb: 205,
          localUri: job.croppedUri,
          watermarkLinhas: job.linhas,
        });
      }
    },
    [onPhotoCaptured, salvarCopiaGaleriaCelular]
  );

  const acionarToqueParaFocar = useCallback(
    (x: number, y: number) => {
      const clampedX = Math.max(24, Math.min(squareSide - 24, x));
      const clampedY = Math.max(24, Math.min(squareSide - 24, y));
      setFocusPoint({ x: clampedX, y: clampedY });

      focusAnim.setValue(1);
      Animated.timing(focusAnim, {
        toValue: 0,
        duration: 950,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setFocusPoint(null);
      });

      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      setAutofocus("off");
      focusTimerRef.current = setTimeout(() => {
        setAutofocus("on");
      }, 90);
    },
    [focusAnim, squareSide]
  );

  const handleStageTouchStart = (e: GestureResponderEvent) => {
    const touches = e.nativeEvent.touches;
    if (touches.length >= 2) {
      pinchBaseDistRef.current = distanciaEntreToques(touches);
      pinchBaseZoomRef.current = zoom;
      return;
    }
    pinchBaseDistRef.current = null;
    if (touches.length === 1) {
      acionarToqueParaFocar(
        e.nativeEvent.locationX,
        e.nativeEvent.locationY
      );
    }
  };

  const aplicarZoomImediato = useCallback((valor: number) => {
    const clamped = Math.max(0, Math.min(0.85, Math.round(valor * 100) / 100));
    lastZoomValueRef.current = clamped;
    lastZoomEmitTsRef.current = Date.now();
    setZoom(clamped);
  }, []);

  const handleStageTouchMove = (e: GestureResponderEvent) => {
    const touches = e.nativeEvent.touches;
    if (touches.length >= 2) {
      const distAtual = distanciaEntreToques(touches);
      if (!pinchBaseDistRef.current) {
        pinchBaseDistRef.current = distAtual;
        pinchBaseZoomRef.current = lastZoomValueRef.current;
        return;
      }
      const agoraMs = Date.now();
      if (agoraMs - lastZoomEmitTsRef.current < 48) return;

      const delta = (distAtual - pinchBaseDistRef.current) / squareSide;
      const proximoZoom = Math.max(
        0,
        Math.min(0.85, pinchBaseZoomRef.current + delta * 0.9)
      );
      if (Math.abs(proximoZoom - lastZoomValueRef.current) < 0.015) return;

      aplicarZoomImediato(proximoZoom);
    }
  };

  const handleStageTouchEnd = (e: GestureResponderEvent) => {
    if (e.nativeEvent.touches.length < 2) {
      pinchBaseDistRef.current = null;
    }
  };

  const handleDisparar = async () => {
    if (capturando) return;
    const instanteDisparo = new Date();
    const horarioCurto = instanteDisparo.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const nomeArquivo = `FOTO_${String(proximoSequencialFoto).padStart(3, "0")}.jpg`;
    const marcaCongelada = montarLinhasMarcaDagua({
      dataHora: instanteDisparo,
      coordenadas: gpsCtx.coordenadas,
      municipioGps: gpsCtx.municipioGps,
      cidadeVistoria,
      localVistoria,
    });

    if (Platform.OS === "web" || !cameraRef.current) {
      onPhotoCaptured({
        nomeArquivo,
        horario: horarioCurto,
        tamanhoKb: 192,
        watermarkLinhas: marcaCongelada.todasLinhas,
      });
      return;
    }

    setCapturando(true);
    jobFinalizadoRef.current = false;

    try {
      const raw = await cameraRef.current.takePictureAsync({
        quality: 0.92,
        skipProcessing: false,
      });
      if (!raw?.uri) {
        setCapturando(false);
        return;
      }

      const croppedUri = await mediaService.recortarQuadradoCentral(
        raw.uri,
        raw.width || COMPOSITOR_SIDE_PX,
        raw.height || COMPOSITOR_SIDE_PX
      );

      setPendingJob({
        croppedUri,
        rawUri: raw.uri,
        nomeArquivo,
        horario: horarioCurto,
        linhas: marcaCongelada.todasLinhas,
      });
    } catch {
      setCapturando(false);
    }
  };

  if (!visible) return null;

  const precisaPermissao = Platform.OS !== "web" && !permission?.granted;

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalShell}>
        {pendingJob && (
          <View
            ref={compositorRef}
            collapsable={false}
            pointerEvents="none"
            style={styles.offscreenCompositor}
          >
            <Image
              source={{ uri: pendingJob.croppedUri }}
              style={styles.offscreenImage}
              resizeMode="cover"
              fadeDuration={0}
              onLoad={() => void concluirComposicao(pendingJob)}
              onError={() => void concluirComposicao(pendingJob)}
            />
            <FotoWatermarkStamp
              linhas={pendingJob.linhas}
              canvasSidePx={COMPOSITOR_SIDE_PX}
            />
          </View>
        )}

        <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onClose}
            disabled={capturando}
            style={styles.iconCircle}
            accessibilityRole="button"
            accessibilityLabel="Fechar câmera"
          >
            <X size={20} color={ARPE_COLORS.white} />
          </Pressable>

          <View style={styles.gpsPill}>
            <MapPin
              size={13}
              color={gpsCtx.coordenadas ? "#4ade80" : "#facc15"}
            />
            <Text style={styles.gpsPillText} numberOfLines={1}>
              {gpsLoading
                ? "Obtendo GPS..."
                : gpsCtx.coordenadas
                  ? "GPS fixado · Formato 1:1"
                  : "Modo offline · Formato 1:1"}
            </Text>
          </View>

          <View style={styles.topRightRow}>
            <Pressable
              onPress={() => setFlash((f) => (f === "off" ? "on" : "off"))}
              style={styles.iconCircle}
              accessibilityRole="button"
              accessibilityLabel="Alternar flash"
            >
              {flash === "on" ? (
                <Zap size={18} color="#facc15" />
              ) : (
                <ZapOff size={18} color={ARPE_COLORS.white} />
              )}
            </Pressable>
            <Pressable
              onPress={() => setFacing((c) => (c === "back" ? "front" : "back"))}
              style={styles.iconCircle}
              accessibilityRole="button"
              accessibilityLabel="Alternar câmera"
            >
              <RefreshCw size={18} color={ARPE_COLORS.white} />
            </Pressable>
          </View>
        </View>

        <View style={styles.centerStage}>
          {precisaPermissao ? (
            <View style={[styles.permissionBox, { width: squareSide, height: squareSide }]}>
              <Camera size={38} color={ARPE_COLORS.white} />
              <Text style={styles.permTitle}>Permissão da câmera necessária</Text>
              <Text style={styles.permSub}>
                Autorize a câmera para enquadrar fotos quadradas (1:1) com marca d'água oficial no sandbox privado.
              </Text>
              <Pressable
                onPress={() => void requestPermission()}
                style={[styles.permBtn, { backgroundColor: accentColor }]}
              >
                <Text style={styles.permBtnText}>Permitir câmera</Text>
              </Pressable>
            </View>
          ) : (
            <View
              style={[styles.squareFrame, { width: squareSide, height: squareSide }]}
              onTouchStart={handleStageTouchStart}
              onTouchMove={handleStageTouchMove}
              onTouchEnd={handleStageTouchEnd}
            >
              {Platform.OS !== "web" ? (
                <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFill}
                  facing={facing}
                  flash={flash}
                  enableTorch={flash === "on" && facing === "back"}
                  zoom={zoom}
                  autofocus={autofocus}
                  animateShutter={false}
                />
              ) : (
                <View style={styles.webSimStage}>
                  <Camera size={42} color="rgba(255,255,255,0.55)" />
                  <Text style={styles.webSimText}>Visor 1:1 (Prévia Web)</Text>
                </View>
              )}

              {focusPoint && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.focusRing,
                    {
                      left: focusPoint.x - 26,
                      top: focusPoint.y - 26,
                      opacity: focusAnim,
                      transform: [
                        {
                          scale: focusAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.85, 1.15],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              )}

              <LiveWatermarkStamp
                gpsCtx={gpsCtx}
                cidadeVistoria={cidadeVistoria}
                localVistoria={localVistoria}
                canvasSidePx={squareSide}
              />

              {capturando && (
                <View pointerEvents="none" style={styles.processingPill}>
                  <ActivityIndicator size="small" color={ARPE_COLORS.white} />
                  <Text style={styles.processingText}>
                    Salvando 1:1 + marca d'água...
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.bottomBar}>
          <View style={styles.zoomRow}>
            {ZOOM_PRESETS.map((preset) => {
              const ativo = Math.abs(zoom - preset.value) < 0.08;
              return (
                <Pressable
                  key={preset.label}
                  onPress={() => aplicarZoomImediato(preset.value)}
                  style={[
                    styles.zoomPill,
                    ativo && { backgroundColor: accentColor, borderColor: accentColor },
                  ]}
                >
                  <Text style={styles.zoomPillText}>{preset.label}</Text>
                </Pressable>
              );
            })}
            <Text style={styles.zoomReadout}>
              {(1 + zoom * 4).toFixed(1)}x
            </Text>
          </View>
          <Text style={styles.hintText}>
            Toque no visor para focar · Pinça ou botões para zoom
          </Text>
          <Pressable
            onPress={() => void handleDisparar()}
            disabled={capturando || precisaPermissao}
            style={[
              styles.shutterOuter,
              (capturando || precisaPermissao) && styles.shutterDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Capturar foto quadrada"
          >
            <View style={[styles.shutterInner, { borderColor: accentColor }]} />
          </Pressable>
        </View>
      </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalShell: { flex: 1, backgroundColor: "#05070b", overflow: "hidden" },
  root: { flex: 1, backgroundColor: "#05070b", justifyContent: "space-between", zIndex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  topRightRow: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
  iconCircle: {
    width: TOUCH_TARGET_MIN - 4,
    height: TOUCH_TARGET_MIN - 4,
    borderRadius: RADII.pill,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  gpsPill: {
    flex: 1,
    maxWidth: 220,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADII.pill,
    backgroundColor: "rgba(255,255,255,0.11)",
  },
  gpsPillText: { fontSize: 11.5, fontWeight: "700", color: ARPE_COLORS.white },
  centerStage: { flex: 1, alignItems: "center", justifyContent: "center" },
  squareFrame: {
    borderRadius: RADII.md,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.38)",
    backgroundColor: "#111827",
    position: "relative",
  },
  webSimStage: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  webSimText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.65)" },
  processingPill: {
    position: "absolute",
    top: SPACING.md,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADII.pill,
    backgroundColor: "rgba(5, 7, 11, 0.72)",
  },
  processingText: { fontSize: 12, fontWeight: "700", color: ARPE_COLORS.white },
  focusRing: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "#facc15",
    backgroundColor: "rgba(250, 204, 21, 0.12)",
  },
  zoomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  zoomPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  zoomPillText: { fontSize: 11.5, fontWeight: "800", color: ARPE_COLORS.white },
  zoomReadout: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "rgba(255,255,255,0.72)",
    marginLeft: 4,
  },
  permissionBox: {
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "#0f172a",
    padding: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.md,
  },
  permTitle: { fontSize: 16, fontWeight: "800", color: ARPE_COLORS.white, textAlign: "center" },
  permSub: { fontSize: 12.5, lineHeight: 18, color: "rgba(255,255,255,0.75)", textAlign: "center" },
  permBtn: {
    minHeight: TOUCH_TARGET_MIN,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADII.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  permBtnText: { fontSize: 13.5, fontWeight: "800", color: ARPE_COLORS.white },
  bottomBar: {
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  hintText: { fontSize: 11.5, color: "rgba(255,255,255,0.68)", textAlign: "center" },
  shutterOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: ARPE_COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterDisabled: { opacity: 0.45 },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: ARPE_COLORS.white,
    borderWidth: 2,
  },
  offscreenCompositor: {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 0,
    width: COMPOSITOR_SIDE_PX,
    height: COMPOSITOR_SIDE_PX,
    backgroundColor: "#000000",
  },
  offscreenImage: {
    width: COMPOSITOR_SIDE_PX,
    height: COMPOSITOR_SIDE_PX,
  },
});
