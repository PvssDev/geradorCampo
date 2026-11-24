import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { ARPE_COLORS } from "../../theme/colors";

interface ArpeMonogramProps {
  size?: number;
}

export const ArpeMonogram: React.FC<ArpeMonogramProps> = ({ size = 34 }) => {
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
      accessibilityLabel="Logo ARPE"
    >
      <Svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
        <Path
          d="M4 19L10.5 5L14.2 13.5M6.8 14.5H13.5M14.5 9.5L20 19M20 9.5L14.5 19"
          stroke={ARPE_COLORS.white}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: ARPE_COLORS.navyElevated,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
});

