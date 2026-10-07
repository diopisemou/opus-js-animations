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
  // holds its first frame before it starts and its last after (clips end on the last word; reversed frames would mouth silence)
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
