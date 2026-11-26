import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Camera } from "lucide-react-native";
import { ehUriFotoReal } from "../../../domain/rules/watermarkRules";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII } from "../../theme/tokens";

interface SimulatedPhotoThumbProps {
  nomeArquivo?: string;
  localUri?: string;
  accentColor: string;
  accentSoft: string;
  size?: number;
  badgeText?: string;
}

/**
 * Miniatura reutilizável para evidências fotográficas: exibe a foto 1:1 real
 * do sandbox privado quando disponível ou fallback visual nos mocks de teste.
 */
export const SimulatedPhotoThumb: React.FC<SimulatedPhotoThumbProps> = ({
  nomeArquivo,
  localUri,
  accentColor,
  accentSoft,
  size = 56,
  badgeText,
}) => {
  const shortLabel = nomeArquivo
    ? nomeArquivo.replace(/\.[^.]+$/, "").slice(-8)
    : "FOTO";
  const temFotoReal = ehUriFotoReal(localUri);

  return (
    <View
      style={[
        styles.thumb,
        {
          width: size,
          height: size,
          backgroundColor: accentSoft,
          borderColor: accentColor,
          paddingHorizontal: temFotoReal ? 0 : 4,
        },
      ]}
    >
      {temFotoReal ? (
        <Image
          source={{ uri: localUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <>
          <Camera
            size={Math.max(15, Math.round(size * 0.32))}
            color={accentColor}
          />
          <Text
            style={[
              styles.label,
              { color: accentColor, fontSize: size >= 64 ? 9.5 : 8 },
            ]}
            numberOfLines={1}
          >
            {shortLabel}
          </Text>
        </>
      )}

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
