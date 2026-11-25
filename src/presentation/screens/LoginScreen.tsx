import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Eye, EyeOff, Lock, LogIn, User } from "lucide-react-native";
import { useAuthStore } from "../../application/store/useAuthStore";
import { toast } from "../../application/store/useToastStore";
import { ARPE_COLORS } from "../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../theme/tokens";
import {
  AnimatedScalePressable,
  FadeSlideView,
} from "../components/common/MotionPrimitives";
import { SolicitarAcessoModal } from "../components/auth/SolicitarAcessoModal";

const LOGO_INTEIRA = require("../../../assets/logo/logo_inteira.png");

export const LoginScreen: React.FC = () => {
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);

  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [solicitarVisible, setSolicitarVisible] = useState(false);

  const handleEntrar = async () => {
    if (loading) return;
    if (!usuario.trim() || !senha) {
      toast.error("Campos obrigatórios", "Informe seu usuário e senha.");
      return;
    }

    const res = await login(usuario, senha);
    if (!res.ok) {
      toast.error("Acesso negado", res.erro);
      return;
    }
    toast.success("Bem-vindo(a)", "Sessão protegida salva neste dispositivo.");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex1}
      >
        <View style={styles.centerWrap}>
          <FadeSlideView delay={60} distance={12} duration={260} style={styles.brandBox}>
            <Image
              source={LOGO_INTEIRA}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brandSub}>
              Fiscalização & Monitoramento em Campo
            </Text>
          </FadeSlideView>

          <FadeSlideView delay={120} distance={14} duration={280} style={styles.card}>
            <Text style={styles.cardTitle}>Acesso Restrito</Text>
            <Text style={styles.cardSub}>
              Entre com seu usuário institucional ARPE
            </Text>

            <View style={styles.field}>
              <Text style={styles.label}>USUÁRIO</Text>
              <View style={styles.inputRow}>
                <User size={16} color={ARPE_COLORS.textMuted} />
                <TextInput
                  value={usuario}
                  onChangeText={setUsuario}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Digite seu usuário"
                  placeholderTextColor={ARPE_COLORS.textMuted}
                  style={styles.input}
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>SENHA</Text>
              <View style={styles.inputRow}>
                <Lock size={16} color={ARPE_COLORS.textMuted} />
                <TextInput
                  value={senha}
                  onChangeText={setSenha}
                  secureTextEntry={!mostrarSenha}
                  placeholder="Digite sua senha"
                  placeholderTextColor={ARPE_COLORS.textMuted}
                  style={styles.input}
                  returnKeyType="done"
                  onSubmitEditing={handleEntrar}
                />
                <Pressable
                  onPress={() => setMostrarSenha((v) => !v)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={
                    mostrarSenha ? "Ocultar senha" : "Mostrar senha"
                  }
                >
                  {mostrarSenha ? (
                    <EyeOff size={17} color={ARPE_COLORS.textSecondary} />
                  ) : (
                    <Eye size={17} color={ARPE_COLORS.textSecondary} />
                  )}
                </Pressable>
              </View>
            </View>

            <AnimatedScalePressable
              onPress={handleEntrar}
              disabled={loading}
              style={[styles.loginBtn, loading && styles.btnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Entrar no aplicativo"
            >
              {loading ? (
                <ActivityIndicator color={ARPE_COLORS.white} size="small" />
              ) : (
                <>
                  <LogIn size={17} color={ARPE_COLORS.white} />
                  <Text style={styles.loginBtnText}>Entrar</Text>
                </>
              )}
            </AnimatedScalePressable>

            <AnimatedScalePressable
              onPress={() => setSolicitarVisible(true)}
              style={styles.requestLink}
            >
              <Text style={styles.requestLinkText}>
                Não tem acesso? <Text style={styles.requestBold}>Solicitar Acesso</Text>
              </Text>
            </AnimatedScalePressable>
          </FadeSlideView>

          <Text style={styles.footerNote}>
            Sessão criptografada · Operação 100% offline após login
          </Text>
        </View>
      </KeyboardAvoidingView>

      <SolicitarAcessoModal
        visible={solicitarVisible}
        onClose={() => setSolicitarVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: ARPE_COLORS.surfaceMuted },
  flex1: { flex: 1 },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    gap: SPACING.xl,
  },
  brandBox: { alignItems: "center", gap: SPACING.xs },
  logo: { width: 220, height: 52 },
  brandSub: { fontSize: 12.5, fontWeight: "600", color: ARPE_COLORS.textSecondary },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: ARPE_COLORS.white,
    borderRadius: RADII.xl,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  cardTitle: { fontSize: 19, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  cardSub: { fontSize: 12.5, color: ARPE_COLORS.textSecondary, marginTop: -8 },
  field: { gap: 6 },
  label: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: ARPE_COLORS.textSecondary,
  },
  inputRow: {
    minHeight: TOUCH_TARGET_MIN + 2,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.inputBg,
    borderWidth: 1,
    borderColor: ARPE_COLORS.borderStrong,
    paddingHorizontal: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  input: { flex: 1, fontSize: 14.5, color: ARPE_COLORS.textPrimary },
  loginBtn: {
    marginTop: SPACING.xs,
    minHeight: TOUCH_TARGET_MIN + 6,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnDisabled: { opacity: 0.65 },
  loginBtnText: { fontSize: 15, fontWeight: "800", color: ARPE_COLORS.white },
  requestLink: {
    minHeight: TOUCH_TARGET_MIN - 8,
    alignItems: "center",
    justifyContent: "center",
  },
  requestLinkText: { fontSize: 12.5, color: ARPE_COLORS.textSecondary },
  requestBold: { fontWeight: "800", color: ARPE_COLORS.navy },
  footerNote: { fontSize: 11, color: ARPE_COLORS.textMuted, textAlign: "center" },
});
