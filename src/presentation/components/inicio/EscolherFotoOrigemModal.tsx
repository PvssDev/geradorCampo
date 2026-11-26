import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ArrowLeft, FolderOpen, Images, Smartphone, X } from "lucide-react-native";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import {
  AnimatedModalBox,
  AnimatedScalePressable,
  FadeSlideView,
} from "../common/MotionPrimitives";
import { SimulatedPhotoThumb } from "../common/SimulatedPhotoThumb";
import { SimulatedPhotoDraft } from "./FotoPreviewModal";

export interface AcervoFotoOption {
  readonly id: string;
  readonly nomeArquivo: string;
  readonly localUri: string;
  readonly tamanhoKb: number;
  readonly capturadaEm: string;
}

interface EscolherFotoOrigemModalProps {
  visible: boolean;
  fotosGaleriaApp: readonly AcervoFotoOption[];
  accentColor: string;
  accentSoft: string;
  onClose: () => void;
  onSelectPhoto: (draft: SimulatedPhotoDraft) => void;
}

export const EscolherFotoOrigemModal: React.FC<EscolherFotoOrigemModalProps> = ({
  visible,
  fotosGaleriaApp,
  accentColor,
  accentSoft,
  onClose,
  onSelectPhoto,
}) => {
  const [modoGaleriaApp, setModoGaleriaApp] = useState(false);

  const handleClose = () => {
    setModoGaleriaApp(false);
    onClose();
  };

  const handlePickFromPhone = () => {
    const seq = Math.floor(10 + Math.random() * 89);
    const horario = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setModoGaleriaApp(false);
    onSelectPhoto({
      nomeArquivo: `CELULAR_IMG_${seq}.jpg`,
      horario,
      tamanhoKb: 204,
    });
  };

  const handlePickFromAppGallery = (foto: AcervoFotoOption) => {
    setModoGaleriaApp(false);
    onSelectPhoto({
      nomeArquivo: foto.nomeArquivo,
      horario: foto.capturadaEm,
      tamanhoKb: foto.tamanhoKb,
      localUri: foto.localUri,
    });
  };

  return (
    <AnimatedModalBox
      visible={visible}
      variant="center"
      cardStyle={styles.card}
      onClose={handleClose}
    >
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          {modoGaleriaApp ? (
            <Pressable
              onPress={() => setModoGaleriaApp(false)}
              style={styles.backRow}
            >
              <ArrowLeft size={15} color={ARPE_COLORS.textSecondary} />
              <Text style={styles.backText}>Voltar às origens</Text>
            </Pressable>
          ) : (
            <Text style={styles.kicker}>ESCOLHER FOTO JÁ TIRADA</Text>
          )}
          <Text style={styles.title}>
            {modoGaleriaApp ? "Galeria do aplicativo" : "De onde deseja importar?"}
          </Text>
        </View>
        <Pressable onPress={handleClose} style={styles.closeBtn}>
          <X size={18} color={ARPE_COLORS.textSecondary} />
        </Pressable>
      </View>

      {!modoGaleriaApp ? (
        <FadeSlideView animKey="origin-choices" distance={6} style={styles.choicesStack}>
          <AnimatedScalePressable
            onPress={handlePickFromPhone}
            style={styles.originBtn}
          >
            <View style={[styles.iconBox, { backgroundColor: accentSoft }]}>
              <Smartphone size={20} color={accentColor} />
            </View>
            <View style={styles.originText}>
              <Text style={styles.originTitle}>Escolher do celular</Text>
              <Text style={styles.originSub}>
                Importa uma imagem do dispositivo para o sandbox privado (simulado)
              </Text>
            </View>
          </AnimatedScalePressable>

          <AnimatedScalePressable
            onPress={() => setModoGaleriaApp(true)}
            style={styles.originBtn}
          >
            <View style={[styles.iconBox, { backgroundColor: accentSoft }]}>
              <Images size={20} color={accentColor} />
            </View>
            <View style={styles.originText}>
              <Text style={styles.originTitle}>
                Galeria do aplicativo ({fotosGaleriaApp.length})
              </Text>
              <Text style={styles.originSub}>
                Seleciona entre fotos já registradas localmente no app
              </Text>
            </View>
          </AnimatedScalePressable>
        </FadeSlideView>
      ) : (
        <FadeSlideView animKey="app-gallery-grid" distance={6}>
          {fotosGaleriaApp.length === 0 ? (
            <View style={styles.emptyBox}>
              <FolderOpen size={24} color={ARPE_COLORS.textMuted} />
              <Text style={styles.emptyText}>
                Ainda não há fotos salvas na galeria do aplicativo.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.gridScroll}
              contentContainerStyle={styles.gridContent}
              showsVerticalScrollIndicator={false}
            >
              {fotosGaleriaApp.map((f) => (
                <AnimatedScalePressable
                  key={f.id}
                  onPress={() => handlePickFromAppGallery(f)}
                  style={styles.galleryItem}
                >
                  <SimulatedPhotoThumb
                    nomeArquivo={f.nomeArquivo}
                    localUri={f.localUri}
                    accentColor={accentColor}
                    accentSoft={accentSoft}
                    size={64}
                  />
                  <Text style={styles.galleryName} numberOfLines={1}>
                    {f.nomeArquivo}
                  </Text>
                  <Text style={styles.galleryMeta}>
                    {f.tamanhoKb} KB · {f.capturadaEm}
                  </Text>
                </AnimatedScalePressable>
              ))}
            </ScrollView>
          )}
        </FadeSlideView>
      )}
    </AnimatedModalBox>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: ARPE_COLORS.white,
    borderRadius: RADII.xl,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  titleWrap: { flex: 1, gap: 3 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { fontSize: 12, fontWeight: "700", color: ARPE_COLORS.textSecondary },
  kicker: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: ARPE_COLORS.textMuted,
  },
  title: { fontSize: 18, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  choicesStack: { gap: SPACING.sm },
  originBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADII.lg,
    borderWidth: 1.2,
    borderColor: ARPE_COLORS.border,
    backgroundColor: ARPE_COLORS.white,
    minHeight: TOUCH_TARGET_MIN + 18,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: RADII.md,
    alignItems: "center",
    justifyContent: "center",
  },
  originText: { flex: 1, gap: 2 },
  originTitle: { fontSize: 14.5, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  originSub: { fontSize: 12, lineHeight: 16, color: ARPE_COLORS.textSecondary },
  emptyBox: {
    padding: SPACING.xl,
    borderRadius: RADII.lg,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    color: ARPE_COLORS.textSecondary,
  },
  gridScroll: { maxHeight: 300 },
  gridContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  galleryItem: {
    width: "47.5%",
    padding: SPACING.sm,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    alignItems: "center",
    gap: 4,
  },
  galleryName: { fontSize: 11.5, fontWeight: "700", color: ARPE_COLORS.textPrimary },
  galleryMeta: { fontSize: 10.5, color: ARPE_COLORS.textMuted },
});

