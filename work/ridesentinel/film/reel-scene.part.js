// ════ SCENE ("the 16-second reel") ═════════════════════════════════════════
// A dot is pinged by an offer, swells into a panic of numbers, melts into liquid metal, snaps into the Rate Dial:
// PASS, TAKE. Then the claim, the rules, the headline, the logo. Shader layers (shaders, WebGPU) sit under crisp 2D.
const R = L.reel;
const TL = {
  ping: 1.0, words: [2.0, 2.33, 2.66], melt: 3.0, drop: 4.0, swing1: [4.45, 4.95], pass: 5.0, reset: [5.55, 5.75], swing2: [5.75, 6.2], take: 6.25,
  claim: [7.5, 7.9], rules: 9.0, lock: 10.5, head: 11.0, logo: 13.5, fadeOut: [15.75, 16],
};
const CX = 520, CY = 960, DIAL = { x: 520, y: 1020, r: 300 };
const envl = (t, a, b, c, d) => Math.min(smooth((t - a) / (b - a)), 1 - smooth((t - c) / (d - c)));
const shakeAt = (t, t0, amp, decay = 9) => t > t0 ? amp * Math.exp(-(t - t0) * decay) * Math.sin((t - t0) * 70) : 0;

// ─── the shader layers: one small WebGPU renderer per effect ────────────────
// Each renderer only draws when its layer is visible, and always advances its clock by exactly (t − its last t), so a
// layer at time t is the same whatever path the export took. Opacity and blending happen in 2D.
const GPU_LAYERS = [
  ['mesh', { type: 'MeshGradient', props: { stops: [{ color: '#0C1220', position: 0 }, { color: '#1B2538', position: .3 }, { color: '#F5B041', position: .58 },
    { color: '#2ED3B7', position: .8 }, { color: '#0C1220', position: 1 }], speed: .6, swirl: .45, variation: .4 } }],
  ['aur', { type: 'Aurora', props: { colorA: '#F5B041', colorB: '#2ED3B7', colorC: '#28344E', intensity: 70, speed: 4, center: { x: .5, y: 0 } } }],
  ['rays', { type: 'Godrays', props: { center: { x: .5, y: -.08 }, rayColor: '#F5B041', intensity: .55, density: .35, speed: .4, backgroundColor: 'transparent' } }],
  ['sun', { type: 'SunBurst', props: { color: '#2ED3B7', background: 'transparent', center: { x: .48, y: .53 }, rayCount: 16, radius: .9, speed: .25 } }],
  ['lm', { type: 'LiquidMetal', props: { lightColor: '#F5B041', darkColor: '#0C1220', scale: .01, center: { x: .5, y: .47 }, speed: .8, turbulence: 1.2 } }],
  ['flare', { type: 'LensFlare', props: { lightPosition: { x: .48, y: .45 }, intensity: .5 } }],
];
const BLEND = { flare: 'screen' };
function gpuState(t) {
  const lmGrow = easeBack((t - TL.melt) / .35, 1.6), lmGone = easeIn((t - (TL.drop - .05)) / .13);
  return {
    rays: t < 2 ? .4 * smooth(t / .4) : t < 4 ? .18 : .85 * envl(t, 7.45, 7.7, 8.85, 9.05) + .45 * envl(t, 10.9, 11.2, 13.3, 13.55),
    lm: envl(t, TL.melt - .02, TL.melt + .02, TL.drop + .03, TL.drop + .1),
    lmScale: Math.max(.001, (.55 * lmGrow + .025 * Math.sin(t * 9)) * (1 - lmGone)),
    mesh: envl(t, TL.drop - .02, TL.drop + .15, 7.4, 7.6) + envl(t, 13.4, 13.7, 99, 100),
    aur: envl(t, 8.9, 9.3, 13.35, 13.7),
    sun: .9 * envl(t, TL.take - .05, TL.take + .2, 7.2, 7.5),
    flare: .6 * envl(t, TL.drop - .02, TL.drop + .03, TL.drop + .2, TL.drop + .45) + envl(t, TL.take - .03, TL.take + .05, TL.take + .35, TL.take + .8),
  };
}
const GPU = {}, GPU_IMG = {};
let GPU_OP = {};
async function gpuInit() {
  for (const [id, comp] of GPU_LAYERS) {
    const g = document.createElement('canvas'); g.width = 720; g.height = 1280;   // soft light and metal under 2× type
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
    GPU_OP[id] = o;
    if (id === 'lm') { GPU.lm.set('lm', 'scale', s.lmScale); await GPU.lm.step(t); }   // a changed prop lands one frame late: flush it
    GPU_IMG[id] = await GPU[id].at(t);
  }
}

// ─── type helpers: squash-and-stretch entrances, fitted to a width ───────────
function fitFont(word, maxW, maxPx, weight = 800) {
  ctx.font = F.head(100, weight); const w = ctx.measureText(word).width;
  return F.head(Math.min(maxPx, 100 * maxW / w), weight);
}
function squashWord(word, x, y, font, color, t0, t, o = {}) {
  const u = (t - t0) / (o.dur || .2); if (u < 0) return;
  const s = easeBack(u, 2.2), sx = lerp(.35, 1, s), sy = lerp(1.9, 1, s), split = 16 * (1 - clamp(u * 1.4));
  ctx.save(); ctx.translate(x, y); ctx.scale(sx * (o.k || 1), sy * (o.k || 1)); ctx.globalAlpha *= clamp(u * 4) * (o.alpha ?? 1);
  ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '0px';
  if (split > .3) {                                            // an RGB split on the way in
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,92,108,.8)'; ctx.fillText(word, -split, 0);
    ctx.fillStyle = 'rgba(46,211,183,.8)'; ctx.fillText(word, split, 0);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.fillStyle = color; ctx.fillText(word, 0, 0);
  ctx.restore();
}
// a slot-machine odometer: every column rolls with its own continuous value
function odometer(value, decimals, x, y, font, color, align = 'left', prefix = '$', digits = 2) {
  const cents = Math.max(0, value) * Math.pow(10, decimals), str = Math.max(1, digits);   // fixed columns: no width jumps
  ctx.save(); ctx.font = font; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.letterSpacing = '0px'; ctx.fillStyle = color;
  const dw = Math.max(...'0123456789'.split('').map(d => ctx.measureText(d).width)), pw = ctx.measureText(prefix).width, dotw = ctx.measureText('.').width;
  const cols = str + decimals, total = pw + cols * dw + (decimals ? dotw : 0), h = parseFloat(font.match(/([\d.]+)px/)[1]);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.fillText(prefix, cx, y); cx += pw;
  ctx.save(); ctx.beginPath(); ctx.rect(cx - 4, y - h * .55, total, h * 1.1); ctx.clip();
  for (let c = 0; c < cols; c++) {
    if (c === str) { ctx.fillText('.', cx, y); cx += dotw; }
    // like a real odometer: a column only turns while every column below it rolls over
    const p = cols - 1 - c, P = Math.pow(10, p), d = Math.floor(cents / P) % 10, f = smooth(clamp((cents % P) - (P - 1)));
    ctx.textAlign = 'center';                                   // tabular: every digit centred in an equal column
    ctx.fillText(String(d), cx + dw / 2, y - f * h); ctx.fillText(String((d + 1) % 10), cx + dw / 2, y + (1 - f) * h);
    ctx.textAlign = 'left'; cx += dw;
  }
  ctx.restore(); ctx.restore();
}

// ─── beats ─────────────────────────────────────────────────────────────────
function drawDotAndPill(t) {
  if (t > 2.2) return;
  const m = easeBack((t - TL.ping) / .3, 1.4), out = smooth((t - 2.0) / .15);
  // radar rings round the dot
  if (t < 1.4) for (let k = 0; k < 3; k++) {
    const p = frac(t * 1.1 + k / 3), a = (1 - p) * .55 * (1 - smooth((t - 1.0) / .3));
    ctx.strokeStyle = rgba(RGB.amber, a); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(CX, CY, 30 + p * 300, 0, TAU); ctx.stroke();
  }
  const w = lerp(52, 780, m), h = lerp(52, 176, m) * (1 - out), r = Math.min(h, w) / 2;
  if (h < 1) return;
  ctx.save(); ctx.shadowColor = rgba(RGB.amber, .55); ctx.shadowBlur = 50 * (1 - m * .5);
  ctx.fillStyle = m < .05 ? C.amber : rgba(mix(RGB.amber, hex('#131B2C'), clamp(m * 3))); ctx.beginPath(); ctx.roundRect(CX - w / 2, CY - h / 2, w, h, r); ctx.fill(); ctx.restore();
  if (m > .3) { ctx.strokeStyle = rgba(RGB.amber, .75); ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(CX - w / 2, CY - h / 2, w, h, r); ctx.stroke(); }
  const ca = smooth((t - TL.ping - .15) / .2) * (1 - out);
  if (ca > 0) {
    ctx.save(); ctx.globalAlpha *= ca;
    text(R.offer, CX - 320, CY - 44, F.mono(28, 600), C.muted, { align: 'left', ls: 4 });
    ctx.fillStyle = C.teal; ctx.beginPath(); ctx.arc(CX - 336, CY - 44, 0, 0, TAU); ctx.fill();
    odometer(R.fare * easeOut((t - TL.ping - .2) / .5), 2, CX - 322, CY + 26, F.head(112), C.ink);
    const rem = 1 - clamp((t - TL.ping - .2) / 2.2);
    ctx.lineCap = 'round'; ctx.lineWidth = 9; ctx.strokeStyle = C.line; ctx.beginPath(); ctx.arc(CX + 300, CY, 46, 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgba(mix(RGB.amber, RGB.rose, 1 - rem)); ctx.beginPath(); ctx.arc(CX + 300, CY, 46, -PI / 2, -PI / 2 + TAU * rem); ctx.stroke();
    ctx.restore();
  }
}
const RAIN = table(46, 404, (r, i) => ({ x: 90 + r() * 860, t0: 2.3 + r() * 1.2, v: 700 + r() * 600, s: 30 + r() * 34, rot: (r() - .5) * .6,
  txt: ['18.40', '÷ 38', '× 60', '$29?', '7 min', '22.4 km', '?', '$/km', '−empty', '$40??'][i % 10], col: ['ink', 'amber', 'rose', 'muted'][i % 4] }));
function drawPanic(t) {
  if (t < TL.words[0] || t > TL.drop + .05) return;
  const pull = easeIn((t - TL.melt) / .55), target = { x: CX, y: CY - 30 };
  // the rain
  for (const d of RAIN) {
    const u = t - d.t0; if (u < 0) continue;
    let x = d.x, y = -60 + u * d.v + 300 * u * u, sc = 1, a = clamp(u * 6);
    if (pull > 0) { x = lerp(x, target.x, pull); y = lerp(Math.min(y, 1800), target.y, pull); sc = 1 - pull * .9; a *= 1 - smooth((pull - .7) / .3); }
    if (y > 1900 || a <= .01) continue;
    ctx.save(); ctx.translate(x, y); ctx.rotate(d.rot); ctx.scale(sc, sc); ctx.globalAlpha *= a * .9;
    text(d.txt, 0, 0, F.mono(d.s, 600), C[d.col]); ctx.restore();
  }
  // DO / THE / MATHS?
  const Y = [690, 990, 1320], out = easeIn((t - TL.melt) / .35);
  R.words.forEach((w, i) => {
    const font = fitFont(w, i === 2 ? 920 : 760, i === 2 ? 330 : 380), col = i === 2 ? C.amber : C.ink;
    const y = lerp(Y[i], target.y, out), k = 1 - out * .95;
    squashWord(w, CX, y, font, col, TL.words[i], t, { k, alpha: 1 - smooth((out - .6) / .4) });
  });
}
const angleOf = v => PI + clamp(v / 80, 0, 1.06) * PI;
function dialValue(t) {
  const sw = (a, b, from, to) => lerp(from, to, easeBack((t - a) / (b - a), 1.3));
  if (t < TL.swing1[0]) return 0;
  if (t < TL.reset[0]) return sw(...TL.swing1, 0, 23);
  if (t < TL.reset[1]) return lerp(23, 0, easeIO((t - TL.reset[0]) / (TL.reset[1] - TL.reset[0])));
  return sw(...TL.swing2, 0, 52);
}
function drawDial(t) {
  if (t < TL.drop || t > 7.65) return;
  const draw = easeOut((t - TL.drop) / .45), out = easeIn((t - 7.4) / .25), D = DIAL;
  const verdict = t >= TL.take ? 'take' : t >= TL.pass && t < TL.reset[0] + .05 ? 'pass' : null;
  const col = verdict === 'take' ? RGB.teal : verdict === 'pass' ? RGB.rose : RGB.amber;
  ctx.save(); ctx.translate(D.x, D.y); ctx.scale(1 - out, 1 - out); ctx.translate(-D.x, -D.y);
  // a dark disc so the dial reads over the gradient
  const bg = ctx.createRadialGradient(D.x, D.y + 60, 0, D.x, D.y + 60, D.r + 380); bg.addColorStop(0, 'rgba(6,9,15,.82)'); bg.addColorStop(1, 'rgba(6,9,15,0)');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.lineCap = 'round';
  ctx.strokeStyle = C.line; ctx.lineWidth = 50; ctx.beginPath(); ctx.arc(D.x, D.y, D.r, PI, PI + PI * draw); ctx.stroke();
  ctx.strokeStyle = 'rgba(166,176,195,.4)'; ctx.lineWidth = 4;
  for (let v = 0; v <= 80; v += 10) { if (v / 80 > draw) break; const a = angleOf(v);
    ctx.beginPath(); ctx.moveTo(D.x + Math.cos(a) * (D.r - 52), D.y + Math.sin(a) * (D.r - 52)); ctx.lineTo(D.x + Math.cos(a) * (D.r - 74), D.y + Math.sin(a) * (D.r - 74)); ctx.stroke(); }
  const bk = smooth((t - TL.drop - .35) / .2);
  if (bk > 0) {
    ctx.save(); ctx.globalAlpha *= bk; ctx.strokeStyle = C.amber; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(D.x, D.y - D.r - 40); ctx.lineTo(D.x, D.y - D.r - 76); ctx.stroke();
    text(R.bar, D.x, D.y - D.r - 112, F.mono(30, 600), C.amber, { ls: 5 }); ctx.restore();
  }
  const v = dialValue(t), a = angleOf(v);
  if (v > .2) { ctx.save(); ctx.shadowColor = rgba(col, .7); ctx.shadowBlur = 40; ctx.strokeStyle = rgba(col); ctx.lineWidth = 50;
    ctx.beginPath(); ctx.arc(D.x, D.y, D.r, PI, a); ctx.stroke(); ctx.restore(); }
  if (draw > .6) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(D.x - Math.cos(a) * 26, D.y - Math.sin(a) * 26);
    ctx.lineTo(D.x + Math.cos(a) * (D.r - 80), D.y + Math.sin(a) * (D.r - 80)); ctx.stroke();
    ctx.fillStyle = '#06090F'; ctx.beginPath(); ctx.arc(D.x, D.y, 40, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(col); ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(D.x, D.y, 34, 0, TAU); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(D.x, D.y, 14, 0, TAU); ctx.fill();
    ctx.save(); ctx.globalAlpha *= smooth((t - TL.swing1[0]) / .15);
    odometer(Math.max(0, v), 0, D.x + 30, D.y + 112, F.head(110), rgba(mix(RGB.ink, col, verdict ? 1 : 0)), 'right', '$', 2);
    text(R.perHr, D.x + 40, D.y + 122, F.mono(44, 600), C.muted, { align: 'left' });
    ctx.restore();
  }
  if (verdict) {
    const t0 = verdict === 'take' ? TL.take : TL.pass, u = (t - t0) / .3, s = lerp(1.9, 1, easeBack(u, 2.4));
    const word = verdict === 'take' ? R.take : R.pass_, wa = verdict === 'pass' ? 1 - smooth((t - TL.reset[0] + .05) / .15) : 1;
    ctx.save(); ctx.translate(D.x, D.y + 300); ctx.scale(s, s); ctx.globalAlpha *= clamp(u * 4) * wa;
    text(word, 0, 0, F.head(250), rgba(col), { ls: 20, glow: [rgba(col, .8), 50] }); ctx.restore();
    const pu = (t - t0) / .6;
    if (pu < 1) { ctx.strokeStyle = rgba(col, .6 * (1 - pu)); ctx.lineWidth = 10 * (1 - pu) + 2; ctx.beginPath(); ctx.arc(D.x, D.y, D.r + 40 + easeOut(pu) * 320, PI, TAU); ctx.stroke(); }
  }
  ctx.restore();
}
function drawClaim(t) {
  if (t < TL.claim[0] || t > 9.1) return;
  const out = easeIn((t - 8.85) / .22);
  ctx.save(); ctx.translate(0, -out * 300); ctx.globalAlpha *= 1 - out;
  squashWord(R.claim[0], CX, 840, fitFont(R.claim[0], 820, 250), C.ink, TL.claim[0], t);
  squashWord(R.claim[1], CX, 1110, fitFont(R.claim[1], 900, 300), C.amber, TL.claim[1], t);
  ctx.restore();
}
function drawLock(x, y, s, col) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineCap = 'round';
  ctx.strokeStyle = col; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(0, -30, 46, PI, TAU); ctx.lineTo(46, 0); ctx.moveTo(-46, 0); ctx.lineTo(-46, -30); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(-70, -6, 140, 104, 18); ctx.fill();
  ctx.fillStyle = '#06090F'; ctx.beginPath(); ctx.arc(0, 36, 13, 0, TAU); ctx.fill(); ctx.fillRect(-5, 40, 10, 30);
  ctx.restore();
}
function drawRules(t) {
  if (t < TL.rules || t > 11.15) return;
  const gather = easeIn((t - (TL.lock - .1)) / .3), out = easeIn((t - 10.95) / .18);
  ctx.save(); ctx.globalAlpha *= 1 - out;
  text(R.rulesTitle, CX, 700, F.mono(36, 600), C.amber, { ls: 8, alpha: smooth((t - TL.rules) / .2) * (1 - gather) });
  const rows = [R.rules.slice(0, 3), R.rules.slice(3)], font = F.head(76, 700);
  ctx.font = font; ctx.letterSpacing = '0px';
  let k = 0;
  rows.forEach((row, ri) => {
    const ws = row.map(s => ctx.measureText(s).width + 76), tot = ws.reduce((a, b) => a + b, 0) + (row.length - 1) * 24;
    let x = CX - tot / 2;
    row.forEach((s, i) => {
      const t0 = TL.rules + .15 + k * .22, u = easeBack((t - t0) / .3, 2), cx = x + ws[i] / 2, cy = 880 + ri * 150, c = k % 2 ? RGB.teal : RGB.amber;
      const px = lerp(cx, CX, gather), py = lerp(cy, 920, gather), sc = u * (1 - gather * .9);
      if (u > 0 && sc > .02) {
        ctx.save(); ctx.translate(px, py); ctx.scale(sc, sc);
        ctx.fillStyle = 'rgba(19,27,44,.92)'; ctx.beginPath(); ctx.roundRect(-ws[i] / 2, -58, ws[i], 116, 58); ctx.fill();
        ctx.strokeStyle = rgba(c, .9); ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-ws[i] / 2, -58, ws[i], 116, 58); ctx.stroke();
        text(s, 0, 4, font, C.ink); ctx.restore();
      }
      x += ws[i] + 24; k++;
    });
  });
  const lk = easeBack((t - TL.lock - .05) / .3, 2.2);
  if (lk > 0) {
    drawLock(CX, 880, lk * 1.3, C.amber);
    squashWord(R.lock, CX, 1130, fitFont(R.lock, 860, 180), C.ink, TL.lock + .1, t);
    text(R.lockSub, CX, 1260, F.sans(44, 500), C.muted, { alpha: smooth((t - TL.lock - .25) / .2) });
  }
  ctx.restore();
}
function drawHeadline(t) {
  if (t < TL.head || t > TL.logo + .1) return;
  const out = easeIn((t - (TL.logo - .15)) / .22);
  ctx.save(); ctx.translate(CX, 1000); ctx.scale(1 - out, 1 - out * .5); ctx.translate(-CX, -1000); ctx.globalAlpha *= 1 - out;
  let k = 0;
  R.head.forEach((line, li) => {
    const font = F.head(200); ctx.font = font; ctx.letterSpacing = '0px';
    const gap = 46, ws = line.map(([w]) => ctx.measureText(w).width), tot = ws.reduce((a, b) => a + b, 0) + gap * (line.length - 1);
    const fit = Math.min(1, 900 / tot);
    let x = CX - tot * fit / 2;
    line.forEach(([w, c], i) => {
      squashWord(w, x + ws[i] * fit / 2, 780 + li * 215, F.head(200 * fit), C[c] || C.ink, TL.head + k * .12, t);
      x += (ws[i] + gap) * fit; k++;
    });
  });
  ctx.restore();
}
function drawLogo(t) {
  if (t < TL.logo) return;
  const x = CX, y = 760, size = 300, s = size / 64, k = smooth((t - TL.logo) / .25);
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
  const sc = ctx.createRadialGradient(CX, 1050, 0, CX, 1050, 640), sk = smooth((t - TL.logo - .5) / .5);   // a dark bed so the type reads on the gradient
  sc.addColorStop(0, `rgba(6,9,15,${.72 * sk})`); sc.addColorStop(1, 'rgba(6,9,15,0)'); ctx.fillStyle = sc; ctx.fillRect(0, 300, W, 1500);
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
function glitch(t) {                                           // horizontal slices of the finished frame, shifted (PASS)
  const k = envl(t, TL.pass - .01, TL.pass + .02, TL.pass + .22, TL.pass + .32); if (k <= 0) return;
  glbRaw.clearRect(0, 0, GLB.width, GLB.height); glbRaw.drawImage(cv, 0, 0);
  const r = rng(Math.floor(t * 30) * 13 + 5);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < 9; i++) {
    const y = Math.floor(r() * H), h = 20 + Math.floor(r() * 90), dx = (r() - .5) * 120 * k;
    ctx.drawImage(GLB, 0, y * SS, W * SS, h * SS, dx, y, W, h);
  }
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .18 * k; ctx.fillStyle = C.rose; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
function drawScene(t) {
  ctx.fillStyle = '#06090F'; ctx.fillRect(0, 0, W, H);
  // the shader layer: an iris opens it at the drop
  const iris = (t - TL.drop) / .4;
  for (const [id] of GPU_LAYERS) {
    if (!GPU_IMG[id]) continue;
    ctx.save(); ctx.globalAlpha = GPU_OP[id]; ctx.globalCompositeOperation = BLEND[id] || 'source-over';
    if (id === 'mesh' && iris > 0 && iris < 1) { ctx.beginPath(); ctx.arc(CX, DIAL.y, 40 + easeOut(iris) * 1400, 0, TAU); ctx.clip(); }
    ctx.drawImage(GPU_IMG[id], 0, 0, W, H);
    ctx.restore();
  }
  const rose = envl(t, TL.pass, TL.pass + .06, TL.reset[0] - .1, TL.reset[0] + .1);
  if (rose > 0) { ctx.fillStyle = rgba(RGB.rose, .22 * rose); ctx.fillRect(0, 0, W, H); }
  const sh = shakeAt(t, TL.drop, 22) + TL.words.reduce((a, w) => a + shakeAt(t, w, 9, 14), 0) + shakeAt(t, TL.claim[1], 10);
  const punch = 1 + .06 * Math.exp(-Math.max(0, t - TL.drop) * 8) * (t > TL.drop);
  ctx.save(); ctx.translate(CX, CY); ctx.scale(punch, punch); ctx.translate(-CX + sh * .6, -CY + sh);
  drawDotAndPill(t); drawPanic(t); drawDial(t); drawClaim(t); drawRules(t); drawHeadline(t);
  ctx.restore();
  drawLogo(t);
  drawHud(t);
  glitch(t);
}
const SHOTS = [
  { id: 'dot', start: 0, end: 1, readAt: .5, action: 'amber dot, radar' }, { id: 'offer', start: 1, end: 2, readAt: 1.7, action: 'pill + odometer' },
  { id: 'panic', start: 2, end: 3, readAt: 2.9, action: 'DO THE MATHS?' }, { id: 'melt', start: 3, end: 4, readAt: 3.6, action: 'liquid metal' },
  { id: 'pass', start: 4, end: 5.75, readAt: 5.2, action: 'dial, PASS' }, { id: 'take', start: 5.75, end: 7.5, readAt: 6.8, action: 'TAKE, sunburst' },
  { id: 'claim', start: 7.5, end: 9, readAt: 8.4, action: 'IN ONE SECOND.' }, { id: 'rules', start: 9, end: 11, readAt: 10, action: 'rules, ON-DEVICE' },
  { id: 'headline', start: 11, end: 13.5, readAt: 12.8, action: 'Stop doing maths at the wheel.' }, { id: 'logo', start: 13.5, end: 16, readAt: 15.5, action: 'logo, URL' },
];
const MARKS = [0, TL.ping, ...TL.words, TL.melt, TL.drop, TL.pass, TL.take, ...TL.claim, TL.rules, TL.lock, TL.head, TL.logo];
