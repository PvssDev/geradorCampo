import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Camera, Check, Link2, RefreshCw } from "lucide-react-native";
import { ehUriFotoReal } from "../../../domain/rules/watermarkRules";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import { FotoWatermarkStamp } from "../camera/FotoWatermarkStamp";
import {
  AnimatedModalBox,
  AnimatedScalePressable,
  FadeSlideView,
} from "../common/MotionPrimitives";

export interface SimulatedPhotoDraft {
  readonly nomeArquivo: string;
  readonly horario: string;
  readonly tamanhoKb: number;
  readonly localUri?: string;
  readonly watermarkLinhas?: readonly string[];
}

interface FotoPreviewModalProps {
  visible: boolean;
  photoDraft: SimulatedPhotoDraft | null;
  accentColor: string;
  temOcorrenciaElegivel: boolean;
  onRefazer: () => void;
  onRelacionar: () => void;
  onConfirmar: () => void;
  onClose: () => void;
}

const PREVIEW_SIDE_PX = 264;

export const FotoPreviewModal: React.FC<FotoPreviewModalProps> = ({
  visible,
  photoDraft,
  accentColor,
  temOcorrenciaElegivel,
  onRefazer,
  onRelacionar,
  onConfirmar,
  onClose,
}) => {
  const temFotoReal = ehUriFotoReal(photoDraft?.localUri);

  return (
    <AnimatedModalBox
      visible={visible && photoDraft !== null}
      variant="center"
      cardStyle={styles.card}
      onClose={onClose}
    >
      {photoDraft && (
        <>
          <Text style={styles.kicker}>PRÉ-VISUALIZAÇÃO DA EVIDÊNCIA (1:1)</Text>
          <Text style={styles.title}>Confira a foto capturada</Text>

          <FadeSlideView
            animKey={`${photoDraft.nomeArquivo}-${photoDraft.horario}`}
            distance={6}
            duration={180}
            style={styles.previewWrap}
          >
            <View
              style={[
                styles.previewSquare,
                {
                  width: PREVIEW_SIDE_PX,
                  height: PREVIEW_SIDE_PX,
                  borderColor: accentColor,
                },
              ]}
            >
              {temFotoReal ? (
                <Image
                  source={{ uri: photoDraft.localUri }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.centerCrosshair}>
                  <Camera size={38} color={accentColor} />
                  <Text style={styles.fileName}>{photoDraft.nomeArquivo}</Text>
                  {photoDraft.watermarkLinhas && (
                    <FotoWatermarkStamp
                      linhas={photoDraft.watermarkLinhas}
                      canvasSidePx={PREVIEW_SIDE_PX}
                    />
                  )}
                </View>
              )}

              <View
                style={[styles.badgeOverlay, { backgroundColor: accentColor }]}
              >
                <Camera size={12} color={ARPE_COLORS.white} />
                <Text style={styles.badgeOverlayText}>
                  {temFotoReal ? "FOTO 1:1 · SANDBOX PRIVADO" : "PRÉVIA 1:1"}
                </Text>
              </View>
            </View>

            <Text style={styles.metaText}>
              {photoDraft.nomeArquivo} · {photoDraft.tamanhoKb} KB ·{" "}
              {photoDraft.horario}
            </Text>
          </FadeSlideView>

          <Text style={styles.helperText}>
            {temOcorrenciaElegivel
              ? "Confirme para criar uma nova NC/PA ou relacione esta foto como 2ª imagem de uma ocorrência existente."
              : "Ao confirmar, você irá classificar se o registro é Não Conformidade (NC) ou Ponto de Atenção (PA)."}
          </Text>

          {temOcorrenciaElegivel && (
            <AnimatedScalePressable
              onPress={onRelacionar}
              style={[styles.relateBtn, { borderColor: accentColor }]}
            >
              <Link2 size={16} color={accentColor} />
              <Text style={[styles.relateBtnText, { color: accentColor }]}>
                Relacionar com ocorrência existente
              </Text>
            </AnimatedScalePressable>
          )}

          <View style={styles.actionsRow}>
            <View style={styles.secondaryCol}>
              <AnimatedScalePressable
                onPress={onRefazer}
                style={styles.secondaryBtn}
              >
                <RefreshCw size={16} color={ARPE_COLORS.textSecondary} />
                <Text style={styles.secondaryBtnText}>Refazer</Text>
              </AnimatedScalePressable>
            </View>

            <View style={styles.confirmCol}>
              <AnimatedScalePressable
                onPress={onConfirmar}
                style={[styles.confirmBtn, { backgroundColor: accentColor }]}
              >
                <Check size={17} color={ARPE_COLORS.white} />
                <Text style={styles.confirmBtnText}>Confirmar Foto</Text>
              </AnimatedScalePressable>
            </View>
          </View>
        </>
      )}
    </AnimatedModalBox>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: ARPE_COLORS.white,
    borderRadius: RADII.xl,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  kicker: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: ARPE_COLORS.textMuted,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
  },
  previewWrap: {
    alignItems: "center",
    gap: 8,
  },
  previewSquare: {
    borderRadius: RADII.lg,
    borderWidth: 2,
    backgroundColor: "#111827",
    overflow: "hidden",
    position: "relative",
  },
  badgeOverlay: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADII.pill,
  },
  badgeOverlayText: {
    fontSize: 10,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
  centerCrosshair: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "600",
    color: ARPE_COLORS.textSecondary,
  },
  helperText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: ARPE_COLORS.textSecondary,
  },
  relateBtn: {
    minHeight: TOUCH_TARGET_MIN + 2,
    borderRadius: RADII.md,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  relateBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
  },
  actionsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  secondaryCol: { flex: 1 },
  confirmCol: { flex: 1.4 },
  secondaryBtn: {
    minHeight: TOUCH_TARGET_MIN + 4,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.borderStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: ARPE_COLORS.textSecondary,
  },
  confirmBtn: {
    minHeight: TOUCH_TARGET_MIN + 4,
    borderRadius: RADII.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
});
