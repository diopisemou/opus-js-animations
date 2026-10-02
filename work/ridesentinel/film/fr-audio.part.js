  // ── French cut. Act 1: a ping, the clock and the maths, then the near-miss.
  const ping = (t, v = .3) => [1318.5, 1760].forEach((f, k) => { const g = gain(bells); env(g, t + k * .09, .003, v, .35); osc('sine', f, t + k * .09, .45, g); });
  ping(0);
  { const g = gain(bus(.16)); g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(.55, TL.react - .05); g.gain.linearRampToValueAtTime(0, TL.react + .02);
    const lp = filt('lowpass', 180, 3, g); lp.frequency.setValueAtTime(180, 0); lp.frequency.exponentialRampToValueAtTime(1300, TL.react);
    for (const f of [55, 55.35, 82.4]) osc('sawtooth', f, 0, TL.react + .1, lp); }
  for (let t = .5, i = 0; t < TL.react - .01; t += t < 4 ? .5 : .25, i++) tick(t, i % 2, .3 + .3 * t / TL.react);
  FRAGS.forEach(([t0], i) => blip(t0, [660, 880, 990, 740, 1170, 830][i % 6] * (1 + (i % 4) * .06), .1));
  // the brake lights ahead: a low swell under the clock
  { const g = gain(bassB); g.gain.setValueAtTime(0, TL.leadBrake1); g.gain.linearRampToValueAtTime(.28, TL.react); g.gain.linearRampToValueAtTime(0, TL.react + .05);
    osc('sine', 46, TL.leadBrake1, TL.react - TL.leadBrake1 + .1, g); }
  // the stop: a jolt, the tyres, a thump, then silence and his heart
  kick(TL.react, 1.1);
  { const d = TL.stop - TL.react + .05;
    const g = gain(fx); g.gain.setValueAtTime(0, TL.react); g.gain.linearRampToValueAtTime(1.1, TL.react + .06); g.gain.setValueAtTime(1, TL.stop - .12); g.gain.linearRampToValueAtTime(0, TL.stop + .04);
    noise(TL.react, d, filt('bandpass', 2300, 3, g));
    const rb = gain(fx); rb.gain.setValueAtTime(0, TL.react); rb.gain.linearRampToValueAtTime(.8, TL.react + .05); rb.gain.linearRampToValueAtTime(0, TL.stop + .05);
    noise(TL.react, d, filt('lowpass', 900, .8, rb));
    const sq = gain(fx); sq.gain.setValueAtTime(0, TL.react); sq.gain.linearRampToValueAtTime(.2, TL.react + .08); sq.gain.linearRampToValueAtTime(0, TL.stop + .02);
    const bp = filt('bandpass', 1750, 4, sq);
    for (const f of [1680, 1745]) { const o = osc('sawtooth', f, TL.react, d, bp); o.frequency.linearRampToValueAtTime(f * .88, TL.stop); } }
  { const g = gain(drums); env(g, TL.stop, .003, 1, .45); const o = osc('sine', 70, TL.stop, .5, g); o.frequency.exponentialRampToValueAtTime(34, TL.stop + .3);
    const n = gain(fx); env(n, TL.stop, .002, .5, .3); noise(TL.stop, .35, filt('lowpass', 420, .7, n)); }
  for (let k = 0; k < 3; k++) {
    const t0 = TL.stop + .35 + k * .85;
    for (const [dt, v] of [[0, .95], [.22, .6]]) { const g = gain(drums); env(g, t0 + dt, .004, v, .16); const o = osc('sine', 62, t0 + dt, .22, g); o.frequency.exponentialRampToValueAtTime(40, t0 + dt + .1); }
  }
  { const g = gain(fx); env(g, TL.offers[0].life, .005, .12, .3); const o = osc('sine', 880, TL.offers[0].life, .35, g); o.frequency.exponentialRampToValueAtTime(420, TL.offers[0].life + .3); }
  // the turn: a hit and a rewind
  hit(TL.turn);
  { const g = gain(fx); g.gain.setValueAtTime(0, TL.rewind[0]); g.gain.linearRampToValueAtTime(.12, TL.rewind[0] + .1); g.gain.linearRampToValueAtTime(0, TL.rewind[1]);
    const o = osc('sine', 160, TL.rewind[0], .85, g); o.frequency.exponentialRampToValueAtTime(1700, TL.rewind[1]); }
  whoosh(TL.rewind[0] + .05, .75, true, .25);
  // act 2: the calm groove, Am – F – C – G – Am
  const CH = [[110, [220, 261.63, 329.63]], [87.31, [174.61, 220, 261.63]], [130.81, [261.63, 329.63, 392]], [98, [196, 246.94, 293.66]],
              [110, [220, 261.63, 329.63]]];
  CH.forEach(([root, notes], b) => {
    const t0 = TL.act2 + b * 2;
    pad(t0, 2, notes);
    for (let k = 0; k < 4; k++) {
      const tb = t0 + k * .5;
      kick(tb, b === 0 && k === 0 ? .6 : .8);
      hat(tb + .25, .18);
      if (b >= 1 && (k === 1 || k === 3)) clap(tb, .26);
      bass(tb, root, .2, .65); bass(tb + .25, k === 3 ? root * 2 : root, .18, .45);
    }
  });
  ping(TL.offers[1].arrive, .25);
  whoosh(TL.offers[1].swing[0], TL.offers[1].swing[1] - TL.offers[1].swing[0], true, .2);
  bell(TL.offers[1].stamp, 1046.5, .5); bell(TL.offers[1].stamp + .11, 1567.98, .45);
  // the car ahead brakes; he is watching, so it is only a soft slowdown
  whoosh(TL.brake2, 1.4, false, .12);
  // the cards and the end card
  whoosh(TL.chipsIn - .05, .5, false, .2);
  [440, 523.25, 659.25].forEach((f, i) => pluck(TL.chips[i], f));
  whoosh(TL.chipsOut - .05, .4, true, .16);
  pad(TL.end, 4.4, [130.81, 196, 329.63, 493.88, 587.33], .9);
  bass(TL.end, 65.41, 4, .5);
  whoosh(TL.markArc[0], .55, true, .14);
  bell(TL.markNeedle[1] - .05, 523.25, .55); bell(TL.markNeedle[1] + .07, 783.99, .35);
