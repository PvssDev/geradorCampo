import React from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import {
  Database,
  Images,
  Lock,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react-native";
import { useMobileStore } from "../../../application/store/useMobileStore";
import { toast } from "../../../application/store/useToastStore";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import {
  AnimatedModalBox,
  AnimatedScalePressable,
} from "../common/MotionPrimitives";

interface ConfiguracoesModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
}

const INFO_ITEMS = [
  {
    key: "keystore",
    title: "Sessão Segura (Keystore)",
    sub: "Tokens JWT protegidos via expo-secure-store (até 10 usuários)",
    icon: Lock,
    color: ARPE_COLORS.navy,
  },
  {
    key: "sandbox",
    title: "Armazenamento Local Privado",
    sub: "Fotos comprimidas (~200 KB) sempre ficam salvas na pasta privada do app",
    icon: Database,
    color: ARPE_COLORS.navy,
  },
  {
    key: "lgpd",
    title: "Banco Analítico Permanente (LGPD)",
    sub: "Grava apenas metadados estruturados de NCs/PAs, sem fotos e sem dados pessoais",
    icon: ShieldCheck,
    color: ARPE_COLORS.statusSanada,
  },
  {
    key: "version",
    title: "Versão do Aplicativo",
    sub: "ARPE Fiscalização Mobile v0.1.0 · Clean Architecture",
    icon: Smartphone,
    color: ARPE_COLORS.navy,
  },
] as const;

export const ConfiguracoesModal: React.FC<ConfiguracoesModalProps> = ({
  visible,
  onClose,
}) => {
  const salvarCopiaGaleriaCelular = useMobileStore(
    (s) => s.salvarCopiaGaleriaCelular
  );
  const setSalvarCopiaGaleriaCelular = useMobileStore(
    (s) => s.setSalvarCopiaGaleriaCelular
  );

  const handleToggleGaleria = (value: boolean) => {
    setSalvarCopiaGaleriaCelular(value);
    toast.info(
      value ? "Cópia na galeria ativada" : "Cópia na galeria desativada",
      value
        ? "Novas fotos serão salvas no app e no álbum ARPE Fiscalização do celular."
        : "Novas fotos ficarão salvas somente na pasta privada do app."
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
        <View>
          <Text style={styles.title}>Configurações</Text>
          <Text style={styles.subtitle}>
            Segurança, privacidade LGPD e informações do aplicativo
          </Text>
        </View>
        <AnimatedScalePressable
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Fechar configurações"
        >
          <X size={18} color={ARPE_COLORS.textSecondary} />
        </AnimatedScalePressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.toggleCard}>
          <View style={styles.iconBox}>
            <Images size={18} color={ARPE_COLORS.navy} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.cardTitle}>Salvar fotos na galeria do celular</Text>
            <Text style={styles.cardSub}>
              Quando ativo, toda foto capturada é salva no app e copiada para o álbum ARPE Fiscalização do aparelho.
            </Text>
          </View>
          <Switch
            value={salvarCopiaGaleriaCelular}
            onValueChange={handleToggleGaleria}
            trackColor={{ false: ARPE_COLORS.borderStrong, true: "#2563eb" }}
            thumbColor={ARPE_COLORS.white}
            accessibilityLabel="Salvar fotos na galeria do celular"
          />
        </View>

        {INFO_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <View key={item.key} style={styles.card}>
              <View style={styles.iconBox}>
                <Icon size={18} color={item.color} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSub}>{item.sub}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
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
    maxHeight: "82%",
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.borderStrong,
    alignSelf: "center",
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
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
  scrollContent: { gap: SPACING.sm, paddingBottom: SPACING.sm },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    padding: SPACING.md,
  },
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: "#eff6ff",
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: "#bfdbfe",
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
  textWrap: { flex: 1 },
  cardTitle: { fontSize: 13.5, fontWeight: "700", color: ARPE_COLORS.textPrimary },
  cardSub: { fontSize: 11.5, color: ARPE_COLORS.textSecondary, marginTop: 2, lineHeight: 16 },
});
