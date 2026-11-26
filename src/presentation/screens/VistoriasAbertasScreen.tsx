import React, { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckSquare, X } from "lucide-react-native";
import {
  alternarSelecaoIds,
  aplicarFiltrosVistoriasAbertas,
  contarFiltrosAtivosVistorias,
  extrairOpcoesFiltroVistorias,
  FILTRO_VISTORIAS_INICIAL,
  filtrarVistoriasEmAberto,
  VistoriasFiltroState,
} from "../../domain/rules/domainRules";
import { useMobileStore } from "../../application/store/useMobileStore";
import { toast } from "../../application/store/useToastStore";
import { ARPE_COLORS, getConcessionTheme } from "../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../theme/tokens";
import {
  AnimatedScalePressable,
  AnimatedValueText,
  FadeSlideView,
} from "../components/common/MotionPrimitives";
import { VistoriaAbertaCard } from "../components/vistoria/VistoriaAbertaCard";
import { ConfirmarExclusaoModal } from "../components/vistoria/ConfirmarExclusaoModal";
import { SelectionActionBar } from "../components/vistoria/SelectionActionBar";
import { VistoriasEmptyState } from "../components/vistoria/VistoriasEmptyState";
import { VistoriasFilterBar } from "../components/vistoria/VistoriasFilterBar";
import { VistoriasFilterSheetModal } from "../components/vistoria/VistoriasFilterSheetModal";

interface VistoriasAbertasScreenProps {
  readonly onOpenVistoria: (vistoriaId: string) => void;
  readonly onNovaVistoria: () => void;
}

const DELETE_EXIT_DURATION_MS = 290;

export const VistoriasAbertasScreen: React.FC<VistoriasAbertasScreenProps> = ({
  onOpenVistoria,
  onNovaVistoria,
}) => {
  const vistorias = useMobileStore((s) => s.vistorias);
  const tipoRelatorio = useMobileStore((s) => s.tipoRelatorio);
  const categoriaRelatorio = useMobileStore((s) => s.categoriaRelatorio);
  const excluirVistorias = useMobileStore((s) => s.excluirVistorias);

  const [filtro, setFiltro] = useState<VistoriasFiltroState>(
    FILTRO_VISTORIAS_INICIAL
  );
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [deletingIds, setDeletingIds] = useState<readonly string[]>([]);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  const theme = getConcessionTheme(tipoRelatorio, categoriaRelatorio);
  const vistoriasAbertas = useMemo(
    () => filtrarVistoriasEmAberto(vistorias),
    [vistorias]
  );
  const opcoesFiltro = useMemo(
    () => extrairOpcoesFiltroVistorias(vistoriasAbertas),
    [vistoriasAbertas]
  );
  const vistoriasFiltradas = useMemo(
    () => aplicarFiltrosVistoriasAbertas(vistoriasAbertas, filtro),
    [vistoriasAbertas, filtro]
  );

  const isDeleting = deletingIds.length > 0;
  const filtrosAtivos = contarFiltrosAtivosVistorias(filtro);

  useEffect(() => {
    if (deletingIds.length === 0) return;

    const total = deletingIds.length;
    const timer = setTimeout(() => {
      excluirVistorias(deletingIds);
      setDeletingIds([]);
      setSelectedIds([]);
      setSelectionMode(false);
      toast.success(
        total > 1 ? `${total} sessões apagadas` : "Sessão apagada",
        "Os rascunhos selecionados foram removidos deste dispositivo."
      );
    }, DELETE_EXIT_DURATION_MS);

    return () => clearTimeout(timer);
  }, [deletingIds, excluirVistorias]);

  const handleChangeFiltro = (next: VistoriasFiltroState) => {
    setFiltro(next);
    if (selectionMode) setSelectedIds([]);
  };

  const handleToggleSelectionMode = () => {
    if (isDeleting) return;
    if (selectionMode) {
      setSelectionMode(false);
      setSelectedIds([]);
      setConfirmModalVisible(false);
      return;
    }
    setSelectionMode(true);
    setSelectedIds([]);
  };

  const handleCardPress = (vistoriaId: string) => {
    if (isDeleting) return;
    if (selectionMode) {
      setSelectedIds((prev) => alternarSelecaoIds(prev, vistoriaId));
      return;
    }
    onOpenVistoria(vistoriaId);
  };

  const handleCardLongPress = (vistoriaId: string) => {
    if (isDeleting) return;
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectedIds([vistoriaId]);
      return;
    }
    setSelectedIds((prev) => alternarSelecaoIds(prev, vistoriaId));
  };

  const handleConfirmDelete = () => {
    if (selectedIds.length === 0 || isDeleting) return;
    setConfirmModalVisible(false);
    setDeletingIds([...selectedIds]);
  };

  const totalSelecionadas = selectedIds.length;
  const temAbertas = vistoriasAbertas.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerTextWrap}>
          <Text style={styles.kicker}>SESSÕES NO DISPOSITIVO</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Vistorias em Aberto</Text>
            <View style={styles.countPill}>
              <AnimatedValueText
                inline
                valueKey={String(vistoriasFiltradas.length)}
                style={styles.countPillText}
              >
                {vistoriasFiltradas.length}
              </AnimatedValueText>
            </View>
          </View>
        </View>

        {vistoriasFiltradas.length > 0 && (
          <FadeSlideView
            animKey={selectionMode ? "cancel" : "select"}
            distance={4}
            duration={150}
          >
            <AnimatedScalePressable
              onPress={handleToggleSelectionMode}
              disabled={isDeleting}
              style={[
                styles.selectBtn,
                selectionMode && styles.selectBtnActive,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                selectionMode ? "Cancelar seleção" : "Selecionar vistorias"
              }
            >
              {selectionMode ? (
                <X size={15} color={ARPE_COLORS.white} />
              ) : (
                <CheckSquare size={15} color={ARPE_COLORS.white} />
              )}
              <Text style={styles.selectBtnText}>
                {selectionMode ? "Cancelar" : "Selecionar"}
              </Text>
            </AnimatedScalePressable>
          </FadeSlideView>
        )}
      </View>

      {temAbertas && (
        <VistoriasFilterBar
          filtro={filtro}
          opcoes={opcoesFiltro}
          accentColor={theme.primary}
          disabled={isDeleting}
          onOpenSheet={() => setFilterSheetVisible(true)}
          onChangeFiltro={handleChangeFiltro}
          onClearAll={() => handleChangeFiltro(FILTRO_VISTORIAS_INICIAL)}
        />
      )}

      <SelectionActionBar
        visible={selectionMode}
        totalSelecionadas={totalSelecionadas}
        isDeleting={isDeleting}
        onRequestDelete={() => setConfirmModalVisible(true)}
      />

      <View style={styles.body}>
        <FlatList
          data={vistoriasFiltradas}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <VistoriasEmptyState
              accentColor={theme.primary}
              isFilteredEmpty={temAbertas && filtrosAtivos > 0}
              onNovaVistoria={onNovaVistoria}
              onLimparFiltros={() =>
                handleChangeFiltro(FILTRO_VISTORIAS_INICIAL)
              }
            />
          }
          renderItem={({ item, index }) => (
            <VistoriaAbertaCard
              vistoria={item}
              index={index}
              selectionMode={selectionMode}
              selected={selectedIds.includes(item.id)}
              isDeleting={deletingIds.includes(item.id)}
              onPress={handleCardPress}
              onLongPress={handleCardLongPress}
            />
          )}
        />
      </View>

      <VistoriasFilterSheetModal
        visible={filterSheetVisible}
        filtro={filtro}
        vistoriasAbertas={vistoriasAbertas}
        accentColor={theme.primary}
        onChangeFiltro={handleChangeFiltro}
        onClose={() => setFilterSheetVisible(false)}
      />

      <ConfirmarExclusaoModal
        visible={confirmModalVisible}
        quantidade={totalSelecionadas}
        onCancel={() => setConfirmModalVisible(false)}
        onConfirm={handleConfirmDelete}
      />
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
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  headerTextWrap: {
    flex: 1,
  },
  kicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    color: "rgba(255,255,255,0.62)",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
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
    textAlign: "center",
    includeFontPadding: false,
  },
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
  selectBtnActive: {
    backgroundColor: ARPE_COLORS.navyMuted,
  },
  selectBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: ARPE_COLORS.white,
  },
  body: {
    flex: 1,
    backgroundColor: ARPE_COLORS.surfaceMuted,
  },
  listContent: {
    padding: SPACING.xl,
    gap: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
});
