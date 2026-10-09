// ════ SCENE ("Pass or Take?": the daily episode) ═══════════════════════════
// One example offer per episode, worked out on screen: the offer card, the real time it costs (pickup + trip + drive back),
// the trip-only rate crossed out, the real rate on the Rate Dial against the driver's bar, the verdict, one lesson, the end card.
// The numbers come from window.EP (computed by daily/daily.py, never typed by hand); the beats follow the voice (window.POT_ALIGN).
const EP = window.EP;
const LB = {
  en: { q: ['PASS', 'or', 'TAKE?'], pickup: 'Pickup', trip: 'Trip', back: 'Drive back', total: 'Total', bar: 'Your bar', tripOnly: 'Trip only',
        real: 'Real rate', example: 'Example offer', ai: 'AI voice', offer: 'New offer', min: 'min', km: 'km' },
  fr: { q: ['PASSER', 'ou', 'PRENDRE ?'], pickup: 'Approche', trip: 'Course', back: 'Retour à vide', total: 'Total', bar: 'Votre seuil',
        tripOnly: 'Course seule', real: 'Taux réel', example: 'Offre d’exemple', ai: 'Voix IA', offer: 'Nouvelle offre', min: 'min', km: 'km' },
}[LANG] || {};
const money = v => LANG === 'fr' ? `${v.toFixed(2).replace('.', ',')} $` : `$${v.toFixed(2)}`;
const rate = v => LANG === 'fr' ? `${Math.round(v)} $/h` : `$${Math.round(v)}/h`;
const num = v => LANG === 'fr' ? String(v).replace('.', ',') : String(v);

const tokenize = s => s.split(/\s+/).filter(Boolean);
function spread(toks, t0, t1) {
  const tot = toks.reduce((a, w) => a + w.length, 0) || 1; let x = t0;
  return toks.map(w => { const d = (t1 - t0) * w.length / tot, o = { w, t0: x, t1: x + d * .94 }; x += d; return o; });
}
const ALIGN = (() => {
  const A = window.POT_ALIGN;
  if (A) { A.lines.forEach(l => { if (!l.words || !l.words.length) l.words = spread(tokenize(l.text), l.t0, l.t1); }); return A; }
  let t = .3;                                                   // no voice yet: estimate, so the film can be previewed
  return { lines: EP.lines.map(s => { const d = Math.max(1.2, s.length / 15), o = { text: s, t0: t, t1: t + d, words: spread(tokenize(s), t, t + d) }; t += d + .35; return o; }), env: null, rate: 100 };
})();
const LN = ALIGN.lines, NL = LN.length;                         // hook, offer, math, verdict, lesson, cta
const dl = i => LN[i].t1 - LN[i].t0;
const wordAt = (i, re, fb = .5) => { const w = LN[i].words.find(w => re.test(w.w)); return w ? w.t0 : LN[i].t0 + fb * dl(i); };
const O = EP.offer, K = EP.calc, VERDICT = K.verdict;            // 'PASS' | 'TAKE'
const VMAX = Math.max(60, Math.ceil(Math.max(K.trip_only_per_hour, EP.bar, K.per_hour) * 1.25 / 10) * 10);
const CX = 540;
const SCR = { x: 0, y: 0, w: 592, h: 1472, r: 0 };              // the shared map bake reads SCR
const TL = (() => {
  const verdictT = wordAt(3, /^(pass|take|passez|prenez|passer|prendre)/i, .75);
  const end = LN[NL - 1].t0 - .1;
  return {
    q: LN[0].words.length ? [0, 1, 2].map(k => (LN[0].words[Math.min(k, LN[0].words.length - 1)].t0)) : [.3, .6, .9],
    card: LN[1].t0 - .05, math: LN[2].t0 - .05, dial: LN[3].t0 - .05, verdict: verdictT, lesson: Math.min(Math.max(LN[4].t0 - .05, verdictT + 1.5), end - 1.8), end,   // the verdict holds >= 1.5 s
    markArc: [end + .05, end + .6], markNeedle: [end + .45, end + .95], word: end + .75, line: end + 1.05, url: end + 1.3, cta: end + 1.5, fine: end + 1.7,
  };
})();
DURATION = Math.max(LN[NL - 1].t1 + 1.6, TL.end + 3.4);
TL.fadeOut = [DURATION - .45, DURATION];
const envl = (t, a, b, c, d) => Math.min(smooth((t - a) / (b - a)), 1 - smooth((t - c) / (d - c)));
const COLV = VERDICT === 'TAKE' ? RGB.teal : RGB.rose;
function lineAt(t) { let i = 0; while (i < NL - 1 && t >= LN[i + 1].t0 - .15) i++; return i; }

// ─── the night behind everything: a drifting street grid and soft city lights ─
function drawBackdrop(t) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0B1222'); g.addColorStop(1, '#05080F');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(540, 960); ctx.rotate(.21);
  const off = (t * 18) % 120;
  for (let i = -14; i <= 14; i++) {
    const main = i % 3 === 0, p = i * 120 + off;
    ctx.strokeStyle = main ? 'rgba(40,52,78,.55)' : 'rgba(40,52,78,.25)'; ctx.lineWidth = main ? 6 : 3;
    ctx.beginPath(); ctx.moveTo(-1400, p); ctx.lineTo(1400, p); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p * 1.1, -1400); ctx.lineTo(p * 1.1, 1400); ctx.stroke();
  }
  ctx.restore();
  for (const b of LIGHTS.slice(0, 22)) {
    const x = 540 + Math.cos(b.a) * 620 + Math.sin(t * b.sp * 6 + b.ph * TAU) * 30, y = 960 + Math.sin(b.a) * 1000;
    ctx.globalAlpha = b.al * .7; ctx.drawImage(TINTED[b.kind], x - b.s / 2, y - b.s / 2, b.s, b.s);
  }
  ctx.globalAlpha = 1;
}

// ─── beat 1: the question ────────────────────────────────────────────────
function drawQuestion(t) {
  const out = 1 - smooth((t - (TL.card + .1)) / .35);
  if (out <= 0) return;
  const ys = [560, 720, 880], cols = [C.rose, C.muted, C.teal], sizes = [210, 110, 210];
  LB.q.forEach((w, j) => {
    const t0 = TL.q[j]; if (t < t0) return;
    const u = (t - t0) / .22, sc = lerp(1.8, 1, easeBack(u, 2.2));
    ctx.save(); ctx.globalAlpha *= clamp(u * 2.5) * out; ctx.translate(540, ys[j] - (1 - out) * 120); ctx.scale(sc, sc);
    ctx.font = F.head(sizes[j], 800); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '4px';
    const mw = ctx.measureText(w).width; if (mw > 960) ctx.font = resize(F.head(sizes[j], 800), 960 / mw);
    ctx.lineJoin = 'round'; ctx.lineWidth = 18; ctx.strokeStyle = 'rgba(4,6,11,.9)'; ctx.strokeText(w, 0, 0);
    ctx.fillStyle = cols[j]; ctx.fillText(w, 0, 0); ctx.restore();
  });
  reveal(life(t, .15, 99), () => {
    const s = `${EP.setting.time} · ${EP.setting.place}`;
    ctx.save(); ctx.globalAlpha *= out; ctx.font = F.mono(34, 600); const w = ctx.measureText(s).width + 70;
    ctx.fillStyle = 'rgba(12,18,32,.85)'; ctx.beginPath(); ctx.roundRect(540 - w / 2, 300, w, 70, 35); ctx.fill();
    ctx.strokeStyle = 'rgba(245,176,65,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(540 - w / 2, 300, w, 70, 35); ctx.stroke(); ctx.restore();
    text(s, 540, 336, F.mono(34, 600), C.amber, { alpha: out });
  });
}

// ─── beat 2: the offer card ──────────────────────────────────────────────
function drawOfferCard(t) {
  if (t < TL.card) return;
  const inK = easeBack((t - TL.card) / .45, 1.4), up = easeIO((t - TL.math) / .6), fade = 1 - smooth((t - (TL.end - .3)) / .3);
  if (fade <= 0) return;
  const s = lerp(1, .78, up), y = lerp(560, 280, up), w = 900, h = 470, x = 540 - w / 2;
  ctx.save(); ctx.globalAlpha *= clamp((t - TL.card) * 4) * fade;
  ctx.translate(540, y + lerp(260, 0, inK)); ctx.scale(s, s); ctx.translate(-540, -y);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 50;
  ctx.fillStyle = C.surface; ctx.beginPath(); ctx.roundRect(x, y, w, h, 44); ctx.fill(); ctx.restore();
  const vk = smooth((t - TL.verdict) / .2);
  ctx.strokeStyle = rgba(mix(RGB.line, COLV, vk)); ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x, y, w, h, 44); ctx.stroke();
  text(LB.offer.toUpperCase(), x + 52, y + 60, F.mono(28, 600), C.muted, { align: 'left', ls: 4 });
  text(money(O.fare), x + 48, y + 150, F.head(150, 800), C.ink, { align: 'left' });
  // countdown ring: 15 s from the card's arrival, frozen at the verdict
  const rem = 15 - 13 * clamp((Math.min(t, TL.verdict) - TL.card) / Math.max(1, TL.verdict - TL.card)), rx = x + w - 110, ry = y + 130, rr = 54;
  ctx.lineCap = 'round'; ctx.lineWidth = 11;
  ctx.strokeStyle = C.line; ctx.beginPath(); ctx.arc(rx, ry, rr, 0, TAU); ctx.stroke();
  const rc = mix(RGB.amber, RGB.rose, smooth((10 - rem) / 8));
  ctx.strokeStyle = rgba(rc); ctx.beginPath(); ctx.arc(rx, ry, rr, -PI / 2, -PI / 2 + TAU * rem / 15); ctx.stroke();
  text(String(Math.ceil(rem - 1e-6)), rx, ry + 3, F.mono(44, 600), rgba(rc));
  const rows = [[C.amber, `${LB.pickup}`, `${num(O.pickup_min)} ${LB.min} · ${num(O.pickup_km)} ${LB.km}`],
                [C.ink, `${LB.trip}`, `${num(O.trip_min)} ${LB.min} · ${num(O.trip_km)} ${LB.km}`],
                [O.back_min > 0 ? C.rose : C.teal, O.drop_label, O.back_min > 0 ? `→ ${LB.back.toLowerCase()} ${num(O.back_min)} ${LB.min}` : '']];
  rows.forEach(([col, a, b], k) => {
    const yy = y + 270 + k * 62;
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + 62, yy, 10, 0, TAU); ctx.fill();
    text(a, x + 92, yy, F.sans(38, 600), C.ink, { align: 'left', maxW: 330 });
    if (b) text(b, x + w - 50, yy, F.mono(34, 500), k === 2 ? C.rose : C.muted, { align: 'right', maxW: 470 });
  });
  ctx.restore();
}

// ─── beat 3: what the offer really costs in time ──────────────────────────
function drawTimeStack(t) {
  const k = envl(t, TL.math + .2, TL.math + .6, TL.lesson - .3, TL.lesson);
  if (k <= 0) return;
  const segs = [[LB.pickup, O.pickup_min, RGB.amber], [LB.trip, O.trip_min, RGB.ink], ...(O.back_min > 0 ? [[LB.back, O.back_min, RGB.rose]] : [])];
  const tot = K.total_min, x0 = 90, wAll = 900, y = 740, h = 66;
  const grow = t0 => easeOut((t - t0) / .45);
  const span = Math.max(.6, (TL.dial - TL.math - .4)), step = span / (segs.length + 1);
  ctx.save(); ctx.globalAlpha *= k;
  let x = x0;
  segs.forEach(([lab, m, col], i) => {
    const g = grow(TL.math + .3 + i * step), w = wAll * m / tot * g;
    ctx.fillStyle = rgba(col, .92); ctx.beginPath(); ctx.roundRect(x, y, Math.max(0, w - 6), h, 14); ctx.fill();
    if (g > .5) {
      text(`${num(m)} ${LB.min}`, x + (wAll * m / tot) / 2, y + h / 2 + 2, F.mono(32, 600), i === 1 ? C.navy : C.navy, { alpha: smooth((g - .5) * 3), maxW: wAll * m / tot - 14 });
      text(lab, x + (wAll * m / tot) / 2, y - 34, F.sans(30, 600), rgba(col), { alpha: smooth((g - .5) * 3), maxW: Math.max(120, wAll * m / tot) });
    }
    x += wAll * m / tot;
  });
  const tk = smooth((t - (TL.math + .3 + segs.length * step)) / .3);
  if (tk > 0) {
    const s = `= ${num(tot)} ${LB.min}`;
    reveal({ p: tk, out: 1 }, () => text(s, 540, y + h + 64, F.head(100, 800), C.ink));
  }
  ctx.restore();
}

// ─── beat 4: the rate, the trap, the verdict ──────────────────────────────
const DIAL = { x: 540, y: 1340, r: 220 };
function drawRate(t) {
  const k = envl(t, TL.dial, TL.dial + .35, TL.lesson - .25, TL.lesson + .1);
  if (k <= 0) return;
  const D = DIAL, vk = smooth((t - TL.verdict) / .18);
  ctx.save(); ctx.globalAlpha *= k;
  // the trip-only rate, then crossed out
  const tr = smooth((t - TL.dial - .1) / .3), cross = easeOut((t - TL.dial - .9) / .35);
  if (tr > 0) {
    const s = `${LB.tripOnly}: ${rate(K.trip_only_per_hour)}`;
    text(s, 540, 965, F.head(56, 700), C.muted, { alpha: tr });
    if (cross > 0) { ctx.font = F.head(56, 700); const w = ctx.measureText(s).width; ctx.strokeStyle = C.rose; ctx.lineWidth = 8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(540 - w / 2 - 10, 968); ctx.lineTo(540 - w / 2 - 10 + (w + 20) * cross, 968); ctx.stroke(); }
  }
  // the dial
  ctx.lineCap = 'round'; ctx.strokeStyle = C.line; ctx.lineWidth = 46; ctx.beginPath(); ctx.arc(D.x, D.y, D.r, PI, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(166,176,195,.4)'; ctx.lineWidth = 4;
  for (let v = 0; v <= VMAX; v += 10) { const a = angleOf(v); ctx.beginPath(); ctx.moveTo(D.x + Math.cos(a) * (D.r - 40), D.y + Math.sin(a) * (D.r - 40)); ctx.lineTo(D.x + Math.cos(a) * (D.r - 58), D.y + Math.sin(a) * (D.r - 58)); ctx.stroke(); }
  const ab = angleOf(EP.bar);
  ctx.strokeStyle = C.amber; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(D.x + Math.cos(ab) * (D.r + 34), D.y + Math.sin(ab) * (D.r + 34)); ctx.lineTo(D.x + Math.cos(ab) * (D.r + 70), D.y + Math.sin(ab) * (D.r + 70)); ctx.stroke();
  text(`${LB.bar} ${rate(EP.bar)}`, D.x + Math.cos(ab) * (D.r + 120), D.y + Math.sin(ab) * (D.r + 110), F.mono(28, 600), C.amber, { maxW: 360 });
  const sw = easeBack((t - TL.dial - .5) / .9, 1.2), v = K.per_hour * clamp(sw, 0, 1.08), a = angleOf(v);
  const col = mix(RGB.amber, COLV, vk);
  if (v > .3) { ctx.save(); ctx.shadowColor = rgba(col, .6); ctx.shadowBlur = 30; ctx.strokeStyle = rgba(col); ctx.lineWidth = 46; ctx.beginPath(); ctx.arc(D.x, D.y, D.r, PI, a); ctx.stroke(); ctx.restore(); }
  ctx.strokeStyle = C.ink; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(D.x, D.y); ctx.lineTo(D.x + Math.cos(a) * (D.r - 70), D.y + Math.sin(a) * (D.r - 70)); ctx.stroke();
  ctx.fillStyle = '#0A0F1B'; ctx.beginPath(); ctx.arc(D.x, D.y, 32, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(col); ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(D.x, D.y, 28, 0, TAU); ctx.stroke();
  text(`${LB.real}`, D.x, D.y + 70, F.mono(28, 600), C.muted);
  text(rate(v), D.x, D.y + 135, F.head(90, 800), rgba(mix(RGB.ink, COLV, vk)));
  // the verdict stamp
  if (vk > 0) {
    const u = (t - TL.verdict) / .3, sc = lerp(1.8, 1, easeBack(u, 2.2)), word = VERDICT === 'TAKE' ? L.take : L.pass_;
    ctx.save(); ctx.globalAlpha *= clamp(u * 3); ctx.translate(D.x, D.y - 95); ctx.scale(sc, sc);
    ctx.font = F.head(150, 800); const sw2 = Math.min(560, ctx.measureText(word).width + 90);
    ctx.fillStyle = 'rgba(6,9,16,.88)'; ctx.beginPath(); ctx.roundRect(-sw2 / 2, -88, sw2, 176, 28); ctx.fill();
    ctx.strokeStyle = rgba(COLV, .9); ctx.lineWidth = 6; ctx.stroke();
    text(word, 0, 0, F.head(150, 800), VERDICT === 'TAKE' ? C.teal : C.rose, { ls: 12, glow: [rgba(COLV, .7), 40], maxW: 500 });
    ctx.restore();
    const pu = (t - TL.verdict) / .7;
    if (pu < 1) { ctx.strokeStyle = rgba(COLV, .5 * (1 - pu)); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(D.x, D.y, D.r + 30 + easeOut(pu) * 200, PI, TAU); ctx.stroke(); }
  }
  ctx.restore();
}

// ─── beat 5: the lesson ──────────────────────────────────────────────────
function drawLesson(t) {
  const k = envl(t, TL.lesson, TL.lesson + .3, TL.end - .3, TL.end);
  if (k <= 0) return;
  const words = tokenize(EP.lesson_text), rows = [[]]; let wsum = 0;
  ctx.save(); ctx.font = F.head(118, 800);
  const sp = ctx.measureText(' ').width;
  words.forEach(w => { const ww = ctx.measureText(w).width; if (rows[rows.length - 1].length && wsum + sp + ww > 900) { rows.push([]); wsum = 0; } rows[rows.length - 1].push(w); wsum += (wsum ? sp : 0) + ww; });
  ctx.restore();
  const n = words.length, lt = TL.lesson + .15, per = Math.max(.08, (dl(4) * .7) / n);
  let idx = 0;
  rows.forEach((r, ri) => {
    const y = 980 + (ri - (rows.length - 1) / 2) * 140;
    const s = r.join(' ');
    const shown = r.filter((_, j) => t >= lt + (idx + j) * per).length; idx += r.length;
    if (!shown) return;
    const part = r.slice(0, shown).join(' ');
    ctx.save(); ctx.globalAlpha *= k; ctx.font = F.head(118, 800); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    const fullW = ctx.measureText(s).width, x = 540 - fullW / 2;
    ctx.lineJoin = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(4,6,11,.9)'; ctx.strokeText(part, x, y);
    ctx.fillStyle = ri === rows.length - 1 ? C.amber : C.ink; ctx.fillText(part, x, y); ctx.restore();
  });
}

function drawTags() {                                            // honesty, always on screen
  const s = `${LB.example} · ${LB.ai}`;
  ctx.save(); ctx.font = F.mono(24, 600); const w = ctx.measureText(s).width + 48;
  ctx.fillStyle = 'rgba(8,12,22,.6)'; ctx.beginPath(); ctx.roundRect(48, 176, w, 48, 24); ctx.fill();
  ctx.strokeStyle = 'rgba(238,241,247,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(48, 176, w, 48, 24); ctx.stroke(); ctx.restore();
  text(s, 72, 201, F.mono(24, 600), C.ink, { align: 'left' });
}

// ─── captions: the spoken word lit (as in the UGC ad) ─────────────────────
function drawCaptions(t, y) {
  const i = lineAt(t);
  if (t < LN[i].t0 - .1 || t > LN[i].t1 + .3 || t >= TL.end - .05 || i === 0) return;   // the hook is stamped, not captioned
  const words = LN[i].words, font = F.head(70), maxW = 920, lh = 82;
  ctx.save(); ctx.font = font; ctx.letterSpacing = '0px'; ctx.textBaseline = 'middle';
  const sw = ctx.measureText(' ').width * 1.45;
  const rowsAll = [[]]; let wsum = 0;
  words.forEach(w => { const ww = ctx.measureText(w.w).width; if (rowsAll[rowsAll.length - 1].length && wsum + sw + ww > maxW) { rowsAll.push([]); wsum = 0; } const r = rowsAll[rowsAll.length - 1]; wsum += (r.length ? sw : 0) + ww; r.push({ ...w, ww }); });
  const pages = []; for (let k = 0; k < rowsAll.length; k += 2) pages.push(rowsAll.slice(k, k + 2));
  let pi = 0; while (pi < pages.length - 1 && t >= pages[pi + 1][0][0].t0 - .05) pi++;
  const rows = pages[pi], pt0 = rows[0][0].t0;
  const y0 = y - (rows.length - 1) * lh / 2, pop = easeBack((t - pt0 + .1) / .16, 1.6);
  ctx.translate(540, y0); ctx.scale(lerp(.9, 1, pop), lerp(.9, 1, pop)); ctx.translate(-540, -y0);
  rows.forEach((r, ri) => {
    const tot = r.reduce((a, w, k) => a + w.ww + (k ? sw : 0), 0), yy = y0 + ri * lh;
    let x = 540 - tot / 2; ctx.textAlign = 'left';
    r.forEach(w => {
      const now = t >= w.t0 && t < w.t1 + .04, said = t >= w.t0, s = now ? 1.08 : 1, cx = x + w.ww / 2;
      ctx.save(); ctx.translate(cx, yy); ctx.scale(s, s); ctx.translate(-cx, -yy);
      ctx.lineWidth = 14; ctx.strokeStyle = 'rgba(4,6,11,.92)'; ctx.lineJoin = 'round'; ctx.strokeText(w.w, x, yy);
      ctx.fillStyle = now ? C.amber : said ? C.ink : 'rgba(238,241,247,.72)'; ctx.fillText(w.w, x, yy);
      ctx.restore(); x += w.ww + sw;
    });
  });
  ctx.restore();
}

function drawScene(t) {
  drawBackdrop(t);
  drawQuestion(t); drawOfferCard(t); drawTimeStack(t); drawRate(t); drawLesson(t);
  drawCaptions(t, 1640);
  drawEnd(t);
  drawTags();
}
const CUTS = [[0, 'question'], [TL.card, 'offer'], [TL.math, 'math'], [TL.dial, 'rate'], [TL.lesson, 'lesson'], [TL.end, 'end']];
const SHOTS = CUTS.map(([s, k], i) => ({ id: `${i}-${k}`, start: s, end: i < CUTS.length - 1 ? CUTS[i + 1][0] : DURATION, readAt: s + .3, action: k }));
const MARKS = [TL.card, TL.math, TL.dial, TL.verdict, TL.lesson, TL.end];
const STAND = ctx;                                              // the shared seek resets a second context; here there is one
