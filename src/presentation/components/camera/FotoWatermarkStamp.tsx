import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

interface FotoWatermarkStampProps {
  readonly linhas: readonly string[];
  readonly canvasSidePx: number;
}

const WATERMARK_COLOR = "#FACC15";
const WATERMARK_FONT = Platform.select({
  android: "sans-serif",
  ios: "System",
  default: "sans-serif",
});

/**
 * Carimbo de marca d'água no canto inferior direito, sem caixa de fundo,
 * replicando exatamente a proporção, fonte sans-serif e cor amarela da referência ARPE.
 */
export const FotoWatermarkStamp: React.FC<FotoWatermarkStampProps> = ({
  linhas,
  canvasSidePx,
}) => {
  const fontSize = Math.max(9.5, Math.round(canvasSidePx * 0.0272 * 10) / 10);
  const lineHeight = Math.round(fontSize * 1.28 * 10) / 10;
  const rightOffset = Math.max(6, Math.round(canvasSidePx * 0.022));
  const bottomOffset = Math.max(5, Math.round(canvasSidePx * 0.018));
  const shadowRadius = Math.max(1.5, Math.round(canvasSidePx * 0.003 * 10) / 10);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {
          right: rightOffset,
          bottom: bottomOffset,
          maxWidth: Math.round(canvasSidePx * 0.72),
        },
      ]}
    >
      {linhas.map((linha, idx) => (
        <Text
          key={`${idx}-${linha}`}
          numberOfLines={1}
          style={[
            styles.line,
            {
              fontSize,
              lineHeight,
              textShadowRadius: shadowRadius,
            },
          ]}
        >
          {linha}
        </Text>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignItems: "flex-end",
  },
  line: {
    fontFamily: WATERMARK_FONT,
    fontWeight: "500",
    color: WATERMARK_COLOR,
    textAlign: "right",
    includeFontPadding: false,
    textShadowColor: "rgba(0, 0, 0, 0.88)",
    textShadowOffset: { width: 1, height: 1 },
  },
});
