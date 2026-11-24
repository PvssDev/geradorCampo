import React, { useEffect, useRef } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  Eye,
  Route,
} from "lucide-react-native";
import { CONCESSION_CONFIG } from "../../../domain/config/concessionConfig";
import {
  CategoriaRelatorio,
  TipoRelatorio,
} from "../../../domain/entities/types";
import { ARPE_COLORS, getConcessionTheme } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import {
  AnimatedCheckBadge,
  AnimatedScalePressable,
  AnimatedValueText,
  FadeSlideView,
  FLUID_EASE,
  useAnimatedColor,
} from "../common/MotionPrimitives";

interface StepModalidadeProps {
  tipoRelatorio: TipoRelatorio;
  categoriaRelatorio: CategoriaRelatorio;
  onSelectModalidade: (tipo: TipoRelatorio, categoria: CategoriaRelatorio) => void;
  onAvancar: () => void;
}

const CONCESSOES: readonly TipoRelatorio[] = ["CRA", "CRC", "SOCICAM"];
const CATEGORIAS: readonly {
  key: CategoriaRelatorio;
  titulo: string;
  resumo: string;
}[] = [
  {
    key: "Fiscalização",
    titulo: "Fiscalização",
    resumo: "Registro de novas ocorrências (NC e PA) em campo",
  },
  {
    key: "Monitoramento",
    titulo: "Monitoramento",
    resumo: "Acompanhamento de pendências anteriores em campo",
  },
];

const SelectableThemeCard: React.FC<{
  selected: boolean;
  accentColor: string;
  accentSoft: string;
  style: object;
  onPress: () => void;
  children: React.ReactNode;
}> = ({ selected, accentColor, accentSoft, style, onPress, children }) => {
  const anim = useRef(new Animated.Value(selected ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: selected ? 1 : 0,
      duration: 210,
      easing: FLUID_EASE,
      useNativeDriver: false,
    }).start();
  }, [selected, anim]);

  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [ARPE_COLORS.white, accentSoft],
  });
  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [ARPE_COLORS.border, accentColor],
  });

  return (
    <AnimatedScalePressable onPress={onPress}>
      <Animated.View style={[style, { backgroundColor, borderColor }]}>
        {children}
      </Animated.View>
    </AnimatedScalePressable>
  );
};

export const StepModalidade: React.FC<StepModalidadeProps> = ({
  tipoRelatorio,
  categoriaRelatorio,
  onSelectModalidade,
  onAvancar,
}) => {
  const theme = getConcessionTheme(tipoRelatorio, categoriaRelatorio);
  const animatedBtnColor = useAnimatedColor(theme.primary);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <FadeSlideView delay={0} distance={6} style={styles.headerBlock}>
        <Text style={styles.stepTag}>PASSO 1 DE 3</Text>
        <Text style={styles.title}>Qual relatório você vai preencher?</Text>
        <Text style={styles.subtitle}>
          Escolha a concessão e o tipo de relatório para iniciar um preenchimento limpo.
        </Text>
      </FadeSlideView>

      <FadeSlideView delay={35} distance={8} style={styles.section}>
        <Text style={styles.sectionLabel}>CONCESSÃO</Text>
        <View style={styles.cardsStack}>
          {CONCESSOES.map((key) => {
            const cfg = CONCESSION_CONFIG[key];
            const selected = tipoRelatorio === key;
            const itemTheme = getConcessionTheme(key, categoriaRelatorio);
            const Icon = cfg.exibePistaFaixa ? Route : Building2;

            return (
              <SelectableThemeCard
                key={key}
                selected={selected}
                accentColor={itemTheme.primary}
                accentSoft={itemTheme.primarySoft}
                style={styles.optionCard}
                onPress={() => onSelectModalidade(key, categoriaRelatorio)}
              >
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: selected
                        ? itemTheme.primary
                        : ARPE_COLORS.surfaceMuted,
                    },
                  ]}
                >
                  <Icon
                    size={20}
                    color={selected ? ARPE_COLORS.white : ARPE_COLORS.textSecondary}
                  />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>{cfg.nomeCurto}</Text>
                  <Text style={styles.optionSubtitle} numberOfLines={1}>
                    {cfg.nomeCompleto}
                  </Text>
                </View>
                <AnimatedCheckBadge
                  visible={selected}
                  color={itemTheme.primary}
                  size={19}
                />
              </SelectableThemeCard>
            );
          })}
        </View>
      </FadeSlideView>

      <FadeSlideView delay={70} distance={8} style={styles.section}>
        <Text style={styles.sectionLabel}>MODALIDADE</Text>
        <View style={styles.modalityRow}>
          {CATEGORIAS.map((cat) => {
            const selected = categoriaRelatorio === cat.key;
            const catTheme = getConcessionTheme(tipoRelatorio, cat.key);
            const Icon = cat.key === "Fiscalização" ? ClipboardCheck : Eye;

            return (
              <View key={cat.key} style={styles.modalityCol}>
                <SelectableThemeCard
                  selected={selected}
                  accentColor={catTheme.primary}
                  accentSoft={catTheme.primarySoft}
                  style={styles.modalityCard}
                  onPress={() => onSelectModalidade(tipoRelatorio, cat.key)}
                >
                  <View style={styles.modalityTopRow}>
                    <Icon
                      size={20}
                      color={selected ? catTheme.primary : ARPE_COLORS.textSecondary}
                    />
                    <AnimatedCheckBadge
                      visible={selected}
                      color={catTheme.primary}
                      size={16}
                    />
                  </View>
                  <Text
                    style={[
                      styles.modalityTitle,
                      selected && { color: catTheme.primary },
                    ]}
                  >
                    {cat.titulo}
                  </Text>
                  <Text style={styles.modalityDesc}>{cat.resumo}</Text>
                </SelectableThemeCard>
              </View>
            );
          })}
        </View>
      </FadeSlideView>

      <FadeSlideView delay={105} distance={8}>
        <AnimatedScalePressable onPress={onAvancar}>
          <Animated.View
            style={[styles.primaryBtn, { backgroundColor: animatedBtnColor }]}
          >
            <View style={styles.primaryBtnContent}>
              <AnimatedValueText
                valueKey={`${tipoRelatorio}-${categoriaRelatorio}`}
                style={styles.primaryBtnText}
              >
                {`Continuar · ${tipoRelatorio} ${categoriaRelatorio}`}
              </AnimatedValueText>
              <ArrowRight size={18} color={ARPE_COLORS.white} />
            </View>
          </Animated.View>
        </AnimatedScalePressable>
      </FadeSlideView>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ARPE_COLORS.surface },
  content: { padding: SPACING.xl, paddingBottom: 36, gap: SPACING.xl },
  headerBlock: { gap: 6, marginTop: SPACING.xs },
  stepTag: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: ARPE_COLORS.textMuted,
  },
  title: { fontSize: 22, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  subtitle: { fontSize: 13.5, lineHeight: 19, color: ARPE_COLORS.textSecondary },
  section: { gap: SPACING.sm },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    color: ARPE_COLORS.textSecondary,
  },
  cardsStack: { gap: SPACING.sm },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: RADII.lg,
    borderWidth: 1.5,
    gap: SPACING.md,
    minHeight: 68,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: RADII.md,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextWrap: { flex: 1, gap: 2 },
  optionTitle: { fontSize: 16, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  optionSubtitle: { fontSize: 12.5, color: ARPE_COLORS.textSecondary },
  modalityRow: { flexDirection: "row", gap: SPACING.sm },
  modalityCol: { flex: 1 },
  modalityCard: {
    padding: SPACING.md,
    borderRadius: RADII.lg,
    borderWidth: 1.5,
    gap: 6,
    minHeight: 116,
  },
  modalityTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalityTitle: { fontSize: 15, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  modalityDesc: { fontSize: 12, lineHeight: 16, color: ARPE_COLORS.textSecondary },
  primaryBtn: {
    minHeight: TOUCH_TARGET_MIN + 8,
    borderRadius: RADII.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xs,
  },
  primaryBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: ARPE_COLORS.white,
    textAlign: "center",
  },
});
