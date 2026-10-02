'use strict';

// ─── format ─────────────────────────────────────────────────────────────────
const W = 1080, H = 1920, DURATION = 35;
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

// ════ SCENE ("Two drivers, one day") ═══════════════════════════════════════
// Above: Sam, without the app. Below: Alex, with RideSentinel. The same city, the same offers, 6:00 → 22:00 in 20 s.
Object.assign(L, L.day);
const TL = {
  day: [2, 22], night: [22, 27], score: [27, 31.5], final: 29.4,
  end: 31.5, markArc: [31.55, 32.1], markNeedle: [31.95, 32.45], word: 32.3, line: 32.65, url: 32.95, cta: 33.2, fine: 33.45,
  fadeOut: [34.45, 35],
};
const hourAt = t => 6 + clamp((t - TL.day[0]) / (TL.day[1] - TL.day[0])) * 16;
const money = (n, dec = 0) => { const s = n.toFixed(dec); return L.money === 'fr' ? `${s.replace('.', ',')} $` : `$${s}`; };
const clockText = h => { const hh = Math.floor(h), mm = Math.floor((h - hh) * 60 / 5) * 5;
  return L.money === 'fr' ? `${hh} h ${String(mm).padStart(2, '0')}` : `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; };

// panels (film pixels); the map inside is panel-local 1000 × 560
const PANELS = [{ x: 40, y: 400, w: 1000, h: 560 }, { x: 40, y: 1060, w: 1000, h: 560 }];
const BAND = { y: 960, h: 100 };
const HOME = [720, 360], CX = 520;
const ACC = ['rose', 'teal'];

// every leg of each driver's day: kind (pickup / trip / empty), from → to, t0 → t1, km (unpaid) or fare (paid)
const P = (kind, a, b, t0, t1, v) => ({ kind, a, b, t0, t1, km: kind === 'trip' ? 0 : v, fare: kind === 'trip' ? v : 0 });
const LEGS = [
  [ // Sam
    P('pickup', HOME, [300, 120], 3.4, 5.0, 9), P('trip', [300, 120], [470, 260], 5.0, 6.2, 44),
    P('pickup', [470, 260], [430, 300], 6.9, 7.4, 3), P('trip', [430, 300], [60, 500], 7.4, 10.0, 61), P('empty', [60, 500], [440, 280], 10.0, 12.6, 36),
    P('pickup', [440, 280], [520, 200], 14.9, 15.4, 5), P('trip', [520, 200], [180, 90], 15.4, 17.0, 38), P('empty', [180, 90], [400, 220], 17.0, 18.2, 14),
    P('pickup', [400, 220], [430, 250], 19.0, 19.4, 4), P('trip', [430, 250], [50, 470], 19.4, 21.6, 55),
  ],
  [ // Alex
    P('pickup', HOME, [640, 300], 3.75, 4.1, 2), P('trip', [640, 300], [500, 220], 4.1, 5.6, 31),
    P('pickup', [500, 220], [470, 260], 7.1, 7.4, 1.5), P('trip', [470, 260], [560, 160], 7.4, 8.9, 38),
    P('pickup', [560, 160], [590, 190], 9.4, 9.7, 2), P('trip', [590, 190], [420, 300], 9.7, 11.2, 35),
    P('pickup', [420, 300], [400, 260], 11.7, 12.0, 3), P('trip', [400, 260], [600, 250], 12.0, 13.4, 33),
    P('pickup', [600, 250], [620, 230], 14.0, 14.3, 2), P('trip', [620, 230], [450, 180], 14.3, 15.8, 36),
    P('pickup', [450, 180], [470, 210], 16.7, 17.0, 2.5), P('trip', [470, 210], [560, 300], 17.0, 18.4, 40),
    P('pickup', [560, 300], [540, 280], 18.8, 19.1, 2), P('trip', [540, 280], [480, 190], 19.1, 20.3, 34),
    P('pickup', [480, 190], [500, 210], 20.6, 20.9, 1.5), P('trip', [500, 210], [690, 340], 20.9, 21.8, 39), P('empty', [690, 340], HOME, 21.8, 22.0, 5.5),
  ],
];
// the offers each one sees: [t (card in), decided at, verdict, fare, info]
const pick = n => L.pickup.replace('{n}', n);
const OFFERS_DAY = [
  [ [2.6, 3.4, 'accepted', 44, pick(14)], [6.4, 6.9, 'accepted', 61, L.subs], [13.0, 13.9, 'expired', 29.5, pick(4)],
    [14.4, 14.9, 'accepted', 38, pick(9)], [18.6, 19.0, 'accepted', 55, L.subs] ],
  [ [2.6, 2.85, 'pass', 44, pick(14), L.longPickup], [3.5, 3.75, 'take', 31, pick(3)], [6.4, 6.6, 'pass', 61, L.subs, L.strand],
    [6.85, 7.1, 'take', 38, pick(2)], [9.15, 9.4, 'take', 35, pick(3)], [11.45, 11.7, 'take', 33, pick(4)], [13.75, 14.0, 'take', 36, pick(2)],
    [16.0, 16.25, 'pass', 27, pick(16), L.longPickup], [16.45, 16.7, 'take', 40, pick(3)], [18.55, 18.8, 'take', 34, pick(2)],
    [20.35, 20.6, 'take', 39, L.home] ],
];

// streets run along a grid turned by .21 rad: legs follow it as an L
const GR = .21, rot = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
function legPath(a, b) { const ra = rot(a, -GR), rb = rot(b, -GR); return [a, rot([rb[0], ra[1]], GR), b]; }
function along(pts, k) {                                     // point and heading at fraction k of a polyline
  const seg = []; let tot = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; }
  let r = k * tot;
  for (let i = 0; i < seg.length; i++) {
    if (r <= seg[i] || i === seg.length - 1) {
      const u = seg[i] ? clamp(r / seg[i]) : 0, [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      return { x: lerp(x0, x1, u), y: lerp(y0, y1, u), a: Math.atan2(y1 - y0, x1 - x0), done: pts.slice(0, i + 1).concat([[lerp(x0, x1, u), lerp(y0, y1, u)]]) };
    }
    r -= seg[i];
  }
}
function driverState(d, t) {                                 // position, heading, money and unpaid km at time t
  let pos = HOME, a = -PI / 2, earned = 0, km = 0, lastEnd = -1;
  for (const g of LEGS[d]) {
    if (t < g.t0) break;
    const k = easeIO((t - g.t0) / (g.t1 - g.t0)), p = along(legPath(g.a, g.b), k);
    pos = [p.x, p.y]; a = p.a;
    if (g.kind === 'trip') earned += g.fare * smooth((t - g.t1) / .4); else km += g.km * k;
    lastEnd = g.t1;
  }
  return { pos, a, earned, km };
}

// ─── the city, baked once (the same for both) ──────────────────────────────
const CITY = (() => {
  const w = 1000, h = 560, [c, x] = canvas(w * SS, h * SS); x.scale(SS, SS);
  x.fillStyle = '#0E1527'; x.fillRect(0, 0, w, h);
  const r = rng(58);
  x.strokeStyle = '#112340'; x.lineWidth = 40; x.lineCap = 'round';
  x.beginPath(); x.moveTo(-40, 420); x.bezierCurveTo(250, 330, 560, 520, 1040, 400); x.stroke();
  x.fillStyle = '#0F1D26';
  for (let i = 0; i < 9; i++) { x.beginPath(); x.roundRect(r() * w, r() * h, 40 + r() * 80, 30 + r() * 50, 8); x.fill(); }
  // downtown: denser, warmer streets
  const dt = x.createRadialGradient(480, 230, 0, 480, 230, 260);
  dt.addColorStop(0, 'rgba(245,176,65,.13)'); dt.addColorStop(1, 'rgba(245,176,65,0)');
  x.fillStyle = dt; x.fillRect(0, 0, w, h);
  x.save(); x.translate(w / 2, h / 2); x.rotate(GR);
  for (let i = -16; i <= 16; i++) {
    const main = i % 4 === 0, off = i * 42 + (r() - .5) * 10;
    x.strokeStyle = main ? '#1F2C45' : '#172138'; x.lineWidth = main ? 7 : 3;
    x.beginPath(); x.moveTo(-900, off); x.lineTo(900, off); x.stroke();
    x.beginPath(); x.moveTo(off * 1.2, -900); x.lineTo(off * 1.2, 900); x.stroke();
  }
  x.restore();
  // the far suburbs fade out at the left edge
  const sub = x.createLinearGradient(0, 0, 220, 0);
  sub.addColorStop(0, 'rgba(8,12,22,.75)'); sub.addColorStop(1, 'rgba(8,12,22,0)');
  x.fillStyle = sub; x.fillRect(0, 0, 220, h);
  return c;
})();
function drawHouse(x, y, s, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 14 * s, y); ctx.lineTo(x, y - 13 * s); ctx.lineTo(x + 14 * s, y); ctx.lineTo(x + 10 * s, y);
  ctx.lineTo(x + 10 * s, y + 11 * s); ctx.lineTo(x - 10 * s, y + 11 * s); ctx.lineTo(x - 10 * s, y); ctx.closePath(); ctx.fill();
}
// the light of the day over the maps
const SKY = [[6, [255, 120, 150], .26, 0], [8.5, [255, 190, 150], .10, .04], [12.5, [220, 235, 255], .04, .10], [17, [255, 170, 90], .12, .03],
             [19, [255, 110, 60], .24, 0], [20.5, [40, 30, 90], .34, 0], [22, [5, 8, 22], .42, 0]];
function skyAt(h) {
  let i = 1; while (i < SKY.length - 1 && h > SKY[i][0]) i++;
  const [h0, c0, a0, b0] = SKY[i - 1], [h1, c1, a1, b1] = SKY[i], k = smooth((h - h0) / (h1 - h0));
  return { col: mix(c0, c1, k), a: lerp(a0, a1, k), bright: lerp(b0, b1, k) };
}

// ─── one panel: map, trails, car, offer card, header ───────────────────────
function drawTrail(pts, kind, col) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  if (kind === 'trip') { ctx.setLineDash([]); ctx.strokeStyle = rgba(RGB.ink, .8); ctx.lineWidth = 5; }
  else { ctx.setLineDash([2, 12]); ctx.strokeStyle = 'rgba(150,160,182,.85)'; ctx.lineWidth = 5; }
  ctx.stroke(); ctx.setLineDash([]);
}
function drawOfferCard(d, t, S) {
  for (const [t0, t1, v, fare, info, why] of OFFERS_DAY[d]) {
    if (t < t0 || t > t1 + .7) continue;
    const a = smooth((t - t0) / .15) * (1 - smooth((t - t1 - .45) / .25)), pop = easeBack((t - t0) / .3, 1.8);
    const cw = 290, ch = 118, x = clamp(S.pos[0] - cw / 2, 12, 880 - cw), y = clamp(S.pos[1] - ch - 40, 70, 560 - ch - 10);
    ctx.save(); ctx.globalAlpha *= a; ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(lerp(.7, 1, pop), lerp(.7, 1, pop)); ctx.translate(-cw / 2, -ch / 2);
    const vk = smooth((t - t1) / .12), vc = v === 'take' ? RGB.teal : v === 'pass' || v === 'expired' ? RGB.rose : RGB.muted;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 24; ctx.fillStyle = C.surface; ctx.beginPath(); ctx.roundRect(0, 0, cw, ch, 18); ctx.fill(); ctx.restore();
    ctx.strokeStyle = rgba(mix(RGB.line, vc, vk)); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(0, 0, cw, ch, 18); ctx.stroke();
    text(money(fare, fare % 1 ? 2 : 2), 20, 38, F.head(46), C.ink, { align: 'left' });
    text(info, 20, 84, F.sans(23, 500), C.muted, { align: 'left', maxW: d ? 170 : 250 });
    if (d === 0) {
      // Sam: the maths, then a late answer
      if (vk < 1) for (let k = 0; k < 3; k++) {
        const ang = t * 3 + k * TAU / 3, rx = cw / 2 + Math.cos(ang) * 170, ry = ch / 2 + Math.sin(ang) * 80;
        text(['?', '÷', '×'][k], rx, ry, F.head(40), [C.amber, C.ink, C.rose][k], { alpha: 1 - vk });
      }
      if (vk > 0) text(v === 'expired' ? L.expired : L.accepted, cw - 18, 38, F.head(32, 700), rgba(vc), { align: 'right', alpha: vk, ls: 2 });
    } else {
      // Alex: a small Rate Dial answers at once
      const cx = cw - 62, cy = 64, r = 38, val = v === 'take' ? 52 : 23, k = easeBack((t - t0) / (t1 - t0), 1.3);
      ctx.lineCap = 'round'; ctx.lineWidth = 8; ctx.strokeStyle = C.line; ctx.beginPath(); ctx.arc(cx, cy, r, PI, TAU); ctx.stroke();
      ctx.strokeStyle = rgba(mix(RGB.amber, vc, vk)); ctx.beginPath(); ctx.arc(cx, cy, r, PI, PI + clamp(val * k / 80, 0, 1.05) * PI); ctx.stroke();
      const na = PI + clamp(val * k / 80, 0, 1.05) * PI;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(na) * (r - 10), cy + Math.sin(na) * (r - 10)); ctx.stroke();
      ctx.strokeStyle = C.amber; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy - r - 8); ctx.lineTo(cx, cy - r - 16); ctx.stroke();
      if (vk > 0) {
        ctx.save(); ctx.translate(cx, cy + 24); const s = lerp(1.5, 1, easeBack((t - t1) / .25, 2)); ctx.scale(s, s);
        text(v === 'take' ? L.take : L.pass_, 0, 0, F.head(30), rgba(vc), { alpha: vk, ls: 2, glow: [rgba(vc, .6), 14], maxW: 118 });
        ctx.restore();
        if (why) text(why, 20, 106, F.sans(19, 600), rgba(vc), { align: 'left', alpha: vk, maxW: 170 });
      }
    }
    ctx.restore();
  }
}
function drawPanelMap(d, t) {
  const Pn = PANELS[d], h = hourAt(t), sky = skyAt(h), S = driverState(d, t);
  ctx.save(); ctx.translate(Pn.x, Pn.y);
  ctx.beginPath(); ctx.roundRect(0, 0, Pn.w, Pn.h, 28); ctx.clip();
  ctx.drawImage(CITY, 0, 0, Pn.w, Pn.h);
  drawHouse(HOME[0], HOME[1] + 4, 1.4, 'rgba(245,176,65,.9)');
  // trails
  for (const g of LEGS[d]) {
    if (t < g.t0) break;
    drawTrail(along(legPath(g.a, g.b), easeIO((t - g.t0) / (g.t1 - g.t0))).done, g.kind);
  }
  // the car
  ctx.save(); ctx.translate(S.pos[0], S.pos[1]);
  ctx.fillStyle = rgba(RGB[ACC[d]], .25); ctx.beginPath(); ctx.arc(0, 0, 24 + 3 * Math.sin(t * 5), 0, TAU); ctx.fill();
  ctx.rotate(S.a + PI / 2); ctx.fillStyle = C[ACC[d]];
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(12, 13); ctx.lineTo(0, 6); ctx.lineTo(-12, 13); ctx.closePath(); ctx.fill();
  ctx.restore();
  // the light of the hour
  if (sky.bright > 0) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(200,215,240,${sky.bright})`; ctx.fillRect(0, 0, Pn.w, Pn.h); ctx.restore(); }
  ctx.fillStyle = rgba(sky.col, sky.a); ctx.fillRect(0, 0, Pn.w, Pn.h);
  if (h > 19.5) {                                            // street lights come on
    const g = ctx.createRadialGradient(480, 230, 0, 480, 230, 330), k = smooth((h - 19.5) / 1.5);
    g.addColorStop(0, `rgba(245,176,65,${.16 * k})`); g.addColorStop(1, 'rgba(245,176,65,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, Pn.w, Pn.h); ctx.restore();
  }
  drawOfferCard(d, t, S);
  // header: name, tag, counters
  const hg = ctx.createLinearGradient(0, 0, 0, 90); hg.addColorStop(0, 'rgba(8,12,22,.92)'); hg.addColorStop(1, 'rgba(8,12,22,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, 0, Pn.w, 90);
  drawHeader(d, t, S);
  ctx.restore();
  ctx.strokeStyle = rgba(RGB[ACC[d]], .55); ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(Pn.x, Pn.y, Pn.w, Pn.h, 28); ctx.stroke();
}
function drawHeader(d, t, S) {
  text(L.names[d], 26, 40, F.head(50), C.ink, { align: 'left' });
  ctx.font = F.head(50); const nw = ctx.measureText(L.names[d]).width;
  ctx.font = F.sans(23, 600); const tw = ctx.measureText(L.tags[d]).width + 30;
  ctx.fillStyle = rgba(RGB[ACC[d]], .16); ctx.beginPath(); ctx.roundRect(26 + nw + 16, 22, tw, 38, 19); ctx.fill();
  text(L.tags[d], 26 + nw + 16 + tw / 2, 42, F.sans(23, 600), C[ACC[d]]);
  if (S) {
    text(money(Math.round(S.earned)), 880, 36, F.mono(40, 600), C.ink, { align: 'right' });
    text(`${Math.round(S.km)} ${L.empty}`, 880, 72, F.mono(22, 500), 'rgba(166,176,195,.95)', { align: 'right' });
  }
}
function drawBand(t) {
  const h = hourAt(t), a = 1 - smooth((t - TL.score[0] + .2) / .4);   // t is real time; the hour stops at 22:00
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  // the day's progress line, a sun or a moon riding it
  const x0 = 130, x1 = 910, y = BAND.y + BAND.h / 2, k = (h - 6) / 16, px = lerp(x0, x1, k);
  ctx.strokeStyle = C.line; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y + 26); ctx.lineTo(x1, y + 26); ctx.stroke();
  ctx.strokeStyle = C.amber; ctx.beginPath(); ctx.moveTo(x0, y + 26); ctx.lineTo(px, y + 26); ctx.stroke();
  const night = smooth((h - 19.5) / 1.2);
  ctx.fillStyle = rgba(mix(RGB.amber, RGB.ink, night)); ctx.beginPath(); ctx.arc(px, y + 26, 11, 0, TAU); ctx.fill();
  if (night > 0) { ctx.fillStyle = rgba(hex('#080D18'), night); ctx.beginPath(); ctx.arc(px + 6, y + 22, 9, 0, TAU); ctx.fill(); }
  text(clockText(h), 520, y - 12, F.mono(46, 600), C.ink);
  ctx.restore();
}

// ─── the night: both drivers from behind ───────────────────────────────────
const VPX = 470, VPY = 620, KF = 1300, HC = 1.25;
const proj = (lat, h, z) => [VPX + lat * KF / z, VPY + (HC - h) * KF / z];
function applyCam(g, cam) { g.translate(cam.px, cam.py); g.scale(cam.s, cam.s); g.translate(-cam.cx, -cam.cy); }
const STARS = table(80, 5, r => [r() * 1080, 150 + r() * 420, .6 + r() * 1.4, r() * 9]);
function drawNightOutside(d, t) {
  const sky = ctx.createLinearGradient(0, 120, 0, VPY);
  sky.addColorStop(0, '#03050B'); sky.addColorStop(1, d ? '#141C33' : '#0A0F1E');
  ctx.fillStyle = sky; ctx.fillRect(-100, 0, 1300, VPY + 20);
  ctx.fillStyle = '#EEF1F7';
  for (const [x, y, s, ph] of STARS) { ctx.globalAlpha = (d ? .25 : .7) * (.6 + .4 * Math.sin(t * 2 + ph)); ctx.fillRect(x, y, s, s); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#070A12'; ctx.fillRect(-100, VPY, 1300, 700);
  if (d === 0) {
    // the outskirts: the city is a faint glow far away; one lamp; an empty road
    const g = ctx.createRadialGradient(900, VPY, 0, 900, VPY, 260); g.addColorStop(0, 'rgba(245,176,65,.22)'); g.addColorStop(1, 'rgba(245,176,65,0)');
    ctx.fillStyle = g; ctx.fillRect(500, VPY - 260, 700, 400);
    ctx.fillStyle = '#0B0F1A'; const a = proj(-3.5, 0, 200), b = proj(3.5, 0, 200), c = proj(3.5, 0, 1.3), e = proj(-3.5, 0, 1.3);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(e[0], e[1]); ctx.fill();
    ctx.fillStyle = 'rgba(238,241,247,.35)';
    for (let k = 0; k < 10; k++) { const z0 = 3 + k * 7, [x0, y0] = proj(-.06, 0, z0), [x1, y1] = proj(.06, 0, z0 + 2.5); ctx.fillRect(x0, y1, x1 - x0, y0 - y1); }
    const [lx, ly] = proj(4.2, 5.5, 14), [gx, gy] = proj(4.6, 0, 14);
    ctx.strokeStyle = '#1C2538'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, ly); ctx.lineTo(lx, ly); ctx.stroke();
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .7; ctx.drawImage(TINTED.amber, lx - 120, ly - 120, 240, 240); ctx.restore();
  } else {
    // home: a house at the end of the driveway, windows lit (low in the windscreen, where the night shot frames it)
    ctx.fillStyle = '#0B1120'; ctx.beginPath(); ctx.moveTo(200, 590); ctx.lineTo(520, 470); ctx.lineTo(840, 590); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#131B30'; ctx.fillRect(240, 585, 560, 200);
    ctx.fillStyle = '#1C2640'; ctx.fillRect(290, 660, 230, 125);
    for (const [x, y] of [[590, 625], [690, 625]]) {
      ctx.fillStyle = 'rgba(245,176,65,.9)'; ctx.fillRect(x, y, 62, 58);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .4; ctx.drawImage(TINTED.amber, x - 50, y - 50, 162, 158); ctx.restore();
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .7; ctx.drawImage(TINTED.amber, 540, 650, 90, 90); ctx.restore();
    ctx.fillStyle = '#0D1220'; ctx.beginPath(); ctx.moveTo(290, 785); ctx.lineTo(520, 785); ctx.lineTo(760, 1100); ctx.lineTo(60, 1100); ctx.fill();
  }
}
function drawNightPhone(d) {
  const x = 700, y = 820, w = 170, h = 330;
  ctx.fillStyle = '#05070C'; ctx.fillRect(x + w / 2 - 12, y + h - 10, 24, 120);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.fillStyle = '#0B1120'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 26); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(238,241,247,.16)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, h, 26); ctx.stroke();
  if (d === 0) {
    ctx.setLineDash([3, 12]); ctx.strokeStyle = C.rose; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 40, y + 250); ctx.quadraticCurveTo(x + 150, y + 170, x + 110, y + 60); ctx.stroke(); ctx.setLineDash([]);
    drawHouse(x + 112, y + 52, 1.3, C.ink);
    text('25 km', x + w / 2, y + 290, F.head(44), C.rose);
  } else {
    ctx.strokeStyle = C.teal; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(x + w / 2, y + 120, 44, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w / 2 - 20, y + 120); ctx.lineTo(x + w / 2 - 4, y + 136); ctx.lineTo(x + w / 2 + 22, y + 104); ctx.stroke();
    text(money(286), x + w / 2, y + 240, F.head(50), C.teal);
  }
}
function drawNightPanel(d, t, a) {
  const Pn = PANELS[d];
  ctx.save(); ctx.globalAlpha *= a;
  ctx.beginPath(); ctx.roundRect(Pn.x, Pn.y, Pn.w, Pn.h, 28); ctx.clip();
  const cam = { px: Pn.x + (Pn.w - 1080 * .9) / 2, py: Pn.y, s: .9, cx: 60, cy: 560 };
  ctx.fillStyle = '#04060C'; ctx.fillRect(Pn.x, Pn.y, Pn.w, Pn.h);
  ctx.save(); applyCam(ctx, cam);
  ctx.save(); screenPath(ctx); ctx.clip(); drawNightOutside(d, t); ctx.restore();
  drawInterior(t, { red: 0 }); drawWheel(); drawNightPhone(d);
  ctx.restore();
  const Pz = d === 0
    ? { lean: .3, rub: .9 + .1 * Math.sin(t * 2.2), rot: .08 + .02 * Math.sin(t * 1.3), lurch: 0, breathe: .5 * Math.sin(t * 2.4), grip: 0 }
    : { lean: -.3, rub: 0, rot: -.03, lurch: 0, breathe: .3 * Math.sin(t * 1.3), grip: 0 };
  drawDriverLit(Pz, cam, { red: 0 });
  // header over the night
  const hg = ctx.createLinearGradient(0, Pn.y, 0, Pn.y + 90); hg.addColorStop(0, 'rgba(8,12,22,.92)'); hg.addColorStop(1, 'rgba(8,12,22,0)');
  ctx.fillStyle = hg; ctx.fillRect(Pn.x, Pn.y, Pn.w, 90);
  ctx.save(); ctx.translate(Pn.x, Pn.y); drawHeader(d, t, null);
  text(L.night[d], 880, 42, F.sans(30, 600), C[ACC[d]], { align: 'right', maxW: 420 });
  ctx.restore();
  ctx.restore();
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = rgba(RGB[ACC[d]], .55); ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(Pn.x, Pn.y, Pn.w, Pn.h, 28); ctx.stroke(); ctx.restore();
}

// ─── the scorecard ─────────────────────────────────────────────────────────
const RESULT = [{ earned: 198, km: 71, eff: 19.8 }, { earned: 286, km: 22, eff: 28.6 }];
function drawScore(t) {
  const a = smooth((t - TL.score[0]) / .5) * (1 - smooth((t - TL.end + .3) / .35));
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(12,18,32,.9)'; ctx.fillRect(0, 0, W, H);
  const cnt = smooth((t - TL.score[0] - .3) / 1.2);
  RESULT.forEach((R, d) => {
    const Pn = PANELS[d], y0 = Pn.y + 30, rise = (1 - easeOut((t - TL.score[0] - d * .15) / .5)) * 30;
    ctx.save(); ctx.translate(0, rise);
    ctx.fillStyle = C.surface; ctx.beginPath(); ctx.roundRect(80, y0, 820, 400, 30); ctx.fill();
    ctx.strokeStyle = rgba(RGB[ACC[d]], .6); ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(80, y0, 820, 400, 30); ctx.stroke();
    ctx.save(); ctx.translate(80 + 10, y0 + 18); drawHeader(d, t, null); ctx.restore();
    rich([[money(R.eff * cnt, 2), C[ACC[d]], F.head(150)], [L.eff, C.muted, F.sans(40, 600)]], 120, y0 + 190, F.head(150), { align: 'left' });
    text(`${money(Math.round(R.earned * cnt))} ${L.earned}  ·  ${Math.round(R.km * cnt)} ${L.empty}  ·  ${L.online}`, 120, y0 + 320, F.sans(34, 500), C.ink, { align: 'left', maxW: 740 });
    ctx.restore();
  });
  reveal(life(t, TL.final, 99, .35), () => rich(L.final, 520, BAND.y + BAND.h / 2 + 14, F.head(72), { maxW: 880 }));
  reveal(life(t, TL.score[0] + .6, 99), () => text(L.disclaimer, 520, 1478, F.sans(26, 500), C.muted, { maxW: 860 }));
  ctx.restore();
}

// ─── captions and the frame ────────────────────────────────────────────────
function drawCaptions(t) {
  reveal(life(t, 0, 2.4, .25), () => text(L.open, 520, 330, F.head(64), C.ink, { maxW: 880 }));
  reveal(life(t, 7.0, 10.2), () => text(L.bad, 520, 330, F.head(58), C.ink, { maxW: 880 }));
  reveal(life(t, 13.0, 15.4), () => text(L.hes, 520, 330, F.head(58), C.ink, { maxW: 880 }));
  reveal(life(t, 17.0, 21.6), () => rich(L.maths, 520, 330, F.head(58), { maxW: 880 }));
}
function drawScene(t) {
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#0A0F1C'); bg.addColorStop(1, '#070B14');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const nk = smooth((t - TL.night[0]) / .6);
  for (let d = 0; d < 2; d++) {
    if (nk < 1) { ctx.save(); ctx.globalAlpha = 1 - nk; drawPanelMap(d, Math.min(t, TL.night[0])); ctx.restore(); }
    if (nk > 0 && t < TL.score[0] + .6) drawNightPanel(d, t, nk);
  }
  drawBand(t);
  drawCaptions(t);
  drawScore(t);
  drawEnd(t);
}
const SHOTS = [
  { id: 'open', start: 0, end: 2, readAt: 1.2, action: 'split screen, same start' },
  { id: 'morning', start: 2, end: 8, readAt: 4.5, action: 'Sam takes the long pickup; Alex PASS then TAKE' },
  { id: 'suburbs', start: 8, end: 13, readAt: 11.5, action: 'Sam drives back empty from the suburbs' },
  { id: 'expired', start: 13, end: 17, readAt: 13.9, action: 'Sam lets an offer expire' },
  { id: 'evening', start: 17, end: 22, readAt: 21.5, action: 'Sam ends far out; Alex heads home' },
  { id: 'night', start: 22, end: 27, readAt: 25, action: 'both drivers from behind: stranded vs home' },
  { id: 'score', start: 27, end: 31.5, readAt: 30.5, action: 'scorecard, disclaimer' },
  { id: 'end', start: 31.5, end: 35, readAt: 34, action: 'end card' },
];
const MARKS = [0, 2, 10, 13.9, 22, 27, TL.final, TL.end];

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

  // ── "Two drivers, one day". Dawn is sparse, midday grooves, the evening fills out, the night is quiet.
  pad(0, 2.2, [220, 261.63, 329.63], .8);
  const CH = [[110, [220, 261.63, 329.63]], [87.31, [174.61, 220, 261.63]], [130.81, [261.63, 329.63, 392]], [98, [196, 246.94, 293.66]]];
  for (let b = 0; b < 10; b++) {
    const t0 = TL.day[0] + b * 2, [root, notes] = CH[b % 4], energy = b < 2 ? 0 : b < 7 ? 1 : b < 9 ? 2 : .5;
    pad(t0, 2, notes, b < 2 ? 1 : .8);
    for (let k = 0; k < 4; k++) {
      const tb = t0 + k * .5;
      if (energy >= .5 && (energy >= 1 || k % 2 === 0)) kick(tb, energy >= 1 ? .8 : .55);
      if (energy >= 1) hat(tb + .25, .16);
      if (energy >= 2 && (k === 1 || k === 3)) clap(tb, .24);
      if (energy >= .5) { bass(tb, root, .2, .6); if (energy >= 1) bass(tb + .25, k === 3 ? root * 2 : root, .18, .4); }
      if (energy === 0) pluck(tb + .25, notes[(k + b) % 3] * 2, .22);
    }
  }
  // every decision has a sound: Sam's maths blips and dull accepts; Alex's bright TAKE and soft PASS
  OFFERS_DAY[0].forEach(([t0, t1, v]) => {
    for (let q = t0 + .1; q < t1; q += .2) blip(q, 700 + ((q * 10) % 5) * 90, .06);
    if (v === 'expired') { const g = gain(fx); env(g, t1, .005, .14, .3); const o = osc('sine', 820, t1, .35, g); o.frequency.exponentialRampToValueAtTime(380, t1 + .3); }
    else bell(t1, 392, .28);
  });
  OFFERS_DAY[1].forEach(([t0, t1, v]) => { if (v === 'take') { bell(t1, 1046.5, .26); bell(t1 + .09, 1567.98, .2); } else tick(t1, 1, .35); });
  // the night: the groove falls away
  whoosh(TL.night[0] - .1, .7, false, .2);
  pad(TL.night[0], 5, [174.61, 220, 261.63, 329.63], .8);
  bass(TL.night[0], 43.65, 4.6, .45);
  // the scorecard: counting ticks, then a hit on the line
  for (let q = TL.score[0] + .3; q < TL.score[0] + 1.5; q += .08) tick(q, (q * 12 | 0) % 2, .12);
  hit(TL.final);
  pad(TL.final, 2.1, [220, 261.63, 329.63, 440], .8);
  // the end card
  pad(TL.end, 3.4, [130.81, 196, 329.63, 493.88, 587.33], .9);
  bass(TL.end, 65.41, 3.1, .5);
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
