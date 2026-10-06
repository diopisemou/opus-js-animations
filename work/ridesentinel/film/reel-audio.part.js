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
