import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Camera, Pencil, Trash2, X } from "lucide-react-native";
import { CONCESSION_CONFIG } from "../../../domain/config/concessionConfig";
import {
  FotoMidiaEntity,
  OcorrenciaEntity,
  TipoRelatorio,
} from "../../../domain/entities/types";
import { FotoOcorrenciaAlvo } from "../../../domain/rules/domainRules";
import {
  ehUriFotoReal,
  resolverUriPorNomeArquivo,
} from "../../../domain/rules/watermarkRules";
import { ARPE_COLORS } from "../../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../../theme/tokens";
import {
  AnimatedModalBox,
  AnimatedScalePressable,
  FadeSlideView,
} from "../common/MotionPrimitives";
import { ConfirmarExclusaoModal } from "../vistoria/ConfirmarExclusaoModal";

interface OcorrenciaDetalheRelacaoModalProps {
  readonly visible: boolean;
  readonly ocorrencia: OcorrenciaEntity | null;
  readonly fotosVistoria?: readonly FotoMidiaEntity[];
  readonly tipoRelatorio: TipoRelatorio;
  readonly accentColor: string;
  readonly accentSoft: string;
  readonly onClose: () => void;
  readonly onEditar: (alvo: FotoOcorrenciaAlvo) => void;
  readonly onRemoverFoto: (alvo: FotoOcorrenciaAlvo) => void;
  readonly onExcluirOcorrencia: () => void;
}

interface PhotoSlideItem {
  readonly alvo: FotoOcorrenciaAlvo;
  readonly label: string;
  readonly nomeArquivo: string;
  readonly localUri?: string;
}

export const OcorrenciaDetalheRelacaoModal: React.FC<
  OcorrenciaDetalheRelacaoModalProps
> = ({
  visible,
  ocorrencia,
  fotosVistoria = [],
  tipoRelatorio,
  accentColor,
  accentSoft,
  onClose,
  onEditar,
  onRemoverFoto,
  onExcluirOcorrencia,
}) => {
  const [slideWidth, setSlideWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [confirmKind, setConfirmKind] = useState<
    null | "ocorrencia" | FotoOcorrenciaAlvo
  >(null);

  useEffect(() => {
    if (visible) {
      setActiveIndex(0);
      setConfirmKind(null);
    }
  }, [visible, ocorrencia?.numero, ocorrencia?.relacionamento]);

  const cfg = CONCESSION_CONFIG[tipoRelatorio];
  const slides: PhotoSlideItem[] = ocorrencia
    ? [
        {
          alvo: "principal",
          label: ocorrencia.relacionamento ? "Foto 1" : "Foto",
          nomeArquivo: ocorrencia.fotoAtualNome || "Foto 1",
          localUri: resolverUriPorNomeArquivo(
            fotosVistoria,
            ocorrencia.fotoAtualNome
          ),
        },
        ...(ocorrencia.relacionamento
          ? [
              {
                alvo: "relacionada" as const,
                label: "Foto 2",
                nomeArquivo:
                  ocorrencia.relacionamento.fotoRelacionadaNome || "Foto 2",
                localUri: resolverUriPorNomeArquivo(
                  fotosVistoria,
                  ocorrencia.relacionamento.fotoRelacionadaNome
                ),
              },
            ]
          : []),
      ]
    : [];

  const safeIdx = Math.min(activeIndex, Math.max(0, slides.length - 1));
  const activeAlvo: FotoOcorrenciaAlvo = slides[safeIdx]?.alvo ?? "principal";
  const temRelacao = Boolean(ocorrencia?.relacionamento);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (slideWidth <= 0) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
    if (next >= 0 && next < slides.length && next !== activeIndex) {
      setActiveIndex(next);
    }
  };

  const handleConfirmDelete = () => {
    const kind = confirmKind;
    setConfirmKind(null);
    if (kind === "ocorrencia") {
      onExcluirOcorrencia();
    } else if (kind === "principal" || kind === "relacionada") {
      onRemoverFoto(kind);
    }
  };

  return (
    <>
      <AnimatedModalBox
        visible={visible && ocorrencia !== null}
        variant="center"
        cardStyle={styles.card}
        onClose={onClose}
      >
        {ocorrencia && (
          <>
            <View style={styles.topRow}>
              <View style={styles.titleWrap}>
                <Text style={styles.kicker}>
                  OCORRÊNCIA #{String(ocorrencia.numero).padStart(2, "0")} ·{" "}
                  {activeAlvo === "relacionada" && ocorrencia.relacionamento
                    ? ocorrencia.relacionamento.sigla
                    : ocorrencia.tipoAchado}
                </Text>
                <Text style={styles.title} numberOfLines={2}>
                  {ocorrencia.descricao}
                </Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <X size={19} color={ARPE_COLORS.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Carrossel amplo de visualização (deslize para ver a foto relacionada) */}
              <View
                style={styles.carouselBox}
                onLayout={(e) => setSlideWidth(e.nativeEvent.layout.width)}
              >
                {slideWidth > 0 && (
                  <FlatList
                    data={slides}
                    keyExtractor={(item) => item.alvo}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    onMomentumScrollEnd={handleScroll}
                    renderItem={({ item, index }) => {
                      const temFotoReal = ehUriFotoReal(item.localUri);
                      return (
                        <View
                          style={[
                            styles.photoSlide,
                            {
                              width: slideWidth,
                              backgroundColor: temFotoReal
                                ? "#0f172a"
                                : accentSoft,
                              borderColor: accentColor,
                            },
                          ]}
                        >
                          {temFotoReal && (
                            <Image
                              source={{ uri: item.localUri }}
                              style={StyleSheet.absoluteFill}
                              resizeMode="contain"
                            />
                          )}

                          <View style={styles.slideHeader}>
                            <View
                              style={[
                                styles.slideBadge,
                                { backgroundColor: accentColor },
                              ]}
                            >
                              <Text style={styles.slideBadgeText}>
                                {item.label}
                              </Text>
                            </View>
                            {slides.length > 1 && (
                              <Text
                                style={[
                                  styles.slideCounter,
                                  {
                                    color: temFotoReal
                                      ? ARPE_COLORS.white
                                      : accentColor,
                                  },
                                ]}
                              >
                                {index + 1} / {slides.length}
                              </Text>
                            )}
                          </View>

                          {!temFotoReal && (
                            <>
                              <Camera
                                size={48}
                                color={accentColor}
                                strokeWidth={1.6}
                              />
                              <Text
                                style={[styles.slideFile, { color: accentColor }]}
                                numberOfLines={1}
                              >
                                {item.nomeArquivo}
                              </Text>
                            </>
                          )}

                          {temRelacao && (
                            <AnimatedScalePressable
                              onPress={() => setConfirmKind(item.alvo)}
                              style={styles.removePhotoLink}
                            >
                              <Trash2 size={12.5} color={ARPE_COLORS.danger} />
                              <Text style={styles.removePhotoText}>
                                Remover esta foto
                              </Text>
                            </AnimatedScalePressable>
                          )}
                        </View>
                      );
                    }}
                  />
                )}

                {slides.length > 1 && (
                  <View style={styles.dotsRow}>
                    {slides.map((s, idx) => (
                      <View
                        key={s.alvo}
                        style={[
                          styles.dot,
                          idx === safeIdx && {
                            backgroundColor: accentColor,
                            width: 16,
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>

              {/* Resumo dinâmico conforme o slide ativo */}
              <FadeSlideView
                animKey={`${ocorrencia.numero}-${activeAlvo}`}
                distance={5}
                duration={160}
                style={styles.summaryBox}
              >
                {activeAlvo === "principal" ? (
                  <>
                    {cfg.exibePistaFaixa ? (
                      <Text style={styles.summaryLine}>
                        Pista: {ocorrencia.pista ?? "-"}
                        {ocorrencia.direcaoFaixa
                          ? ` · ${ocorrencia.direcaoFaixa}`
                          : ""}
                        {ocorrencia.trecho ? ` · ${ocorrencia.trecho}` : ""}
                      </Text>
                    ) : (
                      <Text style={styles.summaryLine}>
                        Terminal: {ocorrencia.terminal ?? "-"}
                      </Text>
                    )}
                    {ocorrencia.codificacao && (
                      <Text style={styles.summaryLine}>
                        Codificação: {ocorrencia.codificacao}
                      </Text>
                    )}
                  </>
                ) : (
                  ocorrencia.relacionamento && (
                    <>
                      {ocorrencia.relacionamento.faixa && (
                        <Text style={styles.summaryLine}>
                          Faixa: {ocorrencia.relacionamento.faixa}
                        </Text>
                      )}
                      {ocorrencia.relacionamento.setorPredial && (
                        <Text style={styles.summaryLine}>
                          Setor: {ocorrencia.relacionamento.setorPredial}
                        </Text>
                      )}
                      {ocorrencia.relacionamento.siglas && (
                        <Text style={styles.summaryLine}>
                          Siglas: {ocorrencia.relacionamento.siglas.join(", ")}
                        </Text>
                      )}
                      {ocorrencia.relacionamento.codificacao && (
                        <Text style={styles.summaryLine}>
                          Codificação: {ocorrencia.relacionamento.codificacao}
                        </Text>
                      )}
                    </>
                  )
                )}

                {ocorrencia.analiseArpe !== "" && (
                  <Text style={styles.summaryLine}>
                    Fundamento: {ocorrencia.analiseArpe}
                  </Text>
                )}
                {ocorrencia.determinacaoOuInfo !== "" && (
                  <Text style={styles.summaryLine}>
                    Determinação / Info: {ocorrencia.determinacaoOuInfo}
                  </Text>
                )}
              </FadeSlideView>
            </ScrollView>

            {/* Ações: Editar registro atual ou Excluir ocorrência inteira */}
            <View style={styles.actionsRow}>
              <View style={styles.editCol}>
                <AnimatedScalePressable
                  onPress={() => onEditar(activeAlvo)}
                  style={[styles.editBtn, { backgroundColor: accentColor }]}
                >
                  <Pencil size={15} color={ARPE_COLORS.white} />
                  <Text style={styles.editBtnText}>Editar</Text>
                </AnimatedScalePressable>
              </View>

              <AnimatedScalePressable
                onPress={() => setConfirmKind("ocorrencia")}
                style={styles.deleteBtn}
                accessibilityRole="button"
                accessibilityLabel="Excluir ocorrência inteira"
              >
                <Trash2 size={17} color={ARPE_COLORS.danger} />
              </AnimatedScalePressable>
            </View>
          </>
        )}
      </AnimatedModalBox>

      <ConfirmarExclusaoModal
        visible={confirmKind !== null}
        quantidade={1}
        entidadeSingular={
          confirmKind === "ocorrencia" ? "ocorrência" : "foto da ocorrência"
        }
        entidadePlural="itens"
        onCancel={() => setConfirmKind(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 430,
    maxHeight: "88%",
    backgroundColor: ARPE_COLORS.white,
    borderRadius: RADII.xl,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  titleWrap: { flex: 1, gap: 3 },
  kicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    color: ARPE_COLORS.textMuted,
  },
  title: { fontSize: 16.5, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollArea: { maxHeight: 420 },
  scrollContent: { gap: SPACING.md },
  carouselBox: { gap: SPACING.xs },
  photoSlide: {
    height: 204,
    borderRadius: RADII.lg,
    borderWidth: 1.5,
    padding: SPACING.md,
    alignItems: "center",
    justifyContent: "space-between",
  },
  slideHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  slideBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADII.pill,
  },
  slideBadgeText: { fontSize: 10.5, fontWeight: "800", color: ARPE_COLORS.white },
  slideCounter: { fontSize: 11.5, fontWeight: "800" },
  slideFile: { fontSize: 13, fontWeight: "800" },
  removePhotoLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.white,
  },
  removePhotoText: { fontSize: 11.5, fontWeight: "700", color: ARPE_COLORS.danger },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ARPE_COLORS.borderStrong,
  },
  summaryBox: {
    padding: SPACING.md,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    gap: 5,
  },
  summaryLine: { fontSize: 12.5, lineHeight: 18, color: ARPE_COLORS.textSecondary },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  editCol: { flex: 1 },
  editBtn: {
    minHeight: TOUCH_TARGET_MIN + 2,
    borderRadius: RADII.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  editBtnText: { fontSize: 14, fontWeight: "800", color: ARPE_COLORS.white },
  deleteBtn: {
    width: TOUCH_TARGET_MIN + 4,
    height: TOUCH_TARGET_MIN + 2,
    borderRadius: RADII.md,
    backgroundColor: ARPE_COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: ARPE_COLORS.dangerBorder,
    alignItems: "center",
    justifyContent: "center",
  },
});
