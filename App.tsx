import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthStore } from "./src/application/store/useAuthStore";
import { RootNavigator } from "./src/presentation/navigation/RootNavigator";
import { LoginScreen } from "./src/presentation/screens/LoginScreen";
import { ArpeSplashOverlay } from "./src/presentation/components/common/ArpeSplashOverlay";
import { ToastViewport } from "./src/presentation/components/common/ToastViewport";

export default function App() {
  const hydrated = useAuthStore((s) => s.hydrated);
  const session = useAuthStore((s) => s.session);
  const hidratarSessao = useAuthStore((s) => s.hidratarSessao);

  useEffect(() => {
    void hidratarSessao();
  }, [hidratarSessao]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#071d36" />
      {hydrated ? session ? <RootNavigator /> : <LoginScreen /> : null}
      <ArpeSplashOverlay />
      <ToastViewport />
    </SafeAreaProvider>
  );
}
