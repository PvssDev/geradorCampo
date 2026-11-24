import React from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./src/presentation/navigation/RootNavigator";
import { ToastViewport } from "./src/presentation/components/common/ToastViewport";

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#071d36" />
      <RootNavigator />
      <ToastViewport />
    </SafeAreaProvider>
  );
}

