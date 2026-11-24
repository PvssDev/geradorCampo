import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link2, X } from "lucide-react-native";
import { CONCESSION_CONFIG } from "../../../domain/config/concessionConfig";
import {
  OcorrenciaEntity,
  TipoRelatorio,
} from "../../../domain/entities/types";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING } from "../../theme/tokens";
import { AnimatedModalBox } from "../common/MotionPrimitives";
import { SimulatedPhotoThumb } from "../common/SimulatedPhotoThumb";

interface OcorrenciaDetalheRelacaoModalProps {
  visible: boolean;
  ocorrencia: OcorrenciaEntity | null;
  tipoRelatorio: TipoRelatorio;
  accentColor: string;
  accentSoft: string;
  onClose: () => void;
}

/**
 * Visualização limpa do detalhe da ocorrência (sem lógica de relacionar aqui —
 * o relacionamento é feito exclusivamente pela janela de confirmação da foto).
 */
export const OcorrenciaDetalheRelacaoModal: React.FC<OcorrenciaDetalheRelacaoModalProps> = ({
  visible,
  ocorrencia,
  tipoRelatorio,
  accentColor,
  accentSoft,
  onClose,
}) => {
  const cfg = CONCESSION_CONFIG[tipoRelatorio];

  return (
    <AnimatedModalBox
      visible={visible && ocorrencia !== null}
      variant="center"
      cardStyle={styles.card}
      onClose={onClose}
    >
      {ocorrencia && (
        <>
          <View style={styles.topRow}>
            <View style={styles.titleWrap}>
              <Text style={styles.kicker}>
                OCORRÊNCIA #{String(ocorrencia.numero).padStart(2, "0")} · {ocorrencia.tipoAchado}
              </Text>
              <Text style={styles.title}>{ocorrencia.descricao}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={19} color={ARPE_COLORS.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Miniatura(s) da ocorrência */}
            <View style={styles.thumbsRow}>
              <View style={styles.thumbSlot}>
                <SimulatedPhotoThumb
                  nomeArquivo={ocorrencia.fotoAtualNome}
                  accentColor={accentColor}
                  accentSoft={accentSoft}
                  size={76}
                  badgeText="1ª"
                />
                <Text style={styles.thumbCaption} numberOfLines={1}>
                  {ocorrencia.fotoAtualNome || "Foto principal"}
                </Text>
              </View>

              {ocorrencia.relacionamento && (
                <>
                  <Link2 size={18} color={accentColor} />
                  <View style={styles.thumbSlot}>
                    <SimulatedPhotoThumb
                      nomeArquivo={ocorrencia.relacionamento.fotoRelacionadaNome}
                      accentColor={accentColor}
                      accentSoft={accentSoft}
                      size={76}
                      badgeText="2ª"
                    />
                    <Text style={styles.thumbCaption} numberOfLines={1}>
                      {ocorrencia.relacionamento.fotoRelacionadaNome || "Foto relacionada"}
                    </Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.summaryBox}>
              {cfg.exibePistaFaixa ? (
                <Text style={styles.summaryLine}>
                  Pista: {ocorrencia.pista ?? "-"}
                  {ocorrencia.direcaoFaixa ? ` · ${ocorrencia.direcaoFaixa}` : ""}
                  {ocorrencia.trecho ? ` · ${ocorrencia.trecho}` : ""}
                </Text>
              ) : (
                <Text style={styles.summaryLine}>
                  Terminal: {ocorrencia.terminal ?? "-"}
                </Text>
              )}
              {ocorrencia.codificacao && (
                <Text style={styles.summaryLine}>
                  Codificação: {ocorrencia.codificacao}
                </Text>
              )}
              {ocorrencia.determinacaoOuInfo !== "" && (
                <Text style={styles.summaryLine}>
                  Determinação / Info: {ocorrencia.determinacaoOuInfo}
                </Text>
              )}
            </View>

            {ocorrencia.relacionamento && (
              <View style={styles.relatedSummary}>
                <Text style={[styles.relatedTitle, { color: accentColor }]}>
                  2ª Foto Relacionada ({ocorrencia.relacionamento.sigla})
                </Text>
                {ocorrencia.relacionamento.faixa && (
                  <Text style={styles.summaryLine}>
                    Faixa: {ocorrencia.relacionamento.faixa}
                  </Text>
                )}
                {ocorrencia.relacionamento.siglas && (
                  <Text style={styles.summaryLine}>
                    Siglas: {ocorrencia.relacionamento.siglas.join(", ")}
                  </Text>
                )}
                {ocorrencia.relacionamento.codificacao && (
                  <Text style={styles.summaryLine}>
                    Codificação: {ocorrencia.relacionamento.codificacao}
                  </Text>
                )}
              </View>
            )}
          </ScrollView>
        </>
      )}
    </AnimatedModalBox>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "84%",
    backgroundColor: ARPE_COLORS.white,
    borderRadius: RADII.xl,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  titleWrap: { flex: 1, gap: 3 },
  kicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: ARPE_COLORS.textMuted,
  },
  title: { fontSize: 17, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollArea: { maxHeight: 380 },
  scrollContent: { gap: SPACING.md },
  thumbsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  thumbSlot: { alignItems: "center", gap: 4, maxWidth: 120 },
  thumbCaption: { fontSize: 11, fontWeight: "600", color: ARPE_COLORS.textSecondary },
  summaryBox: {
    padding: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    gap: 5,
  },
  summaryLine: { fontSize: 12.5, color: ARPE_COLORS.textSecondary },
  relatedSummary: {
    padding: SPACING.md,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.borderStrong,
    gap: 4,
  },
  relatedTitle: { fontSize: 12.5, fontWeight: "800" },
});
