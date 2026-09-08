import { useMemo } from "react";
import { Image } from "react-native";

interface OrqaraLogoProps {
  size?: number;
  color?: string;
}

export function OrqaraLogo({ size = 64 }: OrqaraLogoProps) {
  const style = useMemo(() => ({ width: size, height: size, borderRadius: size * 0.22 }), [size]);

  return (
    <Image
      source={require("../../../assets/images/icon.png")}
      style={style}
      resizeMode="cover"
      accessibilityIgnoresInvertColors
    />
  );
}
