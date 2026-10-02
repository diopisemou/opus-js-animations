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
