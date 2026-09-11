import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { AppText } from "@/components/ui/Text";
import { useAppTheme } from "@/theme/ThemeProvider";

export function ProgressRing({
  value,
  size = 88,
  stroke = 8,
  label,
  labelColor,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  labelColor?: string;
}) {
  const { colors } = useAppTheme();
  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceMuted}
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.primary}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - clamped)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: "absolute" }}>
        <AppText variant="subheading" color={labelColor}>
          {label ?? `${Math.round(clamped * 100)}%`}
        </AppText>
      </View>
    </View>
  );
}
