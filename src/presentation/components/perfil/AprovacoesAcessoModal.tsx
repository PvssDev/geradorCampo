import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Check, ShieldAlert, UserCheck, X } from "lucide-react-native";
import { AccessRequestEntity } from "../../../domain/entities/authTypes";
import { obterLabelPerfil } from "../../../domain/rules/authRules";
import {
  decidirSolicitacaoAcesso,
  listarSolicitacoesPendentes,
} from "../../../infrastructure/auth/accessRequestService";
import { useAuthStore } from "../../../application/store/useAuthStore";
import { toast } from "../../../application/store/useToastStore";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import {
  AnimatedModalBox,
  AnimatedScalePressable,
} from "../common/MotionPrimitives";

interface AprovacoesAcessoModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onUpdated?: () => void;
}

export const AprovacoesAcessoModal: React.FC<AprovacoesAcessoModalProps> = ({
  visible,
  onClose,
  onUpdated,
}) => {
  const session = useAuthStore((s) => s.session);
  const [itens, setItens] = useState<readonly AccessRequestEntity[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [senhaAdm, setSenhaAdm] = useState("");
  const isAdm = session?.perfil.role === "adm";

  const carregar = useCallback(async () => {
    if (!session) return;
    const lista = await listarSolicitacoesPendentes(session.accessToken);
    setItens(lista);
  }, [session]);

  useEffect(() => {
    if (visible) {
      setSenhaAdm("");
      void carregar();
    }
  }, [visible, carregar]);

  const handleDecidir = async (
    solicitacao: AccessRequestEntity,
    decisao: "aprovada" | "rejeitada"
  ) => {
    if (!session || busyId) return;
    if (isAdm && senhaAdm.trim().length < 6) {
      toast.error(
        "Reconfirmação obrigatória",
        "Digite sua senha de ADM acima para confirmar a decisão."
      );
      return;
    }
    setBusyId(solicitacao.id);
    const res = await decidirSolicitacaoAcesso({
      accessToken: session.accessToken,
      roleAtual: session.perfil.role,
      solicitacao,
      decisao,
      decisorUsuario: session.perfil.usuario,
      senhaConfirmacao: isAdm ? senhaAdm : undefined,
    });
    setBusyId(null);

    if (!res.ok) {
      toast.error("Erro na decisão", res.erro);
      return;
    }

    toast.success(
      decisao === "aprovada" ? "Acesso aprovado" : "Solicitação rejeitada",
      `@${solicitacao.usuario} (${obterLabelPerfil(solicitacao.roleSolicitado)})`
    );
    await carregar();
    onUpdated?.();
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
          <Text style={styles.title}>Aprovações de Acesso</Text>
          <Text style={styles.subtitle}>
            Solicitações pendentes para Analista e Coordenador
          </Text>
        </View>
        <AnimatedScalePressable onPress={onClose} style={styles.closeBtn}>
          <X size={18} color={ARPE_COLORS.textSecondary} />
        </AnimatedScalePressable>
      </View>

      {isAdm && itens.length > 0 && (
        <View style={styles.admConfirmBox}>
          <View style={styles.admConfirmHeader}>
            <ShieldAlert size={14} color={ARPE_COLORS.navy} />
            <Text style={styles.admConfirmLabel}>
              RECONFIRMAÇÃO DE SENHA DO ADM
            </Text>
          </View>
          <TextInput
            value={senhaAdm}
            onChangeText={setSenhaAdm}
            secureTextEntry
            placeholder="Digite sua senha de ADM para aprovar/rejeitar"
            placeholderTextColor={ARPE_COLORS.textMuted}
            style={styles.admInput}
          />
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {itens.length === 0 ? (
          <View style={styles.emptyBox}>
            <UserCheck size={28} color={ARPE_COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Nenhuma solicitação pendente</Text>
            <Text style={styles.emptySub}>
              Novos pedidos enviados na tela de login aparecerão aqui.
            </Text>
          </View>
        ) : (
          itens.map((item) => {
            const disabled = busyId === item.id;
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{item.nomeCompleto}</Text>
                  <Text style={styles.cardMeta}>
                    @{item.usuario} · {obterLabelPerfil(item.roleSolicitado)}
                  </Text>
                </View>

                <View style={styles.actions}>
                  <AnimatedScalePressable
                    onPress={() => void handleDecidir(item, "rejeitada")}
                    disabled={disabled}
                    style={[styles.actionBtn, styles.rejectBtn]}
                    accessibilityLabel={`Rejeitar ${item.usuario}`}
                  >
                    <X size={16} color={ARPE_COLORS.danger} />
                  </AnimatedScalePressable>
                  <AnimatedScalePressable
                    onPress={() => void handleDecidir(item, "aprovada")}
                    disabled={disabled}
                    style={[styles.actionBtn, styles.approveBtn]}
                    accessibilityLabel={`Aprovar ${item.usuario}`}
                  >
                    <Check size={16} color={ARPE_COLORS.white} />
                    <Text style={styles.approveText}>Aprovar</Text>
                  </AnimatedScalePressable>
                </View>
              </View>
            );
          })
        )}
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
  list: { gap: SPACING.sm, paddingBottom: SPACING.sm },
  emptyBox: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    gap: 6,
  },
  emptyTitle: { fontSize: 14.5, fontWeight: "700", color: ARPE_COLORS.textPrimary },
  emptySub: {
    fontSize: 12.5,
    color: ARPE_COLORS.textSecondary,
    textAlign: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
  },
  cardInfo: { flex: 1, gap: 2 },
  cardName: { fontSize: 14, fontWeight: "700", color: ARPE_COLORS.textPrimary },
  cardMeta: { fontSize: 12, fontWeight: "600", color: ARPE_COLORS.textSecondary },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionBtn: {
    minHeight: 36,
    borderRadius: RADII.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  rejectBtn: {
    width: 36,
    backgroundColor: ARPE_COLORS.white,
    borderWidth: 1,
    borderColor: ARPE_COLORS.danger,
  },
  approveBtn: {
    paddingHorizontal: SPACING.md,
    backgroundColor: ARPE_COLORS.navy,
  },
  approveText: { fontSize: 12.5, fontWeight: "700", color: ARPE_COLORS.white },
  admConfirmBox: {
    gap: 6,
    padding: SPACING.sm,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: ARPE_COLORS.borderStrong,
  },
  admConfirmHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  admConfirmLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: ARPE_COLORS.navy,
  },
  admInput: {
    minHeight: 40,
    borderRadius: RADII.sm,
    backgroundColor: ARPE_COLORS.white,
    borderWidth: 1,
    borderColor: ARPE_COLORS.borderStrong,
    paddingHorizontal: SPACING.sm,
    fontSize: 13,
    color: ARPE_COLORS.textPrimary,
  },
});
