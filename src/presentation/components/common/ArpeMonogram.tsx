import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { ARPE_COLORS } from "../../theme/colors";

const LOGO_ICONE = require("../../../../assets/logo/logo_icone.png");

interface ArpeMonogramProps {
  readonly size?: number;
}

export const ArpeMonogram: React.FC<ArpeMonogramProps> = ({ size = 34 }) => {
  const iconSize = Math.round(size * 0.72);

  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: Math.round(size * 0.28) },
      ]}
      accessibilityLabel="Logo ARPE"
    >
      <Image
        source={LOGO_ICONE}
        style={{ width: iconSize, height: iconSize }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: ARPE_COLORS.white,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
