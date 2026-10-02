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


// ════ SCENE ("POV: the 2 a.m. offer") ══════════════════════════════════════
// Every beat is timed to the voiceover: measured line and word times (align-xx.js, from voice.align.json) once it exists,
// estimated from the script until then. Act 1: red light, maths out loud, horns, the offer is gone. Act 2: one glance, PASS, TAKE.
const PV = L.pov;
L.expired = PV.expired;
const isPunct = c => /[，。？！：、…；,.?!:]/.test(c);
function tokenize(s) {
  if (LANG !== 'zh') return s.split(/\s+/).filter(Boolean);
  const out = [];
  for (const c of Array.from(s)) { if (c === ' ') continue; if (out.length && isPunct(c)) out[out.length - 1] += c; else out.push(c); }
  return out;
}
function spread(toks, t0, t1) {                               // share a span among tokens by length
  const tot = toks.reduce((a, w) => a + w.length, 0) || 1; let x = t0;
  return toks.map(w => { const d = (t1 - t0) * w.length / tot, o = { w, t0: x, t1: x + d * .94 }; x += d; return o; });
}
function estimateAlign(lines) {
  const cps = { en: 15, fr: 15.5, pt: 15, ar: 12.5, zh: 4.6 }[LANG] || 15;
  let t = .25; const out = [];
  lines.forEach((s, i) => {
    if (i === 6) t += .55;                                     // the beat before "Not anymore"
    const dur = Math.max(.7, s.length / cps);
    out.push({ text: s, t0: t, t1: t + dur, words: spread(tokenize(s), t, t + dur) }); t += dur + .35;
  });
  return { lines: out, env: null, rate: 100, estimated: true };
}
const ALIGN = (() => {
  const A = window.POV_ALIGN;
  if (!A) return estimateAlign(PV.lines);
  // measured: Chinese comes back as one "word" per line; split it into characters inside the measured span
  A.lines.forEach(l => {
    if (!l.words || !l.words.length) l.words = spread(tokenize(l.text), l.t0, l.t1);
    else if (LANG === 'zh') l.words = l.words.flatMap(w => spread(tokenize(w.w), w.t0, w.t1));
  });
  return A;
})();
const LN = ALIGN.lines;
DURATION = LN[9].t1 + 1.7;
const dl = i => LN[i].t1 - LN[i].t0;
const TL = (() => {
  const ping = LN[0].t1 - .3, green = LN[4].t0 + .45 * dl(4), gone = LN[5].t0 + .5 * dl(5), act2 = LN[6].t0 - .06;
  const pass = LN[7].words[0].t0, take = LN[8].words[0].t0, end = LN[9].t0 - .1;
  return {
    ping, green, honk: [green + .1, green + .55], gone, act2, turn: act2, dialIn: act2 + .06, pass, take, end,
    offers: [
      { arrive: ping, arrive2: act2 + .02, swing: [pass - .5, pass - .04], stamp: pass, leave: take - .62, life: gone },
      { arrive: take - .56, swing: [take - .46, take - .03], stamp: take, leave: 99 },
    ],
    markArc: [end + .05, end + .6], markNeedle: [end + .45, end + .95], word: end + .75, line: end + 1.05, url: end + 1.3, cta: end + 1.5, fine: end + 1.7,
    fadeOut: [DURATION - .45, DURATION],
  };
})();
// the cut list: [start, kind]
const CUTS = [
  [0, 'face'], [LN[1].t0 - .06, 'phone'], [LN[2].t0 - .06, 'face'], [LN[5].t0 - .06, 'phone'], [TL.gone + .5, 'face'],
  [TL.act2, 'phone'], [TL.pass + 1.0, 'face'], [TL.take - .42, 'phone'], [TL.take + 1.05, 'face'], [TL.end, 'end'],
];
function shotAt(t) { let i = 0; while (i < CUTS.length - 1 && t >= CUTS[i + 1][0]) i++; return { i, kind: CUTS[i][1], u: t - CUTS[i][0] }; }

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

// ─── the voice drives the mouth ────────────────────────────────────────────
function voiceEnv(t) {
  if (ALIGN.env) { const k = t * ALIGN.rate, i = Math.floor(k), a = ALIGN.env[i] || 0, b = ALIGN.env[i + 1] || 0; return clamp(lerp(a, b, k - i)); }
  for (const l of LN) if (t >= l.t0 && t < l.t1) for (const w of l.words) if (t >= w.t0 && t < w.t1) return .4 + .6 * Math.abs(Math.sin((t - w.t0) * PI * 6.5));
  return 0;
}

// ─── the light on the face ─────────────────────────────────────────────────
const RED = [255, 59, 78], GREEN = [40, 220, 140], COOL = [120, 150, 230];
function ambient(t) {
  if (t < TL.green) return { col: RED, a: .3 + .03 * Math.sin(t * 3) };
  if (t < TL.act2) return { col: GREEN, a: lerp(.34, .14, smooth((t - TL.gone) / .8)) };
  return { col: COOL, a: .12 };
}

// ─── the driver, from the dashboard ────────────────────────────────────────
const SKIN = '#8D5A3F', SKIN_D = '#71452F', SKIN_L = '#A87054', HAIR = '#17110D', HOOD = '#1D2A44', HOOD_D = '#141D31';
function expression(t) {
  const E = { brow: 0, worry: 0, look: [0, 0], lid: .28, pop: 0, mouth: 'flat', sweat: 0, dy: 0, tilt: 0, slump: 0 };
  const l1 = LN[1].t0, l2 = LN[2].t0, l3 = LN[3].t0, l4 = LN[4].t0;
  if (t < TL.ping) { E.lid = .3; E.mouth = 'flat'; }
  else if (t < l2) { E.lid = 0; E.brow = .4; E.look = [.7, .55]; E.mouth = 'smile'; }
  else if (t < l3) { E.lid = .1; E.worry = .9; E.look = [Math.sin(t * 9) * .85, .45 + .2 * Math.sin(t * 13)]; E.mouth = 'grim'; E.sweat = smooth((t - l2) / .8); }
  else if (t < l4) { E.lid = 0; E.brow = 1; E.pop = .5; E.worry = .3; E.look = [-.6 + .1 * Math.sin(t * 7), -.3]; E.mouth = 'o'; E.sweat = 1; }
  else if (t < TL.green) { E.lid = .15; E.worry = .7; E.look = [.7, .55]; E.mouth = 'grim'; E.sweat = 1; }
  else if (t < TL.gone + .5) {
    const k = t - TL.honk[0];
    E.dy = k > 0 ? -60 * Math.exp(-k * 6) * Math.abs(Math.cos(k * 14)) : 0;
    E.lid = 0; E.pop = 1 - smooth((t - TL.honk[1] - .3) / .6) * .6; E.brow = 1; E.look = [0, -.7]; E.mouth = 'o'; E.sweat = 1;
  } else if (t < TL.act2) { E.slump = smooth((t - TL.gone - .5) / .35); E.lid = .55; E.worry = 1; E.look = [.3, .6]; E.mouth = 'sad'; E.tilt = -.06 * E.slump; }
  else {
    E.lid = .12; E.look = [0, -.35]; E.mouth = 'smile';
    const g = envl(t, TL.take - .78, TL.take - .68, TL.take - .5, TL.take - .42);   // one glance at the phone before TAKE
    if (g > 0) E.look = [lerp(0, .8, g), lerp(-.35, .55, g)];
    if (t > TL.take + .6) { E.mouth = 'grin'; E.brow = .35; }
  }
  // blink every few seconds (never mid-shock)
  if (E.pop < .3 && frac(t / 3.3 + .2) < .04) E.lid = 1;
  E.open = voiceEnv(t);
  E.tilt += E.open * .015 * Math.sin(t * 9);
  return E;
}
const envl = (t, a, b, c, d) => Math.min(smooth((t - a) / (b - a)), 1 - smooth((t - c) / (d - c)));
function drawCharacter(g, E, t) {
  g.save();
  g.translate(0, E.dy + E.slump * 22);
  // torso: hoodie, collar, seatbelt
  g.fillStyle = HOOD; g.beginPath();
  g.moveTo(80, 1920); g.lineTo(110, 1170); g.quadraticCurveTo(130, 1060, 300, 1030); g.lineTo(440, 1000); g.lineTo(640, 1000);
  g.lineTo(780, 1030); g.quadraticCurveTo(950, 1060, 970, 1170); g.lineTo(1000, 1920); g.closePath(); g.fill();
  g.fillStyle = '#2ED3B7'; g.beginPath(); g.moveTo(455, 1000); g.lineTo(540, 1120); g.lineTo(625, 1000); g.closePath(); g.fill();
  g.strokeStyle = HOOD_D; g.lineWidth = 10; g.beginPath(); g.moveTo(430, 1000); g.quadraticCurveTo(540, 1150, 650, 1000); g.stroke();
  g.strokeStyle = '#F5B041'; g.lineWidth = 6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(500, 1090); g.lineTo(492, 1190); g.moveTo(580, 1090); g.lineTo(588, 1190); g.stroke();
  g.strokeStyle = '#2B3346'; g.lineWidth = 46; g.lineCap = 'butt'; g.beginPath(); g.moveTo(800, 1010); g.lineTo(330, 1920); g.stroke();
  // neck
  g.fillStyle = SKIN_D; g.beginPath(); g.roundRect(478, 890, 124, 140, 40); g.fill();
  // head
  g.save(); g.translate(540, 900); g.rotate(E.tilt); g.translate(-540, -900);
  const hx = 540, hy = 760;
  g.fillStyle = SKIN; g.beginPath(); g.ellipse(368, 790, 26, 46, -.1, 0, TAU); g.ellipse(712, 790, 26, 46, .1, 0, TAU); g.fill();
  g.fillStyle = SKIN; g.beginPath(); g.ellipse(hx, hy, 175, 208, 0, 0, TAU); g.fill();
  const sh = g.createRadialGradient(hx - 60, hy - 80, 40, hx, hy, 230); sh.addColorStop(0, 'rgba(255,220,190,.18)'); sh.addColorStop(1, 'rgba(60,30,20,.25)');
  g.fillStyle = sh; g.beginPath(); g.ellipse(hx, hy, 175, 208, 0, 0, TAU); g.fill();
  // hair: a short crop with a fade
  g.fillStyle = HAIR; g.beginPath();
  g.moveTo(368, 720); g.quadraticCurveTo(360, 560, 540, 545); g.quadraticCurveTo(720, 560, 712, 720);
  g.quadraticCurveTo(690, 640, 610, 625); g.quadraticCurveTo(540, 650, 470, 625); g.quadraticCurveTo(390, 640, 368, 720); g.fill();
  // eyes
  const pop = 1 + .32 * E.pop;
  for (const s of [-1, 1]) {
    const ex = hx + s * 72, ey = 772, rx = 44 * pop, ry = 34 * pop;
    g.save(); g.beginPath(); g.ellipse(ex, ey, rx, ry, 0, 0, TAU); g.clip();
    g.fillStyle = '#F4F1EC'; g.fillRect(ex - rx, ey - ry, rx * 2, ry * 2);
    const px = ex + E.look[0] * 18, py = ey + E.look[1] * 12, pr = 19 / (1 + .25 * E.pop);
    g.fillStyle = '#2A1A12'; g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(px - 6, py - 7, 5, 0, TAU); g.fill();
    // the upper lid comes down
    g.fillStyle = SKIN_D; g.fillRect(ex - rx, ey - ry - 2, rx * 2, ry * 2 * clamp(E.lid) + 2);
    g.restore();
    g.strokeStyle = '#2A1A12'; g.lineWidth = 5; g.lineCap = 'round';
    const ly = ey - ry + ry * 2 * clamp(E.lid);
    g.beginPath(); g.moveTo(ex - rx, Math.min(ey, ly + 4)); g.quadraticCurveTo(ex, ly - 6, ex + rx, Math.min(ey, ly + 4)); g.stroke();
  }
  // eyebrows: raise and worry (inner ends up)
  g.strokeStyle = HAIR; g.lineWidth = 18; g.lineCap = 'round';
  for (const s of [-1, 1]) {
    const by = 702 - E.brow * 24 - E.pop * 10, inner = by - E.worry * 18, outer = by + E.worry * 6;
    g.beginPath(); g.moveTo(hx + s * 30, inner); g.quadraticCurveTo(hx + s * 75, Math.min(inner, outer) - 10, hx + s * 118, outer + 6); g.stroke();
  }
  // nose
  g.fillStyle = SKIN_D; g.beginPath(); g.moveTo(540, 790); g.quadraticCurveTo(512, 852, 524, 862); g.quadraticCurveTo(540, 870, 558, 862); g.quadraticCurveTo(566, 850, 540, 790); g.fill();
  drawMouth(g, E, 540, 905);
  // sweat
  if (E.sweat > 0) {
    const k = frac(t * .7), sy = 640 + k * 120;
    g.globalAlpha *= E.sweat * (1 - smooth((k - .75) / .25));
    g.fillStyle = '#BFE6FF'; g.beginPath(); g.moveTo(690, sy - 22); g.quadraticCurveTo(706, sy, 690, sy + 12); g.quadraticCurveTo(674, sy, 690, sy - 22); g.fill();
    g.globalAlpha = 1;
  }
  g.restore();
  // arms, wheel, hands
  g.strokeStyle = HOOD_D; g.lineWidth = 120; g.lineCap = 'round';
  g.beginPath(); g.moveTo(170, 1180); g.quadraticCurveTo(170, 1400, 300, 1475); g.stroke();
  g.beginPath(); g.moveTo(910, 1180); g.quadraticCurveTo(910, 1400, 780, 1475); g.stroke();
  g.restore();
}
function drawMouth(g, E, x, y) {
  const o = E.open, talk = o > .06 && E.mouth !== 'grin';
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (talk || E.mouth === 'o') {
    const rx = E.mouth === 'o' ? 24 + o * 10 : 38 + o * 10, ry = E.mouth === 'o' ? 28 + o * 12 : 7 + o * 34;
    g.fillStyle = '#3B1612'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill();
    if (ry > 18) { g.save(); g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.clip();
      g.fillStyle = '#F4F1EC'; g.fillRect(x - rx, y - ry, rx * 2, Math.min(12, ry * .35));
      g.fillStyle = '#B5524A'; g.beginPath(); g.ellipse(x, y + ry * .75, rx * .7, ry * .45, 0, 0, TAU); g.fill(); g.restore(); }
    return;
  }
  if (E.mouth === 'grim') {
    g.fillStyle = '#F4F1EC'; g.beginPath(); g.roundRect(x - 62, y - 16, 124, 32, 10); g.fill();
    g.strokeStyle = '#3B1612'; g.lineWidth = 5; g.beginPath(); g.roundRect(x - 62, y - 16, 124, 32, 10); g.stroke();
    g.lineWidth = 3; g.beginPath(); for (let k = -2; k <= 2; k++) { g.moveTo(x + k * 22, y - 15); g.lineTo(x + k * 22, y + 15); } g.moveTo(x - 60, y); g.lineTo(x + 60, y); g.stroke();
    return;
  }
  if (E.mouth === 'grin') {
    g.fillStyle = '#3B1612'; g.beginPath(); g.moveTo(x - 78, y - 14); g.quadraticCurveTo(x, y - 4, x + 78, y - 14); g.quadraticCurveTo(x, y + 70, x - 78, y - 14); g.fill();
    g.save(); g.clip(); g.fillStyle = '#F4F1EC'; g.fillRect(x - 80, y - 20, 160, 26); g.restore();
    return;
  }
  g.strokeStyle = '#3B1612'; g.lineWidth = 9; g.beginPath();
  if (E.mouth === 'sad') { g.moveTo(x - 46, y + 16); g.quadraticCurveTo(x, y - 22, x + 46, y + 16); }
  else if (E.mouth === 'smile') { g.moveTo(x - 50, y - 8); g.quadraticCurveTo(x, y + 30, x + 50, y - 8); }
  else { g.moveTo(x - 36, y + 2); g.lineTo(x + 36, y); }
  g.stroke();
}
function drawWheelFront(g) {
  g.strokeStyle = '#0A0D14'; g.lineWidth = 46; g.beginPath(); g.ellipse(540, 1540, 330, 108, 0, PI * 1.02, PI * 1.98); g.stroke();
  g.strokeStyle = 'rgba(245,176,65,.25)'; g.lineWidth = 5; g.beginPath(); g.ellipse(540, 1522, 334, 104, 0, PI * 1.08, PI * 1.92); g.stroke();
  const hub = g.createRadialGradient(540, 1690, 10, 540, 1700, 170); hub.addColorStop(0, '#2A3346'); hub.addColorStop(1, '#10151F');
  g.strokeStyle = '#0E131C'; g.lineWidth = 34; g.beginPath(); g.moveTo(250, 1560); g.lineTo(420, 1690); g.moveTo(830, 1560); g.lineTo(660, 1690); g.stroke();
  g.fillStyle = hub; g.beginPath(); g.ellipse(540, 1705, 150, 82, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(245,176,65,.18)'; g.lineWidth = 3; g.beginPath(); g.ellipse(540, 1705, 150, 82, 0, PI * 1.1, PI * 1.9); g.stroke();
  for (const x of [300, 780]) {                                // hands on the rim
    g.fillStyle = SKIN_D; g.beginPath(); g.ellipse(x, 1462, 62, 44, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(40,20,12,.5)'; g.lineWidth = 4; g.beginPath();
    for (let k = -1; k <= 1; k++) { g.moveTo(x + k * 22, 1440); g.lineTo(x + k * 22, 1490); } g.stroke();
  }
}

// ─── the cabin behind the driver ───────────────────────────────────────────
const BACKLIGHTS = table(26, 91, r => ({ x: r(), y: r(), s: 30 + r() * 90, k: ['amber', 'amber', 'ink', 'rose', 'teal'][Math.floor(r() * 5)], ph: r(), sp: .25 + r() * .35 }));
function drawCabin(t, amb) {
  ctx.fillStyle = '#04060B'; ctx.fillRect(-200, -200, W + 400, H + 400);
  // rear window: the street behind, standing still at the light, streaming once we drive
  ctx.save(); ctx.beginPath(); ctx.roundRect(150, 250, 780, 470, 60); ctx.clip();
  const sky = ctx.createLinearGradient(0, 250, 0, 720); sky.addColorStop(0, '#070B16'); sky.addColorStop(1, '#141C33');
  ctx.fillStyle = sky; ctx.fillRect(150, 250, 780, 470);
  ctx.globalCompositeOperation = 'lighter';
  const moving = t >= TL.act2;
  for (const b of BACKLIGHTS) {
    let x = 150 + b.x * 780, y = 330 + b.y * 330, s = b.s * .6, a = .35;
    if (moving) { const p = frac(b.ph + t * b.sp); x = 540 + (b.x - .5) * 780 * (1 - p); y = 480 + (b.y - .5) * 300 * (1 - p); s = b.s * (1 - p * .8); a = .5 * Math.sin(p * PI); }
    ctx.globalAlpha = a; ctx.drawImage(TINTED[b.k], x - s / 2, y - s / 2, s, s);
  }
  if (!moving) {                                               // the car behind: its headlights, flaring on the horn
    const f = t > TL.honk[0] ? .55 + .45 * Math.exp(-(t - TL.honk[0]) * 3) : .55;
    for (const x of [430, 650]) { ctx.globalAlpha = f; ctx.drawImage(TINTED.ink, x - 70, 610 - 70, 140, 140); }
  }
  ctx.restore();
  // headrest, seat, side windows
  ctx.fillStyle = '#10151F'; ctx.beginPath(); ctx.roundRect(370, 470, 340, 260, 70); ctx.fill();
  ctx.fillStyle = '#0B0F18'; ctx.beginPath(); ctx.roundRect(200, 700, 680, 1300, 120); ctx.fill();
  for (const x of [0, 960]) { ctx.fillStyle = '#0A1020'; ctx.fillRect(x, 220, 120, 760); }
  // the light of the moment
  const wash = ctx.createRadialGradient(540, 200, 0, 540, 200, 1300);
  wash.addColorStop(0, rgba(amb.col, amb.a * .8)); wash.addColorStop(1, rgba(amb.col, 0));
  ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);
}
const [CHARC, charRaw] = canvas(W * SS, H * SS), CHAR = supersample(charRaw, SS);
function drawFaceShot(t, u) {
  const amb = ambient(t), E = expression(t);
  const punch = 1 + .07 * (1 - easeOut(u / .28));
  const hk = Math.max(t > TL.honk[0] ? Math.exp(-(t - TL.honk[0]) * 7) : 0, t > TL.honk[1] ? Math.exp(-(t - TL.honk[1]) * 7) : 0);
  const snap = v => Math.round(v * SS) / SS;                    // whole device pixels: sub-pixel shakes rasterise unstably
  const shx = snap(16 * hk * Math.sin(t * 61)), shy = snap(12 * hk * Math.sin(t * 47 + 1));
  const zoom = punch * (t >= LN[3].t0 && t < TL.green ? 1.08 : 1);
  const cam = g => { g.translate(540, 900); g.scale(zoom, zoom); g.translate(-540 + shx, -900 + shy); };
  ctx.save(); cam(ctx); drawCabin(t, amb); ctx.restore();
  // the driver on a layer, lit by the traffic light, the phone and (in act 2) passing street lamps
  CHAR.setTransform(1, 0, 0, 1, 0, 0); CHAR.globalCompositeOperation = 'source-over'; CHAR.clearRect(0, 0, W, H);
  CHAR.save(); cam(CHAR); drawCharacter(CHAR, E, t); CHAR.restore();
  CHAR.globalCompositeOperation = 'source-atop';
  const lg = CHAR.createLinearGradient(0, 300, 0, 1500); lg.addColorStop(0, rgba(amb.col, amb.a)); lg.addColorStop(1, rgba(amb.col, amb.a * .4));
  CHAR.fillStyle = lg; CHAR.fillRect(0, 0, W, H);
  if (t > TL.ping && t < TL.act2) {
    const pg = CHAR.createRadialGradient(820, 1300, 0, 820, 1300, 900), k = .3 * smooth((t - TL.ping) / .2) * (1 - smooth((t - TL.gone) / .5));
    pg.addColorStop(0, `rgba(200,225,255,${k})`); pg.addColorStop(1, 'rgba(200,225,255,0)'); CHAR.fillStyle = pg; CHAR.fillRect(0, 0, W, H);
  }
  if (t >= TL.act2) {
    const p = frac((t - TL.act2) / 1.3), sx = lerp(-400, 1500, p);
    const sg = CHAR.createLinearGradient(sx - 300, 0, sx + 300, 0);
    sg.addColorStop(0, 'rgba(245,176,65,0)'); sg.addColorStop(.5, 'rgba(245,176,65,.22)'); sg.addColorStop(1, 'rgba(245,176,65,0)');
    CHAR.fillStyle = sg; CHAR.fillRect(0, 0, W, H);
  }
  CHAR.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(CHARC, 0, 0, W, H); ctx.restore();
  ctx.save(); cam(ctx); drawWheelFront(ctx); ctx.restore();
  drawBubbles(t);
  drawHonks(t);
  if (t < LN[1].t0) drawPovTag(t);
}

// ─── the maths around the head, the horns, the POV sticker ─────────────────
function drawBubbles(t) {
  const t0 = LN[2].t0, t1 = TL.green + .45;
  if (t < t0 || t > t1) return;
  PV.frags.forEach((s, k) => {
    const a0 = t0 + k * .32 + (k >= 2 ? LN[3].t0 - t0 - .64 : 0);       // "suburbs" and "drive back" arrive with line 4
    if (t < a0) return;
    const pop = easeBack((t - a0) / .28, 2), ang = k * 1.05 + t * .45 + (k % 2 ? .3 : 0), R = 330 + (k % 3) * 40;
    let x = 540 + Math.cos(ang) * R, y = 720 + Math.sin(ang) * R * .55, sc = lerp(.4, 1, pop), al = clamp((t - a0) / .1);
    const fly = smooth((t - TL.green) / .4);                              // the horn scatters them
    if (fly > 0) { x += (x - 540) * fly * 1.4; y += (y - 760) * fly * 1.4; al *= 1 - fly; }
    if (al <= .01) return;
    const big = k === 2 || k === 3, size = big ? 50 : 44, col = big ? 'rose' : k === 4 ? 'amber' : 'ink';
    ctx.font = F.mono(size, 600); ctx.letterSpacing = '0px'; ctx.direction = RTL ? 'rtl' : 'ltr';
    const w = ctx.measureText(s).width + size * .9, h = size * 1.55, hw = w / 2 * sc + 24;   // keep the whole bubble in frame
    ctx.save(); ctx.translate(clamp(x, hw, W - hw), clamp(y, 400, 1180)); ctx.rotate((k % 2 ? 1 : -1) * .08); ctx.scale(sc, sc); ctx.globalAlpha *= al;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 20; ctx.fillStyle = 'rgba(27,37,56,.95)'; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h * .3); ctx.fill(); ctx.restore();
    ctx.strokeStyle = rgba(RGB[col], .6); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h * .3); ctx.stroke();
    text(s, 0, 2, F.mono(size, 600), C[col]);
    ctx.restore();
  });
}
function starburst(x, y, r, n, col) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = i * PI / n, rr = i % 2 ? r * .72 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .8); }
  ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = C.navy; ctx.lineWidth = 8; ctx.stroke();
}
function drawHonks(t) {
  [[TL.honk[0], 290, 470, -.12, C.amber], [TL.honk[1], 790, 600, .1, C.rose]].forEach(([h, x, y, r, col]) => {
    const u = t - h; if (u < 0 || u > .85) return;
    const s = easeBack(u / .18, 2.6) * (1 - smooth((u - .6) / .25)), j = Math.sin(t * 70) * 6 * (1 - u);
    ctx.save(); ctx.translate(x + j, y); ctx.rotate(r); ctx.scale(s, s);
    starburst(0, 0, 200, 12, col);
    text(PV.honk, 0, 6, F.head(84), C.navy, { maxW: 300 });
    ctx.restore();
  });
}
function drawPovTag(t) {
  const p = easeBack(t / .3, 2.2), a = 1 - smooth((t - LN[1].t0 + .3) / .25);
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(540, 360); ctx.rotate(-.06); ctx.scale(p, p);
  ctx.font = F.head(120); const w = ctx.measureText(PV.tag + ':').width + 80;
  ctx.save(); ctx.shadowColor = 'rgba(245,176,65,.5)'; ctx.shadowBlur = 40; ctx.fillStyle = C.amber; ctx.beginPath(); ctx.roundRect(-w / 2, -76, w, 152, 30); ctx.fill(); ctx.restore();
  text(PV.tag + (LANG === 'zh' ? '：' : ':'), 0, 4, F.head(120), C.navy);
  ctx.restore();
}

// ─── the phone, close ──────────────────────────────────────────────────────
function countdownOf(i, t) {
  const o = TL.offers[i];
  if (i === 0 && t < TL.act2) return 15 * (1 - clamp((t - o.arrive) / (o.life - o.arrive)));
  const a = i === 0 ? o.arrive2 : o.arrive;
  return 15 - (Math.min(Math.max(t, a), o.stamp) - a);
}
function dialValue(t) {
  const [a, b] = TL.offers, sw = (o, from, to) => lerp(from, to, easeBack((t - o.swing[0]) / (o.swing[1] - o.swing[0]), 1.3));
  if (t < a.swing[0]) return 0;
  if (t < a.leave) return sw(a, 0, OFFERS[0].value);
  if (t < a.leave + .5) return lerp(OFFERS[0].value, 0, easeIO((t - a.leave) / .5));
  if (t < b.swing[0]) return 0;
  return sw(b, 0, OFFERS[1].value);
}
function drawPhone(t) {
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
  const [o0, o1] = TL.offers, act2 = t >= TL.act2;
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
  if (t >= o1.arrive) drawCard(1, t, lerp(560, 0, easeBack((t - o1.arrive) / .42, 1.1)));
  drawDial(t);
  ctx.restore();
  ctx.save(); phonePath(ctx, SCR); ctx.clip();
  const sh = ctx.createLinearGradient(SCR.x, SCR.y, SCR.x + SCR.w, SCR.y + 700);
  sh.addColorStop(0, 'rgba(255,255,255,.05)'); sh.addColorStop(.4, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh; ctx.fillRect(SCR.x, SCR.y, SCR.w, SCR.h); ctx.restore();
  ctx.fillStyle = '#05070D'; ctx.beginPath(); ctx.roundRect(CX - 60, SCR.y + 14, 120, 30, 15); ctx.fill();
}
function drawPhoneShot(t, u) {
  const amb = ambient(t);
  ctx.fillStyle = '#04060B'; ctx.fillRect(0, 0, W, H);
  const gl = ctx.createRadialGradient(540, 820, 0, 540, 820, 900);
  gl.addColorStop(0, rgba(amb.col, amb.a * 1.1)); gl.addColorStop(1, rgba(amb.col, 0));
  ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
  const z = .82 * (1 + .07 * (1 - easeOut(u / .28)));
  ctx.save(); ctx.translate(540, 820); ctx.scale(z, z); ctx.translate(-520, -1000); drawPhone(t); ctx.restore();
}

// ─── karaoke captions ──────────────────────────────────────────────────────
function currentLine(t) {
  for (let k = LN.length - 1; k >= 0; k--) if (t >= LN[k].t0 - .1) return t < LN[k].t1 + .6 || k < LN.length - 1 ? k : -1;
  return -1;
}
function drawCaptions(t) {
  const i = currentLine(t);
  if (i < 0 || i === 9 || t >= TL.end) return;
  const ln = LN[i], font = F.head(LANG === 'zh' ? 66 : 76), sep = LANG === 'zh' ? '' : ' ', maxW = LANG === 'zh' ? 960 : 900, lh = 90;
  ctx.save(); ctx.font = font; ctx.letterSpacing = '0px'; ctx.direction = RTL ? 'rtl' : 'ltr'; ctx.textBaseline = 'middle';
  const sw = ctx.measureText(' ').width * (sep ? 1.45 : .25);   // room for the lit word to grow
  const rows = [[]]; let wsum = 0;
  ln.words.forEach(w => { const ww = ctx.measureText(w.w).width; if (rows[rows.length - 1].length && wsum + sw + ww > maxW) { rows.push([]); wsum = 0; } const r = rows[rows.length - 1]; wsum += (r.length ? sw : 0) + ww; r.push({ ...w, ww }); });
  const y0 = 1350 - (rows.length - 1) * lh / 2, pop = easeBack((t - ln.t0 + .1) / .16, 1.6);
  const sc = ctx.createLinearGradient(0, y0 - 130, 0, y0 + rows.length * lh + 40);
  sc.addColorStop(0, 'rgba(4,6,11,0)'); sc.addColorStop(.35, 'rgba(4,6,11,.6)'); sc.addColorStop(1, 'rgba(4,6,11,.6)');
  ctx.fillStyle = sc; ctx.fillRect(0, y0 - 130, W, rows.length * lh + 190);
  ctx.translate(540, y0); ctx.scale(lerp(.9, 1, pop), lerp(.9, 1, pop)); ctx.translate(-540, -y0);
  rows.forEach((r, ri) => {
    const tot = r.reduce((a, w, k) => a + w.ww + (k ? sw : 0), 0), y = y0 + ri * lh;
    let x = RTL ? 540 + tot / 2 : 540 - tot / 2;
    ctx.textAlign = RTL ? 'right' : 'left';
    r.forEach(w => {
      const now = t >= w.t0 && t < w.t1 + .04, said = t >= w.t0, s = now ? 1.07 : 1, cx = RTL ? x - w.ww / 2 : x + w.ww / 2;
      ctx.save(); ctx.translate(cx, y); ctx.scale(s, s); ctx.translate(-cx, -y);
      ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(4,6,11,.9)'; ctx.lineJoin = 'round'; ctx.strokeText(w.w, x, y);
      ctx.fillStyle = now ? C.amber : said ? C.ink : 'rgba(238,241,247,.6)'; ctx.fillText(w.w, x, y);
      ctx.restore();
      x += RTL ? -(w.ww + sw) : w.ww + sw;
    });
  });
  ctx.restore();
}

function drawScene(t) {
  ctx.fillStyle = '#04060B'; ctx.fillRect(0, 0, W, H);          // shakes and punch-ins must never uncover the last frame
  const S = shotAt(t);
  if (S.kind === 'phone') drawPhoneShot(t, S.u);
  else { const prev = S.kind === 'end' ? shotAt(TL.end - .01) : S; if (prev.kind === 'phone') drawPhoneShot(t, 9); else drawFaceShot(t, S.kind === 'end' ? 9 : S.u); }
  drawCaptions(t);
  drawEnd(t);
}
const SHOTS = CUTS.map(([s, k], i) => ({ id: `${i}-${k}`, start: s, end: i < CUTS.length - 1 ? CUTS[i + 1][0] : DURATION, readAt: s + .3, action: k }));
const MARKS = [TL.ping, TL.green, ...TL.honk, TL.gone, TL.act2, TL.pass, TL.take, TL.end];

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

  // ── "POV". The voice leads; the score ducks under every line.
  if (voiceBuf) {
    const src = ac.createBufferSource(); src.buffer = voiceBuf;
    const vg = ac.createGain(); vg.gain.value = 1.1; src.connect(vg).connect(master); src.start(0);
  }
  LN.forEach(l => { duck.gain.setTargetAtTime(.38, Math.max(0, l.t0 - .06), .04); duck.gain.setTargetAtTime(1, l.t1 + .05, .18); });
  // act 1: a night drone, the clock (faster once the maths starts), the ping, a blip per bubble
  { const g = gain(bus(.14)); g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(.8, TL.green - .1); g.gain.linearRampToValueAtTime(0, TL.green + .05);
    const lp = filt('lowpass', 200, 3, g); lp.frequency.setValueAtTime(200, 0); lp.frequency.exponentialRampToValueAtTime(1100, TL.green);
    for (const f of [55, 55.4, 82.4]) osc('sawtooth', f, 0, TL.green + .1, lp); }
  for (let t = .4, i = 0; t < TL.green; t += t < LN[2].t0 ? .5 : .25, i++) tick(t, i % 2, .28);
  [1318.5, 1760].forEach((f, k) => { const g = gain(bells); env(g, TL.ping + k * .09, .003, .32, .35); osc('sine', f, TL.ping + k * .09, .45, g); });
  PV.frags.forEach((s, k) => blip(LN[2].t0 + k * .32 + (k >= 2 ? LN[3].t0 - LN[2].t0 - .64 : 0), [660, 880, 990, 740, 1170, 830][k], .08));
  // the light turns green: two horns from the car behind
  const horn = (t, d, f) => { const g = gain(fx); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.42, t + .02); g.gain.setValueAtTime(.42, t + d - .05); g.gain.linearRampToValueAtTime(0, t + d);
    const lp = filt('lowpass', 2200, 1, g); for (const m of [1, 1.26]) osc('square', f * m, t, d, lp); };
  horn(TL.honk[0], .38, 370); horn(TL.honk[1], .6, 392);
  whoosh(TL.green - .05, .4, true, .2);
  // "…it's gone": a sad trombone, then silence
  { const notes = [[311.13, .26], [293.66, .26], [277.18, .26], [261.63, .8]]; let t = TL.gone;
    for (const [f, d] of notes) { const g = gain(fx); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.3, t + .03); g.gain.setValueAtTime(.3, t + d - .06); g.gain.linearRampToValueAtTime(0, t + d);
      const lp = filt('lowpass', 1300, 2, g), o = osc('sawtooth', f, t, d, lp);
      if (d > .5) { const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 6; lg.gain.value = 7; lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(t + d); }
      t += d; } }
  // act 2: the drop on "Not anymore", then a confident groove
  hit(TL.act2);
  const CH = [[110, [220, 261.63, 329.63]], [87.31, [174.61, 220, 261.63]], [130.81, [261.63, 329.63, 392]], [98, [196, 246.94, 293.66]]];
  for (let b = 0; TL.act2 + b * 2 < TL.end; b++) {
    const t0 = TL.act2 + b * 2, [root, notes] = CH[b % 4];
    pad(t0, Math.min(2, TL.end - t0), notes, .8);
    for (let k = 0; k < 4 && t0 + k * .5 < TL.end; k++) {
      const tb = t0 + k * .5;
      if (b || k) kick(tb, .8); hat(tb + .25, .17); if (k === 1 || k === 3) clap(tb, .22);
      bass(tb, root, .2, .6); bass(tb + .25, k === 3 ? root * 2 : root, .18, .4);
    }
  }
  CUTS.forEach(([s], i) => { if (i && s < TL.end) whoosh(s - .12, .22, i % 2 === 1, .09); });
  { const t = TL.pass, g = gain(drums); env(g, t, .002, .8, .4); const o = osc('sine', 120, t, .45, g); o.frequency.exponentialRampToValueAtTime(48, t + .2); }
  bell(TL.take, 1046.5, .45); bell(TL.take + .1, 1567.98, .4);
  // the end card
  pad(TL.end, DURATION - TL.end, [130.81, 196, 329.63, 493.88, 587.33], .9);
  bass(TL.end, 65.41, DURATION - TL.end - .3, .5);
  bell(TL.markNeedle[1] - .05, 523.25, .5); bell(TL.markNeedle[1] + .07, 783.99, .32);
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
  for (const g of [ctx, CHAR]) {                                 // nothing a frame sets may leak into the next one
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

window.__film = { duration: DURATION, ready: false, seek, shots: SHOTS, marks: MARKS,
  wav: async () => wavB64(await renderMix(48000)) };
const SAMPLE = 'Aa$0÷×−…·' + (LANG === 'ar' ? 'عربي؟' : LANG === 'zh' ? '中文，' : '');
Promise.all([F.head(100, 800), F.head(100, 700), F.sans(40, 400), F.sans(40, 500), F.sans(40, 600), F.mono(40, 500), F.mono(40, 600)]
  .map(f => document.fonts.load(f, SAMPLE))).then(() => {
    // warm the glyph and blur caches with one pass over the film, so the first draw of a frame matches every later one
    for (let t = 0; t < DURATION; t += .25) seek(t);
    window.__film.ready = true;
  });

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
