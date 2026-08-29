import Svg, { Circle, Path, Polyline, Rect } from "react-native-svg";

import type { ColorTokens } from "@/constants/theme";

export type IconName =
  | "home"
  | "tasks"
  | "timer"
  | "plus"
  | "play"
  | "pause"
  | "skip"
  | "previous"
  | "restart"
  | "check"
  | "close"
  | "chevron"
  | "settings"
  | "calendar"
  | "trash"
  | "edit"
  | "copy"
  | "grip"
  | "flame"
  | "sun"
  | "shuffle";

interface IconProps {
  name: IconName;
  color: string;
  size?: number;
}

export function Icon({ name, color, size = 22 }: IconProps) {
  const stroke = color;
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
  };

  switch (name) {
    case "home":
      return (
        <Svg {...props}>
          <Path
            d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "tasks":
      return (
        <Svg {...props}>
          <Rect
            x="4"
            y="4"
            width="16"
            height="16"
            rx="3"
            stroke={stroke}
            strokeWidth={1.8}
          />
          <Path
            d="M8 12.2 10.4 14.6 16 9"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "timer":
      return (
        <Svg {...props}>
          <Circle cx="12" cy="13" r="8" stroke={stroke} strokeWidth={1.8} />
          <Path
            d="M12 13V9"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          <Path
            d="M9 4h6"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      );
    case "plus":
      return (
        <Svg {...props}>
          <Path
            d="M12 5v14M5 12h14"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      );
    case "shuffle":
      return (
        <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
          <Path
            d="M16.5 13.5C12.5 13.5 9.5 16.5 9.5 20.5C9.5 24.5 12.5 27.5 16.5 27.5H18.5"
            stroke={stroke}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M14.5 9.5L19.5 13.5L14.5 17.5"
            stroke={stroke}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Rect x="25" y="11" width="20" height="7" rx="3.5" fill={stroke} />
          <Rect x="25" y="23" width="20" height="7" rx="3.5" fill={stroke} />
        </Svg>
      );
    case "play":
      return (
        <Svg {...props}>
          <Path d="M8 6.5v11l10-5.5-10-5.5Z" fill={stroke} />
        </Svg>
      );
    case "pause":
      return (
        <Svg {...props}>
          <Rect x="7" y="5" width="3.5" height="14" rx="1" fill={stroke} />
          <Rect x="13.5" y="5" width="3.5" height="14" rx="1" fill={stroke} />
        </Svg>
      );
    case "skip":
      return (
        <Svg {...props}>
          <Path d="M6 6v12l8-6-8-6Z" fill={stroke} />
          <Rect x="16" y="6" width="2" height="12" rx="1" fill={stroke} />
        </Svg>
      );
    case "previous":
      return (
        <Svg {...props}>
          <Path d="M18 6v12l-8-6 8-6Z" fill={stroke} />
          <Rect x="6" y="6" width="2" height="12" rx="1" fill={stroke} />
        </Svg>
      );
    case "restart":
      return (
        <Svg {...props}>
          <Path
            d="M20 12a8 8 0 1 1-2.2-5.5"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
          <Polyline
            points="20 4 20 9 15 9"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "check":
      return (
        <Svg {...props}>
          <Path
            d="M5 12.5 9.5 17 19 7.5"
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "close":
      return (
        <Svg {...props}>
          <Path
            d="M6 6l12 12M18 6 6 18"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      );
    case "chevron":
      return (
        <Svg {...props}>
          <Path
            d="M9 6l6 6-6 6"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "settings":
      return (
        <Svg {...props}>
          <Path
            d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="12" cy="12" r="3" stroke={stroke} strokeWidth={2} />
        </Svg>
      );
    case "calendar":
      return (
        <Svg {...props}>
          <Rect
            x="4"
            y="6"
            width="16"
            height="14"
            rx="2"
            stroke={stroke}
            strokeWidth={1.8}
          />
          <Path
            d="M8 4v4M16 4v4M4 11h16"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      );
    case "trash":
      return (
        <Svg {...props}>
          <Path
            d="M5 8h14M10 8V6h4v2M8 8l.8 11h6.4L16 8"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "edit":
      return (
        <Svg {...props}>
          <Path
            d="M4 20h4l10-10-4-4L4 16v4Z"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "copy":
      return (
        <Svg {...props}>
          <Rect
            x="8"
            y="8"
            width="11"
            height="11"
            rx="2"
            stroke={stroke}
            strokeWidth={1.8}
          />
          <Path
            d="M5 16V5h11"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      );
    case "grip":
      return (
        <Svg {...props}>
          <Path
            d="M9 7h.01M15 7h.01M9 12h.01M15 12h.01M9 17h.01M15 17h.01"
            stroke={stroke}
            strokeWidth={3}
            strokeLinecap="round"
          />
        </Svg>
      );
    case "flame":
      return (
        <Svg {...props}>
          <Path
            d="M12 3s5 5 5 9a5 5 0 1 1-10 0c0-2 2-4.5 3-6 0 2 2 2.5 2 4.5"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      );
    case "sun":
      return (
        <Svg {...props}>
          <Circle cx="12" cy="12" r="4" stroke={stroke} strokeWidth={1.8} />
          <Path
            d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </Svg>
      );
    default:
      return null;
  }
}

export function iconColor(colors: ColorTokens, active: boolean): string {
  return active ? colors.primary : colors.textSecondary;
}
