import Svg, { Path, Rect } from "react-native-svg";
import { useUnistyles } from "react-native-unistyles";

interface PaseoLogoProps {
  size?: number;
  color?: string;
}

export function PaseoLogo({ size = 64, color }: PaseoLogoProps) {
  const { theme } = useUnistyles();
  const fill = color ?? theme.colors.foreground;
  const ink = color === "#000000" ? "#ffffff" : theme.colors.background;

  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" fill="none">
      <Rect x="64" y="64" width="896" height="896" rx="240" fill={fill} />
      <Path
        d="M288 336c0-61.856 50.144-112 112-112h224c61.856 0 112 50.144 112 112v224c0 61.856-50.144 112-112 112h-80l128 128H536L408 672h-8c-61.856 0-112-50.144-112-112V336Z"
        fill={ink}
      />
      <Path d="M416 352h192v192H416z" fill={fill} />
    </Svg>
  );
}
