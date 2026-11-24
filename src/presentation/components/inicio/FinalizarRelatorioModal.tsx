import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { AlertTriangle, CheckCircle2 } from "lucide-react-native";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import { toast } from "../../../application/store/useToastStore";
import {
  AnimatedModalBox,
  AnimatedScalePressable,
  FadeSlideView,
} from "../common/MotionPrimitives";

interface FinalizarRelatorioModalProps {
  visible: boolean;
  sugestaoId: string;
  accentColor: string;
  onCancel: () => void;
  onConfirmarFinalizacao: (nomeIdRelatorio: string) => void;
}

export const FinalizarRelatorioModal: React.FC<FinalizarRelatorioModalProps> = ({
  visible,
  sugestaoId,
  accentColor,
  onCancel,
  onConfirmarFinalizacao,
}) => {
  const [etapa, setEtapa] = useState<"informar_id" | "confirmar">("informar_id");
  const [nomeId, setNomeId] = useState(sugestaoId);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (visible) {
      setEtapa("informar_id");
      setNomeId(sugestaoId);
      setErro("");
    }
  }, [visible, sugestaoId]);

  const handleAvancarConfirmacao = () => {
    if (!nomeId.trim()) {
      const msg = "Informe o nome (ID) do relatório antes de finalizar.";
      setErro(msg);
      toast.error("ID obrigatório", msg);
      return;
    }
    setErro("");
    setEtapa("confirmar");
  };

  return (
    <AnimatedModalBox
      visible={visible}
      variant="center"
      cardStyle={styles.card}
      onClose={onCancel}
    >
      <FadeSlideView animKey={etapa} distance={8} duration={185} style={styles.innerContent}>
        {etapa === "informar_id" ? (
          <>
            <Text style={styles.kicker}>FINALIZAR RELATÓRIO · ETAPA 1 DE 2</Text>
            <Text style={styles.title}>Identificação do relatório</Text>
            <Text style={styles.subtitle}>
              Confirme ou digite o nome (ID) deste relatório para identificá-lo na aba Finalizados.
            </Text>

            <TextInput
              value={nomeId}
              onChangeText={(v) => {
                setNomeId(v);
                if (erro) setErro("");
              }}
              placeholder="Ex.: FISC-CRA-2026-001"
              placeholderTextColor={ARPE_COLORS.textMuted}
              autoCapitalize="characters"
              style={styles.input}
            />

            {erro !== "" && <Text style={styles.errorText}>{erro}</Text>}

            <View style={styles.actionsRow}>
              <View style={styles.secondaryCol}>
                <AnimatedScalePressable onPress={onCancel} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Cancelar</Text>
                </AnimatedScalePressable>
              </View>
              <View style={styles.primaryCol}>
                <AnimatedScalePressable
                  onPress={handleAvancarConfirmacao}
                  style={[styles.primaryBtn, { backgroundColor: accentColor }]}
                >
                  <Text style={styles.primaryBtnText}>Finalizar</Text>
                </AnimatedScalePressable>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.warningIconRow}>
              <AlertTriangle size={22} color="#d97706" />
              <Text style={styles.kicker}>CONFIRMAÇÃO DE SEGURANÇA · ETAPA 2 DE 2</Text>
            </View>
            <Text style={styles.title}>Tem certeza que deseja finalizar?</Text>
            <Text style={styles.subtitle}>
              O relatório <Text style={styles.boldText}>{nomeId.trim()}</Text> sairá das sessões em aberto e será movido para a aba Finalizados.
            </Text>

            <View style={styles.actionsRow}>
              <View style={styles.secondaryCol}>
                <AnimatedScalePressable
                  onPress={() => setEtapa("informar_id")}
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryBtnText}>Voltar</Text>
                </AnimatedScalePressable>
              </View>
              <View style={styles.primaryCol}>
                <AnimatedScalePressable
                  onPress={() => onConfirmarFinalizacao(nomeId.trim())}
                  style={[styles.primaryBtn, { backgroundColor: accentColor }]}
                >
                  <CheckCircle2 size={17} color={ARPE_COLORS.white} />
                  <Text style={styles.primaryBtnText}>Sim, tenho certeza</Text>
                </AnimatedScalePressable>
              </View>
            </View>
          </>
        )}
      </FadeSlideView>
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
  },
  innerContent: {
    gap: SPACING.md,
  },
  warningIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  kicker: {
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: ARPE_COLORS.textMuted,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    color: ARPE_COLORS.textSecondary,
  },
  boldText: {
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
  },
  input: {
    minHeight: TOUCH_TARGET_MIN + 2,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.inputBg,
    borderWidth: 1,
    borderColor: ARPE_COLORS.borderStrong,
    paddingHorizontal: SPACING.md,
    fontSize: 14.5,
    fontWeight: "700",
    color: ARPE_COLORS.textPrimary,
  },
  errorText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#dc2626",
  },
  actionsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  secondaryCol: { flex: 1 },
  primaryCol: { flex: 1.4 },
  secondaryBtn: {
    minHeight: TOUCH_TARGET_MIN + 4,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: ARPE_COLORS.textSecondary,
  },
  primaryBtn: {
    minHeight: TOUCH_TARGET_MIN + 4,
    borderRadius: RADII.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
});
