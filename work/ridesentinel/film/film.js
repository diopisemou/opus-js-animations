'use strict';

// ─── format ─────────────────────────────────────────────────────────────────
const W = 1080, H = 1920, DURATION = 20;
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

// ════ SCENE ═════════════════════════════════════════════════════════════════
// Timeline: picture and score both read these times (120 BPM, a bar = 2 s).
const TL = {
  slam: 0, turn: 4.0, rewind: [4.0, 4.6], dialIn: 4.35,
  offers: [
    { arrive: 0, swing: [5.0, 5.9], stamp: 6.0, leave: 8.2 },
    { arrive: 8.5, swing: [9.2, 9.95], stamp: 10.0, leave: 99 },
  ],
  phoneOut: [12.3, 12.95], chips: [12.8, 13.5, 14.2], chipsOut: 15.7,
  end: 16.0, markArc: [16.05, 16.6], markNeedle: [16.45, 16.95], word: 16.8, line: 17.15, url: 17.45, cta: 17.7, fine: 17.95,
  fadeOut: [19.45, 20],
};
const OFFERS = [
  { ...L.offers[0], value: 23, verdict: 'PASS', word: L.pass_, col: 'rose', route: [[520, 1120], [488, 1050], [452, 985], [398, 930], [366, 850], [318, 770], [292, 690]] },
  { ...L.offers[1], value: 52, verdict: 'TAKE', word: L.take, col: 'teal', route: [[520, 1120], [556, 1062], [602, 1000], [640, 930], [700, 868], [738, 790]] },
];
const BAR = 40, VMAX = 80;
// the maths that swarms the screen before the turn: [t, x, y, text, size, colour, rot°, kind]
const FRAGS = [
  [0.50, 400, 770, '18.40 ÷ 38 min', 44, 'ink', -6, 'chip'],
  [0.62, 700, 880, '× 60 = ?', 50, 'amber', 5, 'chip'],
  [0.95, 175, 1010, '$/km?', 50, 'ink', -10, 'chip'],
  [1.10, 640, 700, '$29/hr?', 56, 'amber', 4, 'chip'],
  [1.35, 850, 1190, '− drive back', 38, 'rose', 8, 'chip'],
  [1.50, 350, 1120, '18.40 ÷ 22.4', 42, 'ink', -3, 'chip'],
  [1.75, 185, 700, '0.82/km', 44, 'muted', -8, 'chip'],
  [1.90, 770, 1020, '7 min pickup…', 38, 'muted', 6, 'chip'],
  [2.15, 480, 640, 'over $40/hr??', 54, 'rose', -4, 'chip'],
  [2.30, 150, 1320, '+ gas', 48, 'amber', 7, 'chip'],
  [2.50, 915, 780, '?', 120, 'amber', 12, 'sym'],
  [2.65, 575, 1260, 'empty ride home?', 40, 'rose', -5, 'chip'],
  [2.85, 270, 870, 'surge?', 46, 'ink', 9, 'chip'],
  [3.00, 830, 1420, 'battery 34%', 38, 'muted', -7, 'chip'],
  [3.15, 140, 1560, '?', 140, 'rose', -14, 'sym'],
  [3.30, 700, 1340, '÷', 96, 'ink', 0, 'sym'],
  [3.45, 380, 1500, '38 + 22 min…', 42, 'ink', 4, 'chip'],
  [3.60, 930, 590, '??', 104, 'rose', 10, 'sym'],
  [3.70, 120, 580, '×', 96, 'amber', -10, 'sym'],
  [3.80, 650, 1580, '= ?', 84, 'ink', -6, 'sym'],
];
const CHIPS = [{ icon: 'sliders', col: 'amber' }, { icon: 'bolt', col: 'teal' }, { icon: 'lock', col: 'rose' }].map((c, i) => ({ ...c, ...L.chips[i] }));
FRAGS.forEach((f, i) => { if (L.frags[i]) f[3] = L.frags[i]; });

// geometry (film pixels). Everything that matters sits in the Reels safe band x 90–940, y 300–1450.
const CX = 520;
const PHONE = { x: 210, y: 560, w: 620, h: 1500, r: 80 };
const SCR = { x: 224, y: 574, w: 592, h: 1472, r: 68 };
const CARD = { x: 242, y: 1188, w: 556, h: 262, r: 30 };
const PANEL = { x: 252, y: 662, w: 536, h: 506, r: 34 };
const HUB = { x: CX, y: 925 }, DR = 168;

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
  if (i === 0) {
    if (t < TL.turn) return 15 - t;
    if (t < TL.rewind[1]) return lerp(15 - TL.turn, 15, easeIO((t - TL.rewind[0]) / (TL.rewind[1] - TL.rewind[0])));
    return 15 - (Math.min(t, o.stamp) - TL.rewind[1]);
  }
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
  if (t < a.swing[0]) return 0;
  if (t < a.leave) return sw(a, 0, OFFERS[0].value);
  if (t < a.leave + .5) return lerp(OFFERS[0].value, 0, easeIO((t - a.leave) / .5));
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
    const shown = `$${Math.round(Math.max(0, v))}`;
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
  if (t > TL.turn + .55) return;
  const urg = smooth(t / TL.turn);
  FRAGS.forEach(([t0, x, y, s, size, col, rot, kind], i) => {
    if (t < t0) return;
    const pop = easeBack((t - t0) / .28, 2.2), a0 = clamp((t - t0) / .08);
    // drift outward from the phone, jitter harder as the clock runs
    const dx = (x - CX) * .025 * (t - t0), dy = (y - 1000) * .02 * (t - t0);
    let px = x + dx + Math.sin(t * 37 + i * 1.7) * 2.2 * urg, py = y + dy + Math.cos(t * 41 + i * 2.3) * 2.2 * urg;
    let sc = lerp(.4, 1, pop), r = rot * PI / 180, alpha = a0;
    // the turn: everything is pulled into the dial's hub
    const u = Math.pow(clamp((t - TL.turn - i * .006) / .36), 2);
    if (u > 0) {
      px = lerp(px, HUB.x, u); py = lerp(py, HUB.y, u);
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

// ─── captions (screen space, top of the safe band) ─────────────────────────
function drawCaptions(t) {
  // the problem
  reveal(life(t, 0, 2.05, .2), () => text(L.c1, CX, 380, F.head(96), C.ink, { maxW: 840 }));
  const dm = life(t, 2.1, TL.turn - .02, .3, .15);
  reveal(dm, () => {
    const j = Math.sin(t * 53) * 3 * smooth((t - 3) / 1);
    text(L.c2, CX + j, 380, F.head(110), C.ink, { maxW: 840 });
  });
  // the turn
  const hl = life(t, TL.turn, 5.75, .3, .35);
  if (hl) {
    const sc = lerp(1.18, 1, easeBack((t - TL.turn) / .35, 1.6));
    ctx.save(); ctx.globalAlpha *= clamp((t - TL.turn) / .1) * hl.out;
    ctx.translate(CX, 410); ctx.scale(sc, sc); ctx.translate(-CX, -410);
    rich(L.head[0], CX, 352, F.head(118), { ls: 1 });
    rich(L.head[1], CX, 466, F.head(118), { ls: 1 });
    ctx.restore();
  }
  // offer 1: the reason
  const R1 = life(t, TL.offers[0].stamp - .05, TL.offers[0].leave + .1);
  reveal(R1, () => {
    rich(L.r1[0], CX, 360, F.sans(54, 600));
    rich(L.r1[1], CX, 432, F.sans(54, 600));
  });
  // offer 2: the reason, and the time to spare
  const R2 = life(t, TL.offers[1].stamp - .05, TL.phoneOut[0] + .1);
  reveal(R2, () => {
    rich(L.r2[0], CX, 340, F.sans(54, 600));
    rich(L.r2[1], CX, 412, F.sans(54, 600));
  });
  reveal(life(t, TL.offers[1].stamp + .35, TL.phoneOut[0] + .1), () =>
    text(L.decided, CX, 488, F.mono(32, 600), C.teal, { maxW: 840 }));
  // why trust it
  reveal(life(t, 12.55, TL.chipsOut + .35), () => {
    rich(L.built[0], CX, 360, F.head(104));
    rich(L.built[1], CX, 464, F.head(104));
  });
}

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

function drawScene(t) {
  drawBackground(t);
  // camera: push in while the clock runs, snap back on the turn, breathe after
  let z;
  if (t < TL.turn) z = lerp(1, 1.07, easeIO(t / TL.turn) * .6 + t / TL.turn * .4);
  else if (t < TL.turn + .5) z = lerp(1.07, 1, easeOut((t - TL.turn) / .5));
  else z = lerp(1, 1.035, clamp((t - TL.turn - .5) / 7.8));
  const shake = 11 * Math.exp(-t * 11) * Math.sin(t * 70) + (t > TL.turn ? 9 * Math.exp(-(t - TL.turn) * 10) * Math.sin((t - TL.turn) * 80) : 0);
  const drop = easeIn((t - TL.phoneOut[0]) / (TL.phoneOut[1] - TL.phoneOut[0])) * 1500;
  if (t < TL.phoneOut[1] + .05) {
    ctx.save();
    ctx.translate(CX, 1000); ctx.scale(z, z); ctx.translate(-CX, -1000);
    ctx.translate(shake * .6, shake + drop);
    drawPhone(t);
    ctx.restore();
    ctx.save(); ctx.translate(CX, 1000); ctx.scale(z, z); ctx.translate(-CX, -1000); ctx.translate(shake * .6, shake);
    drawSwarm(t);
    ctx.restore();
  }
  drawChips(t);
  drawCaptions(t);
  drawEnd(t);
}
const SHOTS = [
  { id: 'problem', start: 0, end: TL.turn, readAt: 3.2, action: 'offer slams in, maths swarms, countdown drains' },
  { id: 'turn', start: TL.turn, end: 5.0, readAt: 4.7, action: 'maths sucked into the Rate Dial; headline' },
  { id: 'pass', start: 5.0, end: 8.5, readAt: 7, action: 'needle to $23/hr, PASS' },
  { id: 'take', start: 8.5, end: 12.3, readAt: 11, action: 'needle to $52/hr, TAKE, 14 s to spare' },
  { id: 'trust', start: 12.3, end: 16, readAt: 15, action: 'three chips' },
  { id: 'end', start: 16, end: 20, readAt: 18.5, action: 'logo, line, URL, fine print' },
];
const MARKS = [0, TL.turn, TL.offers[0].stamp, TL.offers[1].stamp, ...TL.chips, TL.end, TL.markNeedle[1]];

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

  // 0–4: the problem. A slam, a drone that tightens, the clock, a blip per fragment, a riser.
  kick(0, 1.1); { const n = gain(fx); env(n, 0, .001, .45, .35); noise(0, .4, filt('lowpass', 5000, .7, n)); }
  { const g = gain(bus(.16)); g.gain.setValueAtTime(.0, 0); g.gain.linearRampToValueAtTime(1, 3.9); g.gain.linearRampToValueAtTime(0, TL.turn + .02);
    const lp = filt('lowpass', 180, 3, g); lp.frequency.setValueAtTime(180, 0); lp.frequency.exponentialRampToValueAtTime(1100, TL.turn);
    for (const f of [55, 55.35, 82.4]) osc('sawtooth', f, 0, TL.turn + .1, lp); }
  for (let t = .5, i = 0; t < TL.turn - .01; t += t < 3 ? .5 : .25, i++) tick(t, i % 2, .35 + .25 * t / TL.turn);
  FRAGS.forEach(([t0], i) => blip(t0, [660, 880, 990, 740, 1170, 830][i % 6] * (1 + (i % 4) * .06)));
  { const g = gain(fx); g.gain.setValueAtTime(0, 3); g.gain.linearRampToValueAtTime(.4, TL.turn - .02); g.gain.linearRampToValueAtTime(0, TL.turn);
    const b = filt('bandpass', 300, 2, g); b.frequency.setValueAtTime(300, 3); b.frequency.exponentialRampToValueAtTime(7000, TL.turn); noise(3, 1, b); }
  // 4.0: the turn
  hit(TL.turn); whoosh(TL.turn, .55, false, .35);
  { const g = gain(fx); env(g, TL.rewind[0], .05, .08, .55); const o = osc('sine', 300, TL.rewind[0], .6, g); o.frequency.exponentialRampToValueAtTime(1300, TL.rewind[1]); }
  whoosh(TL.dialIn, .5, true, .18);
  // 4–16: the groove, Am – F – C – G – Am – F
  const CH = [[110, [220, 261.63, 329.63]], [87.31, [174.61, 220, 261.63]], [130.81, [261.63, 329.63, 392]], [98, [196, 246.94, 293.66]],
              [110, [220, 261.63, 329.63]], [87.31, [174.61, 220, 261.63]]];
  CH.forEach(([root, notes], b) => {
    const t0 = TL.turn + b * 2;
    pad(t0, 2, notes);
    for (let k = 0; k < 4; k++) {
      const tb = t0 + k * .5;
      if (!(b === 0 && k === 0)) kick(tb, .85);
      hat(tb + .25, .2);
      if (t0 >= 8 && (k === 1 || k === 3)) clap(tb, .3);
      bass(tb, root, .2, .7); bass(tb + .25, k === 3 ? root * 2 : root, .18, .5);
    }
  });
  // the offers
  for (const o of TL.offers) whoosh(o.swing[0], o.swing[1] - o.swing[0], true, .22);
  thud(TL.offers[0].stamp);
  bell(TL.offers[1].stamp, 1046.5, .5); bell(TL.offers[1].stamp + .11, 1567.98, .45);
  whoosh(TL.offers[0].leave - .05, .35, false, .18); whoosh(TL.offers[1].arrive - .05, .4, true, .18);
  // why trust it
  whoosh(TL.phoneOut[0] - .05, .6, false, .28);
  [440, 523.25, 659.25].forEach((f, i) => pluck(TL.chips[i], f));
  whoosh(TL.chipsOut - .05, .4, true, .16);
  // end card: a resolved C chord, one bell as the needle lands
  pad(TL.end, 3.4, [130.81, 196, 329.63, 493.88, 587.33], .9);
  bass(TL.end, 65.41, 3.2, .5);
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
