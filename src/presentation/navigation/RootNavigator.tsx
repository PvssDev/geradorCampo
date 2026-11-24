import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CheckCircle2,
  ClipboardList,
  Home,
  Images,
  Settings,
} from "lucide-react-native";
import { useMobileStore } from "../../application/store/useMobileStore";
import { ARPE_COLORS, getConcessionTheme } from "../theme/colors";
import { RADII, SPACING, TOUCH_TARGET_MIN } from "../theme/tokens";
import { InicioWizardScreen } from "../screens/InicioWizardScreen";
import { HomeVistoriasScreen } from "../screens/HomeVistoriasScreen";
import { SyncQueueScreen } from "../screens/SyncQueueScreen";
import { AjustesScreen } from "../screens/AjustesScreen";
import {
  FLUID_EASE,
  NATIVE_DRIVER,
  TabFadeView,
  useAnimatedColor,
} from "../components/common/MotionPrimitives";

type BottomTabKey =
  | "inicio"
  | "vistorias"
  | "galeria"
  | "finalizados"
  | "configuracao";

const TAB_ORDER: readonly BottomTabKey[] = [
  "inicio",
  "vistorias",
  "galeria",
  "finalizados",
  "configuracao",
];

export const RootNavigator: React.FC = () => {
  const {
    tipoRelatorio,
    categoriaRelatorio,
    vistorias,
    retomarVistoriaNoWizard,
    iniciarNovoRelatorioWizard,
  } = useMobileStore();
  const [activeTab, setActiveTab] = useState<BottomTabKey>("inicio");
  const [barWidth, setBarWidth] = useState(0);

  const activeIndex = TAB_ORDER.indexOf(activeTab);
  const indicatorIndex = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(indicatorIndex, {
      toValue: activeIndex,
      duration: 240,
      easing: FLUID_EASE,
      useNativeDriver: NATIVE_DRIVER,
    }).start();
  }, [activeIndex, indicatorIndex]);

  const theme = getConcessionTheme(tipoRelatorio, categoriaRelatorio);
  const animatedPrimary = useAnimatedColor(theme.primary);
  const abertasCount = vistorias.filter(
    (v) => v.lifecycleStatus === "em_aberto"
  ).length;
  const finalizadasPendentesCount = vistorias.filter(
    (v) => v.lifecycleStatus === "finalizada" && v.syncStatus !== "synced"
  ).length;
  const totalFotosLocais = vistorias.reduce(
    (acc, v) => acc + v.fotos.length,
    0
  );

  const tabs: readonly {
    key: BottomTabKey;
    label: string;
    icon: typeof Home;
    badge?: number;
  }[] = [
    { key: "inicio", label: "Início", icon: Home },
    {
      key: "vistorias",
      label: "Vistorias",
      icon: ClipboardList,
      badge: abertasCount > 0 ? abertasCount : undefined,
    },
    { key: "galeria", label: "Galeria", icon: Images },
    {
      key: "finalizados",
      label: "Finalizados",
      icon: CheckCircle2,
      badge:
        finalizadasPendentesCount > 0 ? finalizadasPendentesCount : undefined,
    },
    { key: "configuracao", label: "Configuração", icon: Settings },
  ];

  const tabSlotWidth = barWidth > 0 ? (barWidth - 8) / tabs.length : 0;
  const indicatorTranslateX =
    tabSlotWidth > 0
      ? indicatorIndex.interpolate({
          inputRange: [0, tabs.length - 1],
          outputRange: [
            4 + tabSlotWidth * 0.22,
            4 + tabSlotWidth * (tabs.length - 1) + tabSlotWidth * 0.22,
          ],
        })
      : 0;

  return (
    <View style={styles.root}>
      {/* Fade sutil e instantâneo entre as 5 abas (sem slide pesado) */}
      <TabFadeView animKey={activeTab} style={styles.screenContainer}>
        {activeTab === "inicio" && (
          <InicioWizardScreen
            onFinalizadoSuccess={() => setActiveTab("finalizados")}
          />
        )}

        {activeTab === "vistorias" && (
          <HomeVistoriasScreen
            onOpenVistoria={(vistoriaId) => {
              retomarVistoriaNoWizard(vistoriaId);
              setActiveTab("inicio");
            }}
            onNovaVistoria={() => {
              iniciarNovoRelatorioWizard();
              setActiveTab("inicio");
            }}
          />
        )}

        {activeTab === "galeria" && (
          <SafeAreaView style={styles.placeholderSafe} edges={["top"]}>
            <View style={styles.placeholderCard}>
              <Images size={28} color={theme.primary} />
              <Text style={styles.placeholderTitle}>Galeria Local</Text>
              <Text style={styles.placeholderSubtitle}>
                {totalFotosLocais} foto(s) salvas localmente nas sessões atuais. A grade por cores, filtro por sessão e compartilhamento serão implementados na Parte 3 da Ordem de Execução.
              </Text>
            </View>
          </SafeAreaView>
        )}

        {activeTab === "finalizados" && <SyncQueueScreen />}
        {activeTab === "configuracao" && <AjustesScreen />}
      </TabFadeView>

      {/* Bottom Tab Bar Limpa com indicador deslizante suave */}
      <SafeAreaView edges={["bottom"]} style={styles.tabBarSafe}>
        <View
          style={styles.tabBar}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        >
          {tabSlotWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.slidingIndicator,
                {
                  width: tabSlotWidth * 0.56,
                  transform: [{ translateX: indicatorTranslateX }],
                },
              ]}
            >
              <Animated.View
                style={[StyleSheet.absoluteFill, { backgroundColor: animatedPrimary }]}
              />
            </Animated.View>
          )}

          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const iconColor = isActive ? theme.primary : ARPE_COLORS.textMuted;

            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={styles.tabItem}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={tab.label}
              >
                <View style={styles.iconWrapper}>
                  <Icon
                    size={21}
                    color={iconColor}
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                  {tab.badge !== undefined && (
                    <View
                      style={[
                        styles.badgeDot,
                        { backgroundColor: theme.primary },
                      ]}
                    >
                      <Text style={styles.badgeText}>{tab.badge}</Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    { color: iconColor, fontWeight: isActive ? "700" : "500" },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: ARPE_COLORS.surface,
  },
  screenContainer: {
    flex: 1,
  },
  placeholderSafe: {
    flex: 1,
    backgroundColor: ARPE_COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  placeholderCard: {
    width: "100%",
    maxWidth: 420,
    padding: SPACING.xl,
    borderRadius: RADII.xl,
    borderWidth: 1,
    borderColor: ARPE_COLORS.border,
    backgroundColor: ARPE_COLORS.surfaceMuted,
    alignItems: "center",
    gap: SPACING.sm,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: ARPE_COLORS.textPrimary,
  },
  placeholderSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    color: ARPE_COLORS.textSecondary,
  },
  tabBarSafe: {
    backgroundColor: ARPE_COLORS.white,
    borderTopWidth: 1,
    borderTopColor: ARPE_COLORS.border,
  },
  tabBar: {
    position: "relative",
    flexDirection: "row",
    height: 62,
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 4,
  },
  slidingIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 2.5,
    borderBottomLeftRadius: RADII.pill,
    borderBottomRightRadius: RADII.pill,
  },
  tabItem: {
    flex: 1,
    minHeight: TOUCH_TARGET_MIN,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  iconWrapper: {
    position: "relative",
  },
  badgeDot: {
    position: "absolute",
    top: -5,
    right: -9,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: ARPE_COLORS.white,
  },
  tabLabel: {
    fontSize: 10,
  },
});
