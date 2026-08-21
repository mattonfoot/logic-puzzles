import { Platform } from 'react-native';

export const palette = {
  bg: '#F6F3EC',
  surface: '#FFFFFF',
  surfaceAlt: '#FBF9F3',
  ink: '#1D2333',
  inkSoft: '#5C6379',
  inkFaint: '#98A0B3',
  line: '#E7E1D4',
  lineStrong: '#D2CAB6',
  danger: '#D6455D',
  success: '#2E9E6B',
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
};

export const space = (steps: number) => steps * 4;

export const fontFamily = Platform.select({
  ios: 'System',
  default: undefined,
});

export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#2A2317',
      shadowOpacity: 0.08,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    default: { elevation: 3 },
  }),
  raised: Platform.select({
    ios: {
      shadowColor: '#2A2317',
      shadowOpacity: 0.16,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    },
    default: { elevation: 6 },
  }),
} as const;

/** Flattens an accent colour to a soft background tint. */
export function tint(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
