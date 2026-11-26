import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ShieldCheck, X } from "lucide-react-native";
import { RequestableRole } from "../../../domain/entities/authTypes";
import {
  atualizarUsuarioAdmin,
  criarUsuarioAdmin,
  ManagedUserItem,
} from "../../../infrastructure/auth/adminUserService";
import { useAuthStore } from "../../../application/store/useAuthStore";
import { toast } from "../../../application/store/useToastStore";
import { ADM_DARK, ADM_SHADOWS } from "../../theme/admDarkTheme";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import {
  AnimatedModalBox,
  AnimatedScalePressable,
} from "../common/MotionPrimitives";
import { AdmGradientButton } from "./AdmVisualPrimitives";

interface AdminUsuarioFormModalProps {
  readonly visible: boolean;
  readonly accentColor: string;
  readonly usuarioEdicao: ManagedUserItem | null;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}

const CARGOS = [
  { value: "analista", label: "Analista" },
  { value: "coordenador", label: "Coordenador" },
] as const;

const STATUS_CONTA = [
  { value: "ativo", label: "Ativa" },
  { value: "inativo", label: "Inativa" },
] as const;

interface DarkSegmentedProps {
  readonly label: string;
  readonly accentColor: string;
  readonly options: ReadonlyArray<{ readonly value: string; readonly label: string }>;
  readonly value: string;
  readonly onChange: (val: string) => void;
}

const DarkSegmented: React.FC<DarkSegmentedProps> = ({
  label,
  accentColor,
  options,
  value,
  onChange,
}) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label.toUpperCase()}</Text>
    <View style={styles.segBar}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <AnimatedScalePressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segItem,
              active && { backgroundColor: accentColor, borderColor: accentColor },
            ]}
          >
            <Text style={[styles.segText, active && styles.segTextActive]}>
              {opt.label}
            </Text>
          </AnimatedScalePressable>
        );
      })}
    </View>
  </View>
);

export const AdminUsuarioFormModal: React.FC<AdminUsuarioFormModalProps> = ({
  visible,
  accentColor,
  usuarioEdicao,
  onClose,
  onSaved,
}) => {
  const session = useAuthStore((s) => s.session);
  const isEdit = usuarioEdicao !== null;

  const [nome, setNome] = useState("");
  const [usuario, setUsuario] = useState("");
  const [role, setRole] = useState<RequestableRole>("analista");
  const [ativo, setAtivo] = useState(true);
  const [senha, setSenha] = useState("");
  const [senhaAdm, setSenhaAdm] = useState("");
  const [erro, setErro] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNome(usuarioEdicao?.nomeCompleto ?? "");
    setUsuario(usuarioEdicao?.usuario ?? "");
    setRole(usuarioEdicao?.role ?? "analista");
    setAtivo(usuarioEdicao?.ativo ?? true);
    setSenha("");
    setSenhaAdm("");
    setErro("");
  }, [visible, usuarioEdicao]);

  const handleSalvar = async () => {
    if (!session || saving) return;
    setSaving(true);
    const res = isEdit
      ? await atualizarUsuarioAdmin({
        accessToken: session.accessToken,
        userId: usuarioEdicao.id,
        nomeCompleto: nome,
        role,
        ativo,
        novaSenha: senha,
        senhaConfirmacaoAdm: senhaAdm,
      })
      : await criarUsuarioAdmin({
        accessToken: session.accessToken,
        nomeCompleto: nome,
        usuario,
        role,
        senha,
        senhaConfirmacaoAdm: senhaAdm,
      });
    setSaving(false);

    if (!res.ok) {
      setErro(res.erro);
      return;
    }

    toast.success(
      isEdit ? "Usuário atualizado" : "Usuário criado",
      isEdit
        ? `Dados de @${usuarioEdicao.usuario} salvos com sucesso.`
        : `Conta @${usuario.trim().toLowerCase()} pronta para acesso.`
    );
    onSaved();
    onClose();
  };

  return (
    <AnimatedModalBox
      visible={visible}
      variant="sheet"
      cardStyle={[styles.sheet, ADM_SHADOWS.sheet]}
      onClose={onClose}
    >
      <View style={styles.handle} />
      <View style={styles.header}>
        <View style={styles.flex1}>
          <Text style={styles.title}>
            {isEdit ? "Editar Usuário" : "Novo Usuário"}
          </Text>
          <Text style={styles.subtitle}>
            {isEdit
              ? `@${usuarioEdicao.usuario}`
              : "Cria conta ativa imediata no Supabase"}
          </Text>
        </View>
        <AnimatedScalePressable onPress={onClose} style={styles.closeBtn}>
          <X size={17} color={ADM_DARK.textSecondary} />
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
            placeholderTextColor={ADM_DARK.textMuted}
            style={styles.input}
          />
        </View>

        {!isEdit && (
          <View style={styles.field}>
            <Text style={styles.label}>USUÁRIO DE LOGIN (SEM E-MAIL)</Text>
            <TextInput
              value={usuario}
              onChangeText={(v) => {
                setUsuario(v);
                if (erro) setErro("");
              }}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Ex.: maria.silva"
              placeholderTextColor={ADM_DARK.textMuted}
              style={styles.input}
            />
          </View>
        )}

        <DarkSegmented
          label="Perfil"
          accentColor={accentColor}
          options={CARGOS}
          value={role}
          onChange={(v) => setRole(v as RequestableRole)}
        />

        {isEdit && (
          <DarkSegmented
            label="Status da conta"
            accentColor={accentColor}
            options={STATUS_CONTA}
            value={ativo ? "ativo" : "inativo"}
            onChange={(v) => setAtivo(v === "ativo")}
          />
        )}

        <View style={styles.field}>
          <Text style={styles.label}>
            {isEdit
              ? "NOVA SENHA (OPCIONAL — VAZIO PARA MANTER)"
              : "SENHA INICIAL (MÍN. 10 CHARS)"}
          </Text>
          <TextInput
            value={senha}
            onChangeText={(v) => {
              setSenha(v);
              if (erro) setErro("");
            }}
            secureTextEntry
            placeholder="Maiúscula, minúscula e número"
            placeholderTextColor={ADM_DARK.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>CONFIRME SUA SENHA DE ADM</Text>
          <TextInput
            value={senhaAdm}
            onChangeText={(v) => {
              setSenhaAdm(v);
              if (erro) setErro("");
            }}
            secureTextEntry
            placeholder="Sua senha de Administrador"
            placeholderTextColor={ADM_DARK.textMuted}
            style={styles.input}
          />
        </View>

        {erro !== "" && <Text style={styles.errorText}>{erro}</Text>}
      </ScrollView>

      <AdmGradientButton
        label={isEdit ? "Salvar Alterações" : "Criar Usuário"}
        accentColor={accentColor}
        loading={saving}
        icon={<ShieldCheck size={16} color={ADM_DARK.textPrimary} />}
        onPress={() => void handleSalvar()}
      />
    </AnimatedModalBox>
  );
};

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: ADM_DARK.surface,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    borderTopWidth: 1,
    borderColor: ADM_DARK.borderControl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    maxHeight: "90%",
    gap: SPACING.md,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: RADII.pill,
    backgroundColor: ADM_DARK.borderControl,
    alignSelf: "center",
  },
  header: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  flex1: { flex: 1 },
  title: { fontSize: 18, fontWeight: "800", color: ADM_DARK.textPrimary },
  subtitle: { fontSize: 12, color: ADM_DARK.textSecondary, marginTop: 2 },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: RADII.md,
    backgroundColor: ADM_DARK.surfaceRecessed,
    borderWidth: 1,
    borderColor: ADM_DARK.borderControl,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flexGrow: 0 },
  scrollContent: { gap: SPACING.md, paddingBottom: SPACING.xs },
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
  segBar: {
    flexDirection: "row",
    gap: 8,
  },
  segItem: {
    flex: 1,
    minHeight: 38,
    borderRadius: RADII.md,
    backgroundColor: ADM_DARK.surfaceRecessed,
    borderWidth: 1,
    borderColor: ADM_DARK.borderControl,
    alignItems: "center",
    justifyContent: "center",
  },
  segText: { fontSize: 12.5, fontWeight: "600", color: ADM_DARK.textSecondary },
  segTextActive: { color: ADM_DARK.textPrimary, fontWeight: "700" },
  errorText: { fontSize: 12.5, fontWeight: "700", color: ADM_DARK.danger },
});
