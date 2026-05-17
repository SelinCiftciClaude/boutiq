// ── BUTIKA Renk Sistemi — "Stone & Linen" tasarım dili ──────────────────────
// Editoryal, sakin, minimal premium his.
// Zemin: kırık beyaz/taş. Metin: antrasit. Vurgu: neredeyse yok.

export const Colors = {
  // ── Arka plan — taş/kırık beyaz
  bg:       '#F4F1EC',
  surface1: '#FAF8F4',
  surface2: '#F5F2ED',
  surface3: '#EDEBE5',
  surface4: '#E5E2DB',

  // ── Ana aksiyon rengi — antrasit (eski burgund yerine)
  rose1: '#0F0F0F',
  rose2: '#1A1A1A',
  rose3: '#1C1C1C',   // CTA, aktif, birincil eylem
  rose4: '#2E2E2E',
  rose5: '#4A4A4A',
  roseGlow:       'rgba(28,28,28,0.06)',
  roseGlowStrong: 'rgba(28,28,28,0.14)',

  // ── Warm greige — ikincil vurgu (eski altın yerine)
  gold1: '#5C5248',
  gold2: '#7A6F63',
  gold3: '#8A8068',   // warm greige ana ton
  gold4: '#A89E90',
  gold5: '#C8C0B4',
  goldGlow:       'rgba(138,128,104,0.10)',
  goldGlowStrong: 'rgba(138,128,104,0.20)',

  // ── Nötr gri — bilgi, ikincil (eski periwinkle yerine)
  teal1: '#5A5A5A',
  teal2: '#787878',
  teal3: '#9A9A9A',
  teal4: '#BABABA',
  teal5: '#DEDEDE',
  tealGlow: 'rgba(90,90,90,0.08)',

  // ── Purple (minimal, nötrleştirildi)
  purple1: '#2A2A2A',
  purple2: '#3A3A3A',
  purple3: '#5A5A5A',
  purple4: '#7A7A7A',
  purpleGlow: 'rgba(58,58,58,0.06)',

  // ── Metin — temiz antrasit skalası
  text1: '#1A1A1A',   // birincil metin
  text2: '#3D3D3D',   // ikincil metin
  text3: '#6B6B6B',   // üçüncül metin
  text4: '#9E9E9E',   // yardımcı metin
  text5: '#C7C7C7',   // en soluk metin

  // ── Kenarlıklar — çok hafif
  border1: 'rgba(26,26,26,0.06)',
  border2: 'rgba(26,26,26,0.10)',
  border3: 'rgba(26,26,26,0.16)',
  borderBurgund: 'rgba(26,26,26,0.18)',
  borderRose:    'rgba(26,26,26,0.18)',
  borderGold:    'rgba(138,128,104,0.22)',
  borderBlue:    'rgba(90,90,90,0.18)',

  // ── Status (ayırt edici ama sakin)
  success:     '#2D7A5A',
  successGlow: 'rgba(45,122,90,0.10)',
  warning:     '#8A6A30',
  error:       '#9E3030',
  info:        '#5A6A7A',

  // ── Overlays
  overlay1: 'rgba(244,241,236,0.60)',
  overlay2: 'rgba(244,241,236,0.82)',
  overlay3: 'rgba(244,241,236,0.96)',

  // ── Glass
  glass1: 'rgba(250,248,244,0.65)',
  glass2: 'rgba(250,248,244,0.82)',
  glass3: 'rgba(250,248,244,0.96)',
  glassGold:    'rgba(138,128,104,0.08)',
  glassRose:    'rgba(28,28,28,0.05)',
  glassBlue:    'rgba(90,90,90,0.08)',

  // ── Stripe (doku için)
  stripeWarm: '#E8E4DC',
  stripeCool: '#DEDEDE',

  // ── Gradients
  gradients: {
    rose:         ['#1A1A1A', '#2E2E2E'] as const,
    roseDark:     ['#0F0F0F', '#1C1C1C'] as const,
    gold:         ['#7A6F63', '#A89E90'] as const,
    goldDark:     ['#5C5248', '#8A8068'] as const,
    blue:         ['#787878', '#BABABA'] as const,
    light:        ['#F4F1EC', '#FAF8F4'] as const,
    lightReverse: ['#FAF8F4', '#F4F1EC'] as const,
    surface:      ['#FAF8F4', '#F5F2ED'] as const,
    hero:         ['#F4F1EC', '#FAF8F4', '#F0EDE8'] as const,
    card:         ['rgba(250,248,244,0.97)', 'rgba(244,241,236,0.99)'] as const,
    stripe:       ['#E8E4DC', '#DEDEDE'] as const,
    roseToTrans:  ['#1C1C1C', 'rgba(28,28,28,0)'] as const,
    transToRose:  ['rgba(28,28,28,0)', '#1C1C1C'] as const,
    teal:         ['#787878', '#9A9A9A'] as const,
    heroFull:     ['#F5F2ED', '#F4F1EC', '#FAF8F4'] as const,
  },
};

export type ColorKey = keyof typeof Colors;
