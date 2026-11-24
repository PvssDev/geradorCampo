import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { X } from "lucide-react-native";
import { CONCESSION_CONFIG } from "../../../domain/config/concessionConfig";
import {
  CategoriaRelatorio,
  TipoRelatorio,
} from "../../../domain/entities/types";
import { ARPE_COLORS, getConcessionTheme } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";

interface ModalitySheetModalProps {
  visible: boolean;
  tipoAtual: TipoRelatorio;
  categoriaAtual: CategoriaRelatorio;
  onSelect: (tipo: TipoRelatorio, categoria: CategoriaRelatorio) => void;
  onClose: () => void;
}

const TIPOS: readonly TipoRelatorio[] = ["CRA", "CRC", "SOCICAM"];
const CATEGORIAS: readonly CategoriaRelatorio[] = [
  "Fiscalização",
  "Monitoramento",
];

export const ModalitySheetModal: React.FC<ModalitySheetModalProps> = ({
  visible,
  tipoAtual,
  categoriaAtual,
  onSelect,
  onClose,
}) => {
  const activeTheme = getConcessionTheme(tipoAtual, categoriaAtual);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.kicker}>CTR · MODALIDADE REGULATÓRIA</Text>
              <Text style={styles.title}>Selecionar Concessão e Tipo</Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel="Fechar seletor de modalidade"
            >
              <X size={20} color={ARPE_COLORS.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>CONCESSÃO</Text>
          <View style={styles.segmentRow}>
            {TIPOS.map((tipo) => {
              const selected = tipo === tipoAtual;
              const tTheme = getConcessionTheme(tipo, categoriaAtual);
              return (
                <Pressable
                  key={tipo}
                  onPress={() => onSelect(tipo, categoriaAtual)}
                  style={[
                    styles.pillOption,
                    selected && {
                      backgroundColor: tTheme.primary,
                      borderColor: tTheme.primary,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.pillText,
                      selected && { color: ARPE_COLORS.white },
                    ]}
                  >
                    {tipo}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.helperText}>
            {CONCESSION_CONFIG[tipoAtual].nomeCompleto} ·{" "}
            {CONCESSION_CONFIG[tipoAtual].contratoPadrao}
          </Text>

          <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>
            TIPO DE VISTORIA
          </Text>
          <View style={styles.segmentRow}>
            {CATEGORIAS.map((cat) => {
              const selected = cat === categoriaAtual;
              const cTheme = getConcessionTheme(tipoAtual, cat);
              return (
                <Pressable
                  key={cat}
                  onPress={() => onSelect(tipoAtual, cat)}
                  style={[
                    styles.pillOption,
                    selected && {
                      backgroundColor: cTheme.primary,
                      borderColor: cTheme.primary,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text
                    style={[
                      styles.pillText,
                      selected && { color: ARPE_COLORS.white },
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={onClose}
            style={[styles.confirmBtn, { backgroundColor: activeTheme.primary }]}
          >
            <Text style={styles.confirmText}>Aplicar Seleção</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(7, 29, 54, 0.52)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: ARPE_COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl + 8,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: ARPE_COLORS.borderStrong,
    marginBottom: SPACING.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.lg,
  },
  kicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: ARPE_COLORS.textMuted,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
    marginTop: 2,
  },
  closeBtn: {
    width: TOUCH_TARGET_MIN,
    height: TOUCH_TARGET_MIN,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: ARPE_COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  segmentRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  pillOption: {
    flex: 1,
    minHeight: TOUCH_TARGET_MIN,
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
    color: ARPE_COLORS.textPrimary,
  },
  helperText: {
    marginTop: SPACING.sm,
    fontSize: 12,
    color: ARPE_COLORS.textSecondary,
  },
  confirmBtn: {
    marginTop: SPACING.xl,
    minHeight: 48,
    borderRadius: RADII.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    fontSize: 14,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
});

