import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Camera } from "lucide-react-native";
import { CONCESSION_CONFIG } from "../../domain/config/concessionConfig";
import { SituacaoNC, TipoAchado } from "../../domain/entities/types";
import { calcularCodificacaoCra } from "../../domain/rules/domainRules";
import { useMobileStore } from "../../application/store/useMobileStore";
import { ARPE_COLORS, getConcessionTheme } from "../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../theme/tokens";
import { SituacaoChips } from "../components/ocorrencia/SituacaoChips";

interface NovaOcorrenciaScreenProps {
  onBack: () => void;
  onSaved: () => void;
}

export const NovaOcorrenciaScreen: React.FC<NovaOcorrenciaScreenProps> = ({
  onBack,
  onSaved,
}) => {
  const {
    vistorias,
    activeVistoriaId,
    adicionarOcorrencia,
    simularCapturaFoto,
  } = useMobileStore();

  const vistoria =
    vistorias.find((v) => v.id === activeVistoriaId) ?? vistorias[0];
  const cfg = CONCESSION_CONFIG[vistoria.tipoRelatorio];
  const theme = getConcessionTheme(
    vistoria.tipoRelatorio,
    vistoria.categoriaRelatorio
  );
  const isMonitoring = vistoria.categoriaRelatorio === "Monitoramento";

  const [tipoAchado, setTipoAchado] = useState<TipoAchado>("NC");
  const [descricao, setDescricao] = useState(cfg.ncsSugeridas[0] || "");
  const [pista, setPista] = useState("Sul");
  const [direcaoFaixa, setDirecaoFaixa] = useState("Faixa 1");
  const [trecho, setTrecho] = useState("KM 29,08 - 29,14");
  const [subtrecho, setSubtrecho] = useState("601");
  const [estacaIni, setEstacaIni] = useState("2794");
  const [estacaFim, setEstacaFim] = useState("2834");
  const [setorPredial, setSetorPredial] = useState(
    cfg.setoresPrediais[0] || ""
  );
  const [situacao, setSituacao] = useState<SituacaoNC>("Pendente");
  const [determinacaoOuInfo, setDeterminacaoOuInfo] = useState("");
  const [constatacao, setConstatacao] = useState("");
  const [analiseArpe, setAnaliseArpe] = useState("");
  const [fotoAnexada, setFotoAnexada] = useState<string>("");

  const codificacaoCra = useMemo(() => {
    if (vistoria.tipoRelatorio !== "CRA") return undefined;
    return calcularCodificacaoCra({
      subtrecho,
      estacaIni,
      estacaFim,
      ano: new Date().getFullYear(),
      sequencial: vistoria.ocorrencias.length + 1,
    });
  }, [
    vistoria.tipoRelatorio,
    subtrecho,
    estacaIni,
    estacaFim,
    vistoria.ocorrencias.length,
  ]);

  const handleCapture = () => {
    const foto = simularCapturaFoto(
      vistoria.id,
      vistoria.ocorrencias.length + 1
    );
    setFotoAnexada(foto.nomeArquivo);
  };

  const handleSubmit = () => {
    const seq = vistoria.ocorrencias.length + 1;
    const defaultId =
      codificacaoCra ||
      `NC_${String(seq).padStart(2, "0")}_${vistoria.tipoRelatorio}`;

    adicionarOcorrencia(vistoria.id, {
      tipoAchado: isMonitoring ? "NC" : tipoAchado,
      identificacao: defaultId,
      codificacao: codificacaoCra,
      descricao: descricao.trim() || cfg.ncsSugeridas[0],
      terminal:
        vistoria.tipoRelatorio === "SOCICAM"
          ? vistoria.fiscalizacao.local
          : undefined,
      setorPredial:
        vistoria.tipoRelatorio === "SOCICAM" ? setorPredial : undefined,
      pista: cfg.exibePistaFaixa ? pista : undefined,
      direcaoFaixa: cfg.exibePistaFaixa ? direcaoFaixa : undefined,
      trecho: cfg.exibePistaFaixa ? trecho : undefined,
      determinacaoOuInfo: determinacaoOuInfo.trim(),
      constatacao: constatacao.trim(),
      analiseArpe: analiseArpe.trim(),
      situacao: isMonitoring ? situacao : "Pendente",
      fotoAtualNome: fotoAnexada || undefined,
    });
    onSaved();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          style={styles.backBtn}
          accessibilityLabel="Voltar"
        >
          <ArrowLeft size={20} color={ARPE_COLORS.white} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerKicker}>
            {vistoria.fiscalizacao.idFiscalizacao}
          </Text>
          <Text style={styles.headerTitle}>
            {isMonitoring ? "Auditar Pendência" : "Nova Ocorrência"}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Botão de Captura Rápida de Evidência */}
        <Pressable
          onPress={handleCapture}
          style={[
            styles.captureBanner,
            {
              backgroundColor: theme.primarySoft,
              borderColor: theme.primaryBorder,
            },
          ]}
        >
          <View
            style={[styles.captureIcon, { backgroundColor: theme.primary }]}
          >
            <Camera size={20} color={ARPE_COLORS.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.captureTitle}>
              {fotoAnexada
                ? `Foto vinculada: ${fotoAnexada}`
                : "Capturar Foto Comprobatória"}
            </Text>
            <Text style={styles.captureSub}>
              Compressão automática (~200 KB) no sandbox privado
            </Text>
          </View>
        </Pressable>

        {/* Classificação NC vs PA (apenas Fiscalização) */}
        {!isMonitoring && (
          <>
            <Text style={styles.label}>CLASSIFICAÇÃO DO ACHADO</Text>
            <View style={styles.rowGap}>
              {(["NC", "PA"] as const).map((t) => {
                const selected = tipoAchado === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setTipoAchado(t)}
                    style={[
                      styles.toggleBtn,
                      selected && {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleText,
                        selected && { color: ARPE_COLORS.white },
                      ]}
                    >
                      {t === "NC" ? "Não Conformidade" : "Ponto de Atenção"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Situação (apenas Monitoramento) */}
        {isMonitoring && (
          <>
            <Text style={styles.label}>SITUAÇÃO DA NÃO CONFORMIDADE</Text>
            <SituacaoChips
              value={situacao}
              accentColor={theme.primary}
              onChange={setSituacao}
            />
          </>
        )}

        {/* Campos exclusivos de Rodovias (CRA e CRC) — NUNCA exibidos na SOCICAM */}
        {cfg.exibePistaFaixa ? (
          <>
            <View style={styles.rowGap}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>PISTA</Text>
                <TextInput
                  value={pista}
                  onChangeText={setPista}
                  style={styles.input}
                  placeholder="Norte / Sul"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>FAIXA</Text>
                <TextInput
                  value={direcaoFaixa}
                  onChangeText={setDirecaoFaixa}
                  style={styles.input}
                  placeholder="Faixa 1 / Acost."
                />
              </View>
            </View>

            <Text style={styles.label}>TRECHO / KM</Text>
            <TextInput
              value={trecho}
              onChangeText={setTrecho}
              style={styles.input}
              placeholder="Ex.: KM 29,08 - 29,14"
            />

            {vistoria.tipoRelatorio === "CRA" && (
              <>
                <View style={styles.rowGap}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>SUBTRECHO</Text>
                    <TextInput
                      value={subtrecho}
                      onChangeText={setSubtrecho}
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>ESTACA INI</Text>
                    <TextInput
                      value={estacaIni}
                      onChangeText={setEstacaIni}
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>ESTACA FIM</Text>
                    <TextInput
                      value={estacaFim}
                      onChangeText={setEstacaFim}
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  </View>
                </View>

                <View style={styles.codePreviewBox}>
                  <Text style={styles.codePreviewLabel}>
                    CODIFICAÇÃO AUTOMÁTICA CRA
                  </Text>
                  <Text style={[styles.codePreviewVal, { color: theme.primary }]}>
                    {codificacaoCra}
                  </Text>
                </View>
              </>
            )}
          </>
        ) : (
          /* Campos exclusivos de Terminais (SOCICAM) */
          <>
            <Text style={styles.label}>SETOR PREDIAL DO TERMINAL</Text>
            <View style={styles.chipsWrap}>
              {cfg.setoresPrediais.map((setor) => {
                const selected = setorPredial === setor;
                return (
                  <Pressable
                    key={setor}
                    onPress={() => setSetorPredial(setor)}
                    style={[
                      styles.setorChip,
                      selected && {
                        backgroundColor: theme.primary,
                        borderColor: theme.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.setorChipText,
                        selected && { color: ARPE_COLORS.white },
                      ]}
                    >
                      {setor}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.label}>DESCRIÇÃO DA NÃO CONFORMIDADE / ACHADO</Text>
        <TextInput
          value={descricao}
          onChangeText={setDescricao}
          style={styles.input}
          placeholder="Descreva o achado regulatório"
          placeholderTextColor={ARPE_COLORS.textMuted}
        />

        <Text style={styles.label}>
          {isMonitoring
            ? cfg.labelPosicionamento.toUpperCase()
            : "DETERMINAÇÃO / PROVIDÊNCIA"}
        </Text>
        <TextInput
          value={determinacaoOuInfo}
          onChangeText={setDeterminacaoOuInfo}
          multiline
          numberOfLines={2}
          style={styles.textarea}
          textAlignVertical="top"
          placeholder="Texto técnico..."
          placeholderTextColor={ARPE_COLORS.textMuted}
        />

        <Text style={styles.label}>CONSTATAÇÃO EM CAMPO</Text>
        <TextInput
          value={constatacao}
          onChangeText={setConstatacao}
          multiline
          numberOfLines={2}
          style={styles.textarea}
          textAlignVertical="top"
          placeholder="Descreva o que foi verificado na vistoria..."
          placeholderTextColor={ARPE_COLORS.textMuted}
        />

        {isMonitoring && (
          <>
            <Text style={styles.label}>ANÁLISE DA ARPE</Text>
            <TextInput
              value={analiseArpe}
              onChangeText={setAnaliseArpe}
              multiline
              numberOfLines={2}
              style={styles.textarea}
              textAlignVertical="top"
              placeholder="Prazo de solução ou recomendações contratuais..."
              placeholderTextColor={ARPE_COLORS.textMuted}
            />
          </>
        )}

        <Pressable
          onPress={handleSubmit}
          style={[styles.submitBtn, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.submitBtnText}>Salvar Ocorrência Offline</Text>
        </Pressable>
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
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  backBtn: {
    width: TOUCH_TARGET_MIN,
    height: TOUCH_TARGET_MIN,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.navyElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  headerKicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: "rgba(255,255,255,0.65)",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: ARPE_COLORS.white,
    marginTop: 2,
  },
  body: {
    flex: 1,
    backgroundColor: ARPE_COLORS.surface,
  },
  content: {
    padding: SPACING.xl,
    paddingBottom: 42,
  },
  captureBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    borderRadius: RADII.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  captureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  captureTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
  },
  captureSub: {
    fontSize: 11.5,
    color: ARPE_COLORS.textSecondary,
    marginTop: 2,
  },
  label: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: ARPE_COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.md,
  },
  rowGap: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  toggleBtn: {
    flex: 1,
    minHeight: TOUCH_TARGET_MIN,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: ARPE_COLORS.textPrimary,
  },
  input: {
    minHeight: 46,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.inputBg,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    paddingHorizontal: SPACING.md,
    fontSize: 14,
    color: ARPE_COLORS.textPrimary,
  },
  textarea: {
    minHeight: 74,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.inputBg,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    padding: SPACING.md,
    fontSize: 13.5,
    color: ARPE_COLORS.textPrimary,
  },
  codePreviewBox: {
    marginTop: SPACING.sm,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    padding: SPACING.md,
  },
  codePreviewLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: ARPE_COLORS.textMuted,
  },
  codePreviewVal: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  setorChip: {
    borderRadius: RADII.pill,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  setorChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: ARPE_COLORS.textPrimary,
  },
  submitBtn: {
    marginTop: SPACING.xxl,
    minHeight: 50,
    borderRadius: RADII.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
});

