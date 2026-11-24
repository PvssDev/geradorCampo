import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ClipboardList,
  CloudUpload,
  Home,
  Settings,
} from "lucide-react-native";
import { useMobileStore } from "../../application/store/useMobileStore";
import { ARPE_COLORS, getConcessionTheme } from "../theme/colors";
import { TOUCH_TARGET_MIN } from "../theme/tokens";
import { HomeVistoriasScreen } from "../screens/HomeVistoriasScreen";
import { VistoriaWorkspaceScreen } from "../screens/VistoriaWorkspaceScreen";
import { NovaVistoriaScreen } from "../screens/NovaVistoriaScreen";
import { NovaOcorrenciaScreen } from "../screens/NovaOcorrenciaScreen";
import { SyncQueueScreen } from "../screens/SyncQueueScreen";
import { AjustesScreen } from "../screens/AjustesScreen";

type BottomTabKey = "inicio" | "coleta" | "sync" | "ajustes";
type OverlayScreen = "none" | "nova_vistoria" | "nova_ocorrencia";

export const RootNavigator: React.FC = () => {
  const { tipoRelatorio, categoriaRelatorio, vistorias } = useMobileStore();
  const [activeTab, setActiveTab] = useState<BottomTabKey>("inicio");
  const [overlay, setOverlay] = useState<OverlayScreen>("none");

  const theme = getConcessionTheme(tipoRelatorio, categoriaRelatorio);
  const pendingCount = vistorias.filter((v) => v.syncStatus !== "synced").length;

  if (overlay === "nova_vistoria") {
    return (
      <NovaVistoriaScreen
        onBack={() => setOverlay("none")}
        onCreated={() => {
          setOverlay("none");
          setActiveTab("coleta");
        }}
      />
    );
  }

  if (overlay === "nova_ocorrencia") {
    return (
      <NovaOcorrenciaScreen
        onBack={() => setOverlay("none")}
        onSaved={() => {
          setOverlay("none");
          setActiveTab("coleta");
        }}
      />
    );
  }

  const tabs: readonly {
    key: BottomTabKey;
    label: string;
    icon: typeof Home;
    badge?: number;
  }[] = [
    { key: "inicio", label: "Início", icon: Home },
    { key: "coleta", label: "Coleta", icon: ClipboardList },
    {
      key: "sync",
      label: "Sincronizar",
      icon: CloudUpload,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    { key: "ajustes", label: "Ajustes", icon: Settings },
  ];

  return (
    <View style={styles.root}>
      <View style={styles.screenContainer}>
        {activeTab === "inicio" && (
          <HomeVistoriasScreen
            onOpenVistoria={() => setActiveTab("coleta")}
            onNovaVistoria={() => setOverlay("nova_vistoria")}
          />
        )}
        {activeTab === "coleta" && (
          <VistoriaWorkspaceScreen
            onBack={() => setActiveTab("inicio")}
            onNovaOcorrencia={() => setOverlay("nova_ocorrencia")}
            onGoToSync={() => setActiveTab("sync")}
          />
        )}
        {activeTab === "sync" && <SyncQueueScreen />}
        {activeTab === "ajustes" && <AjustesScreen />}
      </View>

      {/* Bottom Tab Bar Limpa — 4 ícones na base como na referência mobile */}
      <SafeAreaView edges={["bottom"]} style={styles.tabBarSafe}>
        <View style={styles.tabBar}>
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
                  <Icon size={22} color={iconColor} strokeWidth={isActive ? 2.4 : 2} />
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
  tabBarSafe: {
    backgroundColor: ARPE_COLORS.white,
    borderTopWidth: 1,
    borderTopColor: ARPE_COLORS.border,
  },
  tabBar: {
    flexDirection: "row",
    height: 62,
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
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
    fontSize: 10.5,
  },
});

