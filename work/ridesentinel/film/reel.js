'use strict';

// ─── format ─────────────────────────────────────────────────────────────────
const W = 1080, H = 1920, DURATION = 16;
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

// ════ SCENE ("the 16-second reel", v2: real ride elements) ═══════════════════
// From above: a car on a night map is pinged by an offer (pins, route). The maths falls into the car's speedometer, which
// becomes the Rate Dial. Through the windscreen: a red light on PASS, green on TAKE, street lights streaking in one second.
// Above again: the rules as ride items, the phone in its mount. The headline from the driver's seat; the logo over the map.
const R = L.reel;
const TL = {
  ping: 1.0, words: [2.0, 2.33, 2.66], melt: 3.0, drop: 4.0, swing1: [4.45, 4.95], pass: 5.0, reset: [5.55, 5.75], swing2: [5.75, 6.2], take: 6.25,
  claim: [7.5, 7.9], rules: 9.0, lock: 10.5, head: 11.0, logo: 13.5, fadeOut: [15.75, 16],
};
const CX = 520, CY = 960, DIAL = { x: 520, y: 1100, r: 290 };
const envl = (t, a, b, c, d) => Math.min(smooth((t - a) / (b - a)), 1 - smooth((t - c) / (d - c)));
const shakeAt = (t, t0, amp, decay = 9) => t > t0 ? amp * Math.exp(-(t - t0) * decay) * Math.sin((t - t0) * 70) : 0;

// which world we are in: the map from above, or the cockpit
const COCKPIT = [[3.0, 9.0], [11.0, 13.45]];
const inCockpit = t => COCKPIT.some(([a, b]) => t >= a && t < b);

// ─── shader layers (shaders, WebGPU): headlight beams and the green light's flare ─
const GPU_LAYERS = [
  ['rays', { type: 'Godrays', props: { center: { x: .435, y: .224 }, rayColor: '#F5B041', intensity: .6, density: .4, speed: .9, backgroundColor: 'transparent' } }],
  ['flare', { type: 'LensFlare', props: { lightPosition: { x: .77, y: .105 }, intensity: .55 } }],
];
const BLEND = { rays: 'screen', flare: 'screen' };
function gpuState(t) {
  return {
    rays: .75 * envl(t, 7.4, 7.7, 8.85, 9.0) + .3 * envl(t, 11.05, 11.4, 13.2, 13.45),
    flare: envl(t, TL.take - .03, TL.take + .08, TL.take + .5, TL.take + 1.1),
  };
}
const GPU = {}, GPU_IMG = {};
let GPU_OP = {};
async function gpuInit() {
  for (const [id, comp] of GPU_LAYERS) {
    const g = document.createElement('canvas'); g.width = 720; g.height = 1280;
    g.style.cssText = 'position:fixed;left:0;top:0;width:720px;height:1280px;opacity:0;pointer-events:none;z-index:-1';
    document.body.appendChild(g);
    GPU[id] = await GpuLayer.createGpuLayer(g, { components: [{ ...comp, id }] });
    if (GPU[id].failure()) throw new Error(`shader layer ${id} failed: ${GPU[id].failure()}`);
  }
}
async function gpuFrame(t) {
  const s = gpuState(t); GPU_OP = {};
  for (const [id] of GPU_LAYERS) {
    const o = clamp(s[id]); if (GPU_IMG[id]) { GPU_IMG[id].close?.(); GPU_IMG[id] = null; }
    if (o <= .002) continue;
    GPU_OP[id] = o; GPU_IMG[id] = await GPU[id].at(t);
  }
}

// ─── type helpers ──────────────────────────────────────────────────────────
function fitFont(word, maxW, maxPx, weight = 800) {
  ctx.font = F.head(100, weight); const w = ctx.measureText(word).width;
  return F.head(Math.min(maxPx, 100 * maxW / w), weight);
}
function squashWord(word, x, y, font, color, t0, t, o = {}) {
  const u = (t - t0) / (o.dur || .2); if (u < 0) return;
  const s = easeBack(u, 2.2), sx = lerp(.35, 1, s), sy = lerp(1.9, 1, s), split = 16 * (1 - clamp(u * 1.4));
  ctx.save(); ctx.translate(x, y); ctx.scale(sx * (o.k || 1), sy * (o.k || 1)); ctx.globalAlpha *= clamp(u * 4) * (o.alpha ?? 1);
  ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '0px';
  if (o.halo) { ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(4,6,11,.75)'; ctx.lineJoin = 'round'; ctx.strokeText(word, 0, 0); }
  if (split > .3) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,92,108,.8)'; ctx.fillText(word, -split, 0);
    ctx.fillStyle = 'rgba(46,211,183,.8)'; ctx.fillText(word, split, 0);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.fillStyle = color; ctx.fillText(word, 0, 0);
  ctx.restore();
}
function odometer(value, decimals, x, y, font, color, align = 'left', prefix = '$', digits = 2) {
  const cents = Math.max(0, value) * Math.pow(10, decimals), str = Math.max(1, digits);
  ctx.save(); ctx.font = font; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.letterSpacing = '0px'; ctx.fillStyle = color;
  const dw = Math.max(...'0123456789'.split('').map(d => ctx.measureText(d).width)), pw = ctx.measureText(prefix).width, dotw = ctx.measureText('.').width;
  const cols = str + decimals, total = pw + cols * dw + (decimals ? dotw : 0), h = parseFloat(font.match(/([\d.]+)px/)[1]);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.fillText(prefix, cx, y); cx += pw;
  ctx.save(); ctx.beginPath(); ctx.rect(cx - 4, y - h * .55, total, h * 1.1); ctx.clip();
  for (let c = 0; c < cols; c++) {
    if (c === str) { ctx.fillText('.', cx, y); cx += dotw; }
    const p = cols - 1 - c, P = Math.pow(10, p), d = Math.floor(cents / P) % 10, f = smooth(clamp((cents % P) - (P - 1)));
    const lead = c < str - 1 && Math.floor(cents / P) === 0 && f === 0;     // no leading zeros
    ctx.textAlign = 'center';
    if (!lead) { ctx.fillText(String(d), cx + dw / 2, y - f * h); ctx.fillText(String((d + 1) % 10), cx + dw / 2, y + (1 - f) * h); }
    ctx.textAlign = 'left'; cx += dw;
  }
  ctx.restore(); ctx.restore();
}

// ─── the map from above ────────────────────────────────────────────────────
const PH = 2400, AVE = 545, STREETS = k => 100 + 240 * k;
const MAPT = (() => {
  const [c, x] = canvas(W * SS, PH * SS); x.scale(SS, SS);
  const r = rng(808);
  x.fillStyle = '#0B1220'; x.fillRect(0, 0, W, PH);
  // blocks with building footprints and a few lit roofs
  const cols = [[0, 130], [170, 500], [590, 870], [910, W]];
  for (let k = -1; k < 11; k++) for (const [x0, x1] of cols) {
    const y0 = STREETS(k) + 22, y1 = STREETS(k + 1) - 22;
    const park = r() < .1;
    x.fillStyle = park ? '#0F1E22' : '#111A2C'; x.beginPath(); x.roundRect(x0 + 8, y0, x1 - x0 - 16, y1 - y0, 10); x.fill();
    if (park) continue;
    for (let i = 0; i < 5; i++) {
      const bw = 40 + r() * 90, bh = 40 + r() * 70, bx = x0 + 16 + r() * Math.max(1, x1 - x0 - 32 - bw), by = y0 + 8 + r() * Math.max(1, y1 - y0 - 16 - bh);
      x.fillStyle = '#0D1525'; x.fillRect(bx, by, bw, bh);
      if (r() < .35) { x.fillStyle = r() < .6 ? 'rgba(245,176,65,.55)' : 'rgba(46,211,183,.4)'; x.fillRect(bx + bw * .3, by + bh * .3, 6, 6); }
    }
  }
  // streets: the avenue we drive up, two side streets, cross streets every 240 px
  x.fillStyle = '#1A2438';
  x.fillRect(AVE - 70, 0, 140, PH); x.fillRect(130, 0, 40, PH); x.fillRect(870, 0, 40, PH);
  for (let k = 0; k < 10; k++) x.fillRect(0, STREETS(k) - 20, W, 40);
  x.fillStyle = 'rgba(245,176,65,.6)'; for (let y = 0; y < PH; y += 60) x.fillRect(AVE - 2, y, 4, 30);
  x.fillStyle = 'rgba(238,241,247,.3)'; for (let y = 30; y < PH; y += 60) { x.fillRect(AVE - 36, y, 3, 22); x.fillRect(AVE + 33, y, 3, 22); }
  // street lamps along the avenue
  for (let y = 40; y < PH; y += 160) for (const sx of [AVE - 82, AVE + 82]) {
    const g = x.createRadialGradient(sx, y, 0, sx, y, 60); g.addColorStop(0, 'rgba(245,176,65,.22)'); g.addColorStop(1, 'rgba(245,176,65,0)');
    x.fillStyle = g; x.fillRect(sx - 60, y - 60, 120, 120); x.fillStyle = 'rgba(255,220,160,.9)'; x.fillRect(sx - 2, y - 2, 4, 4);
  }
  return c;
})();
const mapScroll = t => 150 * t;                              // px; the map slides down as we drive up
const CAR = { x: AVE + 28, y: 1480 };
const toScreen = (wy, t) => wy + mapScroll(t);
function drawMapBase(t) {
  const s = mapScroll(t) % PH;
  for (const y of [s - PH, s]) ctx.drawImage(MAPT, 0, y, W, PH);
}
function drawCarTop(x, y, s, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  // headlight beams
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const bx of [-24, 24]) {
    const g = ctx.createLinearGradient(0, -90, 0, -470); g.addColorStop(0, 'rgba(255,230,180,.35)'); g.addColorStop(1, 'rgba(255,230,180,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx - 8, -88); ctx.lineTo(bx + 8, -88); ctx.lineTo(bx + 70, -470); ctx.lineTo(bx - 70, -470); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.ellipse(6, 8, 56, 100, 0, 0, TAU); ctx.fill();
  const body = ctx.createLinearGradient(-48, 0, 48, 0); body.addColorStop(0, '#202B42'); body.addColorStop(.5, '#2E3B58'); body.addColorStop(1, '#1A2336');
  ctx.fillStyle = body; ctx.beginPath(); ctx.roundRect(-46, -92, 92, 184, 30); ctx.fill();
  ctx.fillStyle = '#0A0F1B'; ctx.beginPath(); ctx.moveTo(-36, -38); ctx.lineTo(36, -38); ctx.lineTo(30, -6); ctx.lineTo(-30, -6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#141D30'; ctx.beginPath(); ctx.roundRect(-34, -6, 68, 74, 14); ctx.fill();
  ctx.fillStyle = '#0A0F1B'; ctx.beginPath(); ctx.moveTo(-30, 68); ctx.lineTo(30, 68); ctx.lineTo(34, 84); ctx.lineTo(-34, 84); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1A2336'; ctx.fillRect(-54, -40, 10, 12); ctx.fillRect(44, -40, 10, 12);
  ctx.fillStyle = '#EEF1F7'; ctx.fillRect(-36, -92, 18, 6); ctx.fillRect(18, -92, 18, 6);
  ctx.fillStyle = C.rose; ctx.fillRect(-38, 86, 18, 6); ctx.fillRect(20, 86, 18, 6);
  // the ride sign on the roof
  ctx.fillStyle = C.amber; ctx.beginPath(); ctx.roundRect(-16, 18, 32, 14, 5); ctx.fill();
  // indicator
  if (o.blink && frac(t * 2.5) < .5) { ctx.fillStyle = C.amber; ctx.beginPath(); ctx.arc(-40, -84, 7, 0, TAU); ctx.arc(-40, 84, 7, 0, TAU); ctx.fill(); }
  ctx.restore();
}
function drawPin(x, y, col, t0, t, s = 1) {
  const u = (t - t0) / .35; if (u < 0) return;
  const drop = (1 - easeOut(u)) * -120, sq = 1 + .25 * Math.max(0, Math.sin(clamp(u) * PI * 2)) * (1 - clamp(u));
  ctx.save(); ctx.translate(x, y + drop); ctx.scale(s / sq, s * sq); ctx.globalAlpha *= clamp(u * 3);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(0, 4, 20, 7, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 24;
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-36, -44, -30, -86, 0, -86); ctx.bezierCurveTo(30, -86, 36, -44, 0, 0); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#0B1220'; ctx.beginPath(); ctx.arc(0, -56, 12, 0, TAU); ctx.fill();
  ctx.restore();
}
function polyPath(pts, k) {                                  // the first fraction k of a polyline
  const seg = []; let tot = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; }
  let rem = k * tot; ctx.beginPath(); ctx.moveTo(...pts[0]);
  for (let i = 1; i < pts.length && rem > 0; i++) { const u = Math.min(1, rem / seg[i - 1]); ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)); rem -= seg[i - 1]; }
}
// the offer's geometry, fixed in the world when it arrives
const OFFER_W = (() => {
  const cw = CAR.y - mapScroll(TL.ping), py = STREETS(Math.floor((cw - 420 - 100) / 240)), dy = py - 960;
  return { py, dy, pick: [760, py], drop: [150, dy] };
})();
function drawOfferMap(t) {
  if (t < TL.ping) return;
  const sy = wy => toScreen(wy, t), car = [CAR.x, CAR.y], o = OFFER_W;
  const pickup = [[car[0], car[1] - 90], [car[0], sy(o.py)], [o.pick[0], sy(o.py)]];
  const trip = [[o.pick[0], sy(o.py)], [AVE, sy(o.py)], [AVE, sy(o.dy)], [o.drop[0], sy(o.dy)]];
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.setLineDash([2, 16]); ctx.strokeStyle = C.teal; ctx.lineWidth = 8; polyPath(pickup, easeOut((t - TL.ping - .1) / .3)); ctx.stroke(); ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(238,241,247,.18)'; ctx.lineWidth = 22; polyPath(trip, easeIO((t - TL.ping - .3) / .5)); ctx.stroke();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 8; polyPath(trip, easeIO((t - TL.ping - .3) / .5)); ctx.stroke();
  drawPin(o.pick[0], sy(o.py), C.teal, TL.ping + .05, t);
  drawPin(o.drop[0], sy(o.dy), C.rose, TL.ping + .55, t);
}
function drawOfferPill(t) {
  if (t < TL.ping || t > 2.2) return;
  const m = easeBack((t - TL.ping) / .3, 1.4), out = smooth((t - 2.0) / .15), x = CX, y = 700;
  const w = lerp(60, 780, m), h = lerp(60, 176, m) * (1 - out), r = Math.min(h, w) / 2;
  if (h < 1) return;
  ctx.save(); ctx.shadowColor = rgba(RGB.amber, .5); ctx.shadowBlur = 40;
  ctx.fillStyle = 'rgba(19,27,44,.96)'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, r); ctx.fill(); ctx.restore();
  ctx.strokeStyle = rgba(RGB.amber, .8); ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, r); ctx.stroke();
  const ca = smooth((t - TL.ping - .15) / .2) * (1 - out);
  if (ca > 0) {
    ctx.save(); ctx.globalAlpha *= ca;
    text(R.offer, x - 320, y - 44, F.mono(28, 600), C.muted, { align: 'left', ls: 4 });
    odometer(R.fare * easeOut((t - TL.ping - .2) / .5), 2, x - 322, y + 26, F.head(112), C.ink);
    const rem = 1 - clamp((t - TL.ping - .2) / 2.2);
    ctx.lineCap = 'round'; ctx.lineWidth = 9; ctx.strokeStyle = C.line; ctx.beginPath(); ctx.arc(x + 300, y, 46, 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgba(mix(RGB.amber, RGB.rose, 1 - rem)); ctx.beginPath(); ctx.arc(x + 300, y, 46, -PI / 2, -PI / 2 + TAU * rem); ctx.stroke();
    ctx.restore();
  }
}
function drawLocationPulse(t) {
  if (t > 1.3) return;
  for (let k = 0; k < 3; k++) {
    const p = frac(t * 1.1 + k / 3), a = (1 - p) * .6 * (1 - smooth((t - 1.0) / .3));
    ctx.strokeStyle = rgba(RGB.amber, a); ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(CAR.x, CAR.y, 80 + p * 260, 80 + p * 260, 0, 0, TAU); ctx.stroke();
  }
}
// the ride's own figures, raining
const RAIN = table(46, 404, (r, i) => ({ x: 90 + r() * 860, t0: 2.3 + r() * 1.2, v: 700 + r() * 600, s: 30 + r() * 34, rot: (r() - .5) * .6,
  txt: ['18.40', '÷ 38 min', '× 60', '$29/h?', '7 min', '22.4 km', '?', '$/km', '− drive back', '$40??'][i % 10], col: ['ink', 'amber', 'rose', 'muted'][i % 4] }));
function drawPanic(t) {
  if (t < TL.words[0] || t > TL.drop + .05) return;
  const pull = easeIn((t - TL.melt) / .6), target = { x: DIAL.x, y: DIAL.y };
  for (const d of RAIN) {
    const u = t - d.t0; if (u < 0) continue;
    let x = d.x, y = -60 + u * d.v + 300 * u * u, sc = 1, a = clamp(u * 6);
    if (pull > 0) { x = lerp(x, target.x, pull); y = lerp(Math.min(y, 1800), target.y, pull); sc = 1 - pull * .9; a *= 1 - smooth((pull - .7) / .3); }
    if (y > 1900 || a <= .01) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(d.rot); ctx.scale(sc, sc); ctx.globalAlpha *= a * .9;
    text(d.txt, 0, 0, F.mono(d.s, 600), C[d.col]); ctx.restore();
  }
  const Y = [690, 990, 1320], out = easeIn((t - TL.melt) / .35);
  R.words.forEach((w, i) => {
    const font = fitFont(w, i === 2 ? 920 : 760, i === 2 ? 330 : 380), col = i === 2 ? C.amber : C.ink;
    squashWord(w, CX, lerp(Y[i], target.y, out), font, col, TL.words[i], t, { k: 1 - out * .95, alpha: 1 - smooth((out - .6) / .4), halo: true });
  });
}

// ─── the cockpit ───────────────────────────────────────────────────────────
const VPX = 470, VPY = 620, KF = 1300, HC = 1.25;
const proj = (lat, h, z) => [VPX + lat * KF / z, VPY + (HC - h) * KF / z];
const speedAt = t => t < TL.take ? 10 : t < 7.5 ? lerp(10, 26, (t - TL.take) / (7.5 - TL.take)) : t < 9 ? 26 : 13;
function posAt(t) { let p = 0; const n = Math.round(t * 120); for (let i = 0; i < n; i++) p += speedAt((i + .5) / 120) / 120; return p; }
const WIND_Y = 830, OUT_DY = -190;                            // the windscreen ends at y 830; the street is lifted 190 px
function windscreenPath() { ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(W + 10, -10); ctx.lineTo(W + 10, WIND_Y + 40); ctx.quadraticCurveTo(CX, WIND_Y - 60, -10, WIND_Y + 40); ctx.closePath(); }
const LIGHT = { x: 830, y: 210 };
function lightState(t) { return t >= 9 ? 'off' : t >= TL.take - .02 ? 'green' : t >= TL.swing1[0] - .2 ? 'red' : 'off'; }   // later shots are past the light
function drawTrafficLight(t) {
  const st = lightState(t); if (st === 'off') return;
  const a = smooth((t - TL.drop - .1) / .3);
  ctx.save(); ctx.globalAlpha *= a;
  ctx.strokeStyle = '#05070C'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(LIGHT.x, LIGHT.y - 110); ctx.lineTo(LIGHT.x, -20); ctx.moveTo(LIGHT.x, -10); ctx.lineTo(LIGHT.x - 340, -10); ctx.stroke();
  ctx.fillStyle = '#05070C'; ctx.beginPath(); ctx.roundRect(LIGHT.x - 42, LIGHT.y - 112, 84, 224, 22); ctx.fill();
  const lamps = [['red', -70, RGB.rose, 'rose'], ['amber', 0, RGB.amber, 'amber'], ['green', 70, RGB.teal, 'teal']];
  for (const [k, dy, col, tint] of lamps) {
    const on = st === k;
    ctx.fillStyle = on ? rgba(col) : 'rgba(40,52,78,.9)'; ctx.beginPath(); ctx.arc(LIGHT.x, LIGHT.y + dy, 26, 0, TAU); ctx.fill();
    if (on) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= .8; ctx.drawImage(TINTED[tint], LIGHT.x - 150, LIGHT.y + dy - 150, 300, 300); ctx.restore(); }
  }
  ctx.restore();
  if (st !== 'off') {                                          // its colour on the glass
    const col = st === 'red' ? RGB.rose : RGB.teal, k = st === 'red' ? .16 : .12 * envl(t, TL.take, TL.take + .1, 7.3, 7.6);
    const g = ctx.createRadialGradient(LIGHT.x, LIGHT.y, 0, LIGHT.x, LIGHT.y, 1000); g.addColorStop(0, rgba(col, k)); g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, WIND_Y + 40);
  }
}
const STREAKS = table(70, 61, r => ({ a: r() * TAU, ph: r(), w: 1 + r() * 3, col: r() < .7 ? 'amber' : 'ink' }));
function drawStreaks(t) {
  const k = envl(t, 7.35, 7.6, 8.8, 9.0); if (k <= 0) return;
  const vp = { x: VPX, y: VPY + OUT_DY };
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const s of STREAKS) {
    const p = frac(s.ph + t * 1.6), r0 = 40 + p * p * 900, r1 = r0 + 60 + p * 260;
    ctx.strokeStyle = rgba(RGB[s.col], .5 * k * Math.sin(p * PI)); ctx.lineWidth = s.w * (.5 + p);
    ctx.beginPath(); ctx.moveTo(vp.x + Math.cos(s.a) * r0, vp.y + Math.sin(s.a) * r0 * .6); ctx.lineTo(vp.x + Math.cos(s.a) * r1, vp.y + Math.sin(s.a) * r1 * .6); ctx.stroke();
  }
  ctx.restore();
}
function drawCockpit(t) {
  const Wd = { pos: posAt(t), gap: 30, b: .3, red: 0, close: 0 };
  ctx.save(); windscreenPath(); ctx.clip();
  ctx.save(); ctx.translate(0, OUT_DY); drawOutside(Wd); ctx.restore();
  drawTrafficLight(t); drawStreaks(t);
  // the shader layers (headlight beams, the green light's flare) belong to the view through the glass
  for (const [id] of GPU_LAYERS) {
    if (!GPU_IMG[id]) continue;
    ctx.save(); ctx.globalAlpha = GPU_OP[id]; ctx.globalCompositeOperation = BLEND[id] || 'source-over'; ctx.drawImage(GPU_IMG[id], 0, 0, W, H); ctx.restore();
  }
  ctx.restore();
  // A-pillars
  ctx.fillStyle = '#04060C';
  ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(70, -10); ctx.lineTo(-10, 700); ctx.fill();
  ctx.beginPath(); ctx.moveTo(W + 10, -10); ctx.lineTo(W - 70, -10); ctx.lineTo(W + 10, 700); ctx.fill();
  // dashboard
  const dg = ctx.createLinearGradient(0, WIND_Y - 40, 0, H); dg.addColorStop(0, '#0D121E'); dg.addColorStop(1, '#03050A');
  ctx.fillStyle = dg; ctx.beginPath(); ctx.moveTo(-10, WIND_Y + 40); ctx.quadraticCurveTo(CX, WIND_Y - 60, W + 10, WIND_Y + 40); ctx.lineTo(W + 10, H + 10); ctx.lineTo(-10, H + 10); ctx.fill();
  ctx.strokeStyle = 'rgba(245,176,65,.2)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, WIND_Y + 40); ctx.quadraticCurveTo(CX, WIND_Y - 60, W + 10, WIND_Y + 40); ctx.stroke();
  // the binnacle hood and the cluster face
  ctx.fillStyle = '#080C16'; ctx.beginPath(); ctx.ellipse(DIAL.x, DIAL.y + 40, 430, 400, 0, PI, TAU); ctx.lineTo(DIAL.x + 430, DIAL.y + 400); ctx.lineTo(DIAL.x - 430, DIAL.y + 400); ctx.fill();
  ctx.strokeStyle = 'rgba(238,241,247,.08)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(DIAL.x, DIAL.y + 40, 430, 400, 0, PI * 1.05, PI * 1.95); ctx.stroke();
  const face = ctx.createRadialGradient(DIAL.x, DIAL.y, 0, DIAL.x, DIAL.y, 380); face.addColorStop(0, '#0E1424'); face.addColorStop(1, '#05080F');
  ctx.fillStyle = face; ctx.beginPath(); ctx.arc(DIAL.x, DIAL.y, 375, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#1B2538'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(DIAL.x, DIAL.y, 375, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(238,241,247,.12)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(DIAL.x, DIAL.y, 368, PI * 1.15, PI * 1.85); ctx.stroke();
  drawGauge(t);
  // the wheel's rim at the bottom of the frame
  ctx.strokeStyle = '#05080F'; ctx.lineWidth = 60; ctx.beginPath(); ctx.ellipse(DIAL.x, DIAL.y + 820, 640, 330, 0, PI * 1.12, PI * 1.88); ctx.stroke();
  ctx.strokeStyle = 'rgba(245,176,65,.18)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(DIAL.x, DIAL.y + 795, 650, 330, 0, PI * 1.15, PI * 1.85); ctx.stroke();
}

// ─── the gauge: a speedometer that becomes the Rate Dial ───────────────────
const angleOf = v => PI + clamp(v / 80, 0, 1.06) * PI;
function dialValue(t) {
  const sw = (a, b, from, to) => lerp(from, to, easeBack((t - a) / (b - a), 1.3));
  if (t < TL.swing1[0]) return 0;
  if (t < TL.reset[0]) return sw(...TL.swing1, 0, 23);
  if (t < TL.reset[1]) return lerp(23, 0, easeIO((t - TL.reset[0]) / (TL.reset[1] - TL.reset[0])));
  return sw(...TL.swing2, 0, 52);
}
function speedoValue(t) {                                     // km/h, thrashing as the maths piles in
  const k = smooth((t - TL.melt) / .3);
  return clamp(55 + 20 * (t - TL.melt) * k + k * (34 * Math.sin(t * 13) + 22 * Math.sin(t * 21.7 + 1)), 0, 158);
}
function drawGauge(t) {
  const D = DIAL, m = easeIO((t - TL.drop) / .45);           // 0: speedometer, 1: Rate Dial
  const a0 = lerp(PI * .75, PI, m), a1 = lerp(PI * 2.25, TAU, m);
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.line; ctx.lineWidth = lerp(22, 50, m); ctx.beginPath(); ctx.arc(D.x, D.y, D.r, a0, a1); ctx.stroke();
  if (m < 1) {                                                // the speedometer's ticks and numbers
    ctx.save(); ctx.globalAlpha *= 1 - m;
    for (let v = 0; v <= 160; v += 10) {
      const a = PI * .75 + v / 160 * PI * 1.5, big = v % 20 === 0;
      ctx.strokeStyle = big ? C.ink : 'rgba(166,176,195,.6)'; ctx.lineWidth = big ? 6 : 3;
      ctx.beginPath(); ctx.moveTo(D.x + Math.cos(a) * (D.r - 34), D.y + Math.sin(a) * (D.r - 34)); ctx.lineTo(D.x + Math.cos(a) * (D.r - (big ? 70 : 54)), D.y + Math.sin(a) * (D.r - (big ? 70 : 54))); ctx.stroke();
      if (big) text(String(v), D.x + Math.cos(a) * (D.r - 112), D.y + Math.sin(a) * (D.r - 112), F.mono(34, 600), C.muted);
    }
    text('km/h', D.x, D.y + 150, F.mono(32, 600), C.muted);
    const heat = smooth((t - TL.melt - .3) / .6);             // the gauge overheats
    if (heat > 0) { ctx.strokeStyle = rgba(RGB.rose, .5 * heat * (.7 + .3 * Math.sin(t * 30))); ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(D.x, D.y, D.r + 26, PI * .75, PI * 2.25); ctx.stroke(); }
    const a = PI * .75 + speedoValue(t) / 160 * PI * 1.5;
    ctx.strokeStyle = C.rose; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(D.x - Math.cos(a) * 30, D.y - Math.sin(a) * 30); ctx.lineTo(D.x + Math.cos(a) * (D.r - 60), D.y + Math.sin(a) * (D.r - 60)); ctx.stroke();
    ctx.fillStyle = '#1B2538'; ctx.beginPath(); ctx.arc(D.x, D.y, 36, 0, TAU); ctx.fill();
    ctx.restore();
  }
  if (m > 0) drawDial(t, m);
}
function drawDial(t, m) {
  const D = DIAL;
  const verdict = t >= TL.take ? 'take' : t >= TL.pass && t < TL.reset[0] + .05 ? 'pass' : null;
  const col = verdict === 'take' ? RGB.teal : verdict === 'pass' ? RGB.rose : RGB.amber;
  ctx.save(); ctx.globalAlpha *= m;
  ctx.strokeStyle = 'rgba(166,176,195,.4)'; ctx.lineWidth = 4;
  for (let v = 0; v <= 80; v += 10) { const a = angleOf(v);
    ctx.beginPath(); ctx.moveTo(D.x + Math.cos(a) * (D.r - 52), D.y + Math.sin(a) * (D.r - 52)); ctx.lineTo(D.x + Math.cos(a) * (D.r - 74), D.y + Math.sin(a) * (D.r - 74)); ctx.stroke(); }
  const bk = smooth((t - TL.drop - .35) / .2) * (1 - smooth((t - TL.head) / .25));
  if (bk > 0) {
    ctx.save(); ctx.globalAlpha *= bk; ctx.strokeStyle = C.amber; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(D.x, D.y - D.r - 40); ctx.lineTo(D.x, D.y - D.r - 72); ctx.stroke();
    text(R.bar, D.x, D.y - D.r - 104, F.mono(30, 600), C.amber, { ls: 5, glow: ['rgba(4,6,11,.9)', 10] }); ctx.restore();
  }
  const v = dialValue(t), a = angleOf(v);
  if (v > .2) { ctx.save(); ctx.shadowColor = rgba(col, .7); ctx.shadowBlur = 40; ctx.strokeStyle = rgba(col); ctx.lineWidth = 50; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(D.x, D.y, D.r, PI, a); ctx.stroke(); ctx.restore(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(D.x - Math.cos(a) * 26, D.y - Math.sin(a) * 26);
  ctx.lineTo(D.x + Math.cos(a) * (D.r - 80), D.y + Math.sin(a) * (D.r - 80)); ctx.stroke();
  ctx.fillStyle = '#06090F'; ctx.beginPath(); ctx.arc(D.x, D.y, 40, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(col); ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(D.x, D.y, 34, 0, TAU); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(D.x, D.y, 14, 0, TAU); ctx.fill();
  if (t >= TL.swing1[0] - .1) {
    ctx.save(); ctx.globalAlpha *= smooth((t - TL.swing1[0]) / .15);
    odometer(Math.max(0, v), 0, D.x + 30, D.y + 108, F.head(104), rgba(mix(RGB.ink, col, verdict ? 1 : 0)), 'right', '$', 2);
    text(R.perHr, D.x + 40, D.y + 118, F.mono(42, 600), C.muted, { align: 'left' });
    ctx.restore();
  }
  if (verdict && t < 9) {                                     // by the headline the verdict has been read: the dial just rides along
    const t0 = verdict === 'take' ? TL.take : TL.pass, u = (t - t0) / .3, s = lerp(1.9, 1, easeBack(u, 2.4));
    const word = verdict === 'take' ? R.take : R.pass_, wa = verdict === 'pass' ? 1 - smooth((t - TL.reset[0] + .05) / .15) : 1;
    ctx.save(); ctx.translate(D.x, D.y + 250); ctx.scale(s, s); ctx.globalAlpha *= clamp(u * 4) * wa;
    text(word, 0, 0, F.head(210), rgba(col), { ls: 18, glow: [rgba(col, .8), 50] }); ctx.restore();
    const pu = (t - t0) / .6;
    if (pu < 1) { ctx.strokeStyle = rgba(col, .6 * (1 - pu)); ctx.lineWidth = 10 * (1 - pu) + 2; ctx.beginPath(); ctx.arc(D.x, D.y, D.r + 60 + easeOut(pu) * 140, PI, TAU); ctx.stroke(); }
  }
  ctx.restore();
}
function drawClaim(t) {
  if (t < TL.claim[0] || t > 9.1) return;
  const out = easeIn((t - 8.85) / .2);
  ctx.save(); ctx.translate(0, -out * 200); ctx.globalAlpha *= 1 - out;
  squashWord(R.claim[0], CX, 300, fitFont(R.claim[0], 820, 210), C.ink, TL.claim[0], t, { halo: true });
  squashWord(R.claim[1], CX, 540, fitFont(R.claim[1], 900, 250), C.amber, TL.claim[1], t, { halo: true });
  ctx.restore();
}

// ─── the rules, as ride items on the map ───────────────────────────────────
function icon(kind, x, y, s, col) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (kind === 'clock') { ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -12); ctx.moveTo(0, 0); ctx.lineTo(9, 5); ctx.stroke(); }
  else if (kind === 'odo') { ctx.beginPath(); ctx.arc(0, 6, 20, PI, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(12, -6); ctx.stroke(); }
  else if (kind === 'pin') { ctx.beginPath(); ctx.moveTo(0, 20); ctx.bezierCurveTo(-18, -2, -16, -22, 0, -22); ctx.bezierCurveTo(16, -22, 18, -2, 0, 20); ctx.fill(); ctx.fillStyle = '#131B2C'; ctx.beginPath(); ctx.arc(0, -7, 6, 0, TAU); ctx.fill(); }
  else if (kind === 'strand') { ctx.setLineDash([2, 7]); ctx.beginPath(); ctx.moveTo(-18, 16); ctx.quadraticCurveTo(-10, -18, 18, -14); ctx.stroke(); ctx.setLineDash([]); ctx.beginPath(); ctx.arc(-18, 16, 5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(18, -14); ctx.lineTo(8, -22); ctx.moveTo(18, -14); ctx.lineTo(9, -5); ctx.stroke(); }
  else if (kind === 'battery') { ctx.strokeRect(-22, -12, 40, 24); ctx.fillRect(20, -5, 5, 10); ctx.fillRect(-18, -8, 12, 16); }
  ctx.restore();
}
function drawRules(t) {
  if (t < TL.rules - .1 || t > 11.15) return;
  const gather = easeIn((t - (TL.lock - .1)) / .3), out = easeIn((t - 10.95) / .18), sy = wy => toScreen(wy, t);
  // on the map: a pickup pin close by, a far pin at the edge with the empty drive back, the battery on the car
  const cw = CAR.y - mapScroll(TL.rules), farY = cw - 1250, pinY = cw - 520;
  ctx.save(); ctx.globalAlpha *= 1 - gather;
  ctx.setLineDash([3, 16]); ctx.lineCap = 'round'; ctx.strokeStyle = rgba(RGB.rose, .85); ctx.lineWidth = 7;
  polyPath([[150, sy(farY)], [150, sy(cw - 240)], [CAR.x - 60, sy(cw - 240)]], easeIO((t - TL.rules - .7) / .5)); ctx.stroke(); ctx.setLineDash([]);
  drawPin(760, sy(pinY), C.teal, TL.rules + .55, t);
  drawPin(150, sy(farY), C.rose, TL.rules + .7, t);
  const bk = easeBack((t - TL.rules - .95) / .3, 2);
  if (bk > 0) { ctx.save(); ctx.translate(CAR.x + 120, CAR.y - 40); ctx.scale(bk, bk);
    ctx.fillStyle = 'rgba(19,27,44,.95)'; ctx.beginPath(); ctx.roundRect(-58, -34, 116, 68, 20); ctx.fill(); icon('battery', 0, 0, 1.3, C.rose); ctx.restore(); }
  ctx.restore();
  ctx.save(); ctx.globalAlpha *= 1 - out;
  text(R.rulesTitle, CX, 560, F.mono(36, 600), C.amber, { ls: 8, alpha: smooth((t - TL.rules) / .2) * (1 - gather), glow: ['rgba(4,6,11,.9)', 12] });
  const kinds = ['clock', 'odo', 'pin', 'strand', 'battery'], rows = [R.rules.slice(0, 3), R.rules.slice(3)], font = F.head(70, 700);
  ctx.font = font; ctx.letterSpacing = '0px';
  let k = 0;
  rows.forEach((row, ri) => {
    const ws = row.map(s => ctx.measureText(s).width + 136), tot = ws.reduce((a, b) => a + b, 0) + (row.length - 1) * 22;
    let x = CX - tot / 2;
    row.forEach((s, i) => {
      const t0 = TL.rules + .15 + k * .22, u = easeBack((t - t0) / .3, 2), cx = x + ws[i] / 2, cy = 700 + ri * 140, c = k % 2 ? RGB.teal : RGB.amber;
      const px = lerp(cx, CX, gather), py = lerp(cy, 900, gather), sc = u * (1 - gather * .9);
      if (u > 0 && sc > .02) {
        ctx.save(); ctx.translate(px, py); ctx.scale(sc, sc);
        ctx.fillStyle = 'rgba(19,27,44,.95)'; ctx.beginPath(); ctx.roundRect(-ws[i] / 2, -56, ws[i], 112, 56); ctx.fill();
        ctx.strokeStyle = rgba(c, .9); ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-ws[i] / 2, -56, ws[i], 112, 56); ctx.stroke();
        icon(kinds[k], -ws[i] / 2 + 52, 0, 1.15, rgba(c));
        text(s, 30, 4, font, C.ink); ctx.restore();
      }
      x += ws[i] + 22; k++;
    });
  });
  // the phone in its mount, locked: nothing leaves it
  const lk = easeBack((t - TL.lock - .05) / .3, 2.2);
  if (lk > 0) {
    ctx.save(); ctx.translate(CX, 860); ctx.scale(lk, lk);
    ctx.fillStyle = '#05070C'; ctx.fillRect(-14, 150, 28, 70); ctx.fillRect(-90, 214, 180, 18);
    ctx.save(); ctx.shadowColor = 'rgba(245,176,65,.5)'; ctx.shadowBlur = 40; ctx.fillStyle = '#131B2C'; ctx.beginPath(); ctx.roundRect(-100, -180, 200, 340, 34); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(238,241,247,.35)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-100, -180, 200, 340, 34); ctx.stroke();
    ctx.fillStyle = '#05070C'; ctx.fillRect(-112, -40, 12, 80); ctx.fillRect(100, -40, 12, 80);
    ctx.lineCap = 'round'; ctx.strokeStyle = C.amber; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(0, -30, 34, PI, TAU); ctx.lineTo(34, 0); ctx.moveTo(-34, 0); ctx.lineTo(-34, -30); ctx.stroke();
    ctx.fillStyle = C.amber; ctx.beginPath(); ctx.roundRect(-52, -6, 104, 78, 14); ctx.fill();
    ctx.fillStyle = '#131B2C'; ctx.beginPath(); ctx.arc(0, 26, 10, 0, TAU); ctx.fill(); ctx.fillRect(-4, 30, 8, 22);
    ctx.restore();
    squashWord(R.lock, CX, 1160, fitFont(R.lock, 860, 170), C.ink, TL.lock + .1, t, { halo: true });
    text(R.lockSub, CX, 1280, F.sans(44, 500), C.ink, { alpha: smooth((t - TL.lock - .25) / .2), glow: ['rgba(4,6,11,.95)', 14] });
  }
  ctx.restore();
}
function drawHeadline(t) {
  if (t < TL.head || t > TL.logo + .1) return;
  const out = easeIn((t - (TL.logo - .15)) / .22);
  ctx.save(); ctx.translate(CX, 480); ctx.scale(1 - out, 1 - out * .5); ctx.translate(-CX, -480); ctx.globalAlpha *= 1 - out;
  let k = 0;
  R.head.forEach((line, li) => {
    ctx.font = F.head(180); ctx.letterSpacing = '0px';
    const gap = 42, ws = line.map(([w]) => ctx.measureText(w).width), tot = ws.reduce((a, b) => a + b, 0) + gap * (line.length - 1), fit = Math.min(1, 900 / tot);
    let x = CX - tot * fit / 2;
    line.forEach(([w, c], i) => {
      squashWord(w, x + ws[i] * fit / 2, 300 + li * 190, F.head(180 * fit), C[c] || C.ink, TL.head + k * .12, t, { halo: true });
      x += (ws[i] + gap) * fit; k++;
    });
  });
  ctx.restore();
}
function drawLogo(t) {
  if (t < TL.logo) return;
  const x = CX, y = 760, size = 300, s = size / 64, k = smooth((t - TL.logo) / .25);
  const sc = ctx.createRadialGradient(CX, 1000, 0, CX, 1000, 720), sk = smooth((t - TL.logo) / .4);
  sc.addColorStop(0, `rgba(6,9,15,${.8 * sk})`); sc.addColorStop(1, `rgba(6,9,15,0)`); ctx.fillStyle = sc; ctx.fillRect(0, 0, W, H);   // the map and the car stay visible round the edges
  ctx.save(); ctx.translate(x - size / 2, y - size / 2); ctx.scale(s, s); ctx.globalAlpha *= k;
  ctx.save(); ctx.shadowColor = 'rgba(245,176,65,.45)'; ctx.shadowBlur = 80 / s;
  ctx.fillStyle = C.navy; ctx.beginPath(); ctx.roundRect(0, 0, 64, 64, 15); ctx.fill(); ctx.restore();
  ctx.strokeStyle = 'rgba(245,176,65,.5)'; ctx.lineWidth = .6; ctx.beginPath(); ctx.roundRect(0, 0, 64, 64, 15); ctx.stroke();
  ctx.lineCap = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = C.line; ctx.beginPath(); ctx.arc(32, 44, 20, PI, TAU); ctx.stroke();
  const ak = easeOut((t - TL.logo - .05) / .5);
  if (ak > 0) { ctx.strokeStyle = C.amber; ctx.beginPath(); ctx.arc(32, 44, 20, PI, PI + PI / 2 * ak); ctx.stroke(); }
  if (ak > .9) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(44, 27); ctx.lineTo(47, 24); ctx.stroke(); }
  const nk = easeBack((t - TL.logo - .45) / .5, 2.4);
  ctx.save(); ctx.translate(32, 44); ctx.rotate((-110 + 80 * nk) * PI / 180);
  ctx.strokeStyle = C.ink; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, -15); ctx.stroke();
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill(); ctx.restore();
  ctx.restore();
  reveal(life(t, TL.logo + .75, 99), () => {
    ctx.save(); ctx.font = F.head(150); ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.letterSpacing = '1px';
    const a = ctx.measureText('Ride').width, b = ctx.measureText('Sentinel').width, x0 = CX - (a + b) / 2;
    ctx.fillStyle = C.ink; ctx.fillText('Ride', x0, 1030); ctx.fillStyle = C.amber; ctx.fillText('Sentinel', x0 + a, 1030); ctx.restore();
  });
  reveal(life(t, TL.logo + 1.0, 99), () => {
    ctx.font = F.mono(50, 600); const w = ctx.measureText('ridesentinel.app').width + 90;
    ctx.save(); ctx.shadowColor = 'rgba(245,176,65,.5)'; ctx.shadowBlur = 40; ctx.fillStyle = C.amber; ctx.beginPath(); ctx.roundRect(CX - w / 2, 1140, w, 96, 48); ctx.fill(); ctx.restore();
    text('ridesentinel.app', CX, 1189, F.mono(50, 600), C.navy);
  });
  reveal(life(t, TL.logo + 1.2, 99), () => text(R.cta, CX, 1300, F.sans(42, 500), C.ink));
  reveal(life(t, TL.logo + 1.4, 99), () => { text(R.fine[0], CX, 1395, F.sans(27, 400), C.muted); text(R.fine[1], CX, 1437, F.sans(27, 400), C.muted); });
}
function drawHud(t) {
  const close = easeIn((t - 15.3) / .4), a = (.6 + .4 * smooth(t / .2)) * (1 - close), inset = close * 60;
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = 'rgba(238,241,247,.7)'; ctx.lineWidth = 3; ctx.lineCap = 'square';
  const box = [64 + inset, 150 + inset, 1016 - inset, 1790 - inset], L0 = 44;
  for (const [x, y, dx, dy] of [[box[0], box[1], 1, 1], [box[2], box[1], -1, 1], [box[0], box[3], 1, -1], [box[2], box[3], -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(x, y + dy * L0); ctx.lineTo(x, y); ctx.lineTo(x + dx * L0, y); ctx.stroke();
  }
  const f = Math.floor(t * 30), tc = `00:00:${String(Math.floor(t)).padStart(2, '0')}:${String(f % 30).padStart(2, '0')}`;
  text(R.hud[0], box[0] + 22, box[1] + 26, F.mono(22, 600), 'rgba(238,241,247,.75)', { align: 'left', ls: 3 });
  text(tc, box[2] - 22, box[1] + 26, F.mono(22, 600), 'rgba(238,241,247,.75)', { align: 'right' });
  text(R.hud[1], box[0] + 22, box[3] - 24, F.mono(22, 600), 'rgba(238,241,247,.75)', { align: 'left', ls: 3 });
  const blink = frac(t * 1.5) < .6 ? 1 : .2;
  ctx.fillStyle = rgba(RGB.rose, blink); ctx.beginPath(); ctx.arc(box[2] - 98, box[3] - 24, 8, 0, TAU); ctx.fill();
  text(R.hud[2], box[2] - 22, box[3] - 24, F.mono(22, 600), 'rgba(238,241,247,.75)', { align: 'right', ls: 3 });
  ctx.restore();
}

// ─── the frame ─────────────────────────────────────────────────────────────
const [GLB, glbRaw] = canvas(W * SS, H * SS);
function glitch(t) {
  const k = envl(t, TL.pass - .01, TL.pass + .02, TL.pass + .22, TL.pass + .32); if (k <= 0) return;
  glbRaw.clearRect(0, 0, GLB.width, GLB.height); glbRaw.drawImage(cv, 0, 0);
  const r = rng(Math.floor(t * 30) * 13 + 5);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < 9; i++) {
    const y = Math.floor(r() * H), h = 20 + Math.floor(r() * 90), dx = (r() - .5) * 120 * k;
    ctx.drawImage(GLB, 0, y * SS, W * SS, h * SS, dx, y, W, h);
  }
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .14 * k; ctx.fillStyle = C.rose; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
// zooms that carry us between the map and the cockpit
function mapZoom(t) {
  const into = t < 6 ? easeIn((t - 2.8) / .25) : t < 12 ? easeIn((t - 10.8) / .25) : 0;      // diving into the car
  const outof = t >= 9 && t < 10 ? 1 - easeOut((t - 9.0) / .35) : t >= 13.45 ? 1 - easeOut((t - 13.45) / .35) : 0;  // lifting out
  return 1 + 1.6 * Math.max(into, outof);
}
function drawMapWorld(t) {
  const z = mapZoom(t);
  ctx.save(); ctx.translate(CAR.x, CAR.y - 80); ctx.scale(z, z); ctx.translate(-CAR.x, -(CAR.y - 80));
  drawMapBase(t);
  if (t < 3.05) { drawOfferMap(t); drawLocationPulse(t); }
  drawCarTop(CAR.x, CAR.y, 1.25, t, { blink: t < TL.ping });
  ctx.restore();
  const dim = t < 3.05 ? .35 * smooth((t - 1.9) / .2) : .2;
  ctx.fillStyle = `rgba(6,9,15,${dim})`; ctx.fillRect(0, 0, W, H);
}
function drawScene(t) {
  ctx.fillStyle = '#06090F'; ctx.fillRect(0, 0, W, H);
  const cock = inCockpit(t);
  const sh = shakeAt(t, TL.drop, 22) + TL.words.reduce((a, w) => a + shakeAt(t, w, 9, 14), 0) + shakeAt(t, TL.claim[1], 10) + shakeAt(t, TL.take, 8);
  ctx.save(); ctx.translate(sh * .6, sh);
  if (cock) {
    const zin = TL.melt <= t && t < TL.melt + .4 ? lerp(1.25, 1, easeOut((t - TL.melt) / .4)) : t >= 11 && t < 11.4 ? lerp(1.25, 1, easeOut((t - 11) / .4)) : 1;
    ctx.save(); ctx.translate(CX, 900); ctx.scale(zin, zin); ctx.translate(-CX, -900); drawCockpit(t); ctx.restore();
  } else drawMapWorld(t);
  // the blink between worlds: an amber flash of headlights, never pure white
  const fl = Math.max(envl(t, 2.95, 3.0, 3.0, 3.15), envl(t, 8.95, 9.0, 9.0, 9.15), envl(t, 10.95, 11.0, 11.0, 11.15), envl(t, 13.4, 13.45, 13.45, 13.6));
  if (fl > 0) { ctx.fillStyle = `rgba(245,190,110,${.35 * fl})`; ctx.fillRect(-50, -50, W + 100, H + 100); }
  const punch = 1 + .06 * Math.exp(-Math.max(0, t - TL.drop) * 8) * (t > TL.drop);
  ctx.save(); ctx.translate(CX, CY); ctx.scale(punch, punch); ctx.translate(-CX, -CY);
  drawOfferPill(t); drawPanic(t); drawClaim(t); drawRules(t); drawHeadline(t);
  ctx.restore();
  ctx.restore();
  drawLogo(t);
  drawHud(t);
  glitch(t);
}
const SHOTS = [
  { id: 'car', start: 0, end: 1, readAt: .5, action: 'car from above, location pulse' }, { id: 'offer', start: 1, end: 2, readAt: 1.7, action: 'pins, route, offer pill' },
  { id: 'panic', start: 2, end: 3, readAt: 2.9, action: 'DO THE MATHS? over the map' }, { id: 'speedo', start: 3, end: 4, readAt: 3.6, action: 'speedometer thrashing' },
  { id: 'pass', start: 4, end: 5.75, readAt: 5.2, action: 'Rate Dial, red light, PASS' }, { id: 'take', start: 5.75, end: 7.5, readAt: 6.8, action: 'green light, TAKE' },
  { id: 'claim', start: 7.5, end: 9, readAt: 8.4, action: 'IN ONE SECOND., street lights streaking' }, { id: 'rules', start: 9, end: 11, readAt: 10, action: 'ride items, phone locked' },
  { id: 'headline', start: 11, end: 13.5, readAt: 12.8, action: 'headline from the driver seat' }, { id: 'logo', start: 13.5, end: 16, readAt: 15.5, action: 'logo over the map' },
];
const MARKS = [0, TL.ping, ...TL.words, TL.melt, TL.drop, TL.pass, TL.take, ...TL.claim, TL.rules, TL.lock, TL.head, TL.logo];

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

  // ── the reel. 120 BPM: a pulse that builds, a drop at 4 s, a hit on every morph.
  for (let t = 0; t < TL.drop - .01; t += .5) kick(t, t < TL.words[0] ? .45 : .7);
  bell(.02, 880, .2);
  for (let t = .25; t < TL.ping; t += .5) tick(t, 1, .12);
  whoosh(TL.ping - .1, .3, true, .22); bell(TL.ping, 1318.5, .3); bell(TL.ping + .09, 1760, .25);
  for (let q = TL.ping + .2; q < TL.ping + .7; q += .035) tick(q, (q * 40 | 0) % 2, .1);
  TL.words.forEach((w, i) => { kick(w, 1); clap(w, .42); const n = gain(fx); env(n, w, .001, .35, .18); noise(w, .2, filt('highpass', 2500, .7, n)); });
  RAIN.forEach((d, i) => { if (i % 3 === 0 && d.t0 < TL.drop - .1) blip(d.t0, 600 + (i * 53) % 700, .05); });
  { const g = gain(fx); g.gain.setValueAtTime(0, TL.melt); g.gain.linearRampToValueAtTime(.45, TL.drop - .02); g.gain.linearRampToValueAtTime(0, TL.drop);
    const b = filt('bandpass', 250, 2, g); b.frequency.setValueAtTime(250, TL.melt); b.frequency.exponentialRampToValueAtTime(7500, TL.drop); noise(TL.melt, 1, b);
    const s = gain(bassB); s.gain.setValueAtTime(0, TL.melt); s.gain.linearRampToValueAtTime(.5, TL.drop - .05); s.gain.linearRampToValueAtTime(0, TL.drop);
    const o = osc('sawtooth', 55, TL.melt, 1, filt('lowpass', 400, 2, s)); o.frequency.exponentialRampToValueAtTime(110, TL.drop); }
  hit(TL.drop); whoosh(TL.drop, .4, false, .25);
  // the groove under the dial, the claim, the rules and the headline
  const CH = [[110, [220, 261.63, 329.63]], [87.31, [174.61, 220, 261.63]], [130.81, [261.63, 329.63, 392]], [98, [196, 246.94, 293.66]], [110, [220, 261.63, 329.63]]];
  CH.forEach(([root, notes], b) => {
    const t0 = TL.drop + b * 2; pad(t0, Math.min(2, TL.logo - t0), notes, .8);
    for (let k = 0; k < 4 && t0 + k * .5 < TL.logo - .01; k++) {
      const tb = t0 + k * .5; if (b || k) kick(tb, .85); hat(tb + .25, .18); if (k === 1 || k === 3) clap(tb, .3);
      bass(tb, root, .2, .65); bass(tb + .25, k === 3 ? root * 2 : root, .18, .45);
    }
  });
  whoosh(TL.swing1[0], TL.swing1[1] - TL.swing1[0], true, .2);
  { const r = rng(77); for (let q = TL.pass; q < TL.pass + .3; q += .03) blip(q, 200 + r() * 1400, .12);
    const g = gain(drums); env(g, TL.pass, .002, .9, .4); const o = osc('sine', 120, TL.pass, .45, g); o.frequency.exponentialRampToValueAtTime(48, TL.pass + .2); }
  whoosh(TL.reset[0], .2, false, .14); whoosh(TL.swing2[0], TL.swing2[1] - TL.swing2[0], true, .22);
  bell(TL.take, 1046.5, .5); bell(TL.take + .1, 1567.98, .45);
  TL.claim.forEach(c => { kick(c, 1); clap(c, .4); whoosh(c - .15, .2, true, .16); });
  L.reel.rules.forEach((_, k) => pluck(TL.rules + .15 + k * .22, [440, 523.25, 659.25, 783.99, 880][k], .4));
  whoosh(TL.lock - .12, .25, false, .2); tick(TL.lock + .05, 0, .5);
  { const g = gain(drums); env(g, TL.lock + .05, .002, .6, .3); osc('sine', 90, TL.lock + .05, .35, g); }
  for (let k = 0; k < 6; k++) { const t = TL.head + k * .12; clap(t, .16); blip(t, [523, 587, 659, 698, 784, 880][k], .05); }
  // the logo: a resolved chord and one bell as the needle lands
  whoosh(TL.logo - .1, .4, false, .2);
  pad(TL.logo, DURATION - TL.logo, [130.81, 196, 329.63, 493.88, 587.33], .9);
  bass(TL.logo, 65.41, DURATION - TL.logo - .3, .5);
  bell(TL.logo + .95, 523.25, .5); bell(TL.logo + 1.05, 783.99, .32);
  // v2: the car. An engine under the cockpit shots, climbing as the green light lets it go
  for (const [a, b] of COCKPIT) {
    const g = gain(bassB); g.gain.setValueAtTime(0, a); g.gain.linearRampToValueAtTime(.28, a + .2); g.gain.setValueAtTime(.28, b - .2); g.gain.linearRampToValueAtTime(0, b);
    const lp = filt('lowpass', 320, 2, g);
    for (const m of [1, 1.5]) { const o = osc('sawtooth', 42 * m, a, b - a, lp);
      if (a < TL.take && b > TL.take) { o.frequency.setValueAtTime(42 * m, TL.take); o.frequency.linearRampToValueAtTime(78 * m, 7.5); o.frequency.setValueAtTime(78 * m, 8.9); } }
  }
  // the light changes: a soft relay click on red, on green
  tick(TL.swing1[0] - .2, 0, .3); tick(TL.take - .02, 1, .35);
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

// the shader layers render first (async, frame-exact), then the 2D frame is drawn over them
const seekFrame = seek;
async function seekAsync(t) { t = clamp(t, 0, DURATION); await gpuFrame(t); seekFrame(t); }
window.__film = { duration: DURATION, ready: false, seek: seekAsync, shots: SHOTS, marks: MARKS,
  wav: async () => wavB64(await renderMix(48000)) };
const SAMPLE = 'Aa$0÷×−…·' + (LANG === 'ar' ? 'عربي؟' : LANG === 'zh' ? '中文，' : '');
Promise.all([F.head(100, 800), F.head(100, 700), F.sans(40, 400), F.sans(40, 500), F.sans(40, 600), F.mono(40, 500), F.mono(40, 600)]
  .map(f => document.fonts.load(f, SAMPLE))).then(gpuInit).then(async () => {
    for (const t of [0, 1.5, 2.7, 3.6, 4.6, 6.4, 8.2, 10.7, 12.2, 15]) await seekAsync(t);   // warm glyph caches and every shader pipeline
    window.__film.ready = true;
  }).catch(e => { console.error(e); window.__filmError = String(e && e.stack || e); });

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
  if (window.__film.ready && !window.__busy) { window.__busy = true; seekAsync(Math.max(0, t)).finally(() => { window.__busy = false; }); }
  requestAnimationFrame(frame);
}
if (FIXED !== null || CAPTURE) startEl.remove();
if (!CAPTURE) requestAnimationFrame(frame);
