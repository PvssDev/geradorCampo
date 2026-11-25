import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Check, Image as ImageIcon, Wand2, X } from "lucide-react-native";
import {
  CONCESSION_CONFIG,
  DIRECOES_CRA,
  MAP_SIGLAS_OFICIAL,
  PISTAS_SUGESTOES,
} from "../../../domain/config/concessionConfig";
import {
  CategoriaRelatorio,
  OcorrenciaEntity,
  SituacaoNC,
  TipoAchado,
  TipoRelatorio,
} from "../../../domain/entities/types";
import {
  FotoOcorrenciaAlvo,
  obterSiglasPorConcessao,
  sugerirCodificacaoPorConcessao,
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

const SITUACOES: readonly SituacaoNC[] = [
  "Pendente",
  "Parcialmente Sanada",
  "Sanada",
];
const TIPOS_REGISTRO = [
  { value: "NC", label: "Não Conformidade (NC)" },
  { value: "PA", label: "Ponto de Atenção (PA)" },
] as const;

interface ClassificarOcorrenciaModalProps {
  visible: boolean;
  tipoRelatorio: TipoRelatorio;
  categoriaRelatorio: CategoriaRelatorio;
  localSessao: string;
  proximoSequencial: number;
  photoDraft: SimulatedPhotoDraft | null;
  editingOcorrencia?: OcorrenciaEntity | null;
  editingTarget?: FotoOcorrenciaAlvo;
  accentColor: string;
  onClose: () => void;
  onSalvar: (ocorrencia: Omit<OcorrenciaEntity, "numero" | "idFiscalizacao">) => void;
  onSalvarEdicaoRelacionada?: (params: {
    sigla: TipoAchado;
    siglas?: readonly string[];
    faixa?: string;
    setorPredial?: string;
    codificacao?: string;
    fundamento: string;
    determinacao: string;
  }) => void;
}

export const ClassificarOcorrenciaModal: React.FC<ClassificarOcorrenciaModalProps> = ({
  visible,
  tipoRelatorio,
  categoriaRelatorio,
  localSessao,
  proximoSequencial,
  photoDraft,
  editingOcorrencia = null,
  editingTarget = "principal",
  accentColor,
  onClose,
  onSalvar,
  onSalvarEdicaoRelacionada,
}) => {
  const cfg = CONCESSION_CONFIG[tipoRelatorio];
  const isMonitoring = categoriaRelatorio === "Monitoramento";
  const isEditing = Boolean(editingOcorrencia);
  const isEditingRelated =
    isEditing && editingTarget === "relacionada" && Boolean(editingOcorrencia?.relacionamento);
  const temRelacaoCompartilhada = Boolean(editingOcorrencia?.relacionamento);
  const fotoBannerNome = photoDraft
    ? photoDraft.nomeArquivo
    : isEditingRelated
      ? editingOcorrencia?.relacionamento?.fotoRelacionadaNome
      : editingOcorrencia?.fotoAtualNome;
  const anoAtual = new Date().getFullYear();
  const optionsSiglas = obterSiglasPorConcessao(tipoRelatorio);

  const [tipoAchado, setTipoAchado] = useState<TipoAchado>("NC");
  const [pista, setPista] = useState<string>("Sul");
  const [trecho, setTrecho] = useState<string>("");
  const [direcaoFaixa, setDirecaoFaixa] = useState<"Direita" | "Esquerda">("Direita");
  const [codificacao, setCodificacao] = useState<string>("");
  const [siglas, setSiglas] = useState<string[]>([]);
  const [fundamento, setFundamento] = useState<string>("");
  const [determinacao, setDeterminacao] = useState<string>("");
  const [situacao, setSituacao] = useState<SituacaoNC>("Pendente");
  const [legendaFoto, setLegendaFoto] = useState<string>("");
  const [posConcessionaria, setPosConcessionaria] = useState<string>("");
  const [constatacao, setConstatacao] = useState<string>("");
  const [analiseArpe, setAnaliseArpe] = useState<string>("");
  const [erro, setErro] = useState<string>("");

  useEffect(() => {
    if (!visible) return;
    setErro("");

    if (editingOcorrencia) {
      const rel = editingOcorrencia.relacionamento;
      if (editingTarget === "relacionada" && rel) {
        setTipoAchado(rel.sigla);
        setDirecaoFaixa(
          rel.faixa === "Esquerda" ? "Esquerda" : "Direita"
        );
        setCodificacao(rel.codificacao ?? "");
        setSiglas(rel.siglas ? [...rel.siglas] : []);
      } else {
        setTipoAchado(editingOcorrencia.tipoAchado);
        setPista(editingOcorrencia.pista ?? "Sul");
        setTrecho(editingOcorrencia.trecho ?? "");
        setDirecaoFaixa(
          editingOcorrencia.direcaoFaixa === "Esquerda" ? "Esquerda" : "Direita"
        );
        setCodificacao(editingOcorrencia.codificacao ?? "");
        const siglasParsed = editingOcorrencia.constatacao
          .split(",")
          .map((s) => s.trim())
          .filter((s) => optionsSiglas.includes(s));
        setSiglas(siglasParsed);
      }

      setFundamento(editingOcorrencia.analiseArpe);
      setDeterminacao(editingOcorrencia.determinacaoOuInfo);
      setSituacao(editingOcorrencia.situacao);
      setLegendaFoto(editingOcorrencia.legendaAnterior ?? "");
      setPosConcessionaria(editingOcorrencia.determinacaoOuInfo);
      setConstatacao(editingOcorrencia.constatacao);
      setAnaliseArpe(editingOcorrencia.analiseArpe);
      return;
    }

    setTipoAchado("NC");
    setCodificacao("");
    setSiglas([]);
    setFundamento("");
    setDeterminacao("");
    setSituacao("Pendente");
    setLegendaFoto("");
    setPosConcessionaria("");
    setConstatacao("");
    setAnaliseArpe("");
  }, [visible, tipoRelatorio, editingOcorrencia, editingTarget]);

  const toggleSigla = (s: string) => {
    setSiglas((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
    );
    if (erro) setErro("");
  };

  const handleConfirmar = () => {
    if (isEditingRelated && onSalvarEdicaoRelacionada) {
      onSalvarEdicaoRelacionada({
        sigla: tipoAchado,
        siglas: siglas.length > 0 ? siglas : undefined,
        faixa: tipoRelatorio === "CRA" ? direcaoFaixa : undefined,
        setorPredial:
          tipoRelatorio === "SOCICAM"
            ? editingOcorrencia?.relacionamento?.setorPredial
            : undefined,
        codificacao: codificacao.trim() || undefined,
        fundamento: fundamento.trim(),
        determinacao: determinacao.trim(),
      });
      return;
    }

    if (isMonitoring) {
      if (!posConcessionaria.trim() || !constatacao.trim() || !analiseArpe.trim()) {
        const msg = `Preencha ${cfg.labelPosicionamento}, Constatação em Campo e Análise Regulatória.`;
        setErro(msg);
        toast.error("Campos obrigatórios", msg);
        return;
      }
      const identMon = codificacao.trim() || `NC ${String(proximoSequencial).padStart(3, "0")}`;
      onSalvar({
        tipoAchado: "NC",
        identificacao: identMon,
        codificacao: codificacao.trim() || undefined,
        descricao: constatacao.trim(),
        pista: tipoRelatorio !== "SOCICAM" ? pista.trim() || undefined : undefined,
        trecho: tipoRelatorio !== "SOCICAM" ? trecho.trim() || undefined : undefined,
        direcaoFaixa: tipoRelatorio === "CRA" ? direcaoFaixa : undefined,
        terminal: tipoRelatorio === "SOCICAM" ? localSessao : undefined,
        determinacaoOuInfo: posConcessionaria.trim(),
        constatacao: constatacao.trim(),
        analiseArpe: analiseArpe.trim(),
        situacao,
        fotoAtualNome: photoDraft?.nomeArquivo ?? editingOcorrencia?.fotoAtualNome,
        legendaAnterior: legendaFoto.trim() || undefined,
      });
      return;
    }

    if (siglas.length === 0 && !codificacao.trim()) {
      const msg = "Selecione ao menos uma sigla/irregularidade ou preencha a codificação.";
      setErro(msg);
      toast.error("Preenchimento incompleto", msg);
      return;
    }

    const identFinal =
      codificacao.trim() ||
      sugerirCodificacaoPorConcessao(tipoRelatorio, anoAtual, proximoSequencial);
    const descAuto =
      siglas.length > 0
        ? siglas.map((s) => `${s} (${(MAP_SIGLAS_OFICIAL[s] || s).toLowerCase()})`).join("; ")
        : editingOcorrencia?.descricao || identFinal;

    onSalvar({
      tipoAchado,
      identificacao: identFinal,
      codificacao: identFinal,
      descricao: descAuto,
      pista: tipoRelatorio !== "SOCICAM" ? pista.trim() || undefined : undefined,
      trecho: tipoRelatorio === "CRA" ? identFinal : tipoRelatorio === "CRC" ? trecho.trim() || undefined : undefined,
      direcaoFaixa: tipoRelatorio === "CRA" ? direcaoFaixa : undefined,
      terminal: tipoRelatorio === "SOCICAM" ? localSessao : undefined,
      determinacaoOuInfo: determinacao.trim(),
      constatacao: siglas.join(", ") || identFinal,
      analiseArpe: fundamento.trim(),
      situacao: "Pendente",
      fotoAtualNome: photoDraft?.nomeArquivo ?? editingOcorrencia?.fotoAtualNome,
    });
  };

  return (
    <AnimatedModalBox visible={visible} variant="sheet" cardStyle={styles.sheet} onClose={onClose}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.kicker}>
            {isEditing
              ? `EDITAR OCORRÊNCIA #${String(editingOcorrencia?.numero ?? 0).padStart(2, "0")} · ${tipoRelatorio}`
              : isMonitoring
                ? "AUDITORIA DE MONITORAMENTO"
                : `REGISTRO DE OCORRÊNCIA · ${tipoRelatorio}`}
          </Text>
          <Text style={styles.title}>
            {isMonitoring && !isEditing ? "Auditoria da NC" : "Dados do Registro"}
          </Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <X size={20} color={ARPE_COLORS.textSecondary} />
        </Pressable>
      </View>

      {fotoBannerNome && (
        <FadeSlideView delay={30} distance={6} style={styles.photoConfirmedBanner}>
          <SimulatedPhotoThumb
            nomeArquivo={fotoBannerNome}
            accentColor={accentColor}
            accentSoft={ARPE_COLORS.surfaceMuted}
            size={48}
          />
          <View style={styles.photoBannerTextWrap}>
            <View style={styles.photoBannerTitleRow}>
              <ImageIcon size={14} color={ARPE_COLORS.statusSanada} />
              <Text style={styles.photoConfirmedText} numberOfLines={1}>
                {photoDraft
                  ? `Foto confirmada: ${fotoBannerNome}`
                  : `Foto: ${fotoBannerNome}`}
              </Text>
            </View>
            <Text style={styles.photoBannerSub}>
              {photoDraft
                ? `${photoDraft.tamanhoKb} KB · ${photoDraft.horario} · Sandbox local`
                : "Evidência vinculada · Sandbox local"}
            </Text>
          </View>
        </FadeSlideView>
      )}

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FadeSlideView delay={55} distance={6} style={styles.sectionStack}>
          {!isMonitoring ? (
            <ChipSelectorGroup
              label="Tipo de registro *"
              options={TIPOS_REGISTRO}
              value={tipoAchado}
              onChange={(v) => setTipoAchado(v as TipoAchado)}
              accentColor={accentColor}
              equalWidth
            />
          ) : (
            <ChipSelectorGroup
              label="Situação *"
              options={SITUACOES}
              value={situacao}
              onChange={(v) => setSituacao(v as SituacaoNC)}
              accentColor={accentColor}
            />
          )}

          {tipoRelatorio !== "SOCICAM" && (
            <>
              {!isEditingRelated && (
                <>
                  <ChipSelectorGroup
                    label="Pista"
                    options={PISTAS_SUGESTOES}
                    value={pista}
                    onChange={setPista}
                    accentColor={accentColor}
                  />

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>
                      {tipoRelatorio === "CRA" ? "TRECHO / ESTACA" : "TRECHO / KM"}
                    </Text>
                    <TextInput
                      value={trecho}
                      onChangeText={setTrecho}
                      placeholder={tipoRelatorio === "CRA" ? "Ex.: PE-009 · KM 24+500" : "Ex.: PE-024 · KM 04+200"}
                      placeholderTextColor={ARPE_COLORS.textMuted}
                      style={styles.input}
                    />
                  </View>
                </>
              )}

              {tipoRelatorio === "CRA" && (
                <ChipSelectorGroup
                  label="Direção / Faixa"
                  options={DIRECOES_CRA}
                  value={direcaoFaixa}
                  onChange={(v) => setDirecaoFaixa(v as "Direita" | "Esquerda")}
                  accentColor={accentColor}
                  equalWidth
                />
              )}
            </>
          )}

          <View style={styles.fieldGroup}>
            <View style={styles.labelWithAction}>
              <Text style={styles.label}>
                {isMonitoring
                  ? "CODIFICAÇÃO / NC ANTERIOR"
                  : tipoRelatorio === "SOCICAM"
                  ? "CODIFICAÇÃO / IDENTIFICAÇÃO (OPCIONAL)"
                  : "CODIFICAÇÃO"}
              </Text>
              {!isMonitoring && (
                <AnimatedScalePressable
                  onPress={() => {
                    const code = sugerirCodificacaoPorConcessao(
                      tipoRelatorio,
                      anoAtual,
                      proximoSequencial
                    );
                    setCodificacao(code);
                    toast.info("Codificação sugerida", code);
                  }}
                  style={styles.suggestBtn}
                >
                  <Wand2 size={12} color={accentColor} />
                  <Text style={[styles.suggestText, { color: accentColor }]}>Sugerir</Text>
                </AnimatedScalePressable>
              )}
            </View>
            <TextInput
              value={codificacao}
              onChangeText={(v) => {
                setCodificacao(v);
                if (erro) setErro("");
              }}
              placeholder={
                tipoRelatorio === "SOCICAM"
                  ? "Opcional (usa a irregularidade selecionada)"
                  : sugerirCodificacaoPorConcessao(tipoRelatorio, anoAtual, proximoSequencial)
              }
              placeholderTextColor={ARPE_COLORS.textMuted}
              style={[styles.input, styles.monoInput]}
            />
          </View>
        </FadeSlideView>

        <FadeSlideView delay={95} distance={6} style={styles.sectionStack}>
          {!isMonitoring ? (
            <>
              <ChipSelectorGroup
                multiple
                compact
                label={
                  tipoRelatorio === "SOCICAM"
                    ? "Irregularidades do Terminal (SOCICAM) *"
                    : `Patologias / Irregularidades (Siglas ${tipoRelatorio}) *`
                }
                options={optionsSiglas}
                values={siglas}
                onToggle={toggleSigla}
                accentColor={accentColor}
              />

              {siglas.length > 0 && (
                <FadeSlideView
                  animKey={siglas.join(",")}
                  distance={4}
                  duration={160}
                  style={styles.selectedSiglasBox}
                >
                  {siglas.map((s) => (
                    <Text key={s} style={styles.selectedSiglaLine}>
                      <Text style={{ fontWeight: "800", color: accentColor }}>{s}</Text>
                      {` · ${MAP_SIGLAS_OFICIAL[s] || s}`}
                    </Text>
                  ))}
                </FadeSlideView>
              )}

              <View style={styles.fieldGroup}>
                <View style={styles.labelWithAction}>
                  <Text style={styles.label}>FUNDAMENTO DA INFRAÇÃO</Text>
                  {temRelacaoCompartilhada && (
                    <Text style={[styles.sharedTag, { color: accentColor }]}>
                      Compartilhado (2 fotos)
                    </Text>
                  )}
                </View>
                <TextInput
                  value={fundamento}
                  onChangeText={setFundamento}
                  placeholder={`Enquadramento contratual (${cfg.contratoPadrao})`}
                  placeholderTextColor={ARPE_COLORS.textMuted}
                  multiline
                  style={[styles.input, styles.textArea]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.labelWithAction}>
                  <Text style={styles.label}>DETERMINAÇÃO / PRAZO</Text>
                  {temRelacaoCompartilhada && (
                    <Text style={[styles.sharedTag, { color: accentColor }]}>
                      Compartilhado (2 fotos)
                    </Text>
                  )}
                </View>
                <TextInput
                  value={determinacao}
                  onChangeText={setDeterminacao}
                  placeholder="Determinação e prazo para saneamento"
                  placeholderTextColor={ARPE_COLORS.textMuted}
                  multiline
                  style={[styles.input, styles.textArea]}
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>LEGENDA DA FOTO ATUAL</Text>
                <TextInput
                  value={legendaFoto}
                  onChangeText={setLegendaFoto}
                  placeholder="Descrição exibida abaixo da foto no relatório..."
                  placeholderTextColor={ARPE_COLORS.textMuted}
                  style={styles.input}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{cfg.labelPosicionamento.toUpperCase()} *</Text>
                <TextInput
                  value={posConcessionaria}
                  onChangeText={(v) => { setPosConcessionaria(v); if (erro) setErro(""); }}
                  placeholder="Manifestação informada pela concessionária"
                  placeholderTextColor={ARPE_COLORS.textMuted}
                  multiline
                  style={[styles.input, styles.textArea]}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>CONSTATAÇÃO EM CAMPO *</Text>
                <TextInput
                  value={constatacao}
                  onChangeText={(v) => { setConstatacao(v); if (erro) setErro(""); }}
                  placeholder="Situação verificada pela equipe técnica"
                  placeholderTextColor={ARPE_COLORS.textMuted}
                  multiline
                  style={[styles.input, styles.textArea]}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>ANÁLISE REGULATÓRIA *</Text>
                <TextInput
                  value={analiseArpe}
                  onChangeText={(v) => { setAnaliseArpe(v); if (erro) setErro(""); }}
                  placeholder="Conclusão sobre o saneamento"
                  placeholderTextColor={ARPE_COLORS.textMuted}
                  multiline
                  style={[styles.input, styles.textArea]}
                />
              </View>
            </>
          )}
        </FadeSlideView>

        {erro !== "" && (
          <FadeSlideView animKey={erro} distance={4} duration={150}>
            <Text style={styles.errorText}>{erro}</Text>
          </FadeSlideView>
        )}
      </ScrollView>

      <AnimatedScalePressable
        onPress={handleConfirmar}
        style={[styles.saveBtn, { backgroundColor: accentColor }]}
      >
        <Check size={18} color={ARPE_COLORS.white} />
        <Text style={styles.saveBtnText}>
          {isEditing ? "Salvar Alterações" : "Salvar Ocorrência"}
        </Text>
      </AnimatedScalePressable>
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
    maxHeight: "92%",
    gap: SPACING.md,
  },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kicker: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.7, color: ARPE_COLORS.textMuted },
  title: { fontSize: 19, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  photoConfirmedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.statusSanadaSoft,
  },
  photoBannerTextWrap: { flex: 1, gap: 2 },
  photoBannerTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  photoConfirmedText: { fontSize: 12, fontWeight: "700", color: "#065f46" },
  photoBannerSub: { fontSize: 11, color: "#047857" },
  scrollArea: { maxHeight: 450 },
  scrollContent: { gap: SPACING.md, paddingBottom: SPACING.sm },
  sectionStack: { gap: SPACING.md },
  fieldGroup: { gap: 7 },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, color: ARPE_COLORS.textSecondary },
  labelWithAction: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  suggestBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 2 },
  suggestText: { fontSize: 11.5, fontWeight: "800" },
  sharedTag: { fontSize: 10.5, fontWeight: "700" },
  selectedSiglasBox: {
    padding: 10,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    gap: 4,
  },
  selectedSiglaLine: { fontSize: 11.5, lineHeight: 16, color: ARPE_COLORS.textSecondary },
  input: {
    minHeight: TOUCH_TARGET_MIN,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.inputBg,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    paddingHorizontal: SPACING.md,
    fontSize: 14,
    color: ARPE_COLORS.textPrimary,
  },
  monoInput: { fontSize: 13, fontWeight: "700" },
  textArea: { minHeight: 68, paddingTop: 10, textAlignVertical: "top" },
  errorText: { fontSize: 12.5, fontWeight: "700", color: "#dc2626" },
  saveBtn: {
    minHeight: TOUCH_TARGET_MIN + 6,
    borderRadius: RADII.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: "800", color: ARPE_COLORS.white },
});
