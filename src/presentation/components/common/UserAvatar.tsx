import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  extrairIniciaisAvatar,
  obterCorAvatar,
} from "../../../domain/rules/authRules";
import { ARPE_COLORS } from "../../theme/colors";

interface UserAvatarProps {
  readonly nomeCompleto: string;
  readonly usuario: string;
  readonly size?: number;
  readonly bordered?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  nomeCompleto,
  usuario,
  size = 44,
  bordered = false,
}) => {
  const iniciais = extrairIniciaisAvatar(nomeCompleto, usuario);
  const backgroundColor = obterCorAvatar(usuario || nomeCompleto);
  const fontSize = Math.round(size * 0.37);

  return (
    <View
      accessible
      accessibilityLabel={`Avatar de ${nomeCompleto}`}
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
        bordered && styles.bordered,
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{iniciais}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
  },
  bordered: {
    borderWidth: 3.5,
    borderColor: ARPE_COLORS.white,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  initials: {
    fontWeight: "800",
    color: ARPE_COLORS.white,
    letterSpacing: 0.6,
    includeFontPadding: false,
  },
});
