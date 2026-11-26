import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { RotateCcw, X } from "lucide-react-native";
import { CONCESSION_CONFIG } from "../../../domain/config/concessionConfig";
import { VistoriaSessionEntity } from "../../../domain/entities/types";
import { resumirContagensVistoria } from "../../../domain/rules/domainRules";
import { resolverUriPorNomeArquivo } from "../../../domain/rules/watermarkRules";
import { ARPE_COLORS, getConcessionTheme } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import {
  AnimatedModalBox,
  AnimatedScalePressable,
  FadeSlideView,
} from "../common/MotionPrimitives";
import { SimulatedPhotoThumb } from "../common/SimulatedPhotoThumb";

interface FinalizadoDetalheModalProps {
  readonly vistoria: VistoriaSessionEntity | null;
  readonly onClose: () => void;
  readonly onReabrir: (vistoriaId: string) => void;
}

export const FinalizadoDetalheModal: React.FC<FinalizadoDetalheModalProps> = ({
  vistoria,
  onClose,
  onReabrir,
}) => {
  const [confirmingReopen, setConfirmingReopen] = useState(false);

  useEffect(() => {
    setConfirmingReopen(false);
  }, [vistoria?.id]);

  const theme = vistoria
    ? getConcessionTheme(vistoria.tipoRelatorio, vistoria.categoriaRelatorio)
    : getConcessionTheme("CRA", "Fiscalização");
  const cfg = vistoria ? CONCESSION_CONFIG[vistoria.tipoRelatorio] : null;
  const counts = vistoria ? resumirContagensVistoria(vistoria) : null;

  return (
    <AnimatedModalBox
      visible={vistoria !== null}
      variant="sheet"
      cardStyle={styles.sheet}
      onClose={onClose}
    >
      {vistoria && cfg && counts && (
        <>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: theme.primarySoft,
                    borderColor: theme.primaryBorder,
                  },
                ]}
              >
                <Text style={[styles.badgeText, { color: theme.primary }]}>
                  {vistoria.tipoRelatorio} · {vistoria.categoriaRelatorio}
                </Text>
              </View>
              <Text style={styles.title} numberOfLines={1}>
                {vistoria.fiscalizacao.idFiscalizacao}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {vistoria.fiscalizacao.local}
              </Text>
            </View>
            <AnimatedScalePressable onPress={onClose} style={styles.closeBtn}>
              <X size={18} color={ARPE_COLORS.textSecondary} />
            </AnimatedScalePressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.metaCard}>
              <Text style={styles.metaLine}>
                Período: {vistoria.fiscalizacao.periodo} · Contrato:{" "}
                {vistoria.fiscalizacao.contrato}
              </Text>
              <Text style={styles.metaLine}>
                Equipe: {vistoria.fiscalizacao.pessoalResponsavel}
              </Text>
              <Text style={styles.metaLine}>
                Coordenação: {vistoria.fiscalizacao.coordenador}
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{counts.totalNcs}</Text>
                <Text style={styles.statLbl}>NCs</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{counts.totalPas}</Text>
                <Text style={styles.statLbl}>PAs</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{counts.totalFotos}</Text>
                <Text style={styles.statLbl}>Fotos</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>
              OCORRÊNCIAS ({vistoria.ocorrencias.length})
            </Text>
            {vistoria.ocorrencias.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma ocorrência registrada.</Text>
            ) : (
              vistoria.ocorrencias.map((oc) => (
                <View key={oc.numero} style={styles.ocCard}>
                  <View style={styles.ocRow}>
                    <SimulatedPhotoThumb
                      nomeArquivo={oc.fotoAtualNome}
                      localUri={resolverUriPorNomeArquivo(
                        vistoria.fotos,
                        oc.fotoAtualNome
                      )}
                      accentColor={theme.primary}
                      accentSoft={theme.primarySoft}
                      size={46}
                      badgeText={oc.relacionamento ? "2x" : undefined}
                    />
                    <View style={styles.ocBody}>
                      <Text style={styles.ocTitle}>
                        #{String(oc.numero).padStart(2, "0")} · {oc.tipoAchado} ·{" "}
                        {oc.identificacao}
                      </Text>
                      <Text style={styles.ocDesc}>{oc.descricao}</Text>
                      <Text style={styles.ocMeta}>
                        {cfg.exibePistaFaixa
                          ? [oc.pista ? `Pista ${oc.pista}` : "", oc.direcaoFaixa]
                              .filter(Boolean)
                              .join(" · ") || vistoria.fiscalizacao.local
                          : oc.setorPredial || vistoria.fiscalizacao.local}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}

            {vistoria.fiscalizacao.recomendacoesSocicam ? (
              <View style={styles.metaCard}>
                <Text style={styles.sectionLabel}>RECOMENDAÇÕES À SOCICAM</Text>
                <Text style={styles.metaLine}>
                  {vistoria.fiscalizacao.recomendacoesSocicam}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <FadeSlideView
              animKey={confirmingReopen ? "confirm" : "idle"}
              distance={5}
              duration={160}
            >
              {confirmingReopen ? (
                <View style={styles.confirmRow}>
                  <View style={styles.col}>
                    <AnimatedScalePressable
                      onPress={() => setConfirmingReopen(false)}
                      style={styles.cancelBtn}
                    >
                      <Text style={styles.cancelBtnText}>Cancelar</Text>
                    </AnimatedScalePressable>
                  </View>
                  <View style={styles.colWide}>
                    <AnimatedScalePressable
                      onPress={() => onReabrir(vistoria.id)}
                      style={[styles.reopenBtn, { backgroundColor: theme.primary }]}
                    >
                      <RotateCcw size={15} color={ARPE_COLORS.white} />
                      <Text style={styles.reopenBtnText}>
                        Confirmar Reabertura
                      </Text>
                    </AnimatedScalePressable>
                  </View>
                </View>
              ) : (
                <AnimatedScalePressable
                  onPress={() => setConfirmingReopen(true)}
                  style={styles.reopenOutlineBtn}
                >
                  <RotateCcw size={16} color={ARPE_COLORS.navy} />
                  <Text style={styles.reopenOutlineText}>Reabrir Finalizado</Text>
                </AnimatedScalePressable>
              )}
            </FadeSlideView>
          </View>
        </>
      )}
    </AnimatedModalBox>
  );
};

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: ARPE_COLORS.white,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    maxHeight: "86%",
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.borderStrong,
    alignSelf: "center",
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  headerText: { flex: 1, gap: 3 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10.5, fontWeight: "800" },
  title: { fontSize: 17.5, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  subtitle: { fontSize: 12.5, color: ARPE_COLORS.textSecondary },
  closeBtn: {
    width: TOUCH_TARGET_MIN - 8,
    height: TOUCH_TARGET_MIN - 8,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: SPACING.sm, paddingBottom: SPACING.md },
  metaCard: {
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    padding: SPACING.md,
    gap: 4,
  },
  metaLine: { fontSize: 12, lineHeight: 17, color: ARPE_COLORS.textSecondary },
  statsRow: { flexDirection: "row", gap: SPACING.sm },
  statBox: {
    flex: 1,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    paddingVertical: SPACING.sm,
    alignItems: "center",
  },
  statVal: { fontSize: 17, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  statLbl: { fontSize: 11, color: ARPE_COLORS.textSecondary },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: ARPE_COLORS.textMuted,
    marginTop: SPACING.xs,
  },
  emptyText: { fontSize: 12.5, color: ARPE_COLORS.textSecondary },
  ocCard: {
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    padding: SPACING.md,
    gap: 3,
  },
  ocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  ocBody: {
    flex: 1,
    gap: 3,
  },
  ocTitle: { fontSize: 12, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  ocDesc: { fontSize: 12.5, color: ARPE_COLORS.textPrimary, lineHeight: 17 },
  ocMeta: { fontSize: 11, color: ARPE_COLORS.textSecondary },
  footer: {
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: ARPE_COLORS.border,
  },
  reopenOutlineBtn: {
    minHeight: TOUCH_TARGET_MIN + 2,
    borderRadius: RADII.md,
    borderWidth: 1.5,
    borderColor: ARPE_COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  reopenOutlineText: { fontSize: 14, fontWeight: "800", color: ARPE_COLORS.navy },
  confirmRow: { flexDirection: "row", gap: SPACING.sm },
  col: { flex: 1 },
  colWide: { flex: 1.5 },
  cancelBtn: {
    minHeight: TOUCH_TARGET_MIN + 2,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: { fontSize: 13.5, fontWeight: "700", color: ARPE_COLORS.textSecondary },
  reopenBtn: {
    minHeight: TOUCH_TARGET_MIN + 2,
    borderRadius: RADII.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  reopenBtnText: { fontSize: 13.5, fontWeight: "800", color: ARPE_COLORS.white },
});
