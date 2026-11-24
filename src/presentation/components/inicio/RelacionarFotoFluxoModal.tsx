import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ArrowLeft, Check, ChevronRight, Link2, X } from "lucide-react-native";
import {
  CONCESSION_CONFIG,
  DIRECOES_CRA,
} from "../../../domain/config/concessionConfig";
import {
  OcorrenciaEntity,
  TipoAchado,
  TipoRelatorio,
} from "../../../domain/entities/types";
import {
  obterSiglasPorConcessao,
  podeRelacionarOcorrencia,
} from "../../../domain/rules/domainRules";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import { toast } from "../../../application/store/useToastStore";
import {
  AnimatedModalBox,
  AnimatedScalePressable,
  FadeSlideView,
} from "../common/MotionPrimitives";
import { ChipSelectorGroup } from "../common/ChipSelectorGroup";
import { SimulatedPhotoThumb } from "../common/SimulatedPhotoThumb";
import { SimulatedPhotoDraft } from "./FotoPreviewModal";

const TIPOS_REGISTRO = [
  { value: "NC", label: "Não Conformidade (NC)" },
  { value: "PA", label: "Ponto de Atenção (PA)" },
] as const;

interface RelacionarFotoFluxoModalProps {
  visible: boolean;
  photoDraft: SimulatedPhotoDraft | null;
  ocorrencias: readonly OcorrenciaEntity[];
  tipoRelatorio: TipoRelatorio;
  accentColor: string;
  accentSoft: string;
  onClose: () => void;
  onConfirmarRelacao: (params: {
    ocorrenciaNumero: number;
    sigla: TipoAchado;
    siglas?: readonly string[];
    faixa?: string;
    setorPredial?: string;
    codificacao?: string;
    fotoRelacionadaNome: string;
  }) => { ok: true } | { ok: false; erro: string };
}

export const RelacionarFotoFluxoModal: React.FC<RelacionarFotoFluxoModalProps> = ({
  visible,
  photoDraft,
  ocorrencias,
  tipoRelatorio,
  accentColor,
  accentSoft,
  onClose,
  onConfirmarRelacao,
}) => {
  const cfg = CONCESSION_CONFIG[tipoRelatorio];
  const optionsSiglas = obterSiglasPorConcessao(tipoRelatorio);
  const elegiveis = ocorrencias.filter(podeRelacionarOcorrencia);

  const [alvo, setAlvo] = useState<OcorrenciaEntity | null>(null);
  const [tipoAchado, setTipoAchado] = useState<TipoAchado>("NC");
  const [faixa, setFaixa] = useState<string>(DIRECOES_CRA[0]);
  const [siglas, setSiglas] = useState<string[]>([]);
  const [codificacao, setCodificacao] = useState<string>("");
  const [erro, setErro] = useState<string>("");

  useEffect(() => {
    if (visible) {
      setAlvo(null);
      setErro("");
    }
  }, [visible]);

  const selecionarOcorrencia = (oc: OcorrenciaEntity) => {
    setAlvo(oc);
    setTipoAchado(oc.tipoAchado);
    setFaixa(oc.direcaoFaixa ?? DIRECOES_CRA[0]);
    setSiglas(
      (oc.constatacao || "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => optionsSiglas.includes(s))
    );
    setCodificacao("");
    setErro("");
  };

  const handleSalvar = () => {
    if (!alvo || !photoDraft) return;
    const res = onConfirmarRelacao({
      ocorrenciaNumero: alvo.numero,
      sigla: tipoAchado,
      siglas: siglas.length > 0 ? siglas : undefined,
      faixa: tipoRelatorio === "CRA" ? faixa : undefined,
      setorPredial:
        tipoRelatorio === "SOCICAM"
          ? alvo.setorPredial || cfg.setoresPrediais[0]
          : undefined,
      codificacao: codificacao.trim() || undefined,
      fotoRelacionadaNome: photoDraft.nomeArquivo,
    });
    if (!res.ok) {
      setErro(res.erro);
      toast.error("Não foi possível relacionar", res.erro);
      return;
    }
    toast.success(
      `2ª foto relacionada à ocorrência #${String(alvo.numero).padStart(2, "0")}`,
      photoDraft.nomeArquivo
    );
    onClose();
  };

  return (
    <AnimatedModalBox
      visible={visible && photoDraft !== null}
      variant="sheet"
      cardStyle={styles.sheet}
      onClose={onClose}
    >
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          {alvo ? (
            <Pressable onPress={() => setAlvo(null)} style={styles.backRow}>
              <ArrowLeft size={15} color={ARPE_COLORS.textSecondary} />
              <Text style={styles.backText}>Trocar ocorrência</Text>
            </Pressable>
          ) : (
            <Text style={styles.kicker}>RELACIONAR 2ª FOTO · ETAPA 1 DE 2</Text>
          )}
          <Text style={styles.title}>
            {alvo
              ? `Relacionar com #${String(alvo.numero).padStart(2, "0")}`
              : "Escolha a ocorrência para relacionar"}
          </Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <X size={19} color={ARPE_COLORS.textSecondary} />
        </Pressable>
      </View>

      {!alvo ? (
        <FadeSlideView animKey="pick-target" distance={6}>
          <Text style={styles.subtitle}>
            Apenas ocorrências sem relacionamento aparecem aqui (limite de 1 relação por ocorrido).
          </Text>
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {elegiveis.map((oc) => (
              <AnimatedScalePressable
                key={oc.numero}
                onPress={() => selecionarOcorrencia(oc)}
                style={styles.targetCard}
              >
                <SimulatedPhotoThumb
                  nomeArquivo={oc.fotoAtualNome}
                  accentColor={accentColor}
                  accentSoft={accentSoft}
                  size={54}
                  badgeText="1ª"
                />
                <View style={styles.targetInfo}>
                  <Text style={[styles.targetKicker, { color: accentColor }]}>
                    #{String(oc.numero).padStart(2, "0")} · {oc.tipoAchado}
                  </Text>
                  <Text style={styles.targetDesc} numberOfLines={2}>
                    {oc.descricao}
                  </Text>
                </View>
                <ChevronRight size={18} color={ARPE_COLORS.textMuted} />
              </AnimatedScalePressable>
            ))}
          </ScrollView>
        </FadeSlideView>
      ) : (
        <FadeSlideView animKey={`relate-form-${alvo.numero}`} distance={8} style={styles.formWrap}>
          <View style={styles.sideBySideRow}>
            <View style={styles.photoSlot}>
              <SimulatedPhotoThumb
                nomeArquivo={alvo.fotoAtualNome}
                accentColor={accentColor}
                accentSoft={accentSoft}
                size={68}
                badgeText="1ª"
              />
              <Text style={styles.slotLabel} numberOfLines={1}>
                Base · #{String(alvo.numero).padStart(2, "0")}
              </Text>
            </View>
            <Link2 size={18} color={accentColor} />
            <View style={styles.photoSlot}>
              <SimulatedPhotoThumb
                nomeArquivo={photoDraft?.nomeArquivo}
                accentColor={accentColor}
                accentSoft={accentSoft}
                size={68}
                badgeText="2ª"
              />
              <Text style={styles.slotLabel} numberOfLines={1}>
                Nova foto
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <ChipSelectorGroup
              label="Sigla (NC ou PA) *"
              options={TIPOS_REGISTRO}
              value={tipoAchado}
              onChange={(v) => setTipoAchado(v as TipoAchado)}
              accentColor={accentColor}
              equalWidth
            />

            {tipoRelatorio === "CRA" && (
              <ChipSelectorGroup
                label="Direção / Faixa *"
                options={DIRECOES_CRA}
                value={faixa}
                onChange={setFaixa}
                accentColor={accentColor}
                equalWidth
              />
            )}

            <ChipSelectorGroup
              multiple
              compact
              label={
                tipoRelatorio === "SOCICAM"
                  ? "Irregularidades (SOCICAM)"
                  : `Siglas ${tipoRelatorio} (DNIT)`
              }
              options={optionsSiglas}
              values={siglas}
              onToggle={(s) =>
                setSiglas((prev) =>
                  prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
                )
              }
              accentColor={accentColor}
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>CODIFICAÇÃO (OPCIONAL)</Text>
              <TextInput
                value={codificacao}
                onChangeText={setCodificacao}
                placeholder="Deixe em branco para manter a base"
                placeholderTextColor={ARPE_COLORS.textMuted}
                style={styles.input}
              />
            </View>

            {erro !== "" && <Text style={styles.errorText}>{erro}</Text>}
          </ScrollView>

          <AnimatedScalePressable
            onPress={handleSalvar}
            style={[styles.saveBtn, { backgroundColor: accentColor }]}
          >
            <Check size={17} color={ARPE_COLORS.white} />
            <Text style={styles.saveBtnText}>Confirmar Relacionamento</Text>
          </AnimatedScalePressable>
        </FadeSlideView>
      )}
    </AnimatedModalBox>
  );
};

const styles = StyleSheet.create({
  sheet: {
    width: "100%",
    backgroundColor: ARPE_COLORS.white,
    borderTopLeftRadius: RADII.xl,
    borderTopRightRadius: RADII.xl,
    padding: SPACING.xl,
    maxHeight: "90%",
    gap: SPACING.md,
  },
  topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  titleWrap: { flex: 1, gap: 3 },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { fontSize: 12, fontWeight: "700", color: ARPE_COLORS.textSecondary },
  kicker: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.7, color: ARPE_COLORS.textMuted },
  title: { fontSize: 18, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  subtitle: { fontSize: 12.5, color: ARPE_COLORS.textSecondary, marginBottom: SPACING.sm },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollArea: { maxHeight: 360 },
  listContent: { gap: SPACING.sm, paddingBottom: 8 },
  targetCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.sm,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    backgroundColor: ARPE_COLORS.white,
  },
  targetInfo: { flex: 1, gap: 3 },
  targetKicker: { fontSize: 11.5, fontWeight: "800" },
  targetDesc: { fontSize: 13, fontWeight: "600", color: ARPE_COLORS.textPrimary },
  formWrap: { gap: SPACING.md },
  sideBySideRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    padding: SPACING.md,
    borderRadius: RADII.lg,
    backgroundColor: ARPE_COLORS.surfaceMuted,
  },
  photoSlot: { alignItems: "center", gap: 4, maxWidth: 110 },
  slotLabel: { fontSize: 11, fontWeight: "700", color: ARPE_COLORS.textSecondary },
  formContent: { gap: SPACING.md, paddingBottom: 8 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 10.5, fontWeight: "700", letterSpacing: 0.6, color: ARPE_COLORS.textSecondary },
  input: {
    minHeight: TOUCH_TARGET_MIN,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.inputBg,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    paddingHorizontal: SPACING.md,
    fontSize: 13.5,
    color: ARPE_COLORS.textPrimary,
  },
  errorText: { fontSize: 12, fontWeight: "700", color: "#dc2626" },
  saveBtn: {
    minHeight: TOUCH_TARGET_MIN + 6,
    borderRadius: RADII.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: { fontSize: 14.5, fontWeight: "800", color: ARPE_COLORS.white },
});
