import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import { CONCESSION_CONFIG } from "../../domain/config/concessionConfig";
import { useMobileStore } from "../../application/store/useMobileStore";
import { ARPE_COLORS, getConcessionTheme } from "../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../theme/tokens";

interface NovaVistoriaScreenProps {
  onBack: () => void;
  onCreated: (vistoriaId: string) => void;
}

export const NovaVistoriaScreen: React.FC<NovaVistoriaScreenProps> = ({
  onBack,
  onCreated,
}) => {
  const { tipoRelatorio, categoriaRelatorio, criarVistoria } = useMobileStore();
  const cfg = CONCESSION_CONFIG[tipoRelatorio];
  const theme = getConcessionTheme(tipoRelatorio, categoriaRelatorio);

  const prefix = categoriaRelatorio === "Monitoramento" ? "MON" : "FISC";
  const [idFisc, setIdFisc] = useState(`${prefix}-${tipoRelatorio}-2026-004`);
  const [local, setLocal] = useState(cfg.locaisSugeridos[0] || "");
  const [equipe, setEquipe] = useState("Equipe Técnica CTR");
  const [coordenador, setCoordenador] = useState(
    "Maria Ângela Albuquerque de Freitas"
  );

  const handleSave = () => {
    const createdId = criarVistoria({
      idFiscalizacao: idFisc,
      local,
      cidade: local,
      equipe,
      coordenador,
    });
    onCreated(createdId);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityLabel="Voltar"
        >
          <ArrowLeft size={20} color={ARPE_COLORS.white} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerKicker}>
            {tipoRelatorio} · {categoriaRelatorio.toUpperCase()}
          </Text>
          <Text style={styles.headerTitle}>Nova Vistoria Offline</Text>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>ID DA FISCALIZAÇÃO / MONITORAMENTO</Text>
        <TextInput
          value={idFisc}
          onChangeText={setIdFisc}
          style={styles.input}
          placeholder="Ex.: FISC-CRA-2026-001"
          placeholderTextColor={ARPE_COLORS.textMuted}
        />

        <Text style={styles.label}>{cfg.labelLocal.toUpperCase()}</Text>
        <TextInput
          value={local}
          onChangeText={setLocal}
          style={styles.input}
          placeholder={cfg.locaisSugeridos[0]}
          placeholderTextColor={ARPE_COLORS.textMuted}
        />

        <View style={styles.suggestionsWrap}>
          {cfg.locaisSugeridos.slice(0, 3).map((sug) => (
            <Pressable
              key={sug}
              onPress={() => setLocal(sug)}
              style={[
                styles.suggestionChip,
                local === sug && {
                  borderColor: theme.primary,
                  backgroundColor: theme.primarySoft,
                },
              ]}
            >
              <Text
                style={[
                  styles.suggestionText,
                  local === sug && { color: theme.primary },
                ]}
                numberOfLines={1}
              >
                {sug}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>CONTRATO REGULATÓRIO</Text>
        <View style={styles.readOnlyBox}>
          <Text style={styles.readOnlyText}>{cfg.contratoPadrao}</Text>
        </View>

        <Text style={styles.label}>EQUIPE TÉCNICA (PESSOAL RESPONSÁVEL)</Text>
        <TextInput
          value={equipe}
          onChangeText={setEquipe}
          style={styles.input}
          placeholder="Nomes da equipe fiscalizadora"
          placeholderTextColor={ARPE_COLORS.textMuted}
        />

        <Text style={styles.label}>COORDENADOR(A) CTR</Text>
        <TextInput
          value={coordenador}
          onChangeText={setCoordenador}
          style={styles.input}
          placeholder="Coordenador(a)"
          placeholderTextColor={ARPE_COLORS.textMuted}
        />

        <Pressable
          onPress={handleSave}
          style={[styles.submitBtn, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.submitBtnText}>Iniciar Coleta Offline</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ARPE_COLORS.navy,
  },
  header: {
    backgroundColor: ARPE_COLORS.navy,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  backBtn: {
    width: TOUCH_TARGET_MIN,
    height: TOUCH_TARGET_MIN,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.navyElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  headerKicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: "rgba(255,255,255,0.65)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: ARPE_COLORS.white,
    marginTop: 2,
  },
  body: {
    flex: 1,
    backgroundColor: ARPE_COLORS.surface,
  },
  content: {
    padding: SPACING.xl,
    paddingBottom: 40,
  },
  label: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: ARPE_COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  input: {
    minHeight: 46,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.inputBg,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    paddingHorizontal: SPACING.md,
    fontSize: 14,
    color: ARPE_COLORS.textPrimary,
  },
  readOnlyBox: {
    minHeight: 46,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    paddingHorizontal: SPACING.md,
    justifyContent: "center",
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: "700",
    color: ARPE_COLORS.textPrimary,
  },
  suggestionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  suggestionChip: {
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    maxWidth: "100%",
  },
  suggestionText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: ARPE_COLORS.textSecondary,
  },
  submitBtn: {
    marginTop: SPACING.xxl,
    minHeight: 50,
    borderRadius: RADII.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
});

