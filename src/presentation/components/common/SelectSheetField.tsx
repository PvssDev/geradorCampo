import React, { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import {
  AnchoredPopover,
  AnchorRect,
  AnimatedCheckBadge,
  AnimatedChevron,
  AnimatedValueText,
  FadeSlideView,
} from "./MotionPrimitives";

export interface SelectOptionItem {
  readonly value: string;
  readonly label: string;
  readonly subtitle?: string;
}

interface BaseProps {
  label: string;
  placeholder: string;
  options: readonly SelectOptionItem[];
  accentColor: string;
  accentSoft: string;
  leftIcon?: React.ReactNode;
}

type SelectSheetFieldProps =
  | (BaseProps & { multiple?: false; value: string; onChange: (v: string) => void })
  | (BaseProps & { multiple: true; values: readonly string[]; onChange: (v: string[]) => void });

export const SelectSheetField: React.FC<SelectSheetFieldProps> = (props) => {
  const triggerRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);

  const isMulti = props.multiple === true;
  const selected = isMulti ? props.values : props.value ? [props.value] : [];

  const summary =
    selected.length === 0
      ? ""
      : !isMulti
      ? props.options.find((o) => o.value === props.value)?.label ?? props.value
      : selected.length === 1
      ? selected[0]
      : `${selected[0]} +${selected.length - 1}`;

  const handleOpen = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  const toggleMulti = (val: string) => {
    if (!isMulti) return;
    props.onChange(
      props.values.includes(val)
        ? props.values.filter((v) => v !== val)
        : [...props.values, val]
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{props.label}</Text>
        {isMulti && selected.length > 0 && (
          <FadeSlideView animKey={selected.length} distance={3} duration={150}>
            <Text style={[styles.countText, { color: props.accentColor }]}>
              ({selected.length})
            </Text>
          </FadeSlideView>
        )}
      </View>

      <View ref={triggerRef} collapsable={false}>
        <Pressable
          onPress={handleOpen}
          style={({ pressed }) => [
            styles.trigger,
            pressed && { opacity: 0.92 },
            open && {
              borderColor: props.accentColor,
              backgroundColor: ARPE_COLORS.white,
            },
          ]}
        >
          {props.leftIcon}
          <AnimatedValueText
            valueKey={summary || "empty"}
            style={[styles.triggerText, !summary && styles.placeholder]}
          >
            {summary || props.placeholder}
          </AnimatedValueText>
          <AnimatedChevron
            open={open}
            color={open ? props.accentColor : ARPE_COLORS.textSecondary}
          />
        </Pressable>
      </View>

      {isMulti && selected.length > 0 && (
        <View style={styles.chips}>
          {selected.map((name) => (
            <FadeSlideView key={name} distance={4} duration={160}>
              <Pressable
                onPress={() => toggleMulti(name)}
                style={[
                  styles.chip,
                  { backgroundColor: props.accentSoft, borderColor: props.accentColor },
                ]}
              >
                <Text
                  style={[styles.chipText, { color: props.accentColor }]}
                  numberOfLines={1}
                >
                  {name}
                </Text>
                <X size={11} color={props.accentColor} />
              </Pressable>
            </FadeSlideView>
          ))}
        </View>
      )}

      <AnchoredPopover
        visible={open}
        anchor={anchor}
        estimatedHeight={Math.min(280, props.options.length * 52 + 48)}
        onClose={() => setOpen(false)}
      >
        {isMulti && (
          <View style={styles.multiHeader}>
            <Pressable
              onPress={() =>
                props.onChange(
                  props.values.length === props.options.length
                    ? []
                    : props.options.map((o) => o.value)
                )
              }
            >
              <Text style={[styles.multiAction, { color: props.accentColor }]}>
                {props.values.length === props.options.length
                  ? "Desmarcar todos"
                  : "Selecionar todos"}
              </Text>
            </Pressable>
            <Pressable onPress={() => setOpen(false)}>
              <Text style={styles.multiDone}>Concluir</Text>
            </Pressable>
          </View>
        )}

        <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
          {props.options.map((opt) => {
            const active = selected.includes(opt.value);
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  if (isMulti) {
                    toggleMulti(opt.value);
                  } else {
                    props.onChange(opt.value);
                    setOpen(false);
                  }
                }}
                style={({ pressed }) => [
                  styles.option,
                  pressed && { backgroundColor: ARPE_COLORS.surfaceMuted },
                  active && { backgroundColor: props.accentSoft },
                ]}
              >
                <View style={styles.optionTextWrap}>
                  <Text
                    style={[
                      styles.optionLabel,
                      active && { color: props.accentColor },
                    ]}
                    numberOfLines={1}
                  >
                    {opt.label}
                  </Text>
                  {opt.subtitle && (
                    <Text style={styles.optionSub} numberOfLines={1}>
                      {opt.subtitle}
                    </Text>
                  )}
                </View>
                <AnimatedCheckBadge visible={active} color={props.accentColor} size={15} />
              </Pressable>
            );
          })}
        </ScrollView>
      </AnchoredPopover>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: ARPE_COLORS.textSecondary,
    textTransform: "uppercase",
  },
  countText: { fontSize: 11, fontWeight: "800" },
  trigger: {
    minHeight: TOUCH_TARGET_MIN + 2,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.inputBg,
    borderWidth: 1.2,
    borderColor: ARPE_COLORS.border,
    paddingHorizontal: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  triggerText: { fontSize: 14, fontWeight: "600", color: ARPE_COLORS.textPrimary },
  placeholder: { color: ARPE_COLORS.textMuted, fontWeight: "500" },
  menuScroll: { maxHeight: 240 },
  multiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: ARPE_COLORS.border,
  },
  multiAction: { fontSize: 12, fontWeight: "800" },
  multiDone: { fontSize: 12, fontWeight: "700", color: ARPE_COLORS.textPrimary },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: RADII.sm + 2,
    gap: 8,
    marginVertical: 1,
  },
  optionTextWrap: { flex: 1, gap: 1 },
  optionLabel: { fontSize: 13.5, fontWeight: "600", color: ARPE_COLORS.textPrimary },
  optionSub: { fontSize: 11, color: ARPE_COLORS.textSecondary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  chipText: { fontSize: 11.5, fontWeight: "700", maxWidth: 220 },
});
