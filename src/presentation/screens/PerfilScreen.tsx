import React, { useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AtSign,
  ChevronRight,
  LogOut,
  Settings,
  Shield,
  ShieldCheck,
  UserCheck,
} from "lucide-react-native";
import {
  filtrarVistoriasEmAberto,
  filtrarVistoriasFinalizadas,
} from "../../domain/rules/domainRules";
import {
  obterLabelPerfil,
  podeAcessarPainelAdm,
  podeAprovarAcessos,
} from "../../domain/rules/authRules";
import { useAuthStore } from "../../application/store/useAuthStore";
import { useMobileStore } from "../../application/store/useMobileStore";
import { toast } from "../../application/store/useToastStore";
import { ARPE_COLORS } from "../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../theme/tokens";
import { UserAvatar } from "../components/common/UserAvatar";
import {
  AnimatedScalePressable,
  FadeSlideView,
} from "../components/common/MotionPrimitives";
import { ConfiguracoesModal } from "../components/perfil/ConfiguracoesModal";
import { AprovacoesAcessoModal } from "../components/perfil/AprovacoesAcessoModal";
import { PainelAdmScreen } from "./PainelAdmScreen";

export const PerfilScreen: React.FC = () => {
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const usuarioNomeFallback = useMobileStore((s) => s.usuarioNome);
  const vistorias = useMobileStore((s) => s.vistorias);
  const galeriaFotos = useMobileStore((s) => s.galeriaFotos);

  const [configVisible, setConfigVisible] = useState(false);
  const [aprovacoesVisible, setAprovacoesVisible] = useState(false);
  const [painelAdmAberto, setPainelAdmAberto] = useState(false);

  const perfil = session?.perfil;
  const nomeExibido = perfil?.nomeCompleto ?? usuarioNomeFallback;
  const usuarioAtual = perfil?.usuario ?? "arpe";
  const roleAtual = perfil?.role ?? "analista";
  const roleLabel = obterLabelPerfil(roleAtual);
  const podeAprovar = podeAprovarAcessos(roleAtual);
  const podeVerPainelAdm = podeAcessarPainelAdm(roleAtual);

  const totalAbertas = useMemo(
    () => filtrarVistoriasEmAberto(vistorias).length,
    [vistorias]
  );
  const totalFinalizadas = useMemo(
    () => filtrarVistoriasFinalizadas(vistorias).length,
    [vistorias]
  );

  const handleLogout = async () => {
    await logout();
    toast.info("Sessão encerrada", "Entre com seu usuário quando precisar.");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero curvado estilo institucional ARPE */}
        <View style={styles.hero}>
          <View style={styles.heroArcLarge} pointerEvents="none" />
          <View style={styles.heroArcSmall} pointerEvents="none" />

          <View style={styles.topBar}>
            <View style={styles.topBarSpacer} />
            <Text style={styles.topBarTitle}>Perfil</Text>
            <AnimatedScalePressable
              onPress={() => setConfigVisible(true)}
              style={styles.gearBtn}
              accessibilityRole="button"
              accessibilityLabel="Abrir configurações"
            >
              <Settings size={20} color={ARPE_COLORS.white} />
            </AnimatedScalePressable>
          </View>

          <FadeSlideView delay={10} distance={8} style={styles.heroCenter}>
            <UserAvatar
              nomeCompleto={nomeExibido}
              usuario={usuarioAtual}
              size={90}
              bordered
            />
            <Text style={styles.heroName} numberOfLines={1}>
              {nomeExibido}
            </Text>
            <Text style={styles.heroRole}>{roleLabel}</Text>
          </FadeSlideView>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{totalAbertas}</Text>
              <Text style={styles.metricLabel}>Em aberto</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{totalFinalizadas}</Text>
              <Text style={styles.metricLabel}>Finalizados</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{galeriaFotos.length}</Text>
              <Text style={styles.metricLabel}>Fotos</Text>
            </View>
          </View>
        </View>

        {/* Lista minimalista com divisores sutis */}
        <FadeSlideView delay={50} distance={8} style={styles.listSection}>
          <View style={styles.infoRow}>
            <AtSign size={18} color={ARPE_COLORS.textSecondary} />
            <View style={styles.rowText}>
              <Text style={styles.rowCaption}>Usuário corporativo</Text>
              <Text style={styles.rowValue}>@{usuarioAtual}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Shield size={18} color={ARPE_COLORS.textSecondary} />
            <View style={styles.rowText}>
              <Text style={styles.rowCaption}>Nível de acesso</Text>
              <Text style={styles.rowValue}>{roleLabel}</Text>
            </View>
          </View>

          {podeVerPainelAdm && (
            <AnimatedScalePressable
              onPress={() => setPainelAdmAberto(true)}
              style={styles.actionRow}
              accessibilityRole="button"
              accessibilityLabel="Abrir painel ADM"
            >
              <ShieldCheck size={18} color={ARPE_COLORS.navy} />
              <View style={styles.rowText}>
                <Text style={styles.rowCaption}>Administração da equipe</Text>
                <Text style={styles.rowValue}>Painel ADM</Text>
              </View>
              <ChevronRight size={18} color={ARPE_COLORS.textMuted} />
            </AnimatedScalePressable>
          )}

          {podeAprovar && (
            <AnimatedScalePressable
              onPress={() => setAprovacoesVisible(true)}
              style={styles.actionRow}
              accessibilityRole="button"
              accessibilityLabel="Aprovações de acesso"
            >
              <UserCheck size={18} color={ARPE_COLORS.navy} />
              <View style={styles.rowText}>
                <Text style={styles.rowCaption}>Gestão de contas</Text>
                <Text style={styles.rowValue}>Aprovações de Acesso</Text>
              </View>
              <ChevronRight size={18} color={ARPE_COLORS.textMuted} />
            </AnimatedScalePressable>
          )}

          <AnimatedScalePressable
            onPress={() => setConfigVisible(true)}
            style={styles.actionRow}
            accessibilityRole="button"
            accessibilityLabel="Configurações do aplicativo"
          >
            <Settings size={18} color={ARPE_COLORS.textSecondary} />
            <View style={styles.rowText}>
              <Text style={styles.rowCaption}>Privacidade & LGPD</Text>
              <Text style={styles.rowValue}>Configurações</Text>
            </View>
            <ChevronRight size={18} color={ARPE_COLORS.textMuted} />
          </AnimatedScalePressable>

          <AnimatedScalePressable
            onPress={() => void handleLogout()}
            style={[styles.actionRow, styles.lastRow]}
            accessibilityRole="button"
            accessibilityLabel="Sair da conta"
          >
            <LogOut size={18} color={ARPE_COLORS.danger} />
            <View style={styles.rowText}>
              <Text style={styles.rowCaption}>Sessão neste dispositivo</Text>
              <Text style={[styles.rowValue, styles.dangerText]}>
                Sair da conta
              </Text>
            </View>
            <ChevronRight size={18} color={ARPE_COLORS.danger} />
          </AnimatedScalePressable>
        </FadeSlideView>
      </ScrollView>

      <ConfiguracoesModal
        visible={configVisible}
        onClose={() => setConfigVisible(false)}
      />

      {podeAprovar && (
        <AprovacoesAcessoModal
          visible={aprovacoesVisible}
          onClose={() => setAprovacoesVisible(false)}
        />
      )}

      {podeVerPainelAdm && (
        <Modal
          visible={painelAdmAberto}
          animationType="slide"
          presentationStyle="fullScreen"
          statusBarTranslucent
          onRequestClose={() => setPainelAdmAberto(false)}
        >
          <PainelAdmScreen onBack={() => setPainelAdmAberto(false)} />
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: ARPE_COLORS.navy },
  body: { flex: 1, backgroundColor: ARPE_COLORS.white },
  scrollContent: { paddingBottom: SPACING.xxl },
  hero: {
    backgroundColor: ARPE_COLORS.navy,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    overflow: "hidden",
  },
  heroArcLarge: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -110,
    right: -70,
  },
  heroArcSmall: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: -85,
    left: -55,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  topBarSpacer: { width: TOUCH_TARGET_MIN - 4 },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: ARPE_COLORS.white,
    letterSpacing: 0.3,
  },
  gearBtn: {
    width: TOUCH_TARGET_MIN - 4,
    height: TOUCH_TARGET_MIN - 4,
    borderRadius: RADII.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  heroCenter: {
    alignItems: "center",
    gap: 4,
  },
  heroName: {
    marginTop: SPACING.sm,
    fontSize: 20,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
  heroRole: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.74)",
  },
  metricsRow: {
    marginTop: SPACING.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  metricItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 5,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.72)",
  },
  metricDivider: {
    width: 1,
    height: 18,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  listSection: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: ARPE_COLORS.border,
  },
  actionRow: {
    minHeight: TOUCH_TARGET_MIN + 14,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: ARPE_COLORS.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowText: { flex: 1, gap: 2 },
  rowCaption: {
    fontSize: 11.5,
    fontWeight: "500",
    color: ARPE_COLORS.textMuted,
  },
  rowValue: {
    fontSize: 14.5,
    fontWeight: "700",
    color: ARPE_COLORS.textPrimary,
  },
  dangerText: {
    color: ARPE_COLORS.danger,
  },
});
