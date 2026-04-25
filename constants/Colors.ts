export const Colors = {
  // ── Backgrounds — warm cream whites
  bg:       '#FDF8F5',
  surface1: '#FFFFFF',
  surface2: '#FFF5EF',
  surface3: '#F5EDE7',
  surface4: '#EDE0D8',

  // ── Rose / Blush — ana accent
  rose1: '#A82C52',
  rose2: '#C8406A',
  rose3: '#E05580',
  rose4: '#F07EA0',
  rose5: '#FFBDD1',
  roseGlow:       'rgba(224,85,128,0.14)',
  roseGlowStrong: 'rgba(224,85,128,0.28)',

  // ── Gold — ısıl, zengin
  gold1: '#9A7018',
  gold2: '#C2900A',
  gold3: '#D4A843',
  gold4: '#E8C97A',
  gold5: '#F5E0A8',
  goldGlow:       'rgba(212,168,67,0.16)',
  goldGlowStrong: 'rgba(212,168,67,0.32)',

  // ── Teal — ferahlatıcı üçüncü renk
  teal1: '#0D7A66',
  teal2: '#1BAD92',
  teal3: '#4DCDB6',
  tealGlow: 'rgba(27,173,146,0.14)',

  // ── Purple — vurgu
  purple1: '#5B21B6',
  purple2: '#7C3AED',
  purple3: '#9B6EF8',
  purple4: '#C4B5FD',
  purpleGlow: 'rgba(124,58,237,0.12)',

  // ── Text — koyu, okunabilir
  text1: '#1A0E14',
  text2: '#3A2030',
  text3: '#7A5068',
  text4: '#A88898',
  text5: '#C8B5BE',

  // ── Borders — siyah opasite, açık bg için
  border1: 'rgba(30,10,20,0.07)',
  border2: 'rgba(30,10,20,0.11)',
  border3: 'rgba(30,10,20,0.18)',
  borderGold: 'rgba(212,168,67,0.28)',
  borderRose: 'rgba(224,85,128,0.28)',

  // ── Status
  success:     '#0A9070',
  successGlow: 'rgba(10,144,112,0.13)',
  warning:     '#D97E08',
  error:       '#D03A3A',
  info:        '#2F6EE8',

  // ── Overlays (açık tema)
  overlay1: 'rgba(253,248,245,0.60)',
  overlay2: 'rgba(253,248,245,0.82)',
  overlay3: 'rgba(253,248,245,0.95)',

  // ── Glass (açık cam efekti)
  glass1: 'rgba(255,255,255,0.55)',
  glass2: 'rgba(255,255,255,0.75)',
  glass3: 'rgba(255,255,255,0.90)',
  glassGold: 'rgba(212,168,67,0.10)',
  glassRose: 'rgba(224,85,128,0.08)',

  // ── Gradients
  gradients: {
    rose:           ['#C8406A', '#F07EA0'] as const,
    roseDark:       ['#A82C52', '#E05580'] as const,
    gold:           ['#C2900A', '#E8C97A'] as const,
    goldDark:       ['#9A7018', '#D4A843'] as const,
    light:          ['#FDF8F5', '#FFFFFF'] as const,
    lightReverse:   ['#FFFFFF', '#FDF8F5'] as const,
    surface:        ['#FFFFFF', '#FFF5EF'] as const,
    hero:           ['#FDF8F5', '#FFF0EA', '#FDF5F8'] as const,
    card:           ['rgba(255,255,255,0.96)', 'rgba(253,248,245,0.99)'] as const,
    roseToTrans:    ['#E05580', 'rgba(224,85,128,0)'] as const,
    transToRose:    ['rgba(224,85,128,0)', '#E05580'] as const,
    teal:           ['#1BAD92', '#4DCDB6'] as const,
    heroFull:       ['#FFF0F5', '#FFF8F0', '#F5F0FF'] as const,
  },
};

export type ColorKey = keyof typeof Colors;
