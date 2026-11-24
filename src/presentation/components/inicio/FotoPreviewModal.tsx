import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Camera, Check, Link2, RefreshCw } from "lucide-react-native";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import {
  AnimatedModalBox,
  AnimatedScalePressable,
  FadeSlideView,
} from "../common/MotionPrimitives";

export interface SimulatedPhotoDraft {
  readonly nomeArquivo: string;
  readonly horario: string;
  readonly tamanhoKb: number;
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

export const FotoPreviewModal: React.FC<FotoPreviewModalProps> = ({
  visible,
  photoDraft,
  accentColor,
  temOcorrenciaElegivel,
  onRefazer,
  onRelacionar,
  onConfirmar,
  onClose,
}) => (
  <AnimatedModalBox
    visible={visible && photoDraft !== null}
    variant="center"
    cardStyle={styles.card}
    onClose={onClose}
  >
    {photoDraft && (
      <>
        <Text style={styles.kicker}>PRÉ-VISUALIZAÇÃO DA EVIDÊNCIA</Text>
        <Text style={styles.title}>Confira a foto capturada</Text>

        <FadeSlideView
          animKey={`${photoDraft.nomeArquivo}-${photoDraft.horario}`}
          distance={6}
          duration={180}
          style={[styles.previewFrame, { borderColor: accentColor }]}
        >
          <View style={[styles.simulatedBadge, { backgroundColor: accentColor }]}>
            <Camera size={14} color={ARPE_COLORS.white} />
            <Text style={styles.simulatedBadgeText}>CAPTURA SIMULADA</Text>
          </View>

          <View style={styles.centerCrosshair}>
            <Camera size={38} color={accentColor} />
            <Text style={styles.fileName}>{photoDraft.nomeArquivo}</Text>
            <Text style={styles.metaText}>
              1600×1200 px · {photoDraft.tamanhoKb} KB · {photoDraft.horario}
            </Text>
          </View>
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
            <AnimatedScalePressable onPress={onRefazer} style={styles.secondaryBtn}>
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
  previewFrame: {
    height: 196,
    borderRadius: RADII.lg,
    borderWidth: 2,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    padding: SPACING.md,
    justifyContent: "space-between",
  },
  simulatedBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADII.pill,
  },
  simulatedBadgeText: {
    fontSize: 10.5,
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
    fontSize: 15,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
  },
  metaText: {
    fontSize: 12,
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
