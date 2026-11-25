import React, { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Calendar, ChevronDown, MapPin, SlidersHorizontal } from "lucide-react-native";
import {
  alternarFiltroOpcional,
  contarFiltrosAtivosVistorias,
  contarFiltrosModal,
  OpcoesFiltroVistorias,
  VistoriasFiltroState,
} from "../../../domain/rules/domainRules";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import {
  AnchoredPopover,
  AnchorRect,
  AnimatedCheckBadge,
  AnimatedScalePressable,
  AnimatedValueText,
} from "../common/MotionPrimitives";

interface VistoriasFilterBarProps {
  readonly filtro: VistoriasFiltroState;
  readonly opcoes: OpcoesFiltroVistorias;
  readonly accentColor: string;
  readonly disabled?: boolean;
  readonly onOpenSheet: () => void;
  readonly onChangeFiltro: (next: VistoriasFiltroState) => void;
  readonly onClearAll: () => void;
}

type PopoverKind = "data" | "local" | null;

export const VistoriasFilterBar: React.FC<VistoriasFilterBarProps> = ({
  filtro,
  opcoes,
  accentColor,
  disabled = false,
  onOpenSheet,
  onChangeFiltro,
  onClearAll,
}) => {
  const [openKind, setOpenKind] = useState<PopoverKind>(null);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);
  const dataRef = useRef<View>(null);
  const localRef = useRef<View>(null);

  const modalCount = contarFiltrosModal(filtro);
  const totalAtivos = contarFiltrosAtivosVistorias(filtro);

  const openPopover = (kind: Exclude<PopoverKind, null>) => {
    const ref = kind === "data" ? dataRef : localRef;
    ref.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width: Math.max(width, 210), height });
      setOpenKind(kind);
    });
  };

  const currentOptions = openKind === "data" ? opcoes.datas : opcoes.locais;
  const currentValue = openKind === "data" ? filtro.data : filtro.local;

  const handleSelectOption = (option: string) => {
    if (openKind === "data") {
      onChangeFiltro({ ...filtro, data: alternarFiltroOpcional(filtro.data, option) });
    } else if (openKind === "local") {
      onChangeFiltro({ ...filtro, local: alternarFiltroOpcional(filtro.local, option) });
    }
    setOpenKind(null);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={styles.pillSlot}>
          <AnimatedScalePressable
            onPress={onOpenSheet}
            disabled={disabled}
            style={[
              styles.pill,
              modalCount > 0 && { backgroundColor: accentColor, borderColor: accentColor },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Abrir filtros de concessão e modalidade"
          >
            <SlidersHorizontal
              size={14}
              color={modalCount > 0 ? ARPE_COLORS.white : ARPE_COLORS.textPrimary}
            />
            <Text
              style={[styles.pillText, modalCount > 0 && styles.pillTextActive]}
              numberOfLines={1}
            >
              Tipo
            </Text>
            {modalCount > 0 && (
              <View style={styles.badge}>
                <AnimatedValueText
                  inline
                  valueKey={String(modalCount)}
                  style={[styles.badgeText, { color: accentColor }]}
                >
                  {modalCount}
                </AnimatedValueText>
              </View>
            )}
          </AnimatedScalePressable>
        </View>

        {opcoes.datas.length > 0 && (
          <View ref={dataRef} collapsable={false} style={styles.pillSlot}>
            <AnimatedScalePressable
              onPress={() => openPopover("data")}
              disabled={disabled}
              style={[
                styles.pill,
                filtro.data !== null && {
                  backgroundColor: accentColor,
                  borderColor: accentColor,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Filtrar por data"
            >
              <Calendar
                size={13}
                color={filtro.data ? ARPE_COLORS.white : ARPE_COLORS.textSecondary}
              />
              <Text
                style={[styles.pillText, filtro.data !== null && styles.pillTextActive]}
                numberOfLines={1}
              >
                {filtro.data ?? "Data"}
              </Text>
              <ChevronDown
                size={13}
                color={filtro.data ? ARPE_COLORS.white : ARPE_COLORS.textMuted}
              />
            </AnimatedScalePressable>
          </View>
        )}

        {opcoes.locais.length > 0 && (
          <View ref={localRef} collapsable={false} style={styles.pillSlot}>
            <AnimatedScalePressable
              onPress={() => openPopover("local")}
              disabled={disabled}
              style={[
                styles.pill,
                filtro.local !== null && {
                  backgroundColor: accentColor,
                  borderColor: accentColor,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Filtrar por local"
            >
              <MapPin
                size={13}
                color={filtro.local ? ARPE_COLORS.white : ARPE_COLORS.textSecondary}
              />
              <Text
                style={[styles.pillText, filtro.local !== null && styles.pillTextActive]}
                numberOfLines={1}
              >
                {filtro.local ?? "Local"}
              </Text>
              <ChevronDown
                size={13}
                color={filtro.local ? ARPE_COLORS.white : ARPE_COLORS.textMuted}
              />
            </AnimatedScalePressable>
          </View>
        )}

        {totalAtivos > 0 && (
          <AnimatedScalePressable
            onPress={onClearAll}
            disabled={disabled}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Limpar filtros"
          >
            <Text style={[styles.clearText, { color: accentColor }]}>Limpar</Text>
          </AnimatedScalePressable>
        )}
      </View>

      <AnchoredPopover
        visible={openKind !== null}
        anchor={anchor}
        estimatedHeight={200}
        onClose={() => setOpenKind(null)}
      >
        <ScrollView style={styles.popoverList} showsVerticalScrollIndicator={false}>
          {currentOptions.map((option) => {
            const active = currentValue === option;
            return (
              <AnimatedScalePressable
                key={option}
                onPress={() => handleSelectOption(option)}
                style={[styles.popoverItem, active && styles.popoverItemActive]}
              >
                <Text
                  style={[
                    styles.popoverItemText,
                    active && { color: accentColor, fontWeight: "800" },
                  ]}
                  numberOfLines={1}
                >
                  {option}
                </Text>
                <AnimatedCheckBadge visible={active} color={accentColor} size={15} />
              </AnimatedScalePressable>
            );
          })}
        </ScrollView>
      </AnchoredPopover>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: ARPE_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: ARPE_COLORS.border,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  pillSlot: {
    flex: 1,
    minWidth: 0,
  },
  pill: {
    width: "100%",
    height: TOUCH_TARGET_MIN - 8,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: ARPE_COLORS.borderStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  pillText: { fontSize: 12.5, fontWeight: "700", color: ARPE_COLORS.textPrimary, flexShrink: 1 },
  pillTextActive: { color: ARPE_COLORS.white },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: RADII.pill,
    paddingHorizontal: 4,
    backgroundColor: ARPE_COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 10.5, lineHeight: 13, fontWeight: "800", includeFontPadding: false },
  clearBtn: {
    minHeight: TOUCH_TARGET_MIN - 10,
    paddingHorizontal: SPACING.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  clearText: { fontSize: 12, fontWeight: "800" },
  popoverList: { maxHeight: 220 },
  popoverItem: {
    minHeight: TOUCH_TARGET_MIN - 4,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  popoverItemActive: { backgroundColor: ARPE_COLORS.surfaceMuted },
  popoverItemText: { fontSize: 13, fontWeight: "600", color: ARPE_COLORS.textPrimary, flex: 1 },
});
