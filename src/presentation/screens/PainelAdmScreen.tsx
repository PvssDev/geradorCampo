import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from "lucide-react-native";
import { obterLabelPerfil } from "../../domain/rules/authRules";
import {
  AdminTelemetryData,
  deletarUsuarioAdmin,
  listarUsuariosGerenciaveis,
  ManagedUserItem,
  obterTelemetriaAdm,
} from "../../infrastructure/auth/adminUserService";
import { useAuthStore } from "../../application/store/useAuthStore";
import { toast } from "../../application/store/useToastStore";
import { ADM_DARK, ADM_SHADOWS } from "../theme/admDarkTheme";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../theme/tokens";
import { UserAvatar } from "../components/common/UserAvatar";
import {
  AnimatedModalBox,
  AnimatedScalePressable,
  FadeSlideView,
} from "../components/common/MotionPrimitives";
import { AdminUsuarioFormModal } from "../components/perfil/AdminUsuarioFormModal";
import { AdmBootOverlay } from "../components/perfil/AdmBootOverlay";
import { AdmTelemetrySection } from "../components/perfil/AdmTelemetrySection";
import {
  AdmDarkBackdrop,
  AdmGradientButton,
  AdmSurfaceCard,
} from "../components/perfil/AdmVisualPrimitives";

interface PainelAdmScreenProps {
  readonly onBack: () => void;
}

type FiltroRole = "todos" | "coordenador" | "analista";

const FILTROS_ROLE = [
  { value: "todos", label: "Todos" },
  { value: "coordenador", label: "Coordenadores" },
  { value: "analista", label: "Analistas" },
] as const;

export const PainelAdmScreen: React.FC<PainelAdmScreenProps> = ({ onBack }) => {
  const session = useAuthStore((s) => s.session);
  const accentColor = ADM_DARK.accent;

  const [bootDone, setBootDone] = useState(false);
  const [usuarios, setUsuarios] = useState<readonly ManagedUserItem[]>([]);
  const [telemetria, setTelemetria] = useState<AdminTelemetryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erroLoad, setErroLoad] = useState("");
  const [filtro, setFiltro] = useState<FiltroRole>("todos");

  const [formVisible, setFormVisible] = useState(false);
  const [usuarioEdicao, setUsuarioEdicao] = useState<ManagedUserItem | null>(null);

  const [alvoDelete, setAlvoDelete] = useState<ManagedUserItem | null>(null);
  const [senhaAdmDelete, setSenhaAdmDelete] = useState("");
  const [erroDelete, setErroDelete] = useState("");
  const [deleting, setDeleting] = useState(false);

  const carregar = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setErroLoad("");
    const [resUsers, resTel] = await Promise.all([
      listarUsuariosGerenciaveis(session.accessToken),
      obterTelemetriaAdm(session.accessToken),
    ]);
    setLoading(false);
    if (!resUsers.ok) {
      setErroLoad(resUsers.erro);
    } else {
      setUsuarios(resUsers.usuarios);
    }
    if (resTel.ok) {
      setTelemetria(resTel.data);
    }
  }, [session]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    if (filtro === "todos") return usuarios;
    return usuarios.filter((u) => u.role === filtro);
  }, [usuarios, filtro]);

  const abrirCriar = () => {
    setUsuarioEdicao(null);
    setFormVisible(true);
  };

  const abrirEditar = (user: ManagedUserItem) => {
    setUsuarioEdicao(user);
    setFormVisible(true);
  };

  const abrirDeletar = (user: ManagedUserItem) => {
    setAlvoDelete(user);
    setSenhaAdmDelete("");
    setErroDelete("");
  };

  const handleConfirmarDelete = async () => {
    if (!session || !alvoDelete || deleting) return;
    setDeleting(true);
    const res = await deletarUsuarioAdmin({
      accessToken: session.accessToken,
      userId: alvoDelete.id,
      senhaConfirmacaoAdm: senhaAdmDelete,
    });
    setDeleting(false);

    if (!res.ok) {
      setErroDelete(res.erro);
      return;
    }

    const nomeRemovido = alvoDelete.usuario;
    setAlvoDelete(null);
    setSenhaAdmDelete("");
    toast.success("Usuário excluído", `@${nomeRemovido} removido do sistema.`);
    void carregar();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <AdmDarkBackdrop accentColor={accentColor} />
      {!bootDone && (
        <AdmBootOverlay
          accentColor={accentColor}
          onFinish={() => setBootDone(true)}
        />
      )}

      <View style={styles.header}>
        <AnimatedScalePressable
          onPress={onBack}
          style={styles.outlinedBtn}
          accessibilityRole="button"
          accessibilityLabel="Voltar ao perfil"
        >
          <ArrowLeft size={18} color={ADM_DARK.textPrimary} />
        </AnimatedScalePressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Painel ADM</Text>
          <Text style={styles.headerSub}>Gestão de Equipe & Telemetria</Text>
        </View>
        <AnimatedScalePressable
          onPress={() => void carregar()}
          style={styles.outlinedBtn}
          accessibilityRole="button"
          accessibilityLabel="Atualizar painel"
        >
          <RefreshCw size={16} color={ADM_DARK.textSecondary} />
        </AnimatedScalePressable>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <AdmTelemetrySection data={telemetria} accentColor={accentColor} />

        <View style={styles.sectionTop}>
          <View style={styles.sectionTitleRow}>
            <View>
              <Text style={styles.sectionKicker}>EQUIPE CADASTRADA</Text>
              <Text style={styles.sectionCount}>
                {filtrados.length} {filtrados.length === 1 ? "conta" : "contas"}
              </Text>
            </View>
            <AdmGradientButton
              label="Novo usuário"
              accentColor={accentColor}
              compact
              icon={<Plus size={14} color={ADM_DARK.textPrimary} />}
              onPress={abrirCriar}
            />
          </View>

          <View style={styles.filterRow}>
            {FILTROS_ROLE.map((opt) => {
              const active = filtro === opt.value;
              return (
                <AnimatedScalePressable
                  key={opt.value}
                  onPress={() => setFiltro(opt.value)}
                  style={[
                    styles.filterBtn,
                    active && {
                      backgroundColor: accentColor,
                      borderColor: accentColor,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterBtnText,
                      active && styles.filterBtnTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </AnimatedScalePressable>
              );
            })}
          </View>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color={accentColor} />
            <Text style={styles.mutedText}>Carregando painel...</Text>
          </View>
        ) : erroLoad !== "" ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{erroLoad}</Text>
          </View>
        ) : filtrados.length === 0 ? (
          <View style={styles.centerBox}>
            <Users size={26} color={ADM_DARK.textMuted} />
            <Text style={styles.mutedText}>Nenhum usuário neste filtro.</Text>
          </View>
        ) : (
          filtrados.map((user, idx) => (
            <FadeSlideView key={user.id} delay={idx * 20} distance={6}>
              <AdmSurfaceCard style={styles.userCard}>
                <UserAvatar
                  nomeCompleto={user.nomeCompleto}
                  usuario={user.usuario}
                  size={42}
                />
                <View style={styles.userInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {user.nomeCompleto}
                    </Text>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: user.ativo
                            ? ADM_DARK.emerald
                            : ADM_DARK.danger,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.userMeta}>
                    @{user.usuario} · {obterLabelPerfil(user.role)}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <AnimatedScalePressable
                    onPress={() => abrirEditar(user)}
                    style={styles.actionBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar ${user.usuario}`}
                  >
                    <Pencil size={14} color={ADM_DARK.textSecondary} />
                  </AnimatedScalePressable>
                  <AnimatedScalePressable
                    onPress={() => abrirDeletar(user)}
                    style={[styles.actionBtn, styles.actionDanger]}
                    accessibilityRole="button"
                    accessibilityLabel={`Excluir ${user.usuario}`}
                  >
                    <Trash2 size={14} color={ADM_DARK.danger} />
                  </AnimatedScalePressable>
                </View>
              </AdmSurfaceCard>
            </FadeSlideView>
          ))
        )}
      </ScrollView>

      <AdminUsuarioFormModal
        visible={formVisible}
        accentColor={accentColor}
        usuarioEdicao={usuarioEdicao}
        onClose={() => setFormVisible(false)}
        onSaved={() => void carregar()}
      />

      <AnimatedModalBox
        visible={alvoDelete !== null}
        variant="sheet"
        cardStyle={[styles.sheet, ADM_SHADOWS.sheet]}
        onClose={() => setAlvoDelete(null)}
      >
        <View style={styles.handle} />
        <View style={styles.sheetHeader}>
          <View style={styles.flex1}>
            <Text style={styles.sheetTitle}>Excluir Usuário</Text>
            <Text style={styles.sheetSub}>
              {alvoDelete
                ? `Remover ${alvoDelete.nomeCompleto} (@${alvoDelete.usuario})`
                : ""}
            </Text>
          </View>
          <AnimatedScalePressable
            onPress={() => setAlvoDelete(null)}
            style={styles.outlinedBtn}
          >
            <X size={17} color={ADM_DARK.textSecondary} />
          </AnimatedScalePressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>CONFIRME SUA SENHA DE ADM</Text>
          <TextInput
            value={senhaAdmDelete}
            onChangeText={(v) => {
              setSenhaAdmDelete(v);
              if (erroDelete) setErroDelete("");
            }}
            secureTextEntry
            placeholder="Sua senha de Administrador"
            placeholderTextColor={ADM_DARK.textMuted}
            style={styles.input}
          />
        </View>

        {erroDelete !== "" && <Text style={styles.errorText}>{erroDelete}</Text>}

        <AdmGradientButton
          label="Confirmar Exclusão"
          accentColor={accentColor}
          tone="danger"
          loading={deleting}
          icon={<Trash2 size={15} color={ADM_DARK.textPrimary} />}
          onPress={() => void handleConfirmarDelete()}
        />
      </AnimatedModalBox>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: ADM_DARK.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: ADM_DARK.border,
  },
  outlinedBtn: {
    width: 38,
    height: 38,
    borderRadius: RADII.md,
    backgroundColor: ADM_DARK.surface,
    borderWidth: 1,
    borderColor: ADM_DARK.borderControl,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: ADM_DARK.textPrimary,
  },
  headerSub: { fontSize: 11, color: ADM_DARK.textSecondary, marginTop: 1 },
  body: { flex: 1 },
  listContent: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl },
  sectionTop: { gap: SPACING.sm, marginTop: SPACING.xs },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionKicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: ADM_DARK.textMuted,
  },
  sectionCount: {
    fontSize: 15,
    fontWeight: "800",
    color: ADM_DARK.textPrimary,
    marginTop: 1,
  },
  filterRow: { flexDirection: "row", gap: 8 },
  filterBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: RADII.md,
    backgroundColor: ADM_DARK.surface,
    borderWidth: 1,
    borderColor: ADM_DARK.borderControl,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: ADM_DARK.textSecondary,
  },
  filterBtnTextActive: {
    color: ADM_DARK.textPrimary,
    fontWeight: "700",
  },
  centerBox: { alignItems: "center", paddingVertical: SPACING.xl, gap: 8 },
  mutedText: { fontSize: 13, color: ADM_DARK.textSecondary },
  errorText: { fontSize: 12.5, fontWeight: "700", color: ADM_DARK.danger },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
  },
  userInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: ADM_DARK.textPrimary,
    flexShrink: 1,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  userMeta: { fontSize: 12, fontWeight: "500", color: ADM_DARK.textSecondary },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: RADII.md,
    backgroundColor: ADM_DARK.surfaceRecessed,
    borderWidth: 1,
    borderColor: ADM_DARK.borderControl,
    alignItems: "center",
    justifyContent: "center",
  },
  actionDanger: {
    borderColor: "rgba(239, 68, 68, 0.45)",
    backgroundColor: ADM_DARK.dangerSoft,
  },
  sheet: {
    backgroundColor: ADM_DARK.surface,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    borderTopWidth: 1,
    borderColor: ADM_DARK.borderControl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: RADII.pill,
    backgroundColor: ADM_DARK.borderControl,
    alignSelf: "center",
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  flex1: { flex: 1 },
  sheetTitle: { fontSize: 17.5, fontWeight: "800", color: ADM_DARK.textPrimary },
  sheetSub: { fontSize: 12, color: ADM_DARK.textSecondary, marginTop: 2 },
  field: { gap: 6 },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: ADM_DARK.textMuted,
  },
  input: {
    minHeight: TOUCH_TARGET_MIN,
    borderRadius: RADII.md,
    backgroundColor: ADM_DARK.surfaceRecessed,
    borderWidth: 1,
    borderColor: ADM_DARK.borderControl,
    paddingHorizontal: SPACING.md,
    fontSize: 14,
    color: ADM_DARK.textPrimary,
  },
});
