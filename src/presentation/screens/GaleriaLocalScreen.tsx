import React, { useMemo, useRef, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CheckCheck,
  CheckSquare,
  FolderOpen,
  Images,
  Share2,
  Trash2,
  X,
} from "lucide-react-native";
import { GaleriaFotoEntity } from "../../domain/entities/types";
import {
  alternarSelecaoIds,
  extrairSessoesUnicasGaleria,
  FILTRO_GALERIA_SEM_VISTORIA,
  filtrarFotosGaleriaPorSessao,
} from "../../domain/rules/domainRules";
import { useMobileStore } from "../../application/store/useMobileStore";
import { toast } from "../../application/store/useToastStore";
import { mediaService } from "../../infrastructure/media/mediaService";
import { ARPE_COLORS, getConcessionTheme } from "../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../theme/tokens";
import {
  AnchoredPopover,
  AnchorRect,
  AnimatedCheckBadge,
  AnimatedChevron,
  AnimatedScalePressable,
  AnimatedValueText,
  FadeSlideView,
} from "../components/common/MotionPrimitives";
import { ConfirmarExclusaoModal } from "../components/vistoria/ConfirmarExclusaoModal";
import { GaleriaFotoViewerModal } from "../components/galeria/GaleriaFotoViewerModal";
import { GaleriaPhotoTile } from "../components/galeria/GaleriaPhotoTile";

export const GaleriaLocalScreen: React.FC = () => {
  const vistorias = useMobileStore((s) => s.vistorias);
  const galeriaFotos = useMobileStore((s) => s.galeriaFotos);
  const tipoRelatorio = useMobileStore((s) => s.tipoRelatorio);
  const categoriaRelatorio = useMobileStore((s) => s.categoriaRelatorio);
  const excluirFotosGaleria = useMobileStore((s) => s.excluirFotosGaleria);

  const [sessoesFiltro, setSessoesFiltro] = useState<readonly string[]>([]);
  const [popoverAnchor, setPopoverAnchor] = useState<AnchorRect | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [viewerFotoId, setViewerFotoId] = useState<string | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<readonly string[]>(
    []
  );

  const filterBtnRef = useRef<View>(null);
  const theme = getConcessionTheme(tipoRelatorio, categoriaRelatorio);

  const { sessoes, totalSemVistoria } = useMemo(
    () =>
      extrairSessoesUnicasGaleria(
        galeriaFotos,
        vistorias.map((v) => v.id)
      ),
    [galeriaFotos, vistorias]
  );
  const fotosFiltradas = useMemo(
    () => filtrarFotosGaleriaPorSessao(galeriaFotos, sessoesFiltro),
    [galeriaFotos, sessoesFiltro]
  );
  const labelSessaoFiltro =
    sessoesFiltro.length === 0
      ? "Sessão"
      : sessoesFiltro.length === 1
        ? sessoesFiltro[0] === FILTRO_GALERIA_SEM_VISTORIA
          ? "Sem vistoria"
          : sessoesFiltro[0]
        : `Sessões (${sessoesFiltro.length})`;
  const todasSelecionadas =
    fotosFiltradas.length > 0 &&
    fotosFiltradas.every((f) => selectedIds.includes(f.id));

  const handleToggleSelecionarTudo = () => {
    if (todasSelecionadas) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(fotosFiltradas.map((f) => f.id));
  };

  const sairSelecao = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const abrirFiltroSessao = () => {
    filterBtnRef.current?.measureInWindow((x, y, width, height) => {
      setPopoverAnchor({ x, y, width: Math.max(width, 240), height });
      setPopoverOpen(true);
    });
  };

  const handleTapFoto = (foto: GaleriaFotoEntity) => {
    if (selectionMode) {
      const next = alternarSelecaoIds(selectedIds, foto.id);
      setSelectedIds(next);
      if (next.length === 0) setSelectionMode(false);
      return;
    }
    setViewerFotoId(foto.id);
  };

  const handleLongPressFoto = (foto: GaleriaFotoEntity) => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectedIds([foto.id]);
      return;
    }
    setSelectedIds((prev) => alternarSelecaoIds(prev, foto.id));
  };

  const handleCompartilhar = async (fotos: readonly GaleriaFotoEntity[]) => {
    if (fotos.length === 0) return;
    try {
      const res = await mediaService.compartilharFotos(fotos);
      if (res.mode === "no_real_file") {
        toast.info(
          "Foto sem arquivo físico",
          "Registros de exemplo não possuem arquivo JPEG real para envio."
        );
        return;
      }
      if (res.mode === "native_multiple") {
        toast.success(
          `${res.sharedCount} fotos enviadas`,
          "Compartilhadas diretamente como imagens JPEG (sem ZIP)."
        );
        return;
      }
      if (res.mode === "native_sequential") {
        toast.info(
          `${res.sharedCount} fotos compartilhadas`,
          "No Expo Go as imagens são enviadas uma a uma; no APK vão juntas."
        );
        return;
      }
      if (res.mode === "fallback_text") {
        toast.success(
          `Pacote pronto (${res.sharedCount} ${res.sharedCount === 1 ? "foto" : "fotos"})`,
          "Compartilhamento nativo indisponível neste navegador."
        );
      }
    } catch {
      toast.error(
        "Falha ao compartilhar",
        "Não foi possível abrir o compartilhamento da imagem."
      );
    }
  };

  const handleConfirmarExclusao = () => {
    const total = pendingDeleteIds.length;
    if (total === 0) return;

    excluirFotosGaleria(pendingDeleteIds);
    setPendingDeleteIds([]);
    setViewerFotoId(null);
    sairSelecao();
    toast.success(
      total > 1 ? `${total} fotos apagadas` : "Foto apagada",
      "Removida definitivamente da pasta privada da galeria."
    );
  };

  const fotosParaCompartilhar = selectionMode
    ? fotosFiltradas.filter((f) => selectedIds.includes(f.id))
    : fotosFiltradas;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.kicker}>PASTA PRIVADA DO APP</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Galeria Local</Text>
            <View style={styles.countPill}>
              <AnimatedValueText
                inline
                valueKey={String(fotosFiltradas.length)}
                style={styles.countPillText}
              >
                {fotosFiltradas.length}
              </AnimatedValueText>
            </View>
          </View>
        </View>

        <FadeSlideView
          animKey={selectionMode ? "header-sel" : "header-norm"}
          distance={5}
          duration={160}
        >
          {selectionMode ? (
            <View style={styles.headerActions}>
              <AnimatedScalePressable
                onPress={handleToggleSelecionarTudo}
                style={styles.iconActionBtn}
                accessibilityRole="button"
                accessibilityLabel={
                  todasSelecionadas
                    ? "Desmarcar todas as fotos"
                    : "Selecionar todas as fotos"
                }
              >
                <CheckCheck
                  size={21}
                  color={todasSelecionadas ? theme.primary : ARPE_COLORS.white}
                />
              </AnimatedScalePressable>

              <AnimatedScalePressable
                onPress={sairSelecao}
                style={styles.iconActionBtn}
                accessibilityRole="button"
                accessibilityLabel="Cancelar seleção"
              >
                <X size={21} color={ARPE_COLORS.white} />
              </AnimatedScalePressable>
            </View>
          ) : (
            fotosFiltradas.length > 0 && (
              <AnimatedScalePressable
                onPress={() => {
                  setSelectionMode(true);
                  setSelectedIds([]);
                }}
                style={styles.selectBtn}
                accessibilityRole="button"
                accessibilityLabel="Selecionar fotos"
              >
                <CheckSquare size={15} color={ARPE_COLORS.white} />
                <Text style={styles.selectBtnText}>Selecionar</Text>
              </AnimatedScalePressable>
            )
          )}
        </FadeSlideView>
      </View>

      {galeriaFotos.length > 0 && (
        <View style={styles.toolbar}>
          <FadeSlideView
            animKey={selectionMode ? "bar-sel" : "bar-norm"}
            distance={5}
            duration={160}
            style={styles.slot}
          >
            {selectionMode ? (
              <AnimatedValueText
                valueKey={String(selectedIds.length)}
                style={styles.selCountText}
              >
                {selectedIds.length}{" "}
                {selectedIds.length === 1 ? "selecionada" : "selecionadas"}
              </AnimatedValueText>
            ) : (
              <View ref={filterBtnRef} collapsable={false}>
                <AnimatedScalePressable
                  onPress={abrirFiltroSessao}
                  style={[
                    styles.actionPill,
                    styles.fullWidth,
                    sessoesFiltro.length > 0 && {
                      backgroundColor: theme.primary,
                      borderColor: theme.primary,
                    },
                  ]}
                >
                  <FolderOpen
                    size={14}
                    color={
                      sessoesFiltro.length > 0
                        ? ARPE_COLORS.white
                        : ARPE_COLORS.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.actionPillText,
                      sessoesFiltro.length > 0 && styles.actionPillTextLight,
                    ]}
                    numberOfLines={1}
                  >
                    {labelSessaoFiltro}
                  </Text>
                  <AnimatedChevron
                    open={popoverOpen}
                    color={
                      sessoesFiltro.length > 0
                        ? ARPE_COLORS.white
                        : ARPE_COLORS.textMuted
                    }
                  />
                </AnimatedScalePressable>
              </View>
            )}
          </FadeSlideView>

          <View style={styles.toolbarIcons}>
            <AnimatedScalePressable
              onPress={() => {
                if (!selectionMode) {
                  setSelectionMode(true);
                  setSelectedIds([]);
                  return;
                }
                if (selectedIds.length > 0) {
                  handleCompartilhar(fotosParaCompartilhar);
                }
              }}
              disabled={selectionMode && selectedIds.length === 0}
              style={styles.iconActionBtn}
              accessibilityRole="button"
              accessibilityLabel="Compartilhar fotos"
            >
              <Share2
                size={20}
                color={
                  selectionMode && selectedIds.length > 0
                    ? ARPE_COLORS.textPrimary
                    : ARPE_COLORS.textMuted
                }
              />
            </AnimatedScalePressable>

            <AnimatedScalePressable
              onPress={() => {
                if (!selectionMode) {
                  setSelectionMode(true);
                  setSelectedIds([]);
                  return;
                }
                if (selectedIds.length > 0) {
                  setPendingDeleteIds([...selectedIds]);
                }
              }}
              disabled={selectionMode && selectedIds.length === 0}
              style={styles.iconActionBtn}
              accessibilityRole="button"
              accessibilityLabel="Apagar fotos"
            >
              <Trash2
                size={20}
                color={
                  selectionMode && selectedIds.length > 0
                    ? ARPE_COLORS.textPrimary
                    : ARPE_COLORS.textMuted
                }
              />
            </AnimatedScalePressable>
          </View>
        </View>
      )}

      <View style={styles.body}>
        <FlatList
          data={fotosFiltradas}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <FadeSlideView distance={12} duration={220} style={styles.emptyBox}>
              <Images size={28} color={ARPE_COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Nenhuma foto na galeria</Text>
              <Text style={styles.emptySub}>
                Toda foto capturada nas vistorias fica salva aqui em pasta
                privada, mesmo se a vistoria for apagada.
              </Text>
            </FadeSlideView>
          }
          renderItem={({ item, index }) => (
            <GaleriaPhotoTile
              foto={item}
              index={index}
              selectionMode={selectionMode}
              selected={selectedIds.includes(item.id)}
              selectionAccentColor={theme.primary}
              onPress={handleTapFoto}
              onLongPress={handleLongPressFoto}
            />
          )}
        />
      </View>

      <AnchoredPopover
        visible={popoverOpen}
        anchor={popoverAnchor}
        estimatedHeight={220}
        onClose={() => setPopoverOpen(false)}
      >
        <ScrollView style={styles.popList} showsVerticalScrollIndicator={false}>
          {sessoes.map((s) => {
            const active = sessoesFiltro.includes(s.idFiscalizacao);
            const sTheme = getConcessionTheme(
              s.tipoRelatorio,
              s.categoriaRelatorio
            );
            return (
              <AnimatedScalePressable
                key={s.idFiscalizacao}
                onPress={() =>
                  setSessoesFiltro((prev) =>
                    alternarSelecaoIds(prev, s.idFiscalizacao)
                  )
                }
                style={[styles.popItem, active && styles.popItemActive]}
              >
                <View
                  style={[styles.popDot, { backgroundColor: sTheme.primary }]}
                />
                <Text style={styles.popText} numberOfLines={1}>
                  {s.idFiscalizacao} ({s.totalFotos})
                </Text>
                <AnimatedCheckBadge
                  visible={active}
                  color={sTheme.primary}
                  size={15}
                />
              </AnimatedScalePressable>
            );
          })}

          {totalSemVistoria > 0 && (
            <AnimatedScalePressable
              onPress={() =>
                setSessoesFiltro((prev) =>
                  alternarSelecaoIds(prev, FILTRO_GALERIA_SEM_VISTORIA)
                )
              }
              style={[
                styles.popItem,
                sessoesFiltro.includes(FILTRO_GALERIA_SEM_VISTORIA) &&
                styles.popItemActive,
              ]}
            >
              <View
                style={[styles.popDot, { backgroundColor: ARPE_COLORS.textMuted }]}
              />
              <Text
                style={[styles.popText, { color: ARPE_COLORS.textSecondary }]}
                numberOfLines={1}
              >
                Fotos sem vistoria ({totalSemVistoria})
              </Text>
              <AnimatedCheckBadge
                visible={sessoesFiltro.includes(FILTRO_GALERIA_SEM_VISTORIA)}
                color={ARPE_COLORS.textSecondary}
                size={15}
              />
            </AnimatedScalePressable>
          )}
        </ScrollView>
      </AnchoredPopover>

      <GaleriaFotoViewerModal
        fotos={fotosFiltradas}
        initialFotoId={viewerFotoId}
        onClose={() => setViewerFotoId(null)}
        onShare={(f) => handleCompartilhar([f])}
        onRequestDelete={(f) => {
          setViewerFotoId(null);
          setPendingDeleteIds([f.id]);
        }}
      />

      <ConfirmarExclusaoModal
        visible={pendingDeleteIds.length > 0}
        quantidade={pendingDeleteIds.length}
        entidadeSingular="foto da galeria"
        entidadePlural="fotos da galeria"
        onCancel={() => setPendingDeleteIds([])}
        onConfirm={handleConfirmarExclusao}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: ARPE_COLORS.navy },
  header: {
    backgroundColor: ARPE_COLORS.navy,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  headerTextWrap: { flex: 1 },
  kicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    color: "rgba(255,255,255,0.62)",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginTop: 2 },
  title: { fontSize: 20, fontWeight: "800", color: ARPE_COLORS.white },
  countPill: {
    minWidth: 26,
    height: 24,
    borderRadius: RADII.pill,
    paddingHorizontal: SPACING.sm,
    backgroundColor: ARPE_COLORS.navyElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  countPillText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "800",
    color: ARPE_COLORS.white,
    includeFontPadding: false,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
  selectBtn: {
    minHeight: TOUCH_TARGET_MIN - 6,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.navyElevated,
    borderWidth: 1,
    borderColor: ARPE_COLORS.navyMuted,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectBtnText: { fontSize: 12.5, fontWeight: "700", color: ARPE_COLORS.white },
  iconActionBtn: {
    width: TOUCH_TARGET_MIN,
    height: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
  },
  toolbar: {
    backgroundColor: ARPE_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: ARPE_COLORS.border,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  toolbarIcons: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
  slot: { flex: 1, minWidth: 0 },
  fullWidth: { width: "100%" },
  selCountText: { fontSize: 13, fontWeight: "700", color: ARPE_COLORS.textSecondary },
  actionPill: {
    height: TOUCH_TARGET_MIN - 8,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.pill,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: ARPE_COLORS.borderStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  actionPillText: { fontSize: 12.5, fontWeight: "700", color: ARPE_COLORS.textPrimary, flexShrink: 1 },
  actionPillTextLight: { fontSize: 12.5, fontWeight: "800", color: ARPE_COLORS.white, flexShrink: 1 },
  body: { flex: 1, backgroundColor: ARPE_COLORS.surfaceMuted },
  gridContent: { padding: SPACING.lg, gap: SPACING.sm, paddingBottom: SPACING.xxl },
  gridRow: { gap: SPACING.sm },
  emptyBox: {
    marginTop: SPACING.xxl,
    backgroundColor: ARPE_COLORS.surface,
    borderRadius: RADII.xl,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    padding: SPACING.xxl,
    alignItems: "center",
    gap: SPACING.sm,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: ARPE_COLORS.textPrimary },
  emptySub: { fontSize: 13, lineHeight: 19, color: ARPE_COLORS.textSecondary, textAlign: "center" },
  popList: { maxHeight: 220 },
  popItem: {
    minHeight: TOUCH_TARGET_MIN - 4,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  popItemActive: { backgroundColor: ARPE_COLORS.surfaceMuted },
  popDot: { width: 8, height: 8, borderRadius: 4 },
  popText: { fontSize: 12.5, fontWeight: "700", color: ARPE_COLORS.textPrimary, flex: 1 },
});
