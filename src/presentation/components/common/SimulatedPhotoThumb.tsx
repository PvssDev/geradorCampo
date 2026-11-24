import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Camera } from "lucide-react-native";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII } from "../../theme/tokens";

interface SimulatedPhotoThumbProps {
  nomeArquivo?: string;
  accentColor: string;
  accentSoft: string;
  size?: number;
  badgeText?: string;
}

/**
 * Miniatura visual simulada reutilizável para evidências fotográficas no sandbox local.
 */
export const SimulatedPhotoThumb: React.FC<SimulatedPhotoThumbProps> = ({
  nomeArquivo,
  accentColor,
  accentSoft,
  size = 56,
  badgeText,
}) => {
  const shortLabel = nomeArquivo
    ? nomeArquivo.replace(/\.[^.]+$/, "").slice(-8)
    : "FOTO";

  return (
    <View
      style={[
        styles.thumb,
        {
          width: size,
          height: size,
          backgroundColor: accentSoft,
          borderColor: accentColor,
        },
      ]}
    >
      <Camera size={Math.max(15, Math.round(size * 0.32))} color={accentColor} />
      <Text
        style={[styles.label, { color: accentColor, fontSize: size >= 64 ? 9.5 : 8 }]}
        numberOfLines={1}
      >
        {shortLabel}
      </Text>
      {badgeText && (
        <View style={[styles.badge, { backgroundColor: accentColor }]}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  thumb: {
    borderRadius: RADII.md,
    borderWidth: 1.3,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingHorizontal: 4,
    position: "relative",
    overflow: "hidden",
  },
  label: {
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  badge: {
    position: "absolute",
    top: 3,
    right: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: RADII.pill,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
});

