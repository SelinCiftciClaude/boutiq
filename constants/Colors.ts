// ── BUTİKA Renk Sistemi — "Tente" tasarım dili ──────────────────────────────
// Logodaki tenteden çıkarılan 3 ana renk:
//   Burgund   #6B1520  → dikkat, CTA, aktif, logo
//   Sıcak Krem #F5E8C0 → zemin, davetkar, sıcak
//   Periwinkle #8FA8C8  → sakin, bilgi, ikincil

export const Colors = {
  // ── Arka plan — sıcak krem, tente kumaşı
  bg:       '#FAF6E8',
  surface1: '#FFF9EE',
  surface2: '#FFF4DA',
  surface3: '#FAECC4',
  surface4: '#F0E0A8',

  // ── Burgund — ana accent (logo rengi, CTA)
  rose1: '#3A0810',
  rose2: '#521015',
  rose3: '#6B1520',  // birincil burgund
  rose4: '#8C2535',
  rose5: '#B05060',
  roseGlow:       'rgba(107,21,32,0.10)',
  roseGlowStrong: 'rgba(107,21,32,0.22)',

  // ── Sıcak Altın / Hardal — tente sarı şeridi
  gold1: '#7A5A10',
  gold2: '#A87A18',
  gold3: '#C89A28',  // ana altın
  gold4: '#E0B840',
  gold5: '#F5D870',
  goldGlow:       'rgba(200,154,40,0.15)',
  goldGlowStrong: 'rgba(200,154,40,0.30)',

  // ── Periwinkle Mavi — tente mavi şeridi (sakin alanlar)
  teal1: '#4A6080',
  teal2: '#6A88A8',
  teal3: '#8FA8C8',  // ana periwinkle
  teal4: '#B0C8E0',
  teal5: '#D4E4F0',
  tealGlow: 'rgba(143,168,200,0.18)',

  // ── Purple (minimal)
  purple1: '#3A2060',
  purple2: '#5A3890',
  purple3: '#7A58B8',
  purple4: '#A088D8',
  purpleGlow: 'rgba(90,56,144,0.10)',

  // ── Metin — koyu sıcak kahve
  text1: '#1C0E08',   // neredeyse siyah, ılık ton
  text2: '#3C2415',
  text3: '#705038',
  text4: '#A08060',
  text5: '#C8B090',

  // ── Kenarlıklar
  border1: 'rgba(28,14,8,0.07)',
  border2: 'rgba(28,14,8,0.12)',
  border3: 'rgba(28,14,8,0.18)',
  borderBurgund: 'rgba(107,21,32,0.30)',
  borderRose:    'rgba(107,21,32,0.30)',
  borderGold:    'rgba(200,154,40,0.35)',
  borderBlue:    'rgba(143,168,200,0.40)',

  // ── Status
  success:     '#1A6A40',
  successGlow: 'rgba(26,106,64,0.12)',
  warning:     '#B07A10',
  error:       '#8C1520',
  info:        '#4A6888',

  // ── Overlays (açık zemin)
  overlay1: 'rgba(250,246,232,0.60)',
  overlay2: 'rgba(250,246,232,0.82)',
  overlay3: 'rgba(250,246,232,0.96)',

  // ── Glass
  glass1: 'rgba(255,249,238,0.65)',
  glass2: 'rgba(255,249,238,0.82)',
  glass3: 'rgba(255,249,238,0.96)',
  glassGold:    'rgba(200,154,40,0.10)',
  glassRose:    'rgba(107,21,32,0.08)',
  glassBlue:    'rgba(143,168,200,0.15)',

  // ── Stripe (tente şerit dokusu için)
  stripeWarm: '#F0E0A0',   // sıcak şerit
  stripeCool: '#C8D8E8',   // mavi şerit

  // ── Gradients
  gradients: {
    rose:         ['#521015', '#8C2535'] as const,
    roseDark:     ['#3A0810', '#6B1520'] as const,
    gold:         ['#A87A18', '#E0B840'] as const,
    goldDark:     ['#7A5A10', '#C89A28'] as const,
    blue:         ['#6A88A8', '#B0C8E0'] as const,
    light:        ['#FAF6E8', '#FFF9EE'] as const,
    lightReverse: ['#FFF9EE', '#FAF6E8'] as const,
    surface:      ['#FFF9EE', '#FFF4DA'] as const,
    hero:         ['#FAF6E8', '#FFF4DA', '#FAF0D0'] as const,
    card:         ['rgba(255,249,238,0.97)', 'rgba(250,246,232,0.99)'] as const,
    stripe:       ['#F5E8C0', '#C8D8E8'] as const,  // tente şeridi
    roseToTrans:  ['#6B1520', 'rgba(107,21,32,0)'] as const,
    transToRose:  ['rgba(107,21,32,0)', '#6B1520'] as const,
    teal:         ['#6A88A8', '#8FA8C8'] as const,
    heroFull:     ['#FFF4DA', '#FAF6E8', '#FFF9EE'] as const,
  },
};

export type ColorKey = keyof typeof Colors;
