// ════ SCENE (French cut: the driver) ═══════════════════════════════════════
// Act 1 (0–10): an offer, the maths, the car ahead brakes, a near-miss. The turn (10–10.8): the scene rewinds.
// Act 2 (10.8–17): the same road with RideSentinel: one glance, eyes up, a calm stop. Then the cards and the end card.
const TL = {
  turn: 10.0, rewind: [10.0, 10.8], act2: 10.8, dialIn: 11.7,
  offers: [
    { arrive: 0, swing: [99, 99], stamp: 99, leave: 10.0, life: 9.0 },      // act 1: never scored; it expires at 9 s
    { arrive: 11.6, swing: [11.95, 12.6], stamp: 12.65, leave: 99 },
  ],
  leadBrake1: 5.0, react: 6.5, stop: 7.35,
  glance: [12.0, 12.95], leadBrake2: 14.3, brake2: 14.6,
  chipsIn: 17.0, chips: [17.2, 17.9, 18.6], chipsOut: 20.3,
  end: 20.8, markArc: [20.85, 21.4], markNeedle: [21.25, 21.75], word: 21.6, line: 21.95, url: 22.25, cta: 22.5, fine: 22.75,
  fadeOut: [25.45, 26],
};
const OFFERS = [
  { ...L.offers[0], value: 23, verdict: 'PASS', word: L.pass_, col: 'rose', route: [[520, 1120], [488, 1050], [452, 985], [398, 930], [366, 850], [318, 770], [292, 690]] },
  { ...L.offers[1], value: 52, verdict: 'TAKE', word: L.take, col: 'teal', route: [[520, 1120], [556, 1062], [602, 1000], [640, 930], [700, 868], [738, 790]] },
];
const BAR = 40, VMAX = 80;
// the maths around his head: [t, x, y, text, size, colour, rot°, kind]
const FRAGS = [
  [1.00, 330, 640, '18,40 ÷ 38 min', 42, 'ink', -5, 'chip'],
  [1.25, 720, 690, '× 60 = ?', 48, 'amber', 6, 'chip'],
  [1.50, 170, 770, '$/km ?', 46, 'ink', -9, 'chip'],
  [1.80, 660, 870, '29 $/h ?', 50, 'amber', 4, 'chip'],
  [2.05, 170, 1000, 'retour à vide ?', 38, 'rose', -6, 'chip'],
  [2.30, 560, 600, 'plus de 40 $/h ??', 40, 'rose', 3, 'chip'],
  [2.55, 910, 820, '?', 110, 'amber', 12, 'sym'],
  [2.80, 520, 990, '+ essence ?', 42, 'ink', 5, 'chip'],
  [3.00, 230, 1130, 'batterie 34 %', 36, 'muted', -7, 'chip'],
  [3.20, 700, 1250, 'prise en charge 7 min…', 32, 'muted', 6, 'chip'],
  [3.40, 110, 640, '÷', 90, 'ink', -8, 'sym'],
  [3.60, 870, 1000, '0,82/km', 40, 'ink', -4, 'chip'],
  [3.80, 880, 1140, '??', 100, 'rose', 8, 'sym'],
  [4.00, 930, 610, '×', 90, 'amber', 10, 'sym'],
  [4.20, 470, 1200, '38 + 22 min…', 40, 'ink', 3, 'chip'],
  [4.45, 150, 1290, '= ?', 80, 'rose', -6, 'sym'],
];
const CHIPS = [{ icon: 'sliders', col: 'amber' }, { icon: 'bolt', col: 'teal' }, { icon: 'lock', col: 'rose' }].map((c, i) => ({ ...c, ...L.chips[i] }));

// phone geometry (its own design space; placed on the dashboard by PH below)
const CX = 520;
const PHONE = { x: 210, y: 560, w: 620, h: 1500, r: 80 };
const SCR = { x: 224, y: 574, w: 592, h: 1472, r: 68 };
const CARD = { x: 242, y: 1188, w: 556, h: 262, r: 30 };
const PANEL = { x: 252, y: 662, w: 536, h: 506, r: 34 };
const HUB = { x: CX, y: 925 }, DR = 168;
const PH = { x: 770, y: 1095, s: .36, rot: -.035 };           // the phone in its mount, right of the wheel

// the street: a pinhole camera at the driver's eyes
const VPX = 470, VPY = 620, KF = 1300, HC = 1.25;
const proj = (lat, h, z) => [VPX + lat * KF / z, VPY + (HC - h) * KF / z];
