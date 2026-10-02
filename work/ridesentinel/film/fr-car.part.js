// ─── the world as a function of time ───────────────────────────────────────
const envl = (t, a, b, c, d) => Math.min(smooth((t - a) / (b - a)), 1 - smooth((t - c) / (d - c)));
function hermite(t, keys) {                                    // [[t, value, slope], …]: smooth motion with chosen speeds
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, v0, m0] = keys[i - 1], [t1, v1, m1] = keys[i], h = t1 - t0, u = (t - t0) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * h * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * h * m1;
  }
  return keys[keys.length - 1][1];
}
// act 1 closes on the car ahead unnoticed, then fast after it brakes; we stop a hand's width away
const GAP1 = [[0, 14, -.7], [TL.leadBrake1, 10.5, -.9], [TL.react, 4.2, -8], [TL.stop, .35, 0], [99, .35, 0]];
const GAP2 = [[TL.act2, 12, 0], [TL.leadBrake2, 12, 0], [16.6, 6.4, 0], [99, 6.4, 0]];
function world(t) {                                            // t is story time (act 1 < 10 ≤ act 2)
  const act = t < TL.turn ? 1 : 2, V = 11;
  let pos, gap, b;
  if (act === 1) {
    const u = clamp((t - TL.react) / (TL.stop - TL.react));
    pos = t < TL.react ? V * t : V * TL.react + V * (TL.stop - TL.react) * (u - u * u / 2);
    gap = hermite(t, GAP1);
    b = .3 + .7 * smooth((t - TL.leadBrake1) / .12);
  } else {
    const t2 = Math.max(t, TL.act2), u = clamp((t2 - TL.brake2) / 2);
    pos = 300 + V * (Math.min(t2, TL.brake2) - TL.act2) + (t2 > TL.brake2 ? V * 2 * u - 7.5 * 2 * (u * u * u - u * u * u * u / 2) + 3.5 * Math.max(0, t2 - TL.brake2 - 2) : 0);
    gap = hermite(t2, GAP2);
    b = .3 + .7 * smooth((t - TL.leadBrake2) / .2);
  }
  const close = clamp((11 - gap) / 10.5);
  return { act, pos, gap, b, red: b > .5 ? (b - .3) / .7 * close : 0, close };
}
function pose(t) {                                             // the driver, from behind
  const P = { lean: 0, rub: 0, rot: 0, lurch: 0, breathe: 0, grip: 0 };
  if (t < TL.turn) {
    P.lean = t < TL.react ? smooth((t - .25) / .9) : t < TL.react + .18 ? lerp(1, -.4, easeOut((t - TL.react) / .18)) : lerp(-.4, 0, smooth((t - TL.react - .18) / 1.1));
    P.rub = envl(t, 2.3, 2.75, 3.3, 3.7);
    P.rot = envl(t, 3.75, 3.85, 4.35, 4.55) * .13 * Math.sin((t - 3.75) * TAU * 3);
    P.lurch = smooth((t - TL.react - .05) / .45) * (1 - smooth((t - TL.stop) / .55));
    P.breathe = envl(t, TL.stop + .1, TL.stop + .5, 9.5, 9.95) * Math.sin((t - TL.stop) * TAU * 1.25);
    P.grip = smooth((t - TL.react) / .1);
  } else {
    P.lean = .55 * envl(t, TL.glance[0], TL.glance[0] + .25, TL.glance[1] - .25, TL.glance[1]);
    P.lurch = .35 * envl(t, TL.brake2, TL.brake2 + .6, 16.2, 17);
  }
  P.rot += P.lean * .1;
  return P;
}
function camera(t) {                                           // → { z, x, y, dx, dy }
  let z = 1, x = 560, y = 1000, dx = 0, dy = 0;
  if (t < TL.turn) {
    z = 1 + .1 * smooth(t / 5.5) - .07 * smooth((t - TL.react) / 1.2);
    const k = t - TL.react - .02;
    if (k > 0) { const a = 26 * Math.exp(-k * 3.4); dx = a * Math.sin(k * 57); dy = a * .8 * Math.sin(k * 43 + 1); }
    // the heartbeat after the stop
    if (t > TL.stop + .3) { const hb = (t - TL.stop - .3) % .85; z += .007 * (Math.exp(-hb * 18) + .6 * Math.exp(-Math.max(0, hb - .22) * 18) * (hb > .22)); }
  } else {
    const zin = easeIO((t - 11.6) / .5), zout = easeIO((t - TL.glance[1]) / .55);
    z = lerp(1, 1.5, zin * (1 - zout)) + .04 * smooth((t - 14.3) / 2.6);
    x = lerp(560, 740, zin * (1 - zout)); y = lerp(1000, 1060, zin * (1 - zout));
  }
  return { z, x, y, dx, dy };
}
function applyCam(g, cam) { g.translate(cam.x, cam.y); g.scale(cam.z, cam.z); g.translate(-cam.x + cam.dx, -cam.y + cam.dy); }

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

// ─── captions ───────────────────────────────────────────────────────────────
function drawCaptions(t) {
  const sc = ctx.createLinearGradient(0, 0, 0, 640);
  sc.addColorStop(0, 'rgba(4,6,12,.7)'); sc.addColorStop(1, 'rgba(4,6,12,0)');
  ctx.fillStyle = sc; ctx.fillRect(0, 0, W, 640);
  reveal(life(t, 0, 2.3, .2), () => text(L.c1, CX, 380, F.head(96), C.ink, { maxW: 860 }));
  reveal(life(t, 2.35, 5.0, .3, .25), () => {
    const j = Math.sin(t * 53) * 3 * smooth((t - 3.8) / 1);
    text(L.c2, CX + j, 380, F.head(96), C.ink, { maxW: 860 });
  });
  reveal(life(t, 8.0, 9.95, .6, .3), () => text(L.cost, CX, 400, F.head(112), C.ink, { maxW: 860 }));
  const hl = life(t, TL.turn, 11.55, .3, .35);
  if (hl) {
    const s = lerp(1.18, 1, easeBack((t - TL.turn) / .35, 1.6));
    ctx.save(); ctx.globalAlpha *= clamp((t - TL.turn) / .1) * hl.out;
    ctx.translate(CX, 410); ctx.scale(s, s); ctx.translate(-CX, -410);
    rich(L.head[0], CX, 352, F.head(118), { ls: 1 }); rich(L.head[1], CX, 466, F.head(118), { ls: 1 });
    ctx.restore();
  }
  const R2 = life(t, TL.offers[1].stamp - .05, 14.25);
  reveal(R2, () => { rich(L.r2[0], CX, 350, F.sans(54, 600)); rich(L.r2[1], CX, 422, F.sans(54, 600)); });
  reveal(life(t, 14.3, 16.95), () => { rich(L.eyes[0], CX, 352, F.head(104)); rich(L.eyes[1], CX, 462, F.head(104)); });
  reveal(life(t, TL.chipsIn + .05, TL.chipsOut + .35), () => { rich(L.built[0], CX, 360, F.head(104)); rich(L.built[1], CX, 464, F.head(104)); });
}

function drawCar(t) {                                          // the whole shot at story time t
  const Wd = world(t), P = pose(t), cam = camera(t);
  ctx.fillStyle = '#04060C'; ctx.fillRect(0, 0, W, H);
  ctx.save(); applyCam(ctx, cam);
  ctx.save(); screenPath(ctx); ctx.clip(); drawOutside(Wd); ctx.restore();
  drawInterior(t, Wd);
  drawWheel();
  drawPhoneMounted(t);
  ctx.restore();
  drawDriverLit(P, cam, Wd);
  ctx.save(); applyCam(ctx, cam); drawSwarm(t); ctx.restore();
}
function drawScene(t) {
  if (t < TL.rewind[0]) drawCar(t);
  else if (t < TL.rewind[1]) {                                 // the turn: act 1 runs backwards, fast
    const u = (t - TL.rewind[0]) / (TL.rewind[1] - TL.rewind[0]);
    drawCar(lerp(9.95, .2, easeIn(u) * .6 + u * .4));
    ctx.fillStyle = 'rgba(12,18,32,.45)'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) { ctx.fillStyle = 'rgba(238,241,247,.06)'; ctx.fillRect(0, frac(-t * 2.6 + i / 7) * H, W, 14 + (i % 3) * 8); }
  } else drawCar(t);
  const dim = smooth((t - TL.chipsIn) / .4);
  if (dim > 0) { ctx.fillStyle = rgba(RGB.navy, .82 * dim); ctx.fillRect(0, 0, W, H); }
  drawChips(t);
  drawCaptions(t);
  drawEnd(t);
}
const SHOTS = [
  { id: 'offer', start: 0, end: 5, readAt: 3.2, action: 'offer, maths around his head, rubs forehead, shakes head' },
  { id: 'nearmiss', start: 5, end: 8, readAt: 7.4, action: 'brake lights, he looks up late, hard stop a hand from the bumper' },
  { id: 'cost', start: 8, end: 10, readAt: 9.3, action: 'heartbeat, offer expired, "Aucune offre ne vaut ça."' },
  { id: 'turn', start: 10, end: 11.6, readAt: 11, action: 'rewind; headline' },
  { id: 'glance', start: 11.6, end: 14.3, readAt: 12.8, action: 'one glance: PRENDRE' },
  { id: 'calm', start: 14.3, end: 17, readAt: 16, action: 'car ahead brakes; eyes up; calm stop' },
  { id: 'cards', start: 17, end: 20.8, readAt: 19.5, action: 'three cards' },
  { id: 'end', start: 20.8, end: 26, readAt: 24, action: 'end card' },
];
const MARKS = [0, TL.leadBrake1, TL.react, TL.stop, TL.turn, TL.offers[1].stamp, TL.leadBrake2, ...TL.chips, TL.end];
