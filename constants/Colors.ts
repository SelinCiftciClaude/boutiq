export const Colors = {
  // Backgrounds
  bg: '#07070F',
  surface1: '#0E0E1A',
  surface2: '#141422',
  surface3: '#1A1A2E',
  surface4: '#22223A',

  // Gold palette — the soul of BOUTIQ
  gold1: '#B8860B',
  gold2: '#C8960C',
  gold3: '#D4A843',
  gold4: '#E8C97A',
  gold5: '#F5E0A8',
  goldGlow: 'rgba(212,168,67,0.20)',
  goldGlowStrong: 'rgba(212,168,67,0.40)',

  // Purple accent
  purple1: '#4C1D95',
  purple2: '#6D28D9',
  purple3: '#8B5CF6',
  purple4: '#C4B5FD',
  purpleGlow: 'rgba(139,92,246,0.20)',

  // Rose accent
  rose: '#F43F5E',
  roseGlow: 'rgba(244,63,94,0.20)',

  // Text
  text1: '#FAFAFA',
  text2: '#D8D8E8',
  text3: '#9898B2',
  text4: '#5A5A78',
  text5: '#3A3A58',

  // Borders
  border1: 'rgba(255,255,255,0.06)',
  border2: 'rgba(255,255,255,0.10)',
  border3: 'rgba(255,255,255,0.16)',
  borderGold: 'rgba(212,168,67,0.30)',

  // Status
  success: '#10B981',
  successGlow: 'rgba(16,185,129,0.20)',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Overlays
  overlay1: 'rgba(7,7,15,0.60)',
  overlay2: 'rgba(7,7,15,0.80)',
  overlay3: 'rgba(7,7,15,0.92)',

  // Glass
  glass1: 'rgba(255,255,255,0.04)',
  glass2: 'rgba(255,255,255,0.07)',
  glass3: 'rgba(255,255,255,0.10)',
  glassGold: 'rgba(212,168,67,0.08)',

  // Gradients (used as array pairs)
  gradients: {
    gold: ['#C8960C', '#E8C97A'] as const,
    goldDark: ['#B8860B', '#D4A843'] as const,
    dark: ['#07070F', '#0E0E1A'] as const,
    darkReverse: ['#1A1A2E', '#07070F'] as const,
    purple: ['#4C1D95', '#8B5CF6'] as const,
    purpleDark: ['#2D1B69', '#6D28D9'] as const,
    surface: ['#141422', '#0E0E1A'] as const,
    hero: ['#0A0A1A', '#141428', '#0A0A18'] as const,
    card: ['rgba(20,20,34,0.95)', 'rgba(10,10,26,0.98)'] as const,
    goldToTransparent: ['#D4A843', 'rgba(212,168,67,0)'] as const,
    transparentToGold: ['rgba(212,168,67,0)', '#D4A843'] as const,
  },
};

export type ColorKey = keyof typeof Colors;
