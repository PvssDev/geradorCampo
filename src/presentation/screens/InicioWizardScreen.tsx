import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  Images,
  Link2,
  RotateCcw,
} from "lucide-react-native";
import { CONCESSION_CONFIG } from "../../domain/config/concessionConfig";
import { OcorrenciaEntity } from "../../domain/entities/types";
import {
  FotoOcorrenciaAlvo,
  podeRelacionarOcorrencia,
} from "../../domain/rules/domainRules";
import { useMobileStore } from "../../application/store/useMobileStore";
import { toast } from "../../application/store/useToastStore";
import { ARPE_COLORS, getConcessionTheme } from "../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../theme/tokens";
import { StepModalidade } from "../components/inicio/StepModalidade";
import { StepDadosIniciais } from "../components/inicio/StepDadosIniciais";
import {
  FotoPreviewModal,
  SimulatedPhotoDraft,
} from "../components/inicio/FotoPreviewModal";
import { EscolherFotoOrigemModal } from "../components/inicio/EscolherFotoOrigemModal";
import { RelacionarFotoFluxoModal } from "../components/inicio/RelacionarFotoFluxoModal";
import { ClassificarOcorrenciaModal } from "../components/inicio/ClassificarOcorrenciaModal";
import { OcorrenciaDetalheRelacaoModal } from "../components/inicio/OcorrenciaDetalheRelacaoModal";
import { FinalizarRelatorioModal } from "../components/inicio/FinalizarRelatorioModal";
import {
  AnimatedScalePressable,
  AnimatedValueText,
  DirectionalTransition,
  FadeSlideView,
  WizardProgressBar,
} from "../components/common/MotionPrimitives";
import { SimulatedPhotoThumb } from "../components/common/SimulatedPhotoThumb";

interface InicioWizardScreenProps {
  onFinalizadoSuccess?: () => void;
}

export const InicioWizardScreen: React.FC<InicioWizardScreenProps> = ({
  onFinalizadoSuccess,
}) => {
  const {
    wizardStep,
    tipoRelatorio,
    categoriaRelatorio,
    vistorias,
    activeVistoriaId,
    setWizardStep,
    setModalidade,
    criarVistoria,
    atualizarDadosVistoria,
    iniciarNovoRelatorioWizard,
    simularCapturaFoto,
    adicionarOcorrencia,
    atualizarOcorrencia,
    atualizarRelacionamentoOcorrencia,
    removerFotoOcorrencia,
    excluirOcorrencia,
    vincularFotoUltimaOcorrencia,
    relacionarOcorrencia,
    finalizarVistoria,
  } = useMobileStore();

  const vistoriaAtiva = useMemo(
    () =>
      vistorias.find(
        (v) => v.id === activeVistoriaId && v.lifecycleStatus === "em_aberto"
      ),
    [vistorias, activeVistoriaId]
  );

  const todasFotosApp = useMemo(
    () => vistorias.flatMap((v) => v.fotos),
    [vistorias]
  );

  const [photoDraft, setPhotoDraft] = useState<SimulatedPhotoDraft | null>(null);
  const [escolherOrigemVisible, setEscolherOrigemVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [relacionarFluxoVisible, setRelacionarFluxoVisible] = useState(false);
  const [classificarVisible, setClassificarVisible] = useState(false);
  const [editingOcorrenciaNum, setEditingOcorrenciaNum] = useState<number | null>(null);
  const [editingTarget, setEditingTarget] = useState<FotoOcorrenciaAlvo>("principal");
  const [ocorrenciaSelecionadaNum, setOcorrenciaSelecionadaNum] = useState<
    number | null
  >(null);
  const [finalizarVisible, setFinalizarVisible] = useState(false);

  const theme = getConcessionTheme(
    vistoriaAtiva?.tipoRelatorio ?? tipoRelatorio,
    vistoriaAtiva?.categoriaRelatorio ?? categoriaRelatorio
  );

  const effectiveStep: 1 | 2 | 3 =
    wizardStep === "modalidade" || (!vistoriaAtiva && wizardStep === "coleta")
      ? 1
      : wizardStep === "dados_iniciais"
      ? 2
      : 3;

  const stepKey =
    effectiveStep === 1
      ? "step-1-modalidade"
      : effectiveStep === 2
      ? "step-2-dados"
      : `step-3-coleta-${vistoriaAtiva?.id ?? ""}`;

  const temOcorrenciaElegivel = useMemo(
    () =>
      Boolean(
        vistoriaAtiva?.ocorrencias.some((oc) => podeRelacionarOcorrencia(oc))
      ),
    [vistoriaAtiva]
  );

  const gerarDraftFoto = () => {
    const seq = (vistoriaAtiva?.fotos.length ?? 0) + 1;
    const horario = new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setPhotoDraft({
      nomeArquivo: `FOTO_${String(seq).padStart(3, "0")}.jpg`,
      horario,
      tamanhoKb: 182 + (seq % 5) * 11,
    });
    setPreviewVisible(true);
  };

  const handleConfirmarFoto = () => {
    setPreviewVisible(false);
    setClassificarVisible(true);
  };

  const handleAbrirRelacionarDaFoto = () => {
    setPreviewVisible(false);
    setRelacionarFluxoVisible(true);
  };

  const handleSalvarOcorrenciaComFoto = (
    novaOc: Omit<OcorrenciaEntity, "numero" | "idFiscalizacao">
  ) => {
    if (!vistoriaAtiva) return;
    if (editingOcorrenciaNum !== null) {
      atualizarOcorrencia(vistoriaAtiva.id, editingOcorrenciaNum, novaOc);
      setClassificarVisible(false);
      setEditingOcorrenciaNum(null);
      toast.success("Ocorrência atualizada", "As alterações foram salvas.");
      return;
    }
    const proximoNumero = vistoriaAtiva.ocorrencias.length + 1;
    const fotoCriada = simularCapturaFoto(vistoriaAtiva.id, proximoNumero);
    adicionarOcorrencia(vistoriaAtiva.id, {
      ...novaOc,
      fotoAtualNome: photoDraft?.nomeArquivo || fotoCriada.nomeArquivo,
    });
    vincularFotoUltimaOcorrencia(vistoriaAtiva.id, fotoCriada.id, proximoNumero);
    setClassificarVisible(false);
    setPhotoDraft(null);
    toast.success(
      `Ocorrência #${String(proximoNumero).padStart(2, "0")} salva`,
      `${novaOc.tipoAchado} vinculada à foto ${photoDraft?.nomeArquivo || fotoCriada.nomeArquivo}`
    );
  };

  const ocorrenciaEmEdicao = useMemo(
    () =>
      vistoriaAtiva?.ocorrencias.find(
        (o) => o.numero === editingOcorrenciaNum
      ) ?? null,
    [vistoriaAtiva, editingOcorrenciaNum]
  );

  const ocorrenciaSelecionada = useMemo(
    () =>
      vistoriaAtiva?.ocorrencias.find(
        (o) => o.numero === ocorrenciaSelecionadaNum
      ) ?? null,
    [vistoriaAtiva, ocorrenciaSelecionadaNum]
  );

  const renderStepContent = () => {
    if (effectiveStep === 1) {
      return (
        <StepModalidade
          tipoRelatorio={tipoRelatorio}
          categoriaRelatorio={categoriaRelatorio}
          onSelectModalidade={(tipo, cat) => {
            // Se o usuário trocou de modalidade em relação à sessão ativa, preserva a anterior em Vistorias
            if (
              vistoriaAtiva &&
              (vistoriaAtiva.tipoRelatorio !== tipo ||
                vistoriaAtiva.categoriaRelatorio !== cat)
            ) {
              iniciarNovoRelatorioWizard();
            }
            setModalidade(tipo, cat);
          }}
          onAvancar={() => setWizardStep("dados_iniciais")}
        />
      );
    }

    if (effectiveStep === 2) {
      const editandoMesmaSessao =
        vistoriaAtiva &&
        vistoriaAtiva.tipoRelatorio === tipoRelatorio &&
        vistoriaAtiva.categoriaRelatorio === categoriaRelatorio
          ? vistoriaAtiva
          : undefined;

      return (
        <StepDadosIniciais
          tipoRelatorio={tipoRelatorio}
          categoriaRelatorio={categoriaRelatorio}
          initialFiscalizacao={editandoMesmaSessao?.fiscalizacao}
          onVoltar={() => setWizardStep("modalidade")}
          onConfirmarDados={({
            local,
            cidade,
            data,
            periodo,
            hora,
            equipe,
            coordenador,
          }) => {
            if (editandoMesmaSessao) {
              atualizarDadosVistoria(editandoMesmaSessao.id, {
                local,
                cidade,
                data,
                periodo,
                hora,
                equipe,
                coordenador,
              });
              toast.success(
                "Dados da sessão atualizados",
                "Suas ocorrências e fotos foram preservadas."
              );
            } else {
              criarVistoria({
                idFiscalizacao: "",
                local,
                cidade,
                data,
                periodo,
                hora,
                equipe,
                coordenador,
              });
              toast.success(
                `Sessão ${tipoRelatorio} · ${categoriaRelatorio} criada`,
                "Salva em aberto no dispositivo."
              );
            }
          }}
        />
      );
    }

    if (!vistoriaAtiva) return null;
    const cfg = CONCESSION_CONFIG[vistoriaAtiva.tipoRelatorio];

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.coletaContent}
        showsVerticalScrollIndicator={false}
      >
        <FadeSlideView delay={0} distance={6} style={styles.topCompactHeader}>
          <View style={styles.topTitleRow}>
            <Pressable
              onPress={() => setWizardStep("dados_iniciais")}
              style={styles.newSessionLink}
            >
              <ArrowLeft size={15} color={ARPE_COLORS.textSecondary} />
              <Text style={styles.newSessionLinkText}>Voltar</Text>
            </Pressable>

            <View
              style={[
                styles.modalityPill,
                {
                  backgroundColor: theme.primarySoft,
                  borderColor: theme.primaryBorder,
                },
              ]}
            >
              <Text style={[styles.modalityPillText, { color: theme.primary }]}>
                {vistoriaAtiva.tipoRelatorio} · {vistoriaAtiva.categoriaRelatorio}
              </Text>
            </View>

            <Pressable
              onPress={iniciarNovoRelatorioWizard}
              style={styles.newSessionLink}
            >
              <RotateCcw size={13} color={ARPE_COLORS.textSecondary} />
              <Text style={styles.newSessionLinkText}>Novo</Text>
            </Pressable>
          </View>

          <Text style={styles.localTitle} numberOfLines={2}>
            {vistoriaAtiva.fiscalizacao.cidade || vistoriaAtiva.fiscalizacao.local}
          </Text>

          <View style={styles.miniMetricsRow}>
            <View style={styles.miniMetricBadge}>
              <AnimatedValueText
                valueKey={`oc-${vistoriaAtiva.ocorrencias.length}`}
                style={styles.miniMetricValue}
              >
                {`${vistoriaAtiva.ocorrencias.length} ocorrências`}
              </AnimatedValueText>
            </View>
            <View style={styles.miniMetricBadge}>
              <AnimatedValueText
                valueKey={`ft-${vistoriaAtiva.fotos.length}`}
                style={styles.miniMetricValue}
              >
                {`${vistoriaAtiva.fotos.length} fotos`}
              </AnimatedValueText>
            </View>
          </View>
        </FadeSlideView>

        {/* Ações de foto: Tirar foto comprobatória + Escolher foto já tirada */}
        <FadeSlideView delay={35} distance={8} style={styles.photoActionsStack}>
          <AnimatedScalePressable
            onPress={gerarDraftFoto}
            style={[
              styles.captureCard,
              {
                borderColor: theme.primary,
                backgroundColor: theme.primarySoft,
              },
            ]}
          >
            <View style={[styles.cameraCircle, { backgroundColor: theme.primary }]}>
              <Camera size={24} color={ARPE_COLORS.white} />
            </View>
            <View style={styles.captureTextWrap}>
              <Text style={[styles.captureTitle, { color: theme.primary }]}>
                Tirar foto comprobatória
              </Text>
              <Text style={styles.captureSubtitle}>
                Capturar agora (simulado), conferir e registrar NC/PA ou relacionar
              </Text>
            </View>
          </AnimatedScalePressable>

          <AnimatedScalePressable
            onPress={() => setEscolherOrigemVisible(true)}
            style={styles.pickExistingBtn}
          >
            <Images size={17} color={theme.primary} />
            <Text style={[styles.pickExistingText, { color: theme.primary }]}>
              Escolher foto já tirada (celular ou galeria do app)
            </Text>
          </AnimatedScalePressable>
        </FadeSlideView>

        {/* Lista de Ocorrências com Miniaturas Simuladas */}
        <FadeSlideView delay={70} distance={8} style={styles.listSection}>
          <Text style={styles.sectionLabel}>
            OCORRÊNCIAS REGISTRADAS ({vistoriaAtiva.ocorrencias.length})
          </Text>

          {vistoriaAtiva.ocorrencias.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                Nenhuma ocorrência ainda. Tire ou escolha uma foto acima para adicionar o primeiro registro.
              </Text>
            </View>
          ) : (
            <View style={styles.cardsList}>
              {vistoriaAtiva.ocorrencias.map((oc) => (
                <FadeSlideView
                  key={`${vistoriaAtiva.id}-oc-${oc.numero}`}
                  distance={6}
                  duration={190}
                >
                  <AnimatedScalePressable
                    onPress={() => setOcorrenciaSelecionadaNum(oc.numero)}
                    style={styles.ocorrenciaCard}
                  >
                    <SimulatedPhotoThumb
                      nomeArquivo={oc.fotoAtualNome}
                      accentColor={theme.primary}
                      accentSoft={theme.primarySoft}
                      size={56}
                      badgeText={oc.relacionamento ? "2x" : undefined}
                    />

                    <View style={styles.ocMain}>
                      <View style={styles.ocBadgesRow}>
                        <View
                          style={[
                            styles.siglaTag,
                            {
                              backgroundColor:
                                oc.tipoAchado === "NC" ? "#fee2e2" : "#fef3c7",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.siglaTagText,
                              {
                                color:
                                  oc.tipoAchado === "NC" ? "#b91c1c" : "#b45309",
                              },
                            ]}
                          >
                            #{String(oc.numero).padStart(2, "0")} · {oc.tipoAchado}
                          </Text>
                        </View>

                        {oc.relacionamento && (
                          <View style={styles.relatedTag}>
                            <Link2 size={11} color={theme.primary} />
                            <Text
                              style={[
                                styles.relatedTagText,
                                { color: theme.primary },
                              ]}
                            >
                              Relacionado ({oc.relacionamento.sigla})
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.ocDesc} numberOfLines={2}>
                        {oc.descricao}
                      </Text>

                      <Text style={styles.ocMeta}>
                        {cfg.exibePistaFaixa
                          ? `${oc.pista ?? "-"}${oc.direcaoFaixa ? ` · ${oc.direcaoFaixa}` : ""}`
                          : oc.terminal ?? "-"}
                        {oc.fotoAtualNome ? ` · ${oc.fotoAtualNome}` : ""}
                      </Text>
                    </View>

                    <ChevronRight size={18} color={ARPE_COLORS.textMuted} />
                  </AnimatedScalePressable>
                </FadeSlideView>
              ))}
            </View>
          )}
        </FadeSlideView>

        <FadeSlideView delay={105} distance={8} style={styles.footerBlock}>
          <AnimatedScalePressable
            onPress={() => setFinalizarVisible(true)}
            style={[styles.finishBtn, { backgroundColor: ARPE_COLORS.navy }]}
          >
            <CheckCircle2 size={19} color={ARPE_COLORS.white} />
            <Text style={styles.finishBtnText}>Finalizar Relatório</Text>
          </AnimatedScalePressable>
        </FadeSlideView>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <WizardProgressBar
        currentStep={effectiveStep}
        accentColor={theme.primary}
      />

      <DirectionalTransition
        stepKey={stepKey}
        stepIndex={effectiveStep}
        distance={24}
        duration={230}
        style={styles.safeArea}
      >
        {renderStepContent()}
      </DirectionalTransition>

      {vistoriaAtiva && (
        <>
          <EscolherFotoOrigemModal
            visible={escolherOrigemVisible}
            fotosGaleriaApp={todasFotosApp}
            accentColor={theme.primary}
            accentSoft={theme.primarySoft}
            onClose={() => setEscolherOrigemVisible(false)}
            onSelectPhoto={(draft) => {
              setEscolherOrigemVisible(false);
              setPhotoDraft(draft);
              setPreviewVisible(true);
              toast.info("Foto selecionada", draft.nomeArquivo);
            }}
          />

          <FotoPreviewModal
            visible={previewVisible}
            photoDraft={photoDraft}
            accentColor={theme.primary}
            temOcorrenciaElegivel={temOcorrenciaElegivel}
            onRefazer={gerarDraftFoto}
            onRelacionar={handleAbrirRelacionarDaFoto}
            onConfirmar={handleConfirmarFoto}
            onClose={() => setPreviewVisible(false)}
          />

          <RelacionarFotoFluxoModal
            visible={relacionarFluxoVisible}
            photoDraft={photoDraft}
            ocorrencias={vistoriaAtiva.ocorrencias}
            tipoRelatorio={vistoriaAtiva.tipoRelatorio}
            accentColor={theme.primary}
            accentSoft={theme.primarySoft}
            onClose={() => setRelacionarFluxoVisible(false)}
            onConfirmarRelacao={(params) =>
              relacionarOcorrencia({
                vistoriaId: vistoriaAtiva.id,
                ...params,
              })
            }
          />

          <ClassificarOcorrenciaModal
            visible={classificarVisible}
            tipoRelatorio={vistoriaAtiva.tipoRelatorio}
            categoriaRelatorio={vistoriaAtiva.categoriaRelatorio}
            localSessao={vistoriaAtiva.fiscalizacao.local}
            proximoSequencial={vistoriaAtiva.ocorrencias.length + 1}
            photoDraft={editingOcorrenciaNum !== null ? null : photoDraft}
            editingOcorrencia={ocorrenciaEmEdicao}
            editingTarget={editingTarget}
            accentColor={theme.primary}
            onClose={() => {
              setClassificarVisible(false);
              setEditingOcorrenciaNum(null);
            }}
            onSalvar={handleSalvarOcorrenciaComFoto}
            onSalvarEdicaoRelacionada={(params) => {
              if (editingOcorrenciaNum === null) return;
              atualizarRelacionamentoOcorrencia({
                vistoriaId: vistoriaAtiva.id,
                ocorrenciaNumero: editingOcorrenciaNum,
                ...params,
              });
              setClassificarVisible(false);
              setEditingOcorrenciaNum(null);
              toast.success(
                "Ocorrência atualizada",
                "Fundamento e determinação sincronizados para ambas as fotos."
              );
            }}
          />

          <OcorrenciaDetalheRelacaoModal
            visible={ocorrenciaSelecionada !== null}
            ocorrencia={ocorrenciaSelecionada}
            tipoRelatorio={vistoriaAtiva.tipoRelatorio}
            accentColor={theme.primary}
            accentSoft={theme.primarySoft}
            onClose={() => setOcorrenciaSelecionadaNum(null)}
            onEditar={(alvo) => {
              if (!ocorrenciaSelecionada) return;
              const num = ocorrenciaSelecionada.numero;
              setOcorrenciaSelecionadaNum(null);
              setEditingOcorrenciaNum(num);
              setEditingTarget(alvo);
              setClassificarVisible(true);
            }}
            onRemoverFoto={(alvo) => {
              if (!ocorrenciaSelecionada) return;
              const res = removerFotoOcorrencia(
                vistoriaAtiva.id,
                ocorrenciaSelecionada.numero,
                alvo
              );
              if (res === "ocorrencia_excluida") {
                setOcorrenciaSelecionadaNum(null);
              }
              toast.success(
                "Foto removida",
                "A foto continua preservada na Galeria Local."
              );
            }}
            onExcluirOcorrencia={() => {
              if (!ocorrenciaSelecionada) return;
              excluirOcorrencia(vistoriaAtiva.id, ocorrenciaSelecionada.numero);
              setOcorrenciaSelecionadaNum(null);
              toast.success(
                "Ocorrência excluída",
                "As fotos permanecem seguras na Galeria Local."
              );
            }}
          />

          <FinalizarRelatorioModal
            visible={finalizarVisible}
            sugestaoId={vistoriaAtiva.fiscalizacao.idFiscalizacao}
            accentColor={theme.primary}
            onCancel={() => setFinalizarVisible(false)}
            onConfirmarFinalizacao={(nomeId) => {
              setFinalizarVisible(false);
              finalizarVistoria(vistoriaAtiva.id, nomeId);
              toast.success(
                `Relatório ${nomeId} finalizado`,
                "Movido para a aba Finalizados."
              );
              onFinalizadoSuccess?.();
            }}
          />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ARPE_COLORS.surface,
  },
  container: {
    flex: 1,
    backgroundColor: ARPE_COLORS.surface,
  },
  coletaContent: {
    padding: SPACING.xl,
    paddingBottom: 40,
    gap: SPACING.xl,
  },
  topCompactHeader: {
    gap: 8,
  },
  topTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalityPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADII.pill,
    borderWidth: 1,
  },
  modalityPillText: {
    fontSize: 11.5,
    fontWeight: "800",
  },
  newSessionLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
  },
  newSessionLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: ARPE_COLORS.textSecondary,
  },
  localTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
  },
  miniMetricsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: 2,
  },
  miniMetricBadge: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
  },
  miniMetricValue: {
    fontSize: 12,
    fontWeight: "700",
    color: ARPE_COLORS.textPrimary,
  },
  photoActionsStack: {
    gap: SPACING.sm,
  },
  captureCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    borderRadius: RADII.xl,
    borderWidth: 1.5,
    gap: SPACING.md,
  },
  cameraCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  captureTextWrap: {
    flex: 1,
    gap: 3,
  },
  captureTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  captureSubtitle: {
    fontSize: 12.5,
    lineHeight: 17,
    color: ARPE_COLORS.textSecondary,
  },
  pickExistingBtn: {
    minHeight: TOUCH_TARGET_MIN,
    borderRadius: RADII.md,
    borderWidth: 1.2,
    borderColor: ARPE_COLORS.borderStrong,
    backgroundColor: ARPE_COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: SPACING.md,
  },
  pickExistingText: {
    fontSize: 13,
    fontWeight: "700",
  },
  listSection: {
    gap: SPACING.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    color: ARPE_COLORS.textSecondary,
  },
  emptyBox: {
    padding: SPACING.lg,
    borderRadius: RADII.lg,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: ARPE_COLORS.textSecondary,
  },
  cardsList: {
    gap: SPACING.sm,
  },
  ocorrenciaCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.sm + 2,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    backgroundColor: ARPE_COLORS.white,
    gap: SPACING.md,
  },
  ocMain: {
    flex: 1,
    gap: 5,
  },
  ocBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  siglaTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.sm,
  },
  siglaTagText: {
    fontSize: 11,
    fontWeight: "800",
  },
  relatedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.surfaceMuted,
  },
  relatedTagText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  ocDesc: {
    fontSize: 14,
    fontWeight: "700",
    color: ARPE_COLORS.textPrimary,
  },
  ocMeta: {
    fontSize: 12,
    color: ARPE_COLORS.textSecondary,
  },
  footerBlock: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: ARPE_COLORS.border,
  },
  finishBtn: {
    minHeight: TOUCH_TARGET_MIN + 8,
    borderRadius: RADII.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  finishBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
});
