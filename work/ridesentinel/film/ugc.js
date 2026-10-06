'use strict';

// ─── format ─────────────────────────────────────────────────────────────────
const W = 1080, H = 1920; let DURATION = 30;
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

// ─── phone, map, card, dial ─────────────────────────────────────────────────
function phonePath(g, R) { g.beginPath(); g.roundRect(R.x, R.y, R.w, R.h, R.r); }
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
  if (i === 0 && t >= o.life && t < TL.act2) {             // act 1: the offer runs out at the green light
    const k = smooth((t - o.life) / .25);
    ctx.fillStyle = `rgba(12,18,32,${.84 * k})`; phonePath(ctx, CARD); ctx.fill();
    text(L.expired, CX, CARD.y + CARD.h / 2, F.head(76, 700), C.rose, { alpha: k, maxW: CARD.w - 40 });
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
    const shown = LANG === 'fr' ? `${Math.round(Math.max(0, v))}` : `$${Math.round(Math.max(0, v))}`;
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


// ════ SCENE ("Drivers, quick one": the UGC ad) ═════════════════════════════
// A presenter in a parked car talks to the camera (lip-synced A-roll frames from aroll-xx.js, a stand-in until they exist).
// Jump cuts on every line, captions, the app in a split screen. Every beat is timed to the measured voice (align-ugc-xx.js).
const UG = L.ugc;
const isPunct = c => /[，。？！：、…；,.?!:]/.test(c);
const tokenize = s => s.split(/\s+/).filter(Boolean);
function spread(toks, t0, t1) {
  const tot = toks.reduce((a, w) => a + w.length, 0) || 1; let x = t0;
  return toks.map(w => { const d = (t1 - t0) * w.length / tot, o = { w, t0: x, t1: x + d * .94 }; x += d; return o; });
}
const ALIGN = (() => {
  const A = window.UGC_ALIGN;
  if (A) { A.lines.forEach(l => { if (!l.words || !l.words.length) l.words = spread(tokenize(l.text), l.t0, l.t1); }); return A; }
  let t = .15;
  return { lines: UG.lines.map(s => { const d = s.length / 15, o = { text: s, t0: t, t1: t + d, words: spread(tokenize(s), t, t + d) }; t += d + .3; return o; }), env: null, rate: 100 };
})();
const LN = ALIGN.lines, NL = LN.length;
const dl = i => LN[i].t1 - LN[i].t0;
const wordAt = (i, re, fb = .5) => { const w = LN[i].words.find(w => re.test(w.w)); return w ? w.t0 : LN[i].t0 + fb * dl(i); };
// the hook's second sentence is stamped, not captioned: it starts after the first word ending in a full stop
const STAMP_FROM = (() => { const ws = LN[0].words, k = ws.findIndex(w => /[.!؟?]$/.test(w.w)); return k >= 0 && k < ws.length - 1 ? k + 1 : 0; })();
const TL = (() => {
  const pass = wordAt(5, /^(pass|passez|ارفض)/i, .25), take = wordAt(5, /^(take|prenez|اقبل)/i, .75);
  const end = Math.min(wordAt(7, /^(link|lien|الرابط)/i, .55) - .1, LN[7].t1 - .4);
  const dialIn = LN[4].t0 + .1, sweep = LN[4].t0 + .5 * dl(4);
  return {
    stamps: LN[0].words.slice(STAMP_FROM, STAMP_FROM + 3).map(w => w.t0),
    brand: wordAt(3, /^(ride|رايد)/i, .6), lock: LN[6].t0 + .1,
    pass, take, end, dialIn, turn: 0, act2: 0,
    offers: [
      { arrive: LN[1].t0 + .12, arrive2: LN[4].t0 - .02, swing: [sweep, sweep + .6], stamp: pass, leave: take - .05, life: 99 },
      { arrive: take - .02, swing: [take, take + .32], stamp: take + .2, leave: 99 },
    ],
    markArc: [end + .05, end + .6], markNeedle: [end + .45, end + .95], word: end + .75, line: end + 1.05, url: end + 1.3, cta: end + 1.5, fine: end + 1.7,
  };
})();
DURATION = Math.max(LN[NL - 1].t1 + 1.2, TL.end + 3.5);
TL.fadeOut = [DURATION - .45, DURATION];
// the cut list: [start, kind, zoom]. Face shots alternate between a wide and a punched-in framing, as creators cut.
const CUTS = [
  [0, 'face', 1.16], [LN[1].t0 - .08, 'offer'], [LN[2].t0 - .08, 'face', 1.0], [LN[3].t0 - .08, 'face', 1.14],
  [LN[4].t0 - .08, 'dial'], [LN[5].t0 - .08, 'dial'], [LN[6].t0 - .08, 'lock'], [LN[7].t0 - .08, 'face', 1.0], [TL.end, 'end', 1.0],
];
function shotAt(t) { let i = 0; while (i < CUTS.length - 1 && t >= CUTS[i + 1][0]) i++; return { i, kind: CUTS[i][1], zoom: CUTS[i][2] || 1, u: t - CUTS[i][0] }; }

const OFFERS = [
  { ...L.offers[0], value: 23, verdict: 'PASS', word: L.pass_, col: 'rose', route: [[520, 1120], [488, 1050], [452, 985], [398, 930], [366, 850], [318, 770], [292, 690]] },
  { ...L.offers[1], value: 52, verdict: 'TAKE', word: L.take, col: 'teal', route: [[520, 1120], [556, 1062], [602, 1000], [640, 930], [700, 868], [738, 790]] },
];
const BAR = 40, VMAX = 80;
const CX = 520;
const PHONE = { x: 210, y: 560, w: 620, h: 1500, r: 80 };
const SCR = { x: 224, y: 574, w: 592, h: 1472, r: 68 };
const CARD = { x: 242, y: 1188, w: 556, h: 262, r: 30 };
const PANEL = { x: 252, y: 662, w: 536, h: 506, r: 34 };
const HUB = { x: CX, y: 925 }, DR = 168;
const SPLIT = 1000;                                              // split screen: the app above, the presenter below
const envl = (t, a, b, c, d) => Math.min(smooth((t - a) / (b - a)), 1 - smooth((t - c) / (d - c)));

function voiceEnv(t) {
  if (ALIGN.env) { const k = t * ALIGN.rate, i = Math.floor(k), a = ALIGN.env[i] || 0, b = ALIGN.env[i + 1] || 0; return clamp(lerp(a, b, k - i)); }
  return 0;
}

// ─── the presenter: A-roll frames, or a stand-in ───────────────────────────
const AROLL = (window.UGC_AROLL && window.UGC_AROLL.clips) || [];
function lineAt(t) { let i = 0; while (i < NL - 1 && t >= LN[i + 1].t0 - .15) i++; return i; }
function frameRef(t) {                                         // which file holds the presenter at time t (null: the stand-in)
  const i = lineAt(t), c = AROLL[i];
  if (!c) return null;
  const k = clamp(Math.floor((t - c.start) * c.fps + 1e-6), 0, c.n - 1);
  return `${c.dir}/${String(k + 1).padStart(4, '0')}.jpg`;
}
const FRAMES = new Map(); let FACE_IMG = null;
async function prepFace(t) {
  const url = frameRef(t);
  if (!url) { FACE_IMG = null; return; }
  let im = FRAMES.get(url);
  if (!im) {
    im = new Image(); im.src = url; await im.decode();
    FRAMES.set(url, im); if (FRAMES.size > 160) FRAMES.delete(FRAMES.keys().next().value);
  }
  FACE_IMG = im;
}
// the stand-in: the cabin at night, a silhouette whose mouth follows the voice, labelled as pending
const [STANDC, standRaw] = canvas(720 * SS, 1280 * SS), STAND = supersample(standRaw, SS);
function drawStandIn(t) {
  const g = STAND; g.setTransform(1, 0, 0, 1, 0, 0);
  const bg = g.createLinearGradient(0, 0, 0, 1280); bg.addColorStop(0, '#121A2C'); bg.addColorStop(1, '#070B14');
  g.fillStyle = bg; g.fillRect(0, 0, 720, 1280);
  for (const b of BACKLIGHTS) {                                 // the street through the rear window
    const x = b.x * 720 + Math.sin(t * b.sp + b.ph * TAU) * 14, y = 120 + b.y * 420, s = b.s * .8;
    g.globalAlpha = .28; g.drawImage(TINTED[b.k], x - s / 2, y - s / 2, s, s);
  }
  g.globalAlpha = 1;
  g.fillStyle = '#0A0F1A'; g.beginPath(); g.roundRect(150, 260, 420, 560, 120); g.fill();          // headrest and seat
  g.fillStyle = '#1C2538'; g.beginPath(); g.ellipse(360, 470, 118, 148, 0, 0, TAU); g.fill();      // head
  g.beginPath(); g.moveTo(90, 1280); g.bezierCurveTo(100, 760, 250, 690, 360, 690); g.bezierCurveTo(470, 690, 620, 760, 630, 1280); g.fill();
  const m = voiceEnv(t);
  g.fillStyle = '#05070D'; g.beginPath(); g.ellipse(360, 545, 34, 4 + 22 * m, 0, 0, TAU); g.fill();
  g.font = '600 22px "IBM Plex Mono"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(166,176,195,.75)';
  g.fillText('AI PRESENTER · LIP-SYNC PENDING', 360, 900);
  return STANDC;
}
// draw the presenter into a box; focus is the source point kept in view (the face), zoom 1 = the box filled edge to edge
function drawPresenter(t, box, zoom, focusY = .4) {
  const src = FACE_IMG || drawStandIn(t), sw0 = FACE_IMG ? FACE_IMG.naturalWidth : STANDC.width, sh0 = FACE_IMG ? FACE_IMG.naturalHeight : STANDC.height;
  const cover = Math.max(box.w / sw0, box.h / sh0) * zoom, sw = box.w / cover, sh = box.h / cover;
  const sx = clamp((sw0 - sw) / 2, 0, sw0 - sw), sy = clamp(focusY * sh0 - sh * .42, 0, sh0 - sh);
  ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
  ctx.drawImage(src, sx, sy, sw, sh, box.x, box.y, box.w, box.h);
  ctx.restore();
}

// ─── the phone (the POV film's, on a split screen) ─────────────────────────
function countdownOf(i, t) {
  const o = TL.offers[i];
  if (i === 0 && t < o.arrive2) return clamp(15 - (t - o.arrive), 1, 15);
  const a = i === 0 ? o.arrive2 : o.arrive;
  return 15 - (Math.min(Math.max(t, a), o.stamp) - a);
}
function dialValue(t) {
  const [a, b] = TL.offers, sw = (o, from, to) => lerp(from, to, easeBack((t - o.swing[0]) / (o.swing[1] - o.swing[0]), 1.3));
  if (t < a.swing[0]) return 0;
  if (t < b.swing[0]) return sw(a, 0, OFFERS[0].value);
  return sw(b, OFFERS[0].value, OFFERS[1].value);               // "Above it? Take.": the needle climbs past the bar
}
function drawPhone(t, mode) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 80; ctx.shadowOffsetY = 30;
  const bg = ctx.createLinearGradient(PHONE.x, 0, PHONE.x + PHONE.w, 0);
  bg.addColorStop(0, '#1B2336'); bg.addColorStop(.5, '#0B101B'); bg.addColorStop(1, '#1B2336');
  ctx.fillStyle = bg; phonePath(ctx, PHONE); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(238,241,247,.14)'; ctx.lineWidth = 2; phonePath(ctx, PHONE); ctx.stroke();
  ctx.save(); phonePath(ctx, SCR); ctx.clip();
  ctx.fillStyle = '#0B1120'; ctx.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
  ctx.drawImage(MAP.c, SCR.x, SCR.y, MAP.w, MAP.h);
  const mg = ctx.createLinearGradient(0, SCR.y + MAP.h - 160, 0, SCR.y + MAP.h);
  mg.addColorStop(0, 'rgba(11,17,32,0)'); mg.addColorStop(1, 'rgba(11,17,32,1)');
  ctx.fillStyle = mg; ctx.fillRect(SCR.x, SCR.y + MAP.h - 160, SCR.w, 160);
  const [o0, o1] = TL.offers, act2 = mode !== 'offer';
  const r0 = act2 ? 1 - smooth((t - o0.leave) / .25) : 1, r1 = smooth((t - o1.arrive) / .3);
  if (r0 > 0) drawRoute(0, t, r0);
  if (r1 > 0) drawRoute(1, t, r1);
  text('2:04', SCR.x + 44, SCR.y + 40, F.sans(26, 600), C.ink, { align: 'left' });
  ctx.fillStyle = 'rgba(46,211,183,.16)'; ctx.beginPath(); ctx.roundRect(SCR.x + SCR.w - 172, SCR.y + 20, 132, 40, 20); ctx.fill();
  ctx.fillStyle = C.teal; ctx.beginPath(); ctx.arc(SCR.x + SCR.w - 150, SCR.y + 40, 6, 0, TAU); ctx.fill();
  text(L.online, SCR.x + SCR.w - 91, SCR.y + 41, F.sans(24, 600), C.teal, { maxW: 80 });
  const arrive = act2 ? o0.arrive2 : o0.arrive;
  if (!act2 || t < o0.leave + .4) {
    const slam = t - arrive < .35 ? lerp(70, 0, easeBack((t - arrive) / .35, 2.4)) : 0;
    drawCard(0, t, slam + (act2 ? easeIn((t - o0.leave) / .3) * 560 : 0));
  }
  if (act2 && t >= o1.arrive) drawCard(1, t, lerp(560, 0, easeBack((t - o1.arrive) / .42, 1.1)));
  if (act2) drawDial(t);
  if (mode === 'lock') {                                        // everything stays on the phone
    const k = smooth((t - TL.lock) / .3), ls = easeBack((t - TL.lock - .05) / .4, 1.8);
    ctx.fillStyle = `rgba(8,13,24,${.86 * k})`; ctx.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
    if (k > 0) {
      ctx.save(); ctx.globalAlpha *= k; ctx.translate(CX, 1060); ctx.scale(lerp(.6, 1, ls), lerp(.6, 1, ls));
      ctx.save(); ctx.shadowColor = 'rgba(46,211,183,.55)'; ctx.shadowBlur = 50;
      ctx.strokeStyle = C.teal; ctx.lineWidth = 22; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, -70, 68, PI, TAU); ctx.lineTo(68, -10); ctx.moveTo(-68, -70); ctx.lineTo(-68, -10); ctx.stroke();
      ctx.fillStyle = C.teal; ctx.beginPath(); ctx.roundRect(-118, -20, 236, 190, 30); ctx.fill(); ctx.restore();
      ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(0, 55, 22, 0, TAU); ctx.fill(); ctx.fillRect(-9, 55, 18, 58);
      ctx.restore();
      reveal(life(t, TL.lock + .25, 99), () => text(UG.lock, CX, 1330, F.head(104), C.ink, { ls: 4, maxW: 540 }));
      reveal(life(t, TL.lock + .45, 99), () => text(UG.lockSub, CX, 1430, F.sans(40, 500), C.muted, { maxW: 540 }));
    }
  }
  ctx.restore();
  ctx.save(); phonePath(ctx, SCR); ctx.clip();
  const sh = ctx.createLinearGradient(SCR.x, SCR.y, SCR.x + SCR.w, SCR.y + 700);
  sh.addColorStop(0, 'rgba(255,255,255,.05)'); sh.addColorStop(.4, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh; ctx.fillRect(SCR.x, SCR.y, SCR.w, SCR.h); ctx.restore();
  ctx.fillStyle = '#05070D'; ctx.beginPath(); ctx.roundRect(CX - 60, SCR.y + 14, 120, 30, 15); ctx.fill();
}
function drawSplit(t, S) {
  // the app on top: a brand-navy backdrop, the phone framed on what matters for this line
  const g = ctx.createLinearGradient(0, 0, 0, SPLIT); g.addColorStop(0, '#0E1628'); g.addColorStop(1, '#070B14');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, SPLIT);
  const focus = S.kind === 'offer' ? 1300 : S.kind === 'lock' ? 1160 : 1060, z = .85 * (1 + .05 * (1 - easeOut(S.u / .3)));
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, SPLIT); ctx.clip();
  ctx.translate(540, SPLIT / 2 + 30); ctx.scale(z, z); ctx.translate(-CX, -focus); drawPhone(t, S.kind); ctx.restore();
  // the presenter below
  drawPresenter(t, { x: 0, y: SPLIT, w: W, h: H - SPLIT }, 1.0, .36);
  const sh = ctx.createLinearGradient(0, SPLIT, 0, SPLIT + 60); sh.addColorStop(0, 'rgba(0,0,0,.5)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh; ctx.fillRect(0, SPLIT, W, 60);
  ctx.fillStyle = C.amber; ctx.fillRect(0, SPLIT - 3, W, 6);
}

// ─── on top of the presenter: the hook stamp, the maths, the brand ──────────
function drawStamp(t) {
  if (t > LN[1].t0 - .1) return;
  const ys = [1180, 1340, 1500], cols = [C.ink, C.ink, C.amber];
  UG.stamp.forEach((w, j) => {
    const t0 = TL.stamps[j]; if (t0 === undefined || t < t0) return;
    const u = (t - t0) / .22, sc = lerp(1.9, 1, easeBack(u, 2.4));
    ctx.save(); ctx.globalAlpha *= clamp(u * 2.5); ctx.translate(540, ys[j]); ctx.scale(sc, sc); ctx.rotate((j - 1) * -.03);
    ctx.font = F.head(196, 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.direction = RTL ? 'rtl' : 'ltr'; ctx.letterSpacing = LS(4) + 'px';
    const mw = ctx.measureText(w).width; if (mw > 900) ctx.font = resize(F.head(196, 800), 900 / mw);
    ctx.lineJoin = 'round'; ctx.lineWidth = 22; ctx.strokeStyle = 'rgba(4,6,11,.92)'; ctx.strokeText(w, 0, 0);
    ctx.fillStyle = cols[j]; ctx.fillText(w, 0, 0); ctx.restore();
  });
}
function drawBubbles(t) {
  if (t < LN[2].t0 - .1 || t > LN[3].t0 - .1) return;
  const out = 1 - smooth((t - (LN[3].t0 - .35)) / .25);
  const spots = [[250, 520, -.08], [800, 470, .07], [210, 880, .05], [830, 860, -.06]];
  UG.frags.forEach((s, k) => {
    const t0 = LN[2].t0 + .15 + k * .55; if (t < t0) return;
    const [x, y, r] = spots[k], u = easeBack((t - t0) / .3, 2), bob = Math.sin((t - t0) * 2.4 + k) * 10;
    ctx.save(); ctx.globalAlpha *= out * clamp((t - t0) * 6); ctx.translate(x, y + bob); ctx.rotate(r); ctx.scale(u, u);
    ctx.font = F.mono(40, 600); ctx.direction = 'ltr'; const w = ctx.measureText(s).width + 44;
    ctx.fillStyle = 'rgba(12,18,32,.88)'; ctx.beginPath(); ctx.roundRect(-w / 2, -36, w, 72, 18); ctx.fill();
    ctx.strokeStyle = k === 3 ? C.rose : C.amber; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-w / 2, -36, w, 72, 18); ctx.stroke();
    text(s, 0, 2, F.mono(40, 600), k === 3 ? C.rose : C.amber);
    ctx.restore();
  });
}
function drawBrandPop(t) {
  const k = envl(t, TL.brand - .05, TL.brand + .15, LN[4].t0 - .3, LN[4].t0 - .1);
  if (k <= 0) return;
  const u = easeBack((t - TL.brand + .05) / .35, 1.8), y = 1180;
  ctx.save(); ctx.globalAlpha *= k; ctx.translate(540, y); ctx.scale(lerp(.5, 1, u), lerp(.5, 1, u));
  ctx.font = F.head(150); ctx.direction = 'ltr'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const a = ctx.measureText('Ride').width, b = ctx.measureText('Sentinel').width, w = a + b + 90;
  ctx.save(); ctx.shadowColor = 'rgba(245,176,65,.45)'; ctx.shadowBlur = 50;
  ctx.fillStyle = 'rgba(12,18,32,.92)'; ctx.beginPath(); ctx.roundRect(-w / 2, -100, w, 200, 44); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(245,176,65,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(-w / 2, -100, w, 200, 44); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.fillText('Ride', -(a + b) / 2, 4); ctx.fillStyle = C.amber; ctx.fillText('Sentinel', -(a + b) / 2 + a, 4);
  ctx.restore();
}
function drawAiTag() {                                          // a realistic AI person is labelled, always
  ctx.save(); ctx.font = F.mono(26, 600); ctx.direction = RTL ? 'rtl' : 'ltr';
  const w = ctx.measureText(UG.ai).width + 76, x = RTL ? W - 48 - w : 48, y = 176;
  ctx.fillStyle = 'rgba(8,12,22,.62)'; ctx.beginPath(); ctx.roundRect(x, y, w, 52, 26); ctx.fill();
  ctx.strokeStyle = 'rgba(238,241,247,.28)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, w, 52, 26); ctx.stroke();
  const sx = RTL ? x + w - 32 : x + 32, sy = y + 26;               // a four-point sparkle
  ctx.fillStyle = C.amber; ctx.beginPath();
  for (let k = 0; k < 8; k++) { const r = k % 2 ? 4 : 13, a = k * PI / 4 - PI / 2; ctx.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r); }
  ctx.closePath(); ctx.fill(); ctx.restore();
  text(UG.ai, RTL ? x + w - 54 : x + 54, y + 27, F.mono(26, 600), C.ink, { align: RTL ? 'right' : 'left' });
}

// ─── captions: the spoken word lit ─────────────────────────────────────────
function drawCaptions(t, y) {
  const i = lineAt(t);
  if (t < LN[i].t0 - .1 || t > LN[i].t1 + .3 || t >= TL.end - .05) return;
  let words = LN[i].words;
  if (i === 0 && STAMP_FROM) { if (t >= TL.stamps[0] - .02) return; words = words.slice(0, STAMP_FROM); }
  const font = F.head(76), maxW = 920, lh = 88;
  ctx.save(); ctx.font = font; ctx.letterSpacing = '0px'; ctx.direction = RTL ? 'rtl' : 'ltr'; ctx.textBaseline = 'middle';
  const sw = ctx.measureText(' ').width * 1.45;
  // show the words in chunks of up to two rows, as creators' auto-captions do
  const rowsAll = [[]]; let wsum = 0;
  words.forEach(w => { const ww = ctx.measureText(w.w).width; if (rowsAll[rowsAll.length - 1].length && wsum + sw + ww > maxW) { rowsAll.push([]); wsum = 0; } const r = rowsAll[rowsAll.length - 1]; wsum += (r.length ? sw : 0) + ww; r.push({ ...w, ww }); });
  const pages = []; for (let k = 0; k < rowsAll.length; k += 2) pages.push(rowsAll.slice(k, k + 2));
  let pi = 0; while (pi < pages.length - 1 && t >= pages[pi + 1][0][0].t0 - .05) pi++;
  const rows = pages[pi], pt0 = rows[0][0].t0;
  const y0 = y - (rows.length - 1) * lh / 2, pop = easeBack((t - pt0 + .1) / .16, 1.6);
  ctx.translate(540, y0); ctx.scale(lerp(.9, 1, pop), lerp(.9, 1, pop)); ctx.translate(-540, -y0);
  rows.forEach((r, ri) => {
    const tot = r.reduce((a, w, k) => a + w.ww + (k ? sw : 0), 0), yy = y0 + ri * lh;
    let x = RTL ? 540 + tot / 2 : 540 - tot / 2;
    ctx.textAlign = RTL ? 'right' : 'left';
    r.forEach(w => {
      const now = t >= w.t0 && t < w.t1 + .04, said = t >= w.t0, s = now ? 1.08 : 1, cx = RTL ? x - w.ww / 2 : x + w.ww / 2;
      ctx.save(); ctx.translate(cx, yy); ctx.scale(s, s); ctx.translate(-cx, -yy);
      ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(4,6,11,.92)'; ctx.lineJoin = 'round'; ctx.strokeText(w.w, x, yy);
      ctx.fillStyle = now ? C.amber : said ? C.ink : 'rgba(238,241,247,.72)'; ctx.fillText(w.w, x, yy);
      ctx.restore();
      x += RTL ? -(w.ww + sw) : w.ww + sw;
    });
  });
  ctx.restore();
}

function drawScene(t) {
  ctx.fillStyle = '#04060B'; ctx.fillRect(0, 0, W, H);
  const S = shotAt(t), split = S.kind === 'offer' || S.kind === 'dial' || S.kind === 'lock';
  if (split) drawSplit(t, S);
  else {
    const z = S.zoom * (1 + .025 * clamp(S.u / 4));               // a slow push-in on every face shot
    drawPresenter(t, { x: 0, y: 0, w: W, h: H }, z, .4);
    const lo = ctx.createLinearGradient(0, 1000, 0, H); lo.addColorStop(0, 'rgba(4,6,11,0)'); lo.addColorStop(1, 'rgba(4,6,11,.55)');
    ctx.fillStyle = lo; ctx.fillRect(0, 1000, W, H - 1000);
  }
  const flash = 1 - smooth(S.u / .12);                           // a hint of a flash on every jump cut
  if (S.i > 0 && flash > 0 && S.kind !== 'end') { ctx.fillStyle = `rgba(255,255,255,${.1 * flash})`; ctx.fillRect(0, 0, W, H); }
  drawStamp(t); drawBubbles(t); drawBrandPop(t);
  drawCaptions(t, split ? SPLIT + 150 : 1420);
  drawEnd(t);
  drawAiTag();
}
const SHOTS = CUTS.map(([s, k], i) => ({ id: `${i}-${k}`, start: s, end: i < CUTS.length - 1 ? CUTS[i + 1][0] : DURATION, readAt: s + .3, action: k }));
const MARKS = [...TL.stamps, TL.brand, TL.pass, TL.take, TL.lock, TL.end];
const BACKLIGHTS = table(26, 91, r => ({ x: r(), y: r(), s: 30 + r() * 90, k: ['amber', 'amber', 'ink', 'rose', 'teal'][Math.floor(r() * 5)], ph: r(), sp: .25 + r() * .35 }));

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
async function renderMix(sr = 48000) {
  const N = Math.ceil(DURATION * sr), ac = new OfflineAudioContext(2, N, sr), R = rng(4242);
  let voiceBuf = null;                                         // the voiceover, embedded by embed_audio.py
  if (window.FILM_AUDIO_B64) { const bytes = Uint8Array.from(atob(window.FILM_AUDIO_B64), c => c.charCodeAt(0)); voiceBuf = await ac.decodeAudioData(bytes.buffer); }
  const nb = ac.createBuffer(1, sr * 3, sr); { const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1; }
  const ir = ac.createBuffer(2, Math.floor(sr * 2.6), sr);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = (R() * 2 - 1) * Math.pow(1 - i / d.length, 2.8); }
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .2;
  const master = ac.createGain(); master.gain.value = .9;
  const duck = ac.createGain(); duck.connect(master);           // the score ducks under the voice
  const fade = ac.createGain(); fade.gain.setValueAtTime(1, 0); fade.gain.setValueAtTime(1, TL.fadeOut[0]); fade.gain.linearRampToValueAtTime(0, DURATION - .02);
  master.connect(comp).connect(fade).connect(ac.destination);
  const verb = ac.createConvolver(); verb.buffer = ir; const vret = ac.createGain(); vret.gain.value = .42; verb.connect(vret).connect(master);
  function bus(g, send = 0, pan = 0) {
    const n = ac.createGain(); n.gain.value = g;
    const p = ac.createStereoPanner(); p.pan.value = pan; n.connect(p).connect(duck);
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

  // ── "Drivers, quick one". The voice is the ad; a light creator beat sits low under it and ducks hard on every line.
  if (voiceBuf) {
    const src = ac.createBufferSource(); src.buffer = voiceBuf;
    const vg = ac.createGain(); vg.gain.value = 1.15; src.connect(vg).connect(master); src.start(0);
  }
  LN.forEach(l => { duck.gain.setTargetAtTime(.3, Math.max(0, l.t0 - .08), .05); duck.gain.setTargetAtTime(.75, l.t1 + .05, .2); });
  // a 100 BPM lo-fi loop: soft kick, rim on 2 and 4, swung hats, warm chords, a round bass
  const BEAT = .6, CH = [[110, [220, 277.18, 329.63, 415.3]], [92.5, [185, 233.08, 277.18, 369.99]], [123.47, [246.94, 293.66, 369.99, 440]], [82.41, [164.81, 207.65, 246.94, 329.63]]];
  for (let b = 0; b * 4 * BEAT < TL.end; b++) {
    const t0 = b * 4 * BEAT, [root, notes] = CH[b % 4], len = Math.min(4 * BEAT, TL.end - t0);
    pad(t0, len, notes, .55);
    for (let k = 0; k < 4 && t0 + k * BEAT < TL.end; k++) {
      const tb = t0 + k * BEAT;
      if (k === 0 || k === 2) kick(tb, .55);
      if (k === 1 || k === 3) clap(tb, .12);
      hat(tb + BEAT * .5 + .04, .1); hat(tb, .06);
      if (k === 0) bass(tb, root, BEAT * 1.6, .45); if (k === 2) bass(tb, root * (b % 2 ? 1.5 : 1), BEAT * .9, .35);
    }
  }
  // sound design on the picture
  CUTS.forEach(([s], i) => { if (i && s < TL.end) whoosh(s - .1, .2, i % 2 === 1, .1); });
  TL.stamps.forEach((t, j) => { thud(t); blip(t, [220, 247, 196][j], .12); });
  UG.frags.forEach((s, k) => blip(LN[2].t0 + .15 + k * .55, [660, 880, 990, 740][k], .09));
  [1318.5, 1760].forEach((f, k) => { const g = gain(bells); env(g, TL.offers[0].arrive + k * .09, .003, .3, .35); osc('sine', f, TL.offers[0].arrive + k * .09, .45, g); });
  bell(TL.brand, 783.99, .32); bell(TL.brand + .08, 1174.66, .22);
  { const t = TL.pass, g = gain(drums); env(g, t, .002, .7, .4); const o = osc('sine', 120, t, .45, g); o.frequency.exponentialRampToValueAtTime(48, t + .2); }
  bell(TL.take, 1046.5, .42); bell(TL.take + .1, 1567.98, .36);
  { const t = TL.lock + .05; tick(t, 1, .5); tick(t + .07, 0, .35); }
  // the end card
  hit(TL.end);
  pad(TL.end, DURATION - TL.end, [130.81, 196, 329.63, 493.88, 587.33], .8);
  bass(TL.end, 65.41, DURATION - TL.end - .3, .45);
  bell(TL.markNeedle[1] - .05, 523.25, .45); bell(TL.markNeedle[1] + .07, 783.99, .3);
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
  for (const g of [ctx, STAND]) {                                 // nothing a frame sets may leak into the next one
    g.lineCap = 'butt'; g.lineJoin = 'miter'; g.miterLimit = 10; g.lineWidth = 1; g.textAlign = 'start'; g.textBaseline = 'alphabetic';
    g.direction = 'ltr'; g.font = '10px sans-serif'; g.letterSpacing = '0px'; g.globalAlpha = 1; g.filter = 'none'; g.imageSmoothingEnabled = true;
    g.shadowBlur = 0; g.shadowColor = 'rgba(0,0,0,0)'; g.shadowOffsetX = 0; g.shadowOffsetY = 0; g.setLineDash([]);
  }
  drawScene(t);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
  ctx.drawImage(VIGNETTE, 0, 0, W, H);
  const out = smooth((t - TL.fadeOut[0]) / (TL.fadeOut[1] - TL.fadeOut[0]));
  if (out > 0) { ctx.fillStyle = rgba(RGB.navy, out); ctx.fillRect(0, 0, W, H); }
}

const seekFrame = seek;
async function seekAsync(t) { t = clamp(t, 0, DURATION); await prepFace(t); seekFrame(t); }
window.__film = { duration: DURATION, ready: false, seek: seekAsync, shots: SHOTS, marks: MARKS,
  wav: async () => wavB64(await renderMix(48000)) };
const SAMPLE = 'Aa$0÷×−…·' + (LANG === 'ar' ? 'عربي؟' : LANG === 'zh' ? '中文，' : '');
Promise.all([F.head(100, 800), F.head(100, 700), F.sans(40, 400), F.sans(40, 500), F.sans(40, 600), F.mono(40, 500), F.mono(40, 600)]
  .map(f => document.fonts.load(f, SAMPLE))).then(async () => {
    // warm the glyph and blur caches with one pass over the film, so the first draw of a frame matches every later one
    for (let t = 0; t < DURATION; t += .25) await seekAsync(t);
    window.__film.ready = true;
  });

// ─── player (not used by the render tools) ──────────────────────────────────
const params = new URLSearchParams(location.search);
const FIXED = params.has('t') ? parseFloat(params.get('t')) : null, CAPTURE = params.has('capture');
const startEl = document.getElementById('start');
let ac = null, buffer = null, play = null, BUSY = false;
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
  if (window.__film.ready && !BUSY) { BUSY = true; seekAsync(Math.max(0, t)).finally(() => { BUSY = false; }); }
  requestAnimationFrame(frame);
}
if (FIXED !== null || CAPTURE) startEl.remove();
if (!CAPTURE) requestAnimationFrame(frame);
