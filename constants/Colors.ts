export const Colors = {
  // ── Backgrounds — açık sarı tema
  bg:       '#FDFBEA',
  surface1: '#FFFEF5',
  surface2: '#FFF8D0',
  surface3: '#FFF3B0',
  surface4: '#FFEE90',

  // ── Terracotta / Cognac — birincil CTA
  rose1: '#6A2818',
  rose2: '#8C3820',
  rose3: '#B4482A',
  rose4: '#CC6E50',
  rose5: '#E4A488',
  roseGlow:       'rgba(180,72,42,0.12)',
  roseGlowStrong: 'rgba(180,72,42,0.26)',

  // ── Açık Sarı / Altın — ana accent
  gold1: '#8A7020',
  gold2: '#C0A030',
  gold3: '#D4920A',  // primary — koyu altın (açık arka planda okunabilir)
  gold4: '#E8B020',
  gold5: '#F5D060',
  goldGlow:       'rgba(212,146,10,0.15)',
  goldGlowStrong: 'rgba(212,146,10,0.30)',

  // ── Teal (minimal)
  teal1: '#124C3C',
  teal2: '#1E7A62',
  teal3: '#3AAA88',
  tealGlow: 'rgba(30,122,98,0.12)',

  // ── Purple (minimal)
  purple1: '#2E1070',
  purple2: '#4A22AA',
  purple3: '#6E48D8',
  purple4: '#9A84F0',
  purpleGlow: 'rgba(74,34,170,0.10)',

  // ── Text — koyu, açık arka plan için
  text1: '#1A1206',  // neredeyse siyah, sıcak ton
  text2: '#3A2E10',
  text3: '#6A5C20',
  text4: '#9A8840',
  text5: '#C8B860',

  // ── Borders
  border1: 'rgba(26,18,6,0.07)',
  border2: 'rgba(26,18,6,0.12)',
  border3: 'rgba(26,18,6,0.18)',
  borderGold: 'rgba(212,146,10,0.35)',
  borderRose: 'rgba(180,72,42,0.25)',

  // ── Status
  success:     '#1A7A50',
  successGlow: 'rgba(26,122,80,0.13)',
  warning:     '#C08010',
  error:       '#B03030',
  info:        '#2A60B0',

  // ── Overlays (açık)
  overlay1: 'rgba(253,251,234,0.55)',
  overlay2: 'rgba(253,251,234,0.80)',
  overlay3: 'rgba(253,251,234,0.95)',

  // ── Glass (açık cam)
  glass1: 'rgba(255,253,230,0.60)',
  glass2: 'rgba(255,253,230,0.80)',
  glass3: 'rgba(255,253,230,0.95)',
  glassGold: 'rgba(212,146,10,0.10)',
  glassRose: 'rgba(180,72,42,0.08)',

  // ── Gradients
  gradients: {
    rose:         ['#8C3820', '#CC6E50'] as const,
    roseDark:     ['#6A2818', '#B4482A'] as const,
    gold:         ['#C0A030', '#E8B020'] as const,
    goldDark:     ['#8A7020', '#D4920A'] as const,
    light:        ['#FDFBEA', '#FFFEF5'] as const,
    lightReverse: ['#FFFEF5', '#FDFBEA'] as const,
    surface:      ['#FFFEF5', '#FFF8D0'] as const,
    hero:         ['#FDFBEA', '#FFF8D0', '#FFFEF5'] as const,
    card:         ['rgba(255,254,245,0.97)', 'rgba(253,251,234,0.99)'] as const,
    roseToTrans:  ['#B4482A', 'rgba(180,72,42,0)'] as const,
    transToRose:  ['rgba(180,72,42,0)', '#B4482A'] as const,
    teal:         ['#1E7A62', '#3AAA88'] as const,
    heroFull:     ['#FFF8D0', '#FFFEF5', '#FDFBEA'] as const,
  },
};

export type ColorKey = keyof typeof Colors;
