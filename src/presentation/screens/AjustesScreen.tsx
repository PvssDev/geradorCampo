import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CloudOff,
  Database,
  Lock,
  ShieldCheck,
  UserCheck,
  Wifi,
} from "lucide-react-native";
import { useMobileStore } from "../../application/store/useMobileStore";
import { ARPE_COLORS } from "../theme/colors";
import { RADII, SPACING } from "../theme/tokens";
import { ArpeMonogram } from "../components/common/ArpeMonogram";

export const AjustesScreen: React.FC = () => {
  const { isOnline, usuarioNome, usuarioEmail, toggleOnlineMode } =
    useMobileStore();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.profileRow}>
          <ArpeMonogram size={42} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{usuarioNome}</Text>
            <Text style={styles.email}>{usuarioEmail}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>CONECTIVIDADE EM CAMPO</Text>
        <Pressable onPress={toggleOnlineMode} style={styles.settingCard}>
          <View style={styles.iconBox}>
            {isOnline ? (
              <Wifi size={18} color={ARPE_COLORS.statusOnline} />
            ) : (
              <CloudOff size={18} color={ARPE_COLORS.statusOffline} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingTitle}>
              {isOnline ? "Modo Online (Simulação)" : "Modo Offline (Campo)"}
            </Text>
            <Text style={styles.settingSub}>
              Toque para alternar e testar o comportamento offline-first
            </Text>
          </View>
        </Pressable>

        <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>
          SEGURANÇA & CONFORMIDADE LGPD
        </Text>
        <View style={styles.infoStack}>
          <View style={styles.settingCard}>
            <View style={styles.iconBox}>
              <Lock size={18} color={ARPE_COLORS.navy} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Sessão Segura (Keystore)</Text>
              <Text style={styles.settingSub}>
                Tokens JWT protegidos via expo-secure-store (até 10 usuários)
              </Text>
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.iconBox}>
              <Database size={18} color={ARPE_COLORS.navy} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Armazenamento Local Privado</Text>
              <Text style={styles.settingSub}>
                Fotos comprimidas isoladas no sandbox do app, fora da galeria
                pessoal
              </Text>
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.iconBox}>
              <ShieldCheck size={18} color={ARPE_COLORS.statusSanada} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>
                Banco Analítico Permanente (Free)
              </Text>
              <Text style={styles.settingSub}>
                Somente metadados de NCs/PAs sem fotos e sem dados pessoais
              </Text>
            </View>
          </View>

          <View style={styles.settingCard}>
            <View style={styles.iconBox}>
              <UserCheck size={18} color={ARPE_COLORS.navy} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Versão do App</Text>
              <Text style={styles.settingSub}>
                ARPE Fiscalização Mobile v0.1.0 · Clean Architecture
              </Text>
            </View>
          </View>
        </View>
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
    paddingVertical: SPACING.xl,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  name: {
    fontSize: 17,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
  email: {
    fontSize: 12.5,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  body: {
    flex: 1,
    backgroundColor: ARPE_COLORS.surface,
  },
  content: {
    padding: SPACING.xl,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.9,
    color: ARPE_COLORS.textMuted,
    marginBottom: SPACING.sm,
  },
  infoStack: {
    gap: SPACING.sm,
  },
  settingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    padding: SPACING.md,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: RADII.sm,
    backgroundColor: ARPE_COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  settingTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: ARPE_COLORS.textPrimary,
  },
  settingSub: {
    fontSize: 11.5,
    color: ARPE_COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});

