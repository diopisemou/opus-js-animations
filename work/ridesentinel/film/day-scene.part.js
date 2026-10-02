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
