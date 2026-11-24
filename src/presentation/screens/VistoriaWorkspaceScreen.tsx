import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Camera,
  CloudUpload,
  FilePlus2,
  Image as ImageIcon,
  Info,
  MessageSquareText,
} from "lucide-react-native";
import { calcularEstatisticasMonitoramento } from "../../domain/rules/domainRules";
import { useMobileStore } from "../../application/store/useMobileStore";
import { ARPE_COLORS, getConcessionTheme } from "../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../theme/tokens";

interface VistoriaWorkspaceScreenProps {
  onBack?: () => void;
  onNovaOcorrencia: () => void;
  onGoToSync: () => void;
}

export const VistoriaWorkspaceScreen: React.FC<VistoriaWorkspaceScreenProps> = ({
  onBack,
  onNovaOcorrencia,
  onGoToSync,
}) => {
  const {
    vistorias,
    activeVistoriaId,
    simularCapturaFoto,
    atualizarRecomendacoesSocicam,
  } = useMobileStore();

  const vistoria =
    vistorias.find((v) => v.id === activeVistoriaId) ?? vistorias[0];
  const [showDadosModalInfo, setShowDadosModalInfo] = useState(false);

  const theme = getConcessionTheme(
    vistoria.tipoRelatorio,
    vistoria.categoriaRelatorio
  );
  const isMonitoring = vistoria.categoriaRelatorio === "Monitoramento";
  const isSocicamMon =
    vistoria.tipoRelatorio === "SOCICAM" && isMonitoring;

  const stats = useMemo(
    () =>
      calcularEstatisticasMonitoramento(
        vistoria.ocorrencias,
        vistoria.totalAnteriorMonitoramento
      ),
    [vistoria.ocorrencias, vistoria.totalAnteriorMonitoramento]
  );

  const handleQuickCamera = () => {
    const foto = simularCapturaFoto(vistoria.id);
    Alert.alert(
      "Foto Salva no Sandbox Privado",
      `${foto.nomeArquivo} comprimida localmente (${foto.tamanhoKb} KB) e enfileirada para sincronização.`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Escuro (#071d36) — Espelhando o celular direito da referência mobile */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            {onBack ? (
              <Pressable
                onPress={onBack}
                style={styles.backBtn}
                accessibilityLabel="Voltar para início"
              >
                <ArrowLeft size={20} color={ARPE_COLORS.white} />
              </Pressable>
            ) : null}
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {vistoria.fiscalizacao.idFiscalizacao}
              </Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                {vistoria.fiscalizacao.local}
              </Text>
            </View>
          </View>

          <View style={styles.headerBottomRow}>
            <View
              style={[styles.headerBadge, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.headerBadgeText}>
                {vistoria.tipoRelatorio} · {vistoria.categoriaRelatorio}
              </Text>
            </View>
            <Text style={styles.headerMeta}>
              {vistoria.atualizadaEm}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* Bloco 1: 4 Ações Circulares — Espelhando o bloco "Included" da referência */}
          <Text style={styles.sectionTitle}>Ações da Vistoria</Text>
          <Text style={styles.sectionSub}>
            Toque em um atalho para coletar evidências offline
          </Text>

          <View style={styles.actionsGrid}>
            <Pressable
              onPress={() => setShowDadosModalInfo((prev) => !prev)}
              style={styles.actionItem}
            >
              <View
                style={[
                  styles.actionCircleOuter,
                  { borderColor: theme.primaryBorder },
                ]}
              >
                <View
                  style={[
                    styles.actionCircleInner,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <Info size={20} color={ARPE_COLORS.white} />
                </View>
              </View>
              <Text style={styles.actionLabel}>Dados</Text>
            </Pressable>

            <Pressable onPress={handleQuickCamera} style={styles.actionItem}>
              <View
                style={[
                  styles.actionCircleOuter,
                  { borderColor: theme.primaryBorder },
                ]}
              >
                <View
                  style={[
                    styles.actionCircleInner,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <Camera size={20} color={ARPE_COLORS.white} />
                </View>
              </View>
              <Text style={styles.actionLabel}>Câmera</Text>
            </Pressable>

            <Pressable onPress={onNovaOcorrencia} style={styles.actionItem}>
              <View
                style={[
                  styles.actionCircleOuter,
                  { borderColor: theme.primaryBorder },
                ]}
              >
                <View
                  style={[
                    styles.actionCircleInner,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <FilePlus2 size={20} color={ARPE_COLORS.white} />
                </View>
              </View>
              <Text style={styles.actionLabel}>Ocorrência</Text>
            </Pressable>

            <Pressable onPress={onGoToSync} style={styles.actionItem}>
              <View
                style={[
                  styles.actionCircleOuter,
                  { borderColor: theme.primaryBorder },
                ]}
              >
                <View
                  style={[
                    styles.actionCircleInner,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <CloudUpload size={20} color={ARPE_COLORS.white} />
                </View>
              </View>
              <Text style={styles.actionLabel}>Sincronizar</Text>
            </Pressable>
          </View>

          {showDadosModalInfo && (
            <View style={styles.dadosCard}>
              <Text style={styles.dadosLabel}>CONTRATO</Text>
              <Text style={styles.dadosValue}>
                {vistoria.fiscalizacao.contrato}
              </Text>
              <Text style={[styles.dadosLabel, { marginTop: SPACING.sm }]}>
                EQUIPE / COORDENAÇÃO
              </Text>
              <Text style={styles.dadosValue}>
                {vistoria.fiscalizacao.pessoalResponsavel} ·{" "}
                {vistoria.fiscalizacao.coordenador}
              </Text>
            </View>
          )}

          {/* Bloco 2: Ocorrências & Resumo — Espelhando o bloco "Rating & Reviews" */}
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>
                {isMonitoring ? "Auditoria de Pendências" : "Ocorrências"}
              </Text>
              <Text style={styles.sectionSub}>
                {isMonitoring
                  ? `${stats.sanadas} sanadas · ${stats.parcialmenteSanadas} parciais · ${stats.pendentes} pendentes`
                  : "Registradas offline nesta vistoria"}
              </Text>
            </View>
            <View style={styles.counterWrap}>
              <Text style={[styles.counterBig, { color: theme.primary }]}>
                {isMonitoring
                  ? `${stats.pctSanadas}%`
                  : String(vistoria.ocorrencias.length)}
              </Text>
              <Text style={styles.counterCaption}>
                {isMonitoring ? "sanadas" : "itens"}
              </Text>
            </View>
          </View>

          {vistoria.ocorrencias.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Nenhuma ocorrência registrada</Text>
              <Text style={styles.emptySub}>
                Toque em "Ocorrência" acima para cadastrar a primeira NC ou PA.
              </Text>
            </View>
          ) : (
            <View style={styles.ocorrenciasList}>
              {vistoria.ocorrencias.map((oc) => {
                const sitColor =
                  oc.situacao === "Sanada"
                    ? ARPE_COLORS.statusSanada
                    : oc.situacao === "Parcialmente Sanada"
                    ? ARPE_COLORS.statusParcial
                    : theme.primary;
                return (
                  <View key={oc.numero} style={styles.ocorrenciaCard}>
                    <View style={styles.ocTopRow}>
                      <Text style={styles.ocCode} numberOfLines={1}>
                        {oc.identificacao || `NC ${oc.numero}`}
                      </Text>
                      <View
                        style={[
                          styles.sitPill,
                          { backgroundColor: `${sitColor}18` },
                        ]}
                      >
                        <Text style={[styles.sitPillText, { color: sitColor }]}>
                          {isMonitoring ? oc.situacao : oc.tipoAchado}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.ocDesc}>{oc.descricao}</Text>
                    <Text style={styles.ocMeta}>
                      {oc.setorPredial
                        ? `${oc.setorPredial}`
                        : [oc.pista ? `Pista ${oc.pista}` : "", oc.trecho]
                            .filter(Boolean)
                            .join(" · ") || vistoria.fiscalizacao.local}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Bloco Exclusivo SOCICAM Monitoramento: Recomendações à SOCICAM */}
          {isSocicamMon && (
            <View style={styles.socicamRecCard}>
              <View style={styles.socicamRecHeader}>
                <MessageSquareText size={16} color={theme.primary} />
                <Text style={styles.socicamRecTitle}>
                  Recomendações à SOCICAM
                </Text>
              </View>
              <TextInput
                multiline
                numberOfLines={3}
                value={vistoria.fiscalizacao.recomendacoesSocicam || ""}
                onChangeText={(txt) =>
                  atualizarRecomendacoesSocicam(vistoria.id, txt)
                }
                placeholder="Rascunho enviado para a Etapa 04 (Recomendação Geral) no Web..."
                placeholderTextColor={ARPE_COLORS.textMuted}
                style={styles.recInput}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Bloco 3: Galeria de Fotos — Espelhando o bloco "Gallery" na base da Tela 2 */}
          <View style={[styles.sectionHeaderRow, { marginTop: SPACING.xl }]}>
            <View>
              <Text style={styles.sectionTitle}>Galeria de Fotos</Text>
              <Text style={styles.sectionSub}>
                Comprimidas (~200 KB) no sandbox privado
              </Text>
            </View>
            <Text style={styles.galleryCount}>
              {vistoria.fotos.length} foto(s)
            </Text>
          </View>

          <FlatList
            horizontal
            data={vistoria.fotos}
            keyExtractor={(f) => f.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.galleryList}
            ListEmptyComponent={
              <View style={styles.galleryEmpty}>
                <Text style={styles.emptySub}>
                  Nenhuma foto capturada ainda.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.photoCard}>
                <View style={styles.photoPlaceholder}>
                  <ImageIcon size={24} color={ARPE_COLORS.textMuted} />
                  <Text style={styles.photoSize}>{item.tamanhoKb} KB</Text>
                </View>
                <Text style={styles.photoName} numberOfLines={1}>
                  {item.nomeArquivo}
                </Text>
                <Text style={styles.photoTime}>
                  {item.capturadaEm} ·{" "}
                  {item.syncStatus === "synced" ? "Sync" : "Local"}
                </Text>
              </View>
            )}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: ARPE_COLORS.navy,
  },
  container: {
    flex: 1,
    backgroundColor: ARPE_COLORS.surface,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    backgroundColor: ARPE_COLORS.navy,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
  },
  headerTopRow: {
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
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.72)",
    marginTop: 2,
  },
  headerBottomRow: {
    marginTop: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADII.pill,
  },
  headerBadgeText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
  headerMeta: {
    fontSize: 11.5,
    color: "rgba(255,255,255,0.72)",
  },
  body: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 16.5,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
  },
  sectionSub: {
    fontSize: 12,
    color: ARPE_COLORS.textSecondary,
    marginTop: 2,
  },
  actionsGrid: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionItem: {
    alignItems: "center",
    gap: SPACING.xs,
    flex: 1,
  },
  actionCircleOuter: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCircleInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 11.5,
    fontWeight: "700",
    color: ARPE_COLORS.textPrimary,
  },
  dadosCard: {
    marginBottom: SPACING.xl,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    padding: SPACING.md,
  },
  dadosLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: ARPE_COLORS.textMuted,
  },
  dadosValue: {
    fontSize: 12.5,
    fontWeight: "600",
    color: ARPE_COLORS.textPrimary,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  counterWrap: {
    alignItems: "flex-end",
  },
  counterBig: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 22,
  },
  counterCaption: {
    fontSize: 10.5,
    color: ARPE_COLORS.textSecondary,
  },
  emptyBox: {
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    padding: SPACING.lg,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: ARPE_COLORS.textPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: ARPE_COLORS.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  ocorrenciasList: {
    gap: SPACING.sm,
  },
  ocorrenciaCard: {
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    padding: SPACING.md,
  },
  ocTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  ocCode: {
    fontSize: 12.5,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
    flex: 1,
  },
  sitPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADII.pill,
  },
  sitPillText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  ocDesc: {
    fontSize: 13,
    color: ARPE_COLORS.textPrimary,
    marginTop: 6,
    lineHeight: 18,
  },
  ocMeta: {
    fontSize: 11,
    color: ARPE_COLORS.textSecondary,
    marginTop: 4,
  },
  socicamRecCard: {
    marginTop: SPACING.lg,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderRadius: RADII.lg,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    padding: SPACING.md,
  },
  socicamRecHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  socicamRecTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
  },
  recInput: {
    backgroundColor: ARPE_COLORS.white,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    padding: SPACING.md,
    fontSize: 13,
    color: ARPE_COLORS.textPrimary,
    minHeight: 74,
  },
  galleryCount: {
    fontSize: 12,
    fontWeight: "700",
    color: ARPE_COLORS.textSecondary,
  },
  galleryList: {
    gap: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  galleryEmpty: {
    paddingVertical: SPACING.md,
  },
  photoCard: {
    width: 124,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    borderRadius: RADII.md,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    padding: SPACING.sm,
  },
  photoPlaceholder: {
    height: 76,
    borderRadius: RADII.sm,
    backgroundColor: ARPE_COLORS.inputBg,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: SPACING.xs,
  },
  photoSize: {
    fontSize: 10,
    fontWeight: "700",
    color: ARPE_COLORS.textSecondary,
  },
  photoName: {
    fontSize: 11,
    fontWeight: "700",
    color: ARPE_COLORS.textPrimary,
  },
  photoTime: {
    fontSize: 10,
    color: ARPE_COLORS.textMuted,
    marginTop: 2,
  },
});

