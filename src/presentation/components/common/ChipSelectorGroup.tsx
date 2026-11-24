import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import { AnimatedScalePressable, FLUID_EASE } from "./MotionPrimitives";

export type ChipOption = string | { readonly value: string; readonly label: string };

interface BaseProps {
  label: string;
  options: readonly ChipOption[];
  accentColor: string;
  compact?: boolean;
  equalWidth?: boolean;
}

type ChipSelectorGroupProps =
  | (BaseProps & { multiple?: false; value: string; onChange: (val: string) => void })
  | (BaseProps & { multiple: true; values: readonly string[]; onToggle: (val: string) => void });

const AnimatedChipItem: React.FC<{
  label: string;
  active: boolean;
  accentColor: string;
  compact?: boolean;
  equalWidth?: boolean;
  onPress: () => void;
}> = ({ label, active, accentColor, compact, equalWidth, onPress }) => {
  const anim = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: active ? 1 : 0,
      duration: 180,
      easing: FLUID_EASE,
      useNativeDriver: false,
    }).start();
  }, [active, anim]);

  const inactiveBg = compact || equalWidth ? ARPE_COLORS.surfaceMuted : ARPE_COLORS.surface;
  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [inactiveBg, accentColor],
  });
  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [ARPE_COLORS.borderStrong, accentColor],
  });

  return (
    <AnimatedScalePressable scaleTo={0.96} onPress={onPress}>
      <Animated.View
        style={[
          compact ? styles.compactPill : styles.pill,
          equalWidth && styles.equalPill,
          { backgroundColor, borderColor },
        ]}
      >
        <Text
          style={[
            compact ? styles.compactText : styles.pillText,
            active && { color: ARPE_COLORS.white },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </AnimatedScalePressable>
  );
};

export const ChipSelectorGroup: React.FC<ChipSelectorGroupProps> = (props) => {
  const isMulti = props.multiple === true;

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{props.label}</Text>
      <View style={[styles.row, props.equalWidth && styles.equalRow]}>
        {props.options.map((raw) => {
          const val = typeof raw === "string" ? raw : raw.value;
          const lbl = typeof raw === "string" ? raw : raw.label;
          const active = isMulti ? props.values.includes(val) : props.value === val;

          const item = (
            <AnimatedChipItem
              label={lbl}
              active={active}
              accentColor={props.accentColor}
              compact={props.compact}
              equalWidth={props.equalWidth}
              onPress={() => (isMulti ? props.onToggle(val) : props.onChange(val))}
            />
          );

          return props.equalWidth ? (
            <View key={val} style={styles.equalCol}>
              {item}
            </View>
          ) : (
            <React.Fragment key={val}>{item}</React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  group: { gap: 7 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: ARPE_COLORS.textSecondary,
    textTransform: "uppercase",
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  equalRow: { flexWrap: "nowrap", gap: SPACING.sm },
  equalCol: { flex: 1 },
  pill: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: RADII.pill,
    borderWidth: 1.2,
  },
  equalPill: {
    minHeight: TOUCH_TARGET_MIN,
    borderRadius: RADII.md,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: ARPE_COLORS.textPrimary,
    textAlign: "center",
  },
  compactPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADII.sm,
    borderWidth: 1,
  },
  compactText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
  },
});
