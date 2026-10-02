'use strict';

// ─── format ─────────────────────────────────────────────────────────────────
const W = 1080, H = 1920, DURATION = 26;
const TAU = Math.PI * 2, PI = Math.PI;
const SS = Math.max(1, Math.round(Number(new URLSearchParams(location.search).get('ss')) || 1));
function supersample(g, k) {
  if (k === 1) return g;
  const C2 = CanvasRenderingContext2D.prototype, st = C2.setTransform;
  g.setTransform = function (a, b, c, d, e, f) { return st.call(this, a * k, b * k, c * k, d * k, e * k, f * k); };
  g.resetTransform = function () { return st.call(this, k, 0, 0, k, 0, 0); };
  for (const p of ['shadowBlur', 'shadowOffsetX', 'shadowOffsetY']) {
    const d = Object.getOwnPropertyDescriptor(C2, p);
    Object.defineProperty(g, p, { get() { return d.get.call(this) / k; }, set(v) { d.set.call(this, v * k); } });
  }
  const fd = Object.getOwnPropertyDescriptor(C2, 'filter');
  Object.defineProperty(g, 'filter', { get() { return fd.get.call(this); }, set(v) { fd.set.call(this, String(v).replace(/(-?[\d.]+)px/g, (m, n) => `${+n * k}px`)); } });
  g.setTransform(1, 0, 0, 1, 0, 0);
  return g;
}
const cv = document.getElementById('c');
cv.width = W * SS; cv.height = H * SS;
cv.style.aspectRatio = `${W} / ${H}`;
const ctx = supersample(cv.getContext('2d'), SS);

// ─── utils ──────────────────────────────────────────────────────────────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeIO = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const easeOut = x => 1 - Math.pow(1 - clamp(x), 3);
const easeIn = x => Math.pow(clamp(x), 3);
const easeBack = (x, s = 1.70158) => { x = clamp(x); return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const lerp = (a, b, k) => a + (b - a) * k;
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const frac = x => x - Math.floor(x);
function rng(seed) {
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const table = (n, seed, f) => Array.from({ length: n }, (_, i) => f(rng(seed + i * 7919), i));
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

// ─── brand ──────────────────────────────────────────────────────────────────
const C = { navy: '#0C1220', deep: '#080D18', surface: '#131B2C', raised: '#1B2538', line: '#28344E',
            ink: '#EEF1F7', muted: '#A6B0C3', amber: '#F5B041', teal: '#2ED3B7', rose: '#FF5C6C' };
const RGB = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, hex(v)]));
const LANG = window.FILM_LANG || 'en', L = window.LANGS[LANG], RTL = L.dir === 'rtl';
const EXTRA = { en: '', pt: '', ar: ', "IBM Plex Sans Arabic"', zh: ', "Noto Sans SC"' }[LANG] ?? '';
const F = {
  head: (n, w = 800) => `${w} ${n}px "Barlow Condensed"${EXTRA}`,
  sans: (n, w = 500) => `${w} ${n}px "IBM Plex Sans"${EXTRA}`,
  mono: (n, w = 600) => `${w} ${n}px "IBM Plex Mono"${EXTRA}`,
};
const LS = k => RTL ? 0 : LANG === 'zh' ? k * .5 : k;          // tracking breaks Arabic joining; CJK wants less
const mxr = x => RTL ? 2 * CXM - x : x;                         // mirror a phone-local x for right-to-left
const CXM = 520;
const resize = (font, k) => font.replace(/([\d.]+)px/, (m, n) => `${(+n * k).toFixed(2)}px`);

// text drawn straight into the (supersampled) context: crisp at any SS, pure in t
function text(s, x, y, font, color, o = {}) {
  let { align = 'center', ls = 0, alpha = 1, glow = null, maxW = 0 } = o;
  ls = LS(ls);
  ctx.save();
  ctx.direction = RTL ? 'rtl' : 'ltr';
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.letterSpacing = ls + 'px';
  if (maxW) { const w = ctx.measureText(s).width; if (w > maxW) ctx.font = resize(font, maxW / w); }
  ctx.globalAlpha *= alpha;
  if (glow) { ctx.shadowColor = glow[0]; ctx.shadowBlur = glow[1]; }
  ctx.fillText(s, x + (align === 'center' ? ls / 2 : 0), y);
  ctx.restore();
}
// one line in several colours / fonts: segs = [[str, color, font?]]
function rich(segs, cx, y, font, o = {}) {
  let { ls = 0, alpha = 1, align = 'center', maxW = 860 } = o;
  ls = LS(ls);
  segs = segs.filter(([s]) => s).map(([s, col, f]) => [s, C[col] || col || C.ink, f]);
  ctx.save(); ctx.textBaseline = 'middle'; ctx.letterSpacing = ls + 'px'; ctx.globalAlpha *= alpha;
  ctx.direction = RTL ? 'rtl' : 'ltr'; ctx.textAlign = RTL ? 'right' : 'left';
  let ws = segs.map(([s, , f]) => { ctx.font = f || font; return ctx.measureText(s).width; });
  let total = ws.reduce((a, b) => a + b, 0), k = total > maxW ? maxW / total : 1;
  ws = ws.map(w => w * k); total *= k;
  // right-to-left: the first segment sits at the right
  let x = RTL ? (align === 'center' ? cx + total / 2 : cx) : (align === 'center' ? cx - total / 2 : cx);
  segs.forEach(([s, col, f], i) => { ctx.font = resize(f || font, k); ctx.fillStyle = col; ctx.fillText(s, x, y); x += RTL ? -ws[i] : ws[i]; });
  ctx.restore();
}
// a caption's life: rise + focus pull in, soft out. Returns the progress, or 0 when not on screen.
function life(t, t0, t1, rise = .45, fall = .3) {
  if (t < t0 || t > t1) return null;
  return { p: easeOut((t - t0) / rise), out: 1 - smooth((t - (t1 - fall)) / fall) };
}
function reveal(l, fn, dy = 22) {
  if (!l) return;
  const a = l.p * l.out; if (a <= .004) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, (1 - l.p) * dy);
  const b = (1 - l.p) * 7; if (b > .3) ctx.filter = `blur(${b.toFixed(1)}px)`;
  fn(); ctx.restore();
}

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

// ─── baked once: bokeh sprite and the map ───────────────────────────────────
const BOKEH = (() => {
  const s = 128, [c, x] = canvas(s * SS, s * SS);
  const g = x.createRadialGradient(s * SS / 2, s * SS / 2, 0, s * SS / 2, s * SS / 2, s * SS / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.55, 'rgba(255,255,255,.85)'); g.addColorStop(.8, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, s * SS, s * SS); return c;
})();
const TINTED = {};
for (const k of ['amber', 'rose', 'ink', 'teal']) {
  const [c, x] = canvas(BOKEH.width, BOKEH.height);
  x.drawImage(BOKEH, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = C[k]; x.fillRect(0, 0, c.width, c.height);
  TINTED[k] = c;
}
const LIGHTS = table(46, 77, (r, i) => {
  const kinds = ['amber', 'amber', 'amber', 'rose', 'rose', 'ink', 'teal'];
  const kind = kinds[Math.floor(r() * kinds.length)];
  const a = kind === 'rose' ? PI * (.35 + r() * .3) : -PI * (.05 + r() * .9) + (r() < .3 ? PI : 0);
  return { a, kind, ph: r(), sp: .05 + r() * .06, s: 40 + r() * 110, al: .10 + r() * .22 };
});
const MAP = (() => {
  const w = SCR.w, h = 640, [c, x] = canvas(w * SS, h * SS); x.scale(SS, SS);
  x.fillStyle = '#0E1527'; x.fillRect(0, 0, w, h);
  const r = rng(31);
  // a river
  x.strokeStyle = '#112340'; x.lineWidth = 46; x.lineCap = 'round'; x.beginPath();
  x.moveTo(-40, 140); x.bezierCurveTo(160, 90, 300, 260, 640, 180); x.stroke();
  // parks
  x.fillStyle = '#0F1D26';
  for (let i = 0; i < 6; i++) { x.beginPath(); x.roundRect(r() * w, 250 + r() * 360, 60 + r() * 90, 40 + r() * 70, 8); x.fill(); }
  // streets: a rotated grid, every third street a main road
  x.save(); x.translate(w / 2, h / 2); x.rotate(.21);
  for (let i = -12; i <= 12; i++) {
    const main = i % 3 === 0, off = i * 58 + (r() - .5) * 14;
    x.strokeStyle = main ? '#1D2941' : '#162036'; x.lineWidth = main ? 9 : 4;
    x.beginPath(); x.moveTo(-800, off); x.lineTo(800, off); x.stroke();
    x.beginPath(); x.moveTo(off * 1.15, -800); x.lineTo(off * 1.15, 800); x.stroke();
  }
  x.restore();
  return { c, w, h };
})();

// ─── background: a night street through the windscreen ─────────────────────
function drawBackground(t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0A0F1C'); g.addColorStop(.55, C.navy); g.addColorStop(1, '#070B14');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const hz = ctx.createRadialGradient(W * .78, -120, 0, W * .78, -120, 1100);
  hz.addColorStop(0, 'rgba(245,176,65,.20)'); hz.addColorStop(1, 'rgba(245,176,65,0)');
  ctx.fillStyle = hz; ctx.fillRect(0, 0, W, H);
  // lights stream outward from a vanishing point, as if we were driving
  const vp = { x: CX, y: 760 };
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const endK = 1 - .7 * smooth((t - TL.end) / .8);
  for (const L of LIGHTS) {
    const p = frac(L.ph + t * L.sp), d = 80 + p * p * 1300;
    const x = vp.x + Math.cos(L.a) * d, y = vp.y + Math.sin(L.a) * d * .75;
    const s = L.s * (.35 + p * 1.3);
    ctx.globalAlpha = Math.sin(p * PI) * L.al * endK;
    ctx.drawImage(TINTED[L.kind], x - s / 2, y - s / 2, s, s);
  }
  ctx.restore();
}

// ─── phone, map, card, dial ─────────────────────────────────────────────────
function phonePath(g, R) { g.beginPath(); g.roundRect(R.x, R.y, R.w, R.h, R.r); }
function countdownOf(i, t) {
  const o = TL.offers[i];
  if (i === 0) return Math.max(0, o.life - t);
  return 15 - (Math.min(t, o.stamp) - o.arrive);
}
function verdictK(i, t) { return smooth((t - TL.offers[i].stamp) / .15); }

function drawCard(i, t, dy) {
  const O = OFFERS[i], o = TL.offers[i];
  ctx.save(); ctx.translate(0, dy);
  // card
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = -6;
  ctx.fillStyle = C.surface; phonePath(ctx, CARD); ctx.fill();
  ctx.restore();
  const vk = verdictK(i, t);
  ctx.strokeStyle = rgba(mix(RGB.line, RGB[O.col], vk * .8)); ctx.lineWidth = 2; phonePath(ctx, CARD); ctx.stroke();
  // grabber
  ctx.fillStyle = C.line; ctx.beginPath(); ctx.roundRect(CX - 34, CARD.y + 12, 68, 6, 3); ctx.fill();
  // fare and details
  const al = RTL ? 'right' : 'left', tw = CARD.w - 150;
  text(O.fare, mxr(CARD.x + 30), CARD.y + 66, F.head(92), C.ink, { align: al });
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(mxr(CARD.x + 38), CARD.y + 138, 7, 0, TAU); ctx.fill();
  text(O.away, mxr(CARD.x + 58), CARD.y + 138, F.sans(31), C.muted, { align: al, maxW: CARD.w - 90 });
  ctx.fillStyle = C.ink; ctx.fillRect(mxr(CARD.x + 38) - 7, CARD.y + 176, 14, 14);
  text(O.trip, mxr(CARD.x + 58), CARD.y + 183, F.sans(31), C.muted, { align: al, maxW: CARD.w - 90 });
  text(O.drop, mxr(CARD.x + 30), CARD.y + 228, F.sans(29, 600), i === 0 ? rgba(mix(RGB.muted, RGB.rose, vk), 1) : C.muted, { align: al, maxW: CARD.w - 60 });
  // countdown ring
  const rem = countdownOf(i, t), rx = mxr(CARD.x + CARD.w - 62), ry = CARD.y + 66, rr = 34;
  let rc = i === 0 && t < TL.turn ? mix(RGB.amber, RGB.rose, smooth((t - 1.8) / 2)) : RGB.amber;
  rc = mix(rc, RGB[O.col], vk);
  ctx.lineCap = 'round'; ctx.lineWidth = 7;
  ctx.strokeStyle = C.line; ctx.beginPath(); ctx.arc(rx, ry, rr, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(rc); ctx.beginPath(); ctx.arc(rx, ry, rr, -PI / 2, -PI / 2 + TAU * clamp(rem / 15)); ctx.stroke();
  const pulse = vk > 0 ? Math.max(0, 1 - (t - o.stamp) / .6) : 0;
  if (pulse > 0) { ctx.strokeStyle = rgba(rc, pulse * .8); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(rx, ry, rr + 6 + (1 - pulse) * 26, 0, TAU); ctx.stroke(); }
  text(String(Math.ceil(rem - 1e-6)), rx, ry + 2, F.mono(30), rgba(mix(RGB.ink, rc, vk)));
  if (i === 0 && t >= o.life) {                             // act 1: the offer runs out while he is shaking
    const k = smooth((t - o.life) / .3);
    ctx.fillStyle = `rgba(12,18,32,${.82 * k})`; phonePath(ctx, CARD); ctx.fill();
    text(L.expired, CX, CARD.y + CARD.h / 2, F.head(76, 700), C.muted, { alpha: k, maxW: CARD.w - 40 });
  }
  // the platform's own Accept button: RideSentinel only advises, so it just lights with the verdict
  const take = O.verdict === 'TAKE', by = CARD.y + CARD.h + 24;
  ctx.save(); ctx.globalAlpha *= take ? 1 : 1 - .45 * vk;
  ctx.fillStyle = C.raised; ctx.beginPath(); ctx.roundRect(CARD.x, by, CARD.w, 96, 48); ctx.fill();
  ctx.strokeStyle = rgba(mix(RGB.line, RGB[O.col], take ? vk : 0)); ctx.lineWidth = take ? 3 : 2;
  ctx.beginPath(); ctx.roundRect(CARD.x, by, CARD.w, 96, 48); ctx.stroke();
  text(L.accept, CX, by + 49, F.sans(36, 600), rgba(mix(RGB.ink, RGB[O.col], take ? vk : 0)));
  ctx.restore();
  ctx.restore();
}

function drawRoute(i, t, alpha) {
  const pts = OFFERS[i].route;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = () => { ctx.beginPath(); pts.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); };
  ctx.strokeStyle = 'rgba(238,241,247,.14)'; ctx.lineWidth = 20; path(); ctx.stroke();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 7; path(); ctx.stroke();
  ctx.setLineDash([2, 18]); ctx.lineDashOffset = -t * 40; ctx.strokeStyle = C.navy; ctx.lineWidth = 3; path(); ctx.stroke(); ctx.setLineDash([]);
  // drop-off pin
  const [px, py] = pts[pts.length - 1];
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(px, py, 14, 0, TAU); ctx.fill();
  ctx.fillStyle = C.navy; ctx.fillRect(px - 5, py - 5, 10, 10);
  // the car
  const [cx0, cy0] = pts[0];
  ctx.fillStyle = 'rgba(245,176,65,.25)'; ctx.beginPath(); ctx.arc(cx0, cy0, 30 + 4 * Math.sin(t * 5), 0, TAU); ctx.fill();
  ctx.fillStyle = C.amber; ctx.beginPath(); ctx.moveTo(cx0, cy0 - 18); ctx.lineTo(cx0 + 13, cy0 + 14); ctx.lineTo(cx0, cy0 + 7); ctx.lineTo(cx0 - 13, cy0 + 14); ctx.closePath(); ctx.fill();
  ctx.restore();
}

const angleOf = v => PI + clamp(v / VMAX, 0, 1.06) * PI;
function dialValue(t) {
  const [a, b] = TL.offers, sw = (o, from, to) => lerp(from, to, easeBack((t - o.swing[0]) / (o.swing[1] - o.swing[0]), 1.3));
  if (t < b.swing[0]) return 0;
  return sw(b, 0, OFFERS[1].value);
}
function drawDial(t) {
  const appear = easeBack((t - TL.dialIn) / .45, 1.2), vis = smooth((t - TL.dialIn) / .2);
  if (vis <= 0) return;
  const i = t < TL.offers[0].leave + .25 ? 0 : 1, O = OFFERS[i], o = TL.offers[i];
  const vk = verdictK(i, t), col = RGB[O.col];
  const gone = i === 0 ? smooth((t - (o.leave - .1)) / .25) : 0;          // verdict clears between offers
  const vkShow = vk * (1 - gone);
  ctx.save(); ctx.globalAlpha *= vis;
  ctx.translate(HUB.x, HUB.y); ctx.scale(lerp(.9, 1, appear), lerp(.9, 1, appear)); ctx.translate(-HUB.x, -HUB.y);
  // panel
  ctx.save(); ctx.shadowColor = rgba(col, .35 * vkShow); ctx.shadowBlur = 50;
  ctx.fillStyle = 'rgba(10,15,27,.94)'; phonePath(ctx, PANEL); ctx.fill(); ctx.restore();
  ctx.strokeStyle = rgba(mix(RGB.line, col, vkShow)); ctx.lineWidth = 2.5; phonePath(ctx, PANEL); ctx.stroke();
  // track, minor ticks, the bar tick
  const draw = easeOut((t - (TL.dialIn + .05)) / .55);
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.line; ctx.lineWidth = 28;
  ctx.beginPath(); ctx.arc(HUB.x, HUB.y, DR, PI, PI + PI * draw); ctx.stroke();
  ctx.strokeStyle = 'rgba(166,176,195,.35)'; ctx.lineWidth = 3;
  for (let v = 0; v <= VMAX; v += 10) {
    if (v / VMAX > draw + .001) continue;
    const a = angleOf(v); ctx.beginPath();
    ctx.moveTo(HUB.x + Math.cos(a) * (DR - 30), HUB.y + Math.sin(a) * (DR - 30));
    ctx.lineTo(HUB.x + Math.cos(a) * (DR - 42), HUB.y + Math.sin(a) * (DR - 42)); ctx.stroke();
  }
  const barK = smooth((t - (TL.dialIn + .45)) / .25);
  if (barK > 0) {
    const a = angleOf(BAR);
    ctx.save(); ctx.globalAlpha *= barK;
    ctx.strokeStyle = C.amber; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(HUB.x + Math.cos(a) * (DR + 22), HUB.y + Math.sin(a) * (DR + 22));
    ctx.lineTo(HUB.x + Math.cos(a) * (DR + 44), HUB.y + Math.sin(a) * (DR + 44)); ctx.stroke();
    text(L.yourBar, HUB.x, HUB.y - DR - 68, F.mono(22, 600), C.amber, { ls: 3 });
    ctx.restore();
  }
  // value arc and needle
  const v = dialValue(t), a = angleOf(v);
  const fill = mix(RGB.amber, col, vkShow);
  if (v > .2) {
    ctx.save(); ctx.shadowColor = rgba(fill, .6); ctx.shadowBlur = 24;
    ctx.strokeStyle = rgba(fill); ctx.lineWidth = 28; ctx.beginPath(); ctx.arc(HUB.x, HUB.y, DR, PI, a); ctx.stroke(); ctx.restore();
  }
  if (draw > .6) {
    ctx.save(); ctx.globalAlpha *= smooth((draw - .6) / .4);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 11;
    ctx.beginPath(); ctx.moveTo(HUB.x - Math.cos(a) * 16, HUB.y - Math.sin(a) * 16);
    ctx.lineTo(HUB.x + Math.cos(a) * (DR - 46), HUB.y + Math.sin(a) * (DR - 46)); ctx.stroke();
    ctx.fillStyle = 'rgba(10,15,27,1)'; ctx.beginPath(); ctx.arc(HUB.x, HUB.y, 24, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(fill); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(HUB.x, HUB.y, 21, 0, TAU); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(HUB.x, HUB.y, 9, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // the offer's $/hr
  const valK = smooth((t - (TL.dialIn + .4)) / .3);
  if (valK > 0) {
    const shown = `${Math.round(Math.max(0, v))}`;
    { const segs = [[shown, rgba(mix(RGB.ink, col, vkShow)), F.mono(56, 600)], [L.perHr, C.muted, F.mono(30, 500)]];
      if (RTL) segs.reverse();
      rich(segs, HUB.x, HUB.y + 66, F.mono(56), { alpha: valK }); }
  }
  // the verdict, stamped
  if (vkShow > 0) {
    const u = (t - o.stamp) / .32, sc = lerp(1.7, 1, easeBack(u, 2.2));
    ctx.save(); ctx.globalAlpha *= clamp(u * 3) * (1 - gone);
    ctx.translate(HUB.x, HUB.y + 160); ctx.scale(sc, sc);
    text(O.word, 0, 0, F.head(132), O.col === 'rose' ? C.rose : C.teal, { ls: 14, glow: [rgba(col, .75), 34], maxW: 470 });
    ctx.restore();
    // a ring of light off the dial
    const pu = (t - o.stamp) / .7;
    if (pu < 1) {
      ctx.strokeStyle = rgba(col, .55 * (1 - pu)); ctx.lineWidth = 6 * (1 - pu) + 1;
      ctx.beginPath(); ctx.arc(HUB.x, HUB.y, DR + 20 + easeOut(pu) * 180, PI, TAU); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawPhone(t) {
  // body
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 80; ctx.shadowOffsetY = 30;
  const bg = ctx.createLinearGradient(PHONE.x, 0, PHONE.x + PHONE.w, 0);
  bg.addColorStop(0, '#1B2336'); bg.addColorStop(.5, '#0B101B'); bg.addColorStop(1, '#1B2336');
  ctx.fillStyle = bg; phonePath(ctx, PHONE); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(238,241,247,.14)'; ctx.lineWidth = 2; phonePath(ctx, PHONE); ctx.stroke();
  // screen
  ctx.save(); phonePath(ctx, SCR); ctx.clip();
  ctx.fillStyle = '#0B1120'; ctx.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
  ctx.drawImage(MAP.c, SCR.x, SCR.y, MAP.w, MAP.h);
  const mg = ctx.createLinearGradient(0, SCR.y + MAP.h - 160, 0, SCR.y + MAP.h);
  mg.addColorStop(0, 'rgba(11,17,32,0)'); mg.addColorStop(1, 'rgba(11,17,32,1)');
  ctx.fillStyle = mg; ctx.fillRect(SCR.x, SCR.y + MAP.h - 160, SCR.w, 160);
  // route of the offer on screen
  const o0 = TL.offers[0], o1 = TL.offers[1];
  const r0 = 1 - smooth((t - o0.leave) / .25), r1 = smooth((t - o1.arrive) / .3);
  if (r0 > 0) drawRoute(0, t, r0);
  if (r1 > 0) drawRoute(1, t, r1);
  // status bar
  text('11:42', SCR.x + 44, SCR.y + 40, F.sans(26, 600), C.ink, { align: 'left' });
  ctx.fillStyle = 'rgba(46,211,183,.16)'; ctx.beginPath(); ctx.roundRect(SCR.x + SCR.w - 172, SCR.y + 20, 132, 40, 20); ctx.fill();
  ctx.fillStyle = C.teal; ctx.beginPath(); ctx.arc(SCR.x + SCR.w - 150, SCR.y + 40, 6, 0, TAU); ctx.fill();
  text(L.online, SCR.x + SCR.w - 91, SCR.y + 41, F.sans(24, 600), C.teal, { maxW: 80 });
  // cards: offer 1 slams in at frame 0, leaves; offer 2 slides up
  if (t < o0.leave + .4) {
    const slam = t < .35 ? lerp(70, 0, easeBack(t / .35, 2.4)) : 0;
    const out = easeIn((t - o0.leave) / .3) * 560;
    drawCard(0, t, slam + out);
  }
  if (t >= o1.arrive) drawCard(1, t, lerp(560, 0, easeBack((t - o1.arrive) / .42, 1.1)));
  drawDial(t);
  ctx.restore();
  // glass sheen
  ctx.save(); phonePath(ctx, SCR); ctx.clip();
  const sh = ctx.createLinearGradient(SCR.x, SCR.y, SCR.x + SCR.w, SCR.y + 700);
  sh.addColorStop(0, 'rgba(255,255,255,.05)'); sh.addColorStop(.4, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh; ctx.fillRect(SCR.x, SCR.y, SCR.w, SCR.h); ctx.restore();
  // camera cut-out
  ctx.fillStyle = '#05070D'; ctx.beginPath(); ctx.roundRect(CX - 60, SCR.y + 14, 120, 30, 15); ctx.fill();
}

// ─── the maths swarm ───────────────────────────────────────────────────────
function drawSwarm(t) {
  if (t > TL.react + .75) return;
  const urg = smooth(t / 5);
  FRAGS.forEach(([t0, x, y, s, size, col, rot, kind], i) => {
    if (t < t0) return;
    const pop = easeBack((t - t0) / .28, 2.2), a0 = clamp((t - t0) / .08);
    // drift outward from the phone, jitter harder as the clock runs
    const dx = (x - CX) * .025 * (t - t0), dy = (y - 1000) * .02 * (t - t0);
    let px = x + dx + Math.sin(t * 37 + i * 1.7) * 2.2 * urg, py = y + dy + Math.cos(t * 41 + i * 2.3) * 2.2 * urg;
    let sc = lerp(.4, 1, pop), r = rot * PI / 180, alpha = a0;
    // the jolt: the maths shatters forward, out through the windscreen
    const u = Math.pow(clamp((t - TL.react - i * .01) / .55), 2);
    if (u > 0) {
      px = lerp(px, VPX + (px - VPX) * .15, u); py = lerp(py, VPY - 30, u);
      sc *= 1 - .88 * u; r += u * 2.4 * (i % 2 ? 1 : -1); alpha *= 1 - smooth((u - .55) / .45);
    }
    if (alpha <= .01) return;
    if (kind === 'chip') {                                   // translated bubbles run longer: keep them in the frame
      ctx.font = F.mono(size, 600); ctx.letterSpacing = '0px';
      const hw = (ctx.measureText(s).width + size * .9) / 2 * sc + 50;   // + margin for the camera push-in
      px = clamp(px, hw, W - hw);
    }
    ctx.save(); ctx.translate(px, py); ctx.rotate(r); ctx.scale(sc, sc); ctx.globalAlpha *= alpha;
    if (kind === 'chip') {
      ctx.font = F.mono(size, 600); ctx.letterSpacing = '0px';
      const w = ctx.measureText(s).width + size * .9, h = size * 1.55;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
      ctx.fillStyle = 'rgba(27,37,56,.93)'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h * .3); ctx.fill(); ctx.restore();
      ctx.strokeStyle = rgba(RGB[col], .45); ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h * .3); ctx.stroke();
      text(s, 0, 2, F.mono(size, 600), C[col]);
    } else {
      text(s, 0, 0, F.head(size), C[col], { glow: [rgba(RGB[col], .5), 26] });
    }
    ctx.restore();
  });
}

// ─── the world as a function of time ───────────────────────────────────────
const envl = (t, a, b, c, d) => Math.min(smooth((t - a) / (b - a)), 1 - smooth((t - c) / (d - c)));
function hermite(t, keys) {                                    // [[t, value, slope], …]: smooth motion with chosen speeds
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, v0, m0] = keys[i - 1], [t1, v1, m1] = keys[i], h = t1 - t0, u = (t - t0) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * h * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * h * m1;
  }
  return keys[keys.length - 1][1];
}
// act 1 closes on the car ahead unnoticed, then fast after it brakes; we stop a hand's width away
const GAP1 = [[0, 14, -.7], [TL.leadBrake1, 10.5, -.9], [TL.react, 4.2, -8], [TL.stop, .35, 0], [99, .35, 0]];
const GAP2 = [[TL.act2, 12, 0], [TL.leadBrake2, 12, 0], [16.6, 6.4, 0], [99, 6.4, 0]];
function world(t) {                                            // t is story time (act 1 < 10 ≤ act 2)
  const act = t < TL.turn ? 1 : 2, V = 11;
  let pos, gap, b;
  if (act === 1) {
    const u = clamp((t - TL.react) / (TL.stop - TL.react));
    pos = t < TL.react ? V * t : V * TL.react + V * (TL.stop - TL.react) * (u - u * u / 2);
    gap = hermite(t, GAP1);
    b = .3 + .7 * smooth((t - TL.leadBrake1) / .12);
  } else {
    const t2 = Math.max(t, TL.act2), u = clamp((t2 - TL.brake2) / 2);
    pos = 300 + V * (Math.min(t2, TL.brake2) - TL.act2) + (t2 > TL.brake2 ? V * 2 * u - 7.5 * 2 * (u * u * u - u * u * u * u / 2) + 3.5 * Math.max(0, t2 - TL.brake2 - 2) : 0);
    gap = hermite(t2, GAP2);
    b = .3 + .7 * smooth((t - TL.leadBrake2) / .2);
  }
  const close = clamp((11 - gap) / 10.5);
  return { act, pos, gap, b, red: b > .5 ? (b - .3) / .7 * close : 0, close };
}
function pose(t) {                                             // the driver, from behind
  const P = { lean: 0, rub: 0, rot: 0, lurch: 0, breathe: 0, grip: 0 };
  if (t < TL.turn) {
    P.lean = t < TL.react ? smooth((t - .25) / .9) : t < TL.react + .18 ? lerp(1, -.4, easeOut((t - TL.react) / .18)) : lerp(-.4, 0, smooth((t - TL.react - .18) / 1.1));
    P.rub = envl(t, 2.3, 2.75, 3.3, 3.7);
    P.rot = envl(t, 3.75, 3.85, 4.35, 4.55) * .13 * Math.sin((t - 3.75) * TAU * 3);
    P.lurch = smooth((t - TL.react - .05) / .45) * (1 - smooth((t - TL.stop) / .55));
    P.breathe = envl(t, TL.stop + .1, TL.stop + .5, 9.5, 9.95) * Math.sin((t - TL.stop) * TAU * 1.25);
    P.grip = smooth((t - TL.react) / .1);
  } else {
    P.lean = .55 * envl(t, TL.glance[0], TL.glance[0] + .25, TL.glance[1] - .25, TL.glance[1]);
    P.lurch = .35 * envl(t, TL.brake2, TL.brake2 + .6, 16.2, 17);
  }
  P.rot += P.lean * .1;
  return P;
}
function camera(t) {                                           // → { z, x, y, dx, dy }
  let z = 1, x = 560, y = 1000, dx = 0, dy = 0;
  if (t < TL.turn) {
    z = 1 + .1 * smooth(t / 5.5) - .07 * smooth((t - TL.react) / 1.2);
    const k = t - TL.react - .02;
    if (k > 0) { const a = 26 * Math.exp(-k * 3.4); dx = a * Math.sin(k * 57); dy = a * .8 * Math.sin(k * 43 + 1); }
    // the heartbeat after the stop
    if (t > TL.stop + .3) { const hb = (t - TL.stop - .3) % .85; z += .007 * (Math.exp(-hb * 18) + .6 * Math.exp(-Math.max(0, hb - .22) * 18) * (hb > .22)); }
  } else {
    const zin = easeIO((t - 11.6) / .5), zout = easeIO((t - TL.glance[1]) / .55);
    z = lerp(1, 1.5, zin * (1 - zout)) + .04 * smooth((t - 14.3) / 2.6);
    x = lerp(560, 740, zin * (1 - zout)); y = lerp(1000, 1060, zin * (1 - zout));
  }
  return { z, x, y, dx, dy };
}
function applyCam(g, cam) { g.translate(cam.x, cam.y); g.scale(cam.z, cam.z); g.translate(-cam.x + cam.dx, -cam.y + cam.dy); }

// ─── outside: the street through the windscreen ────────────────────────────
function building(j, side) {
  const r = rng(j * 7919 + (side > 0 ? 17 : 3));
  return { h: 7 + r() * 16, lat: side * (8.5 + r() * 2.5), win: table(18, j * 31 + side, q => q() < .32), len: 9 + r() * 5, tone: r() };
}
function drawOutside(Wd) {
  const sky = ctx.createLinearGradient(0, 120, 0, VPY + 40);
  sky.addColorStop(0, '#060A14'); sky.addColorStop(1, '#1A2440');
  ctx.fillStyle = sky; ctx.fillRect(-100, 0, W + 200, VPY + 40);
  const glow = ctx.createRadialGradient(VPX, VPY, 0, VPX, VPY, 520);
  glow.addColorStop(0, 'rgba(245,176,65,.22)'); glow.addColorStop(1, 'rgba(245,176,65,0)');
  ctx.fillStyle = glow; ctx.fillRect(-100, 0, W + 200, 1100);
  // road
  ctx.fillStyle = '#0B101C'; ctx.beginPath();
  const a = proj(-6, 0, 300), b = proj(6, 0, 300), c = proj(6, 0, 1.2), d = proj(-6, 0, 1.2);
  ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.fill();
  // sidewalks
  ctx.fillStyle = '#121A2B';
  for (const s of [-1, 1]) {
    const p = [proj(s * 6, 0, 300), proj(s * 8.5, 0, 300), proj(s * 8.5, 0, 1.2), proj(s * 6, 0, 1.2)];
    ctx.beginPath(); p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.fill();
  }
  // buildings, far to near, scrolling with our position
  const step = 15, base = Math.floor(Wd.pos / step);
  for (let k = 14; k >= 0; k--) for (const side of [-1, 1]) {
    const j = base + k, z0 = j * step - Wd.pos + 4, B = building(j, side);
    if (z0 < 1.5) continue;
    const z1 = z0 + B.len;
    const p = [proj(B.lat, 0, z0), proj(B.lat, B.h, z0), proj(B.lat, B.h, z1), proj(B.lat, 0, z1)];
    ctx.fillStyle = rgba(mix(hex('#0A1020'), hex('#131C30'), B.tone)); ctx.beginPath();
    p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.fill();
    // lit windows
    for (let q = 0; q < 18; q++) if (B.win[q]) {
      const col = q % 6, row = Math.floor(q / 6), zz = z0 + 1 + col * (B.len - 2) / 6, hh = 2.2 + row * 2.6;
      if (hh + 1 > B.h) continue;
      const [x0, y0] = proj(B.lat, hh + 1, zz), [x1, y1] = proj(B.lat, hh, zz + .9);
      ctx.fillStyle = q % 5 ? 'rgba(245,176,65,.55)' : 'rgba(238,241,247,.4)';
      ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.max(1, Math.abs(x1 - x0)), Math.max(1, Math.abs(y1 - y0)));
    }
  }
  // lane dashes
  ctx.fillStyle = 'rgba(238,241,247,.55)';
  for (const lat of [-1.9, 1.9]) for (let k = 0; k < 18; k++) {
    const z0 = k * 6 - (Wd.pos % 6) + 1.2; if (z0 < 1.3) continue;
    const [x0, y0] = proj(lat - .07, 0, z0), [x1, y1] = proj(lat + .07, 0, z0), [x2, y2] = proj(lat + .07, 0, z0 + 2.4), [x3, y3] = proj(lat - .07, 0, z0 + 2.4);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.fill();
  }
  // street lamps
  for (let k = 7; k >= 0; k--) for (const side of [-1, 1]) {
    const z = k * 22 - (Wd.pos % 22) + 6 + (side > 0 ? 11 : 0); if (z < 1.6) continue;
    const [gx, gy] = proj(side * 7, 0, z), [lx, ly] = proj(side * 6.2, 5.6, z);
    ctx.strokeStyle = '#1C2538'; ctx.lineWidth = Math.max(1, 1.2 * KF / z * .12); ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, ly); ctx.lineTo(lx, ly); ctx.stroke();
    const s = Math.min(260, 2.6 * KF / z);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .55; ctx.drawImage(TINTED.amber, lx - s / 2, ly - s / 2, s, s); ctx.restore();
  }
  drawLeadCar(Wd);
}
function drawLeadCar(Wd) {
  const z = Wd.gap + 2.4, lat = .35, k = KF / z;
  const X = l => VPX + (lat + l) * k, Y = h => VPY + (HC - h) * k;
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.ellipse(X(0), Y(0), 1.05 * k, .12 * k, 0, 0, TAU); ctx.fill();
  // tyres
  ctx.fillStyle = '#05070C'; ctx.fillRect(X(-.86), Y(.34), .3 * k, .34 * k); ctx.fillRect(X(.56), Y(.34), .3 * k, .34 * k);
  // body and cabin
  const body = ctx.createLinearGradient(0, Y(1), 0, Y(.28));
  body.addColorStop(0, '#2A3450'); body.addColorStop(1, '#141B2C');
  ctx.fillStyle = body; ctx.beginPath(); ctx.roundRect(X(-.92), Y(.98), 1.84 * k, .7 * k, .12 * k); ctx.fill();
  ctx.fillStyle = '#10172A'; ctx.beginPath();
  ctx.moveTo(X(-.78), Y(.97)); ctx.lineTo(X(-.6), Y(1.45)); ctx.lineTo(X(.6), Y(1.45)); ctx.lineTo(X(.78), Y(.97)); ctx.closePath(); ctx.fill();
  const win = ctx.createLinearGradient(X(-.5), Y(1.4), X(.5), Y(1.02));
  win.addColorStop(0, '#0A1122'); win.addColorStop(.5, '#1B2640'); win.addColorStop(1, '#070B16');
  ctx.fillStyle = win; ctx.beginPath();
  ctx.moveTo(X(-.66), Y(1.02)); ctx.lineTo(X(-.52), Y(1.38)); ctx.lineTo(X(.52), Y(1.38)); ctx.lineTo(X(.66), Y(1.02)); ctx.closePath(); ctx.fill();
  // street light along the roof and shoulder
  ctx.strokeStyle = 'rgba(245,176,65,.35)'; ctx.lineWidth = Math.max(1, .02 * k);
  ctx.beginPath(); ctx.moveTo(X(-.6), Y(1.45)); ctx.lineTo(X(.6), Y(1.45)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(X(-.9), Y(.97)); ctx.lineTo(X(.9), Y(.97)); ctx.stroke();
  // plate
  ctx.fillStyle = '#C9CFDB'; ctx.fillRect(X(-.22), Y(.62), .44 * k, .13 * k);
  ctx.fillStyle = '#2A3346'; ctx.fillRect(X(-.17), Y(.57), .34 * k, .03 * k);
  // tail and brake lights
  const lamp = rgba(mix(hex('#6E1A26'), hex('#FF3B4E'), Wd.b));
  ctx.fillStyle = lamp;
  ctx.beginPath(); ctx.roundRect(X(-.88), Y(.9), .3 * k, .1 * k, .03 * k); ctx.fill();
  ctx.beginPath(); ctx.roundRect(X(.58), Y(.9), .3 * k, .1 * k, .03 * k); ctx.fill();
  if (Wd.b > .5) { ctx.fillStyle = rgba(hex('#FF3B4E'), (Wd.b - .5) * 2); ctx.fillRect(X(-.2), Y(1.43), .4 * k, .035 * k); }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const l of [-.73, .73]) {
    const s = Math.min(360, (.5 + Wd.b * 1.1) * k * .9);          // capped: up close the glow must not swallow the car
    ctx.globalAlpha = .2 + .45 * Wd.b * (1 - .45 * Wd.close); ctx.drawImage(TINTED.rose, X(l) - s / 2, Y(.85) - s / 2, s, s);
  }
  ctx.restore();
}

// ─── inside: windscreen frame, mirror, dashboard, wheel ────────────────────
const SCREEN = [[70, 150], [1010, 150], [1120, 1030], [-40, 1030]];
function screenPath(g, begin = true) { if (begin) g.beginPath(); g.moveTo(70, 160); g.quadraticCurveTo(540, 118, 1010, 160); g.lineTo(1120, 1030); g.lineTo(-40, 1030); g.closePath(); }
function drawInterior(t, Wd) {
  // roof and A-pillars: everything outside the windscreen
  ctx.save(); ctx.fillStyle = '#04060C';
  ctx.beginPath(); ctx.rect(-200, -200, W + 400, H + 400); screenPath(ctx, false); ctx.fill('evenodd'); ctx.restore();
  ctx.strokeStyle = 'rgba(245,176,65,.12)'; ctx.lineWidth = 3; screenPath(ctx); ctx.stroke();
  // rear-view mirror
  ctx.fillStyle = '#05070D'; ctx.fillRect(552, 118, 16, 40);
  ctx.fillStyle = '#0A0E18'; ctx.beginPath(); ctx.roundRect(420, 150, 280, 76, 30); ctx.fill();
  ctx.fillStyle = 'rgba(245,176,65,.10)'; ctx.beginPath(); ctx.roundRect(436, 164, 248, 12, 6); ctx.fill();
  // dashboard
  const dg = ctx.createLinearGradient(0, 1000, 0, 1300);
  dg.addColorStop(0, '#0C111C'); dg.addColorStop(1, '#04060B');
  ctx.fillStyle = dg; ctx.beginPath(); ctx.moveTo(-100, 1060); ctx.quadraticCurveTo(540, 985, W + 100, 1060); ctx.lineTo(W + 100, H + 100); ctx.lineTo(-100, H + 100); ctx.fill();
  ctx.strokeStyle = 'rgba(245,176,65,.16)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-100, 1060); ctx.quadraticCurveTo(540, 985, W + 100, 1060); ctx.stroke();
  // instrument glow behind the wheel
  const ig = ctx.createRadialGradient(300, 1130, 0, 300, 1130, 220);
  ig.addColorStop(0, 'rgba(46,211,183,.16)'); ig.addColorStop(1, 'rgba(46,211,183,0)');
  ctx.fillStyle = ig; ctx.fillRect(60, 900, 480, 460);
  // the red of the brake lights floods in
  if (Wd.red > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const rg = ctx.createRadialGradient(560, 700, 0, 560, 700, 1100);
    rg.addColorStop(0, `rgba(255,59,78,${.24 * Wd.red})`); rg.addColorStop(1, 'rgba(255,59,78,0)');
    ctx.fillStyle = rg; ctx.fillRect(-100, 0, W + 200, H); ctx.restore();
  }
}
function drawWheel() {
  ctx.strokeStyle = '#05080F'; ctx.lineWidth = 40; ctx.beginPath(); ctx.ellipse(300, 1345, 255, 105, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(245,176,65,.22)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(300, 1330, 262, 104, 0, PI * 1.05, PI * 1.95); ctx.stroke();
}
function drawPhoneMounted(t) {
  // the mount: two grips and an arm down into the vent
  ctx.fillStyle = '#05070C';
  ctx.fillRect(PH.x - 14, PH.y + 250, 28, 120);
  ctx.save(); ctx.translate(PH.x, PH.y); ctx.rotate(PH.rot); ctx.scale(PH.s, PH.s); ctx.translate(-520, -1310);
  drawPhone(t);
  ctx.fillStyle = '#05070C'; ctx.fillRect(PHONE.x - 30, 1180, 44, 200); ctx.fillRect(PHONE.x + PHONE.w - 14, 1180, 44, 200);
  ctx.restore();
}

// ─── the driver, from behind: parts on a skeleton, lit from the street ─────
const SKIN = '#5A3E30', HAIR = '#07090F', COAT = '#0E1422';
function driverGeom(P) {
  const x0 = 330 + P.lean * 16, sy = 1190 + P.breathe * 5;
  const hx = 330 + P.lean * 52, hy = 948 + P.lean * 42 - P.breathe * 3;
  const LH = [62, 1312], RHw = [542, 1312], RHf = [hx + 52, hy + 26];
  const rub = P.rub, wob = Math.sin(P.rub * 40) * 6 * rub;
  const RH = [lerp(RHw[0], RHf[0] + wob, rub), lerp(RHw[1], RHf[1], rub)];
  return { x0, sy, hx, hy, LH, RH, rub };
}
function drawDriver(g, P, mask) {
  const D = driverGeom(P), col = c => mask || c;
  g.save();
  // braking throws him forward (away from us): smaller and higher
  g.translate(330, 1500); g.scale(1 - .045 * P.lurch, 1 - .045 * P.lurch); g.translate(-330, -1500 + 26 * P.lurch);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const arm = (sh, hand, out, w1) => {
    const el = [(sh[0] + hand[0]) / 2 + out[0], (sh[1] + hand[1]) / 2 + out[1]];
    g.strokeStyle = col(COAT); g.lineWidth = w1;
    g.beginPath(); g.moveTo(sh[0], sh[1]); g.lineTo(el[0], el[1]); g.lineTo(hand[0], hand[1]); g.stroke();
    g.fillStyle = col(SKIN); g.beginPath(); g.ellipse(hand[0], hand[1], 30, 24, 0, 0, TAU); g.fill();
  };
  arm([D.x0 - 170, D.sy + 40], D.LH, [-40, 30], 64);
  arm([D.x0 + 175, D.sy + 35], D.RH, [lerp(40, 95, D.rub), lerp(30, 40, D.rub)], 64);
  // torso
  g.fillStyle = col(COAT); g.beginPath();
  g.moveTo(D.x0 - 250, 1920); g.lineTo(D.x0 - 232, D.sy + 90);
  g.quadraticCurveTo(D.x0 - 222, D.sy + 8, D.x0 - 150, D.sy - 12);
  g.lineTo(D.x0 - 58, D.sy - 34); g.lineTo(D.x0 + 58, D.sy - 34); g.lineTo(D.x0 + 150, D.sy - 12);
  g.quadraticCurveTo(D.x0 + 226, D.sy + 8, D.x0 + 236, D.sy + 90); g.lineTo(D.x0 + 254, 1920); g.closePath(); g.fill();
  // collar
  if (!mask) { g.strokeStyle = '#161E30'; g.lineWidth = 6; g.beginPath(); g.moveTo(D.x0 - 70, D.sy - 30); g.quadraticCurveTo(D.x0, D.sy - 8, D.x0 + 70, D.sy - 30); g.stroke(); }
  // neck, head, ears, hair
  g.save(); g.translate(D.hx, D.hy); g.rotate(P.rot);
  g.fillStyle = col(SKIN); g.beginPath(); g.roundRect(-44, 40, 88, (D.sy - D.hy) - 20, 30); g.fill();
  g.beginPath(); g.ellipse(-80, 12, 15, 26, -.15, 0, TAU); g.fill(); g.beginPath(); g.ellipse(80, 12, 15, 26, .15, 0, TAU); g.fill();
  g.fillStyle = col(SKIN); g.beginPath(); g.ellipse(0, 0, 80, 98, 0, 0, TAU); g.fill();
  g.fillStyle = col(HAIR); g.beginPath(); g.ellipse(0, -10, 83, 92, 0, PI * .98, PI * 2.02); g.lineTo(78, 30); g.quadraticCurveTo(0, 70, -78, 30); g.closePath(); g.fill();
  g.restore();
  g.restore();
}
const [RIMC, rimRaw] = canvas(W * SS, H * SS), RIM = supersample(rimRaw, SS);
function drawDriverLit(P, cam, Wd) {
  ctx.save(); applyCam(ctx, cam); drawDriver(ctx, P, null); ctx.restore();
  // rim light: the silhouette minus itself shifted away from the light
  const rimCol = rgba(mix(RGB.amber, hex('#FF3B4E'), clamp(Wd.red * 1.4)), 1);
  const sx = lerp(-7, 0, clamp(Wd.red * 1.4)), sy = lerp(5, 8, clamp(Wd.red * 1.4));
  RIM.setTransform(1, 0, 0, 1, 0, 0); RIM.globalCompositeOperation = 'source-over'; RIM.clearRect(0, 0, W, H);
  RIM.save(); applyCam(RIM, cam); drawDriver(RIM, P, rimCol); RIM.restore();
  RIM.globalCompositeOperation = 'destination-out';
  RIM.save(); applyCam(RIM, cam); RIM.translate(sx, sy); drawDriver(RIM, P, '#000'); RIM.restore();
  RIM.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = .85; ctx.drawImage(RIMC, 0, 0, W, H); ctx.restore();
}

// ─── captions ───────────────────────────────────────────────────────────────
function drawCaptions(t) {
  const sc = ctx.createLinearGradient(0, 0, 0, 640);
  sc.addColorStop(0, 'rgba(4,6,12,.7)'); sc.addColorStop(1, 'rgba(4,6,12,0)');
  ctx.fillStyle = sc; ctx.fillRect(0, 0, W, 640);
  reveal(life(t, 0, 2.3, .2), () => text(L.c1, CX, 380, F.head(96), C.ink, { maxW: 860 }));
  reveal(life(t, 2.35, 5.0, .3, .25), () => {
    const j = Math.sin(t * 53) * 3 * smooth((t - 3.8) / 1);
    text(L.c2, CX + j, 380, F.head(96), C.ink, { maxW: 860 });
  });
  reveal(life(t, 8.0, 9.95, .6, .3), () => text(L.cost, CX, 400, F.head(112), C.ink, { maxW: 860 }));
  const hl = life(t, TL.turn, 11.55, .3, .35);
  if (hl) {
    const s = lerp(1.18, 1, easeBack((t - TL.turn) / .35, 1.6));
    ctx.save(); ctx.globalAlpha *= clamp((t - TL.turn) / .1) * hl.out;
    ctx.translate(CX, 410); ctx.scale(s, s); ctx.translate(-CX, -410);
    rich(L.head[0], CX, 352, F.head(118), { ls: 1 }); rich(L.head[1], CX, 466, F.head(118), { ls: 1 });
    ctx.restore();
  }
  const R2 = life(t, TL.offers[1].stamp - .05, 14.25);
  reveal(R2, () => { rich(L.r2[0], CX, 350, F.sans(54, 600)); rich(L.r2[1], CX, 422, F.sans(54, 600)); });
  reveal(life(t, 14.3, 16.95), () => { rich(L.eyes[0], CX, 352, F.head(104)); rich(L.eyes[1], CX, 462, F.head(104)); });
  reveal(life(t, TL.chipsIn + .05, TL.chipsOut + .35), () => { rich(L.built[0], CX, 360, F.head(104)); rich(L.built[1], CX, 464, F.head(104)); });
}

function drawCar(t) {                                          // the whole shot at story time t
  const Wd = world(t), P = pose(t), cam = camera(t);
  ctx.fillStyle = '#04060C'; ctx.fillRect(0, 0, W, H);
  ctx.save(); applyCam(ctx, cam);
  ctx.save(); screenPath(ctx); ctx.clip(); drawOutside(Wd); ctx.restore();
  drawInterior(t, Wd);
  drawWheel();
  drawPhoneMounted(t);
  ctx.restore();
  drawDriverLit(P, cam, Wd);
  ctx.save(); applyCam(ctx, cam); drawSwarm(t); ctx.restore();
}
function drawScene(t) {
  if (t < TL.rewind[0]) drawCar(t);
  else if (t < TL.rewind[1]) {                                 // the turn: act 1 runs backwards, fast
    const u = (t - TL.rewind[0]) / (TL.rewind[1] - TL.rewind[0]);
    drawCar(lerp(9.95, .2, easeIn(u) * .6 + u * .4));
    ctx.fillStyle = 'rgba(12,18,32,.45)'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) { ctx.fillStyle = 'rgba(238,241,247,.06)'; ctx.fillRect(0, frac(-t * 2.6 + i / 7) * H, W, 14 + (i % 3) * 8); }
  } else drawCar(t);
  const dim = smooth((t - TL.chipsIn) / .4);
  if (dim > 0) { ctx.fillStyle = rgba(RGB.navy, .82 * dim); ctx.fillRect(0, 0, W, H); }
  drawChips(t);
  drawCaptions(t);
  drawEnd(t);
}
const SHOTS = [
  { id: 'offer', start: 0, end: 5, readAt: 3.2, action: 'offer, maths around his head, rubs forehead, shakes head' },
  { id: 'nearmiss', start: 5, end: 8, readAt: 7.4, action: 'brake lights, he looks up late, hard stop a hand from the bumper' },
  { id: 'cost', start: 8, end: 10, readAt: 9.3, action: 'heartbeat, offer expired, "Aucune offre ne vaut ça."' },
  { id: 'turn', start: 10, end: 11.6, readAt: 11, action: 'rewind; headline' },
  { id: 'glance', start: 11.6, end: 14.3, readAt: 12.8, action: 'one glance: PRENDRE' },
  { id: 'calm', start: 14.3, end: 17, readAt: 16, action: 'car ahead brakes; eyes up; calm stop' },
  { id: 'cards', start: 17, end: 20.8, readAt: 19.5, action: 'three cards' },
  { id: 'end', start: 20.8, end: 26, readAt: 24, action: 'end card' },
];
const MARKS = [0, TL.leadBrake1, TL.react, TL.stop, TL.turn, TL.offers[1].stamp, TL.leadBrake2, ...TL.chips, TL.end];

function drawIcon(kind, x, y, col) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'sliders') {
    ctx.lineWidth = 5;
    [[-16, 8], [0, -10], [16, 4]].forEach(([yy, kx]) => {
      ctx.beginPath(); ctx.moveTo(-22, yy); ctx.lineTo(22, yy); ctx.stroke();
      ctx.beginPath(); ctx.arc(kx, yy, 7, 0, TAU); ctx.fillStyle = C.surface; ctx.fill(); ctx.stroke();
    });
  } else if (kind === 'bolt') {
    ctx.beginPath(); ctx.moveTo(6, -28); ctx.lineTo(-16, 4); ctx.lineTo(0, 4); ctx.lineTo(-6, 28); ctx.lineTo(16, -6); ctx.lineTo(0, -6); ctx.closePath(); ctx.fill();
  } else {
    ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, -8, 12, PI, TAU); ctx.lineTo(12, 0); ctx.moveTo(-12, 0); ctx.lineTo(-12, -8); ctx.stroke();
    ctx.beginPath(); ctx.roundRect(-20, -2, 40, 30, 6); ctx.fill();
    ctx.fillStyle = C.surface; ctx.beginPath(); ctx.arc(0, 11, 4.5, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
function drawChips(t) {
  if (t < TL.chips[0] || t > TL.chipsOut + .5) return;
  const out = easeIn((t - TL.chipsOut) / .4);
  CHIPS.forEach((c, i) => {
    const t0 = TL.chips[i]; if (t < t0) return;
    const p = easeBack((t - t0) / .45, 1.4), a = clamp((t - t0) / .15) * (1 - out);
    if (a <= 0) return;
    const yc = 730 + i * 262, x0 = 110, w = 820, h = 226;
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(lerp(160, 0, p) - out * 120 * (i % 2 ? -1 : 1), 0);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
    ctx.fillStyle = C.surface; ctx.beginPath(); ctx.roundRect(x0, yc - h / 2, w, h, 30); ctx.fill(); ctx.restore();
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x0, yc - h / 2, w, h, 30); ctx.stroke();
    const m = x => RTL ? 2 * (x0 + w / 2) - x : x, al = RTL ? 'right' : 'left';
    ctx.fillStyle = C[c.col]; ctx.beginPath(); ctx.roundRect(m(x0 + 3.5) - 3.5, yc - h / 2 + 34, 7, h - 68, 4); ctx.fill();
    ctx.fillStyle = rgba(RGB[c.col], .14); ctx.beginPath(); ctx.arc(m(x0 + 92), yc, 50, 0, TAU); ctx.fill();
    drawIcon(c.icon, m(x0 + 92), yc, C[c.col]);
    text(c.title, m(x0 + 172), yc - 52, F.head(60, 700), C.ink, { align: al, maxW: w - 200 });
    c.sub.forEach((s, k) => text(s, m(x0 + 172), yc + 6 + k * 44, F.sans(31, 500), C.muted, { align: al, maxW: w - 200 }));
    ctx.restore();
  });
}

// ─── end card ───────────────────────────────────────────────────────────────
function drawMark(t, x, y, size) {           // the favicon's geometry, drawn on
  const s = size / 64, k = smooth((t - TL.end) / .35);
  if (k <= 0) return;
  ctx.save(); ctx.translate(x - size / 2, y - size / 2); ctx.scale(s, s);
  ctx.globalAlpha *= k;
  ctx.save(); ctx.shadowColor = 'rgba(245,176,65,.35)'; ctx.shadowBlur = 60 / s;
  ctx.fillStyle = C.navy; ctx.beginPath(); ctx.roundRect(0, 0, 64, 64, 15); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(245,176,65,.45)'; ctx.lineWidth = 1.2 / s * 2; ctx.beginPath(); ctx.roundRect(0, 0, 64, 64, 15); ctx.stroke();
  ctx.lineCap = 'round'; ctx.lineWidth = 6;
  ctx.strokeStyle = C.line; ctx.beginPath(); ctx.arc(32, 44, 20, PI, TAU); ctx.stroke();
  const ak = easeOut((t - TL.markArc[0]) / (TL.markArc[1] - TL.markArc[0]));
  if (ak > 0) { ctx.strokeStyle = C.amber; ctx.beginPath(); ctx.arc(32, 44, 20, PI, PI + PI / 2 * ak); ctx.stroke(); }
  const tk = smooth((t - TL.markArc[1] + .1) / .2);
  if (tk > 0) { ctx.globalAlpha *= 1; ctx.lineWidth = 3; ctx.strokeStyle = rgba(RGB.amber, tk); ctx.beginPath(); ctx.moveTo(44, 27); ctx.lineTo(47, 24); ctx.stroke(); }
  const nk = easeBack((t - TL.markNeedle[0]) / (TL.markNeedle[1] - TL.markNeedle[0]), 2.4);
  ctx.save(); ctx.translate(32, 44); ctx.rotate((-110 + 80 * nk) * PI / 180);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, -15); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.restore();
}
function drawEnd(t) {
  if (t < TL.end - .2) return;
  const k = smooth((t - (TL.end - .2)) / .5);
  // a navy wash over the street, an amber haze behind the mark
  ctx.fillStyle = rgba(RGB.navy, .72 * k); ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(CX, 700, 0, CX, 700, 620);
  g.addColorStop(0, `rgba(245,176,65,${.16 * k})`); g.addColorStop(1, 'rgba(245,176,65,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  drawMark(t, CX, 690, 250);
  reveal(life(t, TL.word, 99), () => {
    ctx.save(); ctx.font = F.head(132); ctx.direction = 'ltr'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const a = ctx.measureText('Ride').width, b = ctx.measureText('Sentinel').width, x = CX - (a + b) / 2;
    ctx.fillStyle = C.ink; ctx.fillText('Ride', x, 915); ctx.fillStyle = C.amber; ctx.fillText('Sentinel', x + a, 915); ctx.restore();
  });
  reveal(life(t, TL.line, 99), () => text(L.endLine, CX, 1030, F.head(66, 700), C.ink, { maxW: 800 }));
  reveal(life(t, TL.url, 99), () => {
    ctx.font = F.mono(46, 600); ctx.direction = 'ltr'; const w = ctx.measureText('ridesentinel.app').width + 84;
    ctx.save(); ctx.shadowColor = 'rgba(245,176,65,.45)'; ctx.shadowBlur = 40;
    ctx.fillStyle = C.amber; ctx.beginPath(); ctx.roundRect(CX - w / 2, 1110, w, 88, 44); ctx.fill(); ctx.restore();
    text('ridesentinel.app', CX, 1156, F.mono(46, 600), C.navy);
  });
  reveal(life(t, TL.cta, 99), () => text(L.cta, CX, 1262, F.sans(38, 500), C.ink, { maxW: 800 }));
  reveal(life(t, TL.fine, 99), () => {
    text(L.fine[0], CX, 1368, F.sans(27, 400), C.muted, { maxW: 800 });
    text(L.fine[1], CX, 1410, F.sans(27, 400), C.muted, { maxW: 800 });
  });
}

// ─── score: generated from TL, rendered offline ────────────────────────────
function renderMix(sr = 48000) {
  const N = Math.ceil(DURATION * sr), ac = new OfflineAudioContext(2, N, sr), R = rng(4242);
  const nb = ac.createBuffer(1, sr * 3, sr); { const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; }
  const ir = ac.createBuffer(2, Math.floor(sr * 2.6), sr);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (R() * 2 - 1) * Math.pow(1 - i / d.length, 2.8); }
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .2;
  const master = ac.createGain(); master.gain.value = .9;
  const fade = ac.createGain(); fade.gain.setValueAtTime(1, 0); fade.gain.setValueAtTime(1, TL.fadeOut[0]); fade.gain.linearRampToValueAtTime(0, DURATION - .02);
  master.connect(comp).connect(fade).connect(ac.destination);
  const verb = ac.createConvolver(); verb.buffer = ir; const vret = ac.createGain(); vret.gain.value = .42; verb.connect(vret).connect(master);
  function bus(g, send = 0, pan = 0) {
    const n = ac.createGain(); n.gain.value = g;
    const p = ac.createStereoPanner(); p.pan.value = pan; n.connect(p).connect(master);
    if (send) { const s = ac.createGain(); s.gain.value = send; n.connect(s).connect(verb); }
    return n;
  }
  const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); };
  const osc = (type, f, t, dur, out) => { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(out); o.start(t); o.stop(t + dur + .05); return o; };
  const noise = (t, dur, out) => { const s = ac.createBufferSource(); s.buffer = nb; s.connect(out); s.start(t, R() * 1.5, dur + .05); return s; };
  const filt = (type, f, q, out) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.connect(out); return b; };
  const gain = out => { const g = ac.createGain(); g.connect(out); return g; };

  const drums = bus(.85), perc = bus(.5, .15), bassB = bus(.42), padB = bus(.085, .35), fx = bus(.5, .25), bells = bus(.42, .5);
  const kick = (t, v = 1) => {
    const g = gain(drums); env(g, t, .002, v, .34);
    const o = osc('sine', 150, t, .4, g); o.frequency.exponentialRampToValueAtTime(44, t + .12);
  };
  const hat = (t, v = .25) => { const g = gain(perc); env(g, t, .001, v, .045); noise(t, .08, filt('highpass', 7500, .7, g)); };
  const clap = (t, v = .35) => { const g = gain(perc); env(g, t, .002, v, .16); noise(t, .2, filt('bandpass', 1700, .9, g)); };
  const tick = (t, hi, v = .5) => {
    const g = gain(perc); env(g, t, .001, v, .03); noise(t, .05, filt('bandpass', hi ? 4200 : 3000, 6, g));
    const g2 = gain(perc); env(g2, t, .001, v * .3, .03); osc('sine', hi ? 2400 : 1800, t, .05, g2);
  };
  const blip = (t, f, v = .12) => { const g = gain(fx); env(g, t, .003, v, .08); const o = osc('square', f, t, .12, filt('lowpass', 2600, 1, g)); o.frequency.exponentialRampToValueAtTime(f * .72, t + .09); };
  const whoosh = (t, dur, up, v = .3) => {
    const g = gain(fx); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + dur * .6); g.gain.linearRampToValueAtTime(0, t + dur);
    const b = filt('bandpass', up ? 500 : 3500, 1.3, g); b.frequency.setValueAtTime(up ? 500 : 3500, t); b.frequency.exponentialRampToValueAtTime(up ? 4000 : 380, t + dur);
    noise(t, dur, b);
  };
  const bass = (t, f, dur, v = .8) => {
    const g = gain(bassB); env(g, t, .006, v, dur);
    const lp = filt('lowpass', 900, 5, g); lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(260, t + dur * .8);
    osc('sawtooth', f, t, dur + .1, lp); osc('sine', f / 2, t, dur + .1, g);
  };
  const pad = (t, dur, fs, v = 1) => {
    for (const f of fs) for (const d of [-.005, .005]) {
      const g = gain(padB); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .35); g.gain.setValueAtTime(v, t + dur - .3); g.gain.linearRampToValueAtTime(0, t + dur + .4);
      osc('sawtooth', f * (1 + d), t, dur + .5, filt('lowpass', 1100, .7, g));
    }
  };
  const bell = (t, f, v = .5) => {
    const g1 = gain(bells); env(g1, t, .002, v, 1.8); osc('sine', f, t, 2, g1);
    const g2 = gain(bells); env(g2, t, .001, v * .3, .3); osc('sine', f * 4.01, t, .4, g2);
    const g3 = gain(bells); env(g3, t, .002, v * .18, .7); osc('triangle', f * 2, t, .8, g3);
  };
  const pluck = (t, f, v = .45) => {
    const g = gain(bells); env(g, t, .002, v, .6);
    const lp = filt('lowpass', 3200, 1, g); lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(500, t + .3);
    osc('triangle', f, t, .7, lp);
  };
  const hit = t => {
    kick(t, 1.2);
    const g = gain(bassB); env(g, t, .003, 1.1, .9); osc('sine', 55, t, 1, g);
    const n = gain(fx); env(n, t, .001, .55, .55); noise(t, .6, filt('lowpass', 1400, .7, n));
  };
  const thud = t => {
    const g = gain(drums); env(g, t, .002, 1.0, .45); const o = osc('sine', 120, t, .5, g); o.frequency.exponentialRampToValueAtTime(46, t + .2);
    const d = gain(bassB); env(d, t, .01, .35, .45); const lp = filt('lowpass', 600, 1, d); osc('triangle', 110, t, .5, lp); osc('triangle', 130.81, t, .5, lp);
  };

  // ── French cut. Act 1: a ping, the clock and the maths, then the near-miss.
  const ping = (t, v = .3) => [1318.5, 1760].forEach((f, k) => { const g = gain(bells); env(g, t + k * .09, .003, v, .35); osc('sine', f, t + k * .09, .45, g); });
  ping(0);
  { const g = gain(bus(.16)); g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(.55, TL.react - .05); g.gain.linearRampToValueAtTime(0, TL.react + .02);
    const lp = filt('lowpass', 180, 3, g); lp.frequency.setValueAtTime(180, 0); lp.frequency.exponentialRampToValueAtTime(1300, TL.react);
    for (const f of [55, 55.35, 82.4]) osc('sawtooth', f, 0, TL.react + .1, lp); }
  for (let t = .5, i = 0; t < TL.react - .01; t += t < 4 ? .5 : .25, i++) tick(t, i % 2, .3 + .3 * t / TL.react);
  FRAGS.forEach(([t0], i) => blip(t0, [660, 880, 990, 740, 1170, 830][i % 6] * (1 + (i % 4) * .06), .1));
  // the brake lights ahead: a low swell under the clock
  { const g = gain(bassB); g.gain.setValueAtTime(0, TL.leadBrake1); g.gain.linearRampToValueAtTime(.28, TL.react); g.gain.linearRampToValueAtTime(0, TL.react + .05);
    osc('sine', 46, TL.leadBrake1, TL.react - TL.leadBrake1 + .1, g); }
  // the stop: a jolt, the tyres, a thump, then silence and his heart
  kick(TL.react, 1.1);
  { const d = TL.stop - TL.react + .05;
    const g = gain(fx); g.gain.setValueAtTime(0, TL.react); g.gain.linearRampToValueAtTime(1.1, TL.react + .06); g.gain.setValueAtTime(1, TL.stop - .12); g.gain.linearRampToValueAtTime(0, TL.stop + .04);
    noise(TL.react, d, filt('bandpass', 2300, 3, g));
    const rb = gain(fx); rb.gain.setValueAtTime(0, TL.react); rb.gain.linearRampToValueAtTime(.8, TL.react + .05); rb.gain.linearRampToValueAtTime(0, TL.stop + .05);
    noise(TL.react, d, filt('lowpass', 900, .8, rb));
    const sq = gain(fx); sq.gain.setValueAtTime(0, TL.react); sq.gain.linearRampToValueAtTime(.2, TL.react + .08); sq.gain.linearRampToValueAtTime(0, TL.stop + .02);
    const bp = filt('bandpass', 1750, 4, sq);
    for (const f of [1680, 1745]) { const o = osc('sawtooth', f, TL.react, d, bp); o.frequency.linearRampToValueAtTime(f * .88, TL.stop); } }
  { const g = gain(drums); env(g, TL.stop, .003, 1, .45); const o = osc('sine', 70, TL.stop, .5, g); o.frequency.exponentialRampToValueAtTime(34, TL.stop + .3);
    const n = gain(fx); env(n, TL.stop, .002, .5, .3); noise(TL.stop, .35, filt('lowpass', 420, .7, n)); }
  for (let k = 0; k < 3; k++) {
    const t0 = TL.stop + .35 + k * .85;
    for (const [dt, v] of [[0, .95], [.22, .6]]) { const g = gain(drums); env(g, t0 + dt, .004, v, .16); const o = osc('sine', 62, t0 + dt, .22, g); o.frequency.exponentialRampToValueAtTime(40, t0 + dt + .1); }
  }
  { const g = gain(fx); env(g, TL.offers[0].life, .005, .12, .3); const o = osc('sine', 880, TL.offers[0].life, .35, g); o.frequency.exponentialRampToValueAtTime(420, TL.offers[0].life + .3); }
  // the turn: a hit and a rewind
  hit(TL.turn);
  { const g = gain(fx); g.gain.setValueAtTime(0, TL.rewind[0]); g.gain.linearRampToValueAtTime(.12, TL.rewind[0] + .1); g.gain.linearRampToValueAtTime(0, TL.rewind[1]);
    const o = osc('sine', 160, TL.rewind[0], .85, g); o.frequency.exponentialRampToValueAtTime(1700, TL.rewind[1]); }
  whoosh(TL.rewind[0] + .05, .75, true, .25);
  // act 2: the calm groove, Am – F – C – G – Am
  const CH = [[110, [220, 261.63, 329.63]], [87.31, [174.61, 220, 261.63]], [130.81, [261.63, 329.63, 392]], [98, [196, 246.94, 293.66]],
              [110, [220, 261.63, 329.63]]];
  CH.forEach(([root, notes], b) => {
    const t0 = TL.act2 + b * 2;
    pad(t0, 2, notes);
    for (let k = 0; k < 4; k++) {
      const tb = t0 + k * .5;
      kick(tb, b === 0 && k === 0 ? .6 : .8);
      hat(tb + .25, .18);
      if (b >= 1 && (k === 1 || k === 3)) clap(tb, .26);
      bass(tb, root, .2, .65); bass(tb + .25, k === 3 ? root * 2 : root, .18, .45);
    }
  });
  ping(TL.offers[1].arrive, .25);
  whoosh(TL.offers[1].swing[0], TL.offers[1].swing[1] - TL.offers[1].swing[0], true, .2);
  bell(TL.offers[1].stamp, 1046.5, .5); bell(TL.offers[1].stamp + .11, 1567.98, .45);
  // the car ahead brakes; he is watching, so it is only a soft slowdown
  whoosh(TL.brake2, 1.4, false, .12);
  // the cards and the end card
  whoosh(TL.chipsIn - .05, .5, false, .2);
  [440, 523.25, 659.25].forEach((f, i) => pluck(TL.chips[i], f));
  whoosh(TL.chipsOut - .05, .4, true, .16);
  pad(TL.end, 4.4, [130.81, 196, 329.63, 493.88, 587.33], .9);
  bass(TL.end, 65.41, 4, .5);
  whoosh(TL.markArc[0], .55, true, .14);
  bell(TL.markNeedle[1] - .05, 523.25, .55); bell(TL.markNeedle[1] + .07, 783.99, .35);
  return ac.startRendering();
}
function wavB64(buf) {
  const ch = buf.numberOfChannels, n = buf.length, sr = buf.sampleRate, ab = new ArrayBuffer(44 + n * ch * 2), v = new DataView(ab);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + n * ch * 2, true); ws(8, 'WAVE'); ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, ch, true); v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
  ws(36, 'data'); v.setUint32(40, n * ch * 2, true);
  const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = clamp(data[c][i], -1, 1); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7FFF, true); o += 2; }
  const bytes = new Uint8Array(ab); let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
// ════ END SCENE ═════════════════════════════════════════════════════════════

const VIGNETTE = (() => {
  const [c, x] = canvas(W, H);
  const g = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .4, W / 2, H / 2, Math.max(W, H) * .72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)');
  x.fillStyle = g; x.fillRect(0, 0, W, H); return c;
})();
function seek(t) {
  t = clamp(t, 0, DURATION);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.letterSpacing = '0px'; ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  ctx.setLineDash([]); ctx.lineDashOffset = 0;
  drawScene(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
  ctx.drawImage(VIGNETTE, 0, 0, W, H);
  const out = smooth((t - TL.fadeOut[0]) / (TL.fadeOut[1] - TL.fadeOut[0]));
  if (out > 0) { ctx.fillStyle = rgba(RGB.navy, out); ctx.fillRect(0, 0, W, H); }
}

window.__film = { duration: DURATION, ready: false, seek, shots: SHOTS, marks: MARKS,
  wav: async () => wavB64(await renderMix(48000)) };
const SAMPLE = 'Aa$0÷×−…·' + (LANG === 'ar' ? 'عربي؟' : LANG === 'zh' ? '中文，' : '');
Promise.all([F.head(100, 800), F.head(100, 700), F.sans(40, 400), F.sans(40, 500), F.sans(40, 600), F.mono(40, 500), F.mono(40, 600)]
  .map(f => document.fonts.load(f, SAMPLE))).then(() => { window.__film.ready = true; });

// ─── player (not used by the render tools) ──────────────────────────────────
const params = new URLSearchParams(location.search);
const FIXED = params.has('t') ? parseFloat(params.get('t')) : null, CAPTURE = params.has('capture');
const startEl = document.getElementById('start');
let ac = null, buffer = null, play = null;
async function startPlay() {
  if (!ac) { ac = new AudioContext(); startEl.textContent = 'scoring…'; buffer = await renderMix(ac.sampleRate); }
  await ac.resume();
  if (play?.src) try { play.src.stop(); } catch {}
  const t0 = ac.currentTime + .1; play = { t0 };
  const src = ac.createBufferSource(); src.buffer = buffer; src.loop = true; src.connect(ac.destination); src.start(t0); play.src = src;
  startEl.style.display = 'none';
}
startEl.addEventListener('click', startPlay);
cv.addEventListener('click', () => ac && (ac.state === 'running' ? ac.suspend() : ac.resume()));
addEventListener('keydown', e => {
  if (e.key === ' ' && ac) { e.preventDefault(); ac.state === 'running' ? ac.suspend() : ac.resume(); }
  if (e.key.toLowerCase() === 'f') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
});
function frame() {
  const t = FIXED !== null ? FIXED : play ? (ac.currentTime - play.t0) % DURATION : (performance.now() / 1000) % DURATION;
  if (window.__film.ready) seek(Math.max(0, t));
  requestAnimationFrame(frame);
}
if (FIXED !== null || CAPTURE) startEl.remove();
if (!CAPTURE) requestAnimationFrame(frame);
