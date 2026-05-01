export const Colors = {
  // ── Backgrounds — void noir (siyah kağıt dokusu)
  bg:       '#07070C',
  surface1: '#0C0C16',
  surface2: '#11111E',
  surface3: '#171728',
  surface4: '#1D1D30',

  // ── Terracotta / Cognac — birincil CTA (brick tonu, ordan rafine)
  rose1: '#6A2818',
  rose2: '#8C3820',
  rose3: '#B4482A',  // primary CTA
  rose4: '#CC6E50',
  rose5: '#E4A488',
  roseGlow:       'rgba(180,72,42,0.12)',
  roseGlowStrong: 'rgba(180,72,42,0.26)',

  // ── Açık Sarı / Altın — ana accent
  gold1: '#8A7020',
  gold2: '#C0A030',
  gold3: '#E8C040',  // primary — açık sarı
  gold4: '#F0D060',
  gold5: '#F8ECA0',
  goldGlow:       'rgba(232,192,64,0.14)',
  goldGlowStrong: 'rgba(232,192,64,0.30)',

  // ── Teal (minimal; tracking ekranı)
  teal1: '#124C3C',
  teal2: '#1E7A62',
  teal3: '#3AAA88',
  tealGlow: 'rgba(30,122,98,0.12)',

  // ── Purple (minimal; vurgu)
  purple1: '#2E1070',
  purple2: '#4A22AA',
  purple3: '#6E48D8',
  purple4: '#9A84F0',
  purpleGlow: 'rgba(74,34,170,0.10)',

  // ── Text — warm cream hierarchy
  text1: '#E8E2D4',  // primary cream
  text2: '#BEBAAA',  // secondary
  text3: '#847A6C',  // tertiary
  text4: '#524A40',  // quaternary
  text5: '#302C24',  // barely visible

  // ── Borders — ultra-thin hairlines
  border1: 'rgba(232,226,212,0.05)',
  border2: 'rgba(232,226,212,0.09)',
  border3: 'rgba(232,226,212,0.15)',
  borderGold: 'rgba(232,192,64,0.28)',
  borderRose: 'rgba(180,72,42,0.22)',

  // ── Status
  success:     '#368A6C',
  successGlow: 'rgba(54,138,108,0.13)',
  warning:     '#B48440',
  error:       '#BC3C3C',
  info:        '#4470B8',

  // ── Overlays (koyu)
  overlay1: 'rgba(7,7,12,0.55)',
  overlay2: 'rgba(7,7,12,0.78)',
  overlay3: 'rgba(7,7,12,0.94)',

  // ── Glass (koyu cam — frosted dark)
  glass1: 'rgba(12,12,22,0.55)',
  glass2: 'rgba(12,12,22,0.75)',
  glass3: 'rgba(12,12,22,0.92)',
  glassGold: 'rgba(232,192,64,0.10)',
  glassRose: 'rgba(180,72,42,0.08)',

  // ── Gradients
  gradients: {
    rose:         ['#8C3820', '#CC6E50'] as const,
    roseDark:     ['#6A2818', '#B4482A'] as const,
    gold:         ['#C0A030', '#F0D060'] as const,
    goldDark:     ['#8A7020', '#E8C040'] as const,
    light:        ['#07070C', '#0C0C16'] as const,
    lightReverse: ['#0C0C16', '#07070C'] as const,
    surface:      ['#0C0C16', '#11111E'] as const,
    hero:         ['#07070C', '#0C0C16', '#09090F'] as const,
    card:         ['rgba(12,12,22,0.96)', 'rgba(7,7,12,0.99)'] as const,
    roseToTrans:  ['#B4482A', 'rgba(180,72,42,0)'] as const,
    transToRose:  ['rgba(180,72,42,0)', '#B4482A'] as const,
    teal:         ['#1E7A62', '#3AAA88'] as const,
    heroFull:     ['#09090F', '#0C0C16', '#07070C'] as const,
  },
};

export type ColorKey = keyof typeof Colors;
