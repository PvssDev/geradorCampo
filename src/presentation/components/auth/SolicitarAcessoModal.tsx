import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Send, X } from "lucide-react-native";
import { RequestableRole } from "../../../domain/entities/authTypes";
import { solicitarAcesso } from "../../../infrastructure/auth/accessRequestService";
import { toast } from "../../../application/store/useToastStore";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import { ChipSelectorGroup } from "../common/ChipSelectorGroup";
import {
  AnimatedModalBox,
  AnimatedScalePressable,
} from "../common/MotionPrimitives";

interface SolicitarAcessoModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
}

const PERFIS_SOLICITAVEIS = [
  { value: "analista", label: "Analista" },
  { value: "coordenador", label: "Coordenador" },
] as const;

export const SolicitarAcessoModal: React.FC<SolicitarAcessoModalProps> = ({
  visible,
  onClose,
}) => {
  const [nome, setNome] = useState("");
  const [usuario, setUsuario] = useState("");
  const [role, setRole] = useState<RequestableRole>("analista");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sending, setSending] = useState(false);

  const handleEnviar = async () => {
    if (sending) return;
    setSending(true);
    const result = await solicitarAcesso({
      nomeCompleto: nome,
      usuario,
      roleSolicitado: role,
      senha,
    });
    setSending(false);

    if (!result.ok) {
      setErro(result.erro);
      return;
    }

    setErro("");
    setNome("");
    setUsuario("");
    setSenha("");
    onClose();
    toast.success(
      "Solicitação enviada",
      result.modo === "api"
        ? "Aguarde a aprovação do ADM ou Coordenador."
        : "Salva na fila local para teste de aprovação em Perfil."
    );
  };

  return (
    <AnimatedModalBox
      visible={visible}
      variant="sheet"
      cardStyle={styles.sheet}
      onClose={onClose}
    >
      <View style={styles.handle} />
      <View style={styles.header}>
        <View style={styles.flex1}>
          <Text style={styles.title}>Solicitar Acesso</Text>
          <Text style={styles.subtitle}>
            Contas exigem aprovação do ADM ou Coordenador
          </Text>
        </View>
        <AnimatedScalePressable onPress={onClose} style={styles.closeBtn}>
          <X size={18} color={ARPE_COLORS.textSecondary} />
        </AnimatedScalePressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.field}>
          <Text style={styles.label}>NOME COMPLETO</Text>
          <TextInput
            value={nome}
            onChangeText={(v) => {
              setNome(v);
              if (erro) setErro("");
            }}
            placeholder="Ex.: Maria Silva"
            placeholderTextColor={ARPE_COLORS.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>USUÁRIO DESEJADO (SEM E-MAIL)</Text>
          <TextInput
            value={usuario}
            onChangeText={(v) => {
              setUsuario(v);
              if (erro) setErro("");
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Ex.: maria.silva"
            placeholderTextColor={ARPE_COLORS.textMuted}
            style={styles.input}
          />
        </View>

        <ChipSelectorGroup
          label="Perfil solicitado"
          options={PERFIS_SOLICITAVEIS}
          value={role}
          accentColor={ARPE_COLORS.navy}
          equalWidth
          onChange={(v) => setRole(v as RequestableRole)}
        />

        <View style={styles.field}>
          <Text style={styles.label}>SENHA FORTE (MÍN. 10 CARACTERES)</Text>
          <TextInput
            value={senha}
            onChangeText={(v) => {
              setSenha(v);
              if (erro) setErro("");
            }}
            secureTextEntry
            placeholder="Maiúscula, minúscula e número"
            placeholderTextColor={ARPE_COLORS.textMuted}
            style={styles.input}
          />
        </View>

        {erro !== "" && <Text style={styles.errorText}>{erro}</Text>}
      </ScrollView>

      <AnimatedScalePressable onPress={handleEnviar} style={styles.submitBtn}>
        <Send size={16} color={ARPE_COLORS.white} />
        <Text style={styles.submitText}>Enviar Solicitação</Text>
      </AnimatedScalePressable>
    </AnimatedModalBox>
  );
};

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: ARPE_COLORS.white,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    maxHeight: "88%",
    gap: SPACING.md,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.borderStrong,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  flex1: { flex: 1 },
  title: { fontSize: 18, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  subtitle: { fontSize: 12, color: ARPE_COLORS.textSecondary, marginTop: 2 },
  closeBtn: {
    width: TOUCH_TARGET_MIN - 8,
    height: TOUCH_TARGET_MIN - 8,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: SPACING.md, paddingBottom: SPACING.xs },
  field: { gap: 6 },
  label: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.7,
    color: ARPE_COLORS.textSecondary,
  },
  input: {
    minHeight: TOUCH_TARGET_MIN,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.inputBg,
    borderWidth: 1,
    borderColor: ARPE_COLORS.borderStrong,
    paddingHorizontal: SPACING.md,
    fontSize: 14,
    color: ARPE_COLORS.textPrimary,
  },
  errorText: { fontSize: 12.5, fontWeight: "700", color: ARPE_COLORS.danger },
  submitBtn: {
    minHeight: TOUCH_TARGET_MIN + 4,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitText: { fontSize: 14.5, fontWeight: "800", color: ARPE_COLORS.white },
});
