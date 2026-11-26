import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  DownloadCloud,
  Trash2,
  UserCheck,
  X,
} from "lucide-react-native";
import { UserRole } from "../../../domain/entities/authTypes";
import { obterAcoesNuvemPermitidas } from "../../../domain/rules/authRules";
import { useAuthStore } from "../../../application/store/useAuthStore";
import {
  listarUsuariosGerenciaveis,
  ManagedUserItem,
} from "../../../infrastructure/auth/adminUserService";
import { NuvemVistoriaItem } from "../../../infrastructure/sync/syncEngine";
import { ARPE_COLORS, getConcessionTheme } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import { AnimatedModalBox, AnimatedScalePressable } from "../common/MotionPrimitives";
import { UserAvatar } from "../common/UserAvatar";

interface NuvemAcoesModalProps {
  readonly item: NuvemVistoriaItem | null;
  readonly callerId?: string;
  readonly callerRole?: UserRole;
  readonly onClose: () => void;
  readonly onPuxar: (vistoriaId: string) => Promise<void>;
  readonly onApagarNuvem: (vistoriaId: string) => Promise<void>;
  readonly onRedirecionar: (vistoriaId: string, novoAutorId: string) => Promise<void>;
}

export const NuvemAcoesModal: React.FC<NuvemAcoesModalProps> = ({
  item,
  callerId,
  callerRole,
  onClose,
  onPuxar,
  onApagarNuvem,
  onRedirecionar,
}) => {
  const accessToken = useAuthStore((s) => s.session?.accessToken);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [modoRedirecionar, setModoRedirecionar] = useState(false);
  const [usuarios, setUsuarios] = useState<ManagedUserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    setBusy(false);
    setConfirmDelete(false);
    setModoRedirecionar(false);
  }, [item?.id]);

  if (!item) return null;

  const theme = getConcessionTheme(item.concessao, item.modalidade);
  const acoes = obterAcoesNuvemPermitidas({
    callerId,
    callerRole,
    autorId: item.autor_id,
    autorRole: item.autor_role,
  });

  const autorNome = item.autor_nome || item.autor_usuario;
  const autorUsuario = item.autor_usuario;

  const abrirRedirecionar = async () => {
    setModoRedirecionar(true);
    if (usuarios.length > 0 || !accessToken) return;
    setLoadingUsers(true);
    const res = await listarUsuariosGerenciaveis(accessToken);
    setLoadingUsers(false);
    if (res.ok) {
      setUsuarios(res.usuarios.filter((u) => u.ativo && u.id !== item.autor_id));
    }
  };

  const executar = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatedModalBox
      visible={item !== null}
      variant="sheet"
      cardStyle={styles.sheet}
      onClose={onClose}
    >
      <View style={styles.handle} />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <View
            style={[
              styles.badge,
              { backgroundColor: theme.primarySoft, borderColor: theme.primaryBorder },
            ]}
          >
            <Text style={[styles.badgeText, { color: theme.primary }]}>
              {item.concessao} · {item.modalidade}
            </Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {item.id_fiscalizacao}
          </Text>
        </View>
        <AnimatedScalePressable onPress={onClose} style={styles.closeBtn}>
          <X size={18} color={ARPE_COLORS.textSecondary} />
        </AnimatedScalePressable>
      </View>

      <View style={styles.authorBox}>
        <UserAvatar nomeCompleto={autorNome} usuario={autorUsuario} size={32} />
        <View style={styles.flex1}>
          <Text style={styles.authorName}>{autorNome}</Text>
          <Text style={styles.authorSub}>
            @{autorUsuario} · {item.total_fotos}{" "}
            {item.total_fotos === 1 ? "foto" : "fotos"} na nuvem
          </Text>
        </View>
      </View>

      {busy ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.primary} />
          <Text style={styles.loadingText}>Processando operação na nuvem...</Text>
        </View>
      ) : modoRedirecionar ? (
        <View style={styles.redirectBox}>
          <Text style={styles.sectionLabel}>
            SELECIONE O NOVO RESPONSÁVEL (ANALISTA OU COORDENADOR)
          </Text>
          {loadingUsers ? (
            <ActivityIndicator color={theme.primary} />
          ) : usuarios.length === 0 ? (
            <Text style={styles.emptyUsers}>
              Nenhum outro usuário ativo disponível para redirecionamento.
            </Text>
          ) : (
            <ScrollView style={styles.usersScroll}>
              {usuarios.map((u) => (
                <AnimatedScalePressable
                  key={u.id}
                  onPress={() => void executar(() => onRedirecionar(item.id, u.id))}
                  style={styles.userRow}
                >
                  <UserAvatar
                    nomeCompleto={u.nomeCompleto}
                    usuario={u.usuario}
                    size={28}
                  />
                  <View style={styles.flex1}>
                    <Text style={styles.userName}>{u.nomeCompleto}</Text>
                    <Text style={styles.userMeta}>
                      @{u.usuario} · {u.role}
                    </Text>
                  </View>
                </AnimatedScalePressable>
              ))}
            </ScrollView>
          )}
          <AnimatedScalePressable
            onPress={() => setModoRedirecionar(false)}
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>Voltar</Text>
          </AnimatedScalePressable>
        </View>
      ) : (
        <View style={styles.actionsStack}>
          {acoes.podePuxar && (
            <AnimatedScalePressable
              onPress={() => void executar(() => onPuxar(item.id))}
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            >
              <DownloadCloud size={16} color={ARPE_COLORS.white} />
              <Text style={styles.primaryBtnText}>
                Puxar para local (apaga da nuvem)
              </Text>
            </AnimatedScalePressable>
          )}

          {acoes.podeRedirecionar && (
            <AnimatedScalePressable
              onPress={() => void abrirRedirecionar()}
              style={styles.outlineBtn}
            >
              <UserCheck size={16} color={ARPE_COLORS.navy} />
              <Text style={styles.outlineBtnText}>
                Redirecionar para outro analista/coord.
              </Text>
            </AnimatedScalePressable>
          )}

          {acoes.podeApagarNuvem &&
            (!confirmDelete ? (
              <AnimatedScalePressable
                onPress={() => setConfirmDelete(true)}
                style={styles.dangerOutlineBtn}
              >
                <Trash2 size={16} color={ARPE_COLORS.danger} />
                <Text style={styles.dangerText}>Apagar da nuvem</Text>
              </AnimatedScalePressable>
            ) : (
              <View style={styles.confirmRow}>
                <AnimatedScalePressable
                  onPress={() => setConfirmDelete(false)}
                  style={[styles.cancelBtn, styles.flex1]}
                >
                  <Text style={styles.cancelText}>Cancelar</Text>
                </AnimatedScalePressable>
                <AnimatedScalePressable
                  onPress={() => void executar(() => onApagarNuvem(item.id))}
                  style={[styles.primaryBtn, styles.flex1, { backgroundColor: ARPE_COLORS.danger }]}
                >
                  <Text style={styles.primaryBtnText}>Confirmar exclusão</Text>
                </AnimatedScalePressable>
              </View>
            ))}

          {!acoes.podePuxar &&
            !acoes.podeRedirecionar &&
            !acoes.podeApagarNuvem && (
              <Text style={styles.readOnlyNote}>
                Vistoria registrada por outro usuário (somente visualização).
              </Text>
            )}
        </View>
      )}
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
    gap: SPACING.md,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.borderStrong,
    alignSelf: "center",
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.md },
  headerText: { flex: 1, gap: 4 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10.5, fontWeight: "800" },
  title: { fontSize: 18, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  closeBtn: {
    width: TOUCH_TARGET_MIN - 8,
    height: TOUCH_TARGET_MIN - 8,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  authorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
  },
  flex1: { flex: 1 },
  authorName: { fontSize: 13.5, fontWeight: "700", color: ARPE_COLORS.textPrimary },
  authorSub: { fontSize: 11.5, color: ARPE_COLORS.textSecondary, marginTop: 1 },
  loadingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: SPACING.lg },
  loadingText: { fontSize: 13, fontWeight: "600", color: ARPE_COLORS.textSecondary },
  actionsStack: { gap: SPACING.sm },
  primaryBtn: {
    minHeight: TOUCH_TARGET_MIN,
    borderRadius: RADII.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: SPACING.md,
  },
  primaryBtnText: { fontSize: 13.5, fontWeight: "800", color: ARPE_COLORS.white },
  outlineBtn: {
    minHeight: TOUCH_TARGET_MIN,
    borderRadius: RADII.md,
    borderWidth: 1.5,
    borderColor: ARPE_COLORS.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: SPACING.md,
  },
  outlineBtnText: { fontSize: 13.5, fontWeight: "800", color: ARPE_COLORS.navy },
  dangerOutlineBtn: {
    minHeight: TOUCH_TARGET_MIN,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.dangerBorder,
    backgroundColor: ARPE_COLORS.dangerSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dangerText: { fontSize: 13.5, fontWeight: "800", color: ARPE_COLORS.danger },
  confirmRow: { flexDirection: "row", gap: SPACING.sm },
  cancelBtn: {
    minHeight: TOUCH_TARGET_MIN,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 13, fontWeight: "700", color: ARPE_COLORS.textSecondary },
  redirectBox: { gap: SPACING.sm },
  sectionLabel: { fontSize: 10.5, fontWeight: "800", color: ARPE_COLORS.textMuted },
  usersScroll: { maxHeight: 200 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: ARPE_COLORS.border,
  },
  userName: { fontSize: 13, fontWeight: "700", color: ARPE_COLORS.textPrimary },
  userMeta: { fontSize: 11, color: ARPE_COLORS.textSecondary },
  emptyUsers: { fontSize: 12.5, color: ARPE_COLORS.textSecondary, paddingVertical: SPACING.md },
  readOnlyNote: { fontSize: 12.5, color: ARPE_COLORS.textSecondary, textAlign: "center", paddingVertical: SPACING.sm },
});
