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
