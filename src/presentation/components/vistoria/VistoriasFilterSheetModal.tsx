import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import {
  CategoriaRelatorio,
  TipoRelatorio,
  VistoriaSessionEntity,
} from "../../../domain/entities/types";
import {
  alternarFiltroOpcional,
  aplicarFiltrosVistoriasAbertas,
  contarFiltrosModal,
  VistoriasFiltroState,
} from "../../../domain/rules/domainRules";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import { ChipSelectorGroup } from "../common/ChipSelectorGroup";
import {
  AnimatedModalBox,
  AnimatedScalePressable,
} from "../common/MotionPrimitives";

interface VistoriasFilterSheetModalProps {
  readonly visible: boolean;
  readonly filtro: VistoriasFiltroState;
  readonly vistoriasAbertas: readonly VistoriaSessionEntity[];
  readonly accentColor: string;
  readonly onChangeFiltro: (next: VistoriasFiltroState) => void;
  readonly onClose: () => void;
}

const CONCESSOES: readonly TipoRelatorio[] = ["CRA", "CRC", "SOCICAM"];
const MODALIDADES: readonly CategoriaRelatorio[] = [
  "Fiscalização",
  "Monitoramento",
];

export const VistoriasFilterSheetModal: React.FC<
  VistoriasFilterSheetModalProps
> = ({
  visible,
  filtro,
  vistoriasAbertas,
  accentColor,
  onChangeFiltro,
  onClose,
}) => {
  const totalResultados = useMemo(
    () => aplicarFiltrosVistoriasAbertas(vistoriasAbertas, filtro).length,
    [vistoriasAbertas, filtro]
  );
  const temFiltrosModal = contarFiltrosModal(filtro) > 0;

  return (
    <AnimatedModalBox
      visible={visible}
      variant="sheet"
      cardStyle={styles.sheet}
      onClose={onClose}
    >
      <View style={styles.handle} />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tipo de Vistoria</Text>
          <Text style={styles.subtitle}>
            Toque para marcar ou desmarcar concessão e modalidade
          </Text>
        </View>
        <AnimatedScalePressable
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Fechar filtros"
        >
          <X size={18} color={ARPE_COLORS.textSecondary} />
        </AnimatedScalePressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ChipSelectorGroup
          label="Concessão"
          options={CONCESSOES}
          value={filtro.concessao ?? ""}
          accentColor={accentColor}
          onChange={(v) =>
            onChangeFiltro({
              ...filtro,
              concessao: alternarFiltroOpcional(
                filtro.concessao,
                v as TipoRelatorio
              ),
            })
          }
        />

        <ChipSelectorGroup
          label="Modalidade"
          options={MODALIDADES}
          value={filtro.modalidade ?? ""}
          accentColor={accentColor}
          onChange={(v) =>
            onChangeFiltro({
              ...filtro,
              modalidade: alternarFiltroOpcional(
                filtro.modalidade,
                v as CategoriaRelatorio
              ),
            })
          }
        />
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.secondaryCol}>
          <AnimatedScalePressable
            onPress={() =>
              onChangeFiltro({ ...filtro, concessao: null, modalidade: null })
            }
            disabled={!temFiltrosModal}
            style={[styles.secondaryBtn, !temFiltrosModal && styles.btnDisabled]}
          >
            <Text style={styles.secondaryBtnText}>Limpar</Text>
          </AnimatedScalePressable>
        </View>
        <View style={styles.primaryCol}>
          <AnimatedScalePressable
            onPress={onClose}
            style={[styles.primaryBtn, { backgroundColor: accentColor }]}
          >
            <Text style={styles.primaryBtnText}>
              Ver {totalResultados}{" "}
              {totalResultados === 1 ? "resultado" : "resultados"}
            </Text>
          </AnimatedScalePressable>
        </View>
      </View>
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
    maxHeight: "82%",
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
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  title: { fontSize: 18, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  subtitle: { fontSize: 12.5, color: ARPE_COLORS.textSecondary, marginTop: 2 },
  closeBtn: {
    width: TOUCH_TARGET_MIN - 8,
    height: TOUCH_TARGET_MIN - 8,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: SPACING.lg, paddingBottom: SPACING.lg },
  footer: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: ARPE_COLORS.border,
  },
  secondaryCol: { flex: 1 },
  primaryCol: { flex: 1.6 },
  secondaryBtn: {
    minHeight: TOUCH_TARGET_MIN + 2,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.45 },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: ARPE_COLORS.textSecondary,
  },
  primaryBtn: {
    minHeight: TOUCH_TARGET_MIN + 2,
    borderRadius: RADII.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { fontSize: 14, fontWeight: "800", color: ARPE_COLORS.white },
});
