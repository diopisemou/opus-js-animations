  // ── "Pass or Take?". The voice leads; a light 100 BPM bed sits under it and ducks on every line.
  if (voiceBuf) {
    const src = ac.createBufferSource(); src.buffer = voiceBuf;
    const vg = ac.createGain(); vg.gain.value = 1.15; src.connect(vg).connect(master); src.start(0);
  }
  LN.forEach(l => { duck.gain.setTargetAtTime(.32, Math.max(0, l.t0 - .08), .05); duck.gain.setTargetAtTime(.8, l.t1 + .05, .2); });
  const BEAT = .6, CH = [[110, [220, 277.18, 329.63, 415.3]], [92.5, [185, 233.08, 277.18, 369.99]], [123.47, [246.94, 293.66, 369.99, 440]], [82.41, [164.81, 207.65, 246.94, 329.63]]];
  for (let b = 0; b * 4 * BEAT < TL.end; b++) {
    const t0 = b * 4 * BEAT, [root, notes] = CH[b % 4], len = Math.min(4 * BEAT, TL.end - t0);
    pad(t0, len, notes, .5);
    for (let k = 0; k < 4 && t0 + k * BEAT < TL.end; k++) {
      const tb = t0 + k * BEAT;
      if (k === 0 || k === 2) kick(tb, .5);
      if (k === 1 || k === 3) clap(tb, .11);
      hat(tb + BEAT * .5 + .04, .09); hat(tb, .05);
      if (k === 0) bass(tb, root, BEAT * 1.6, .42); if (k === 2) bass(tb, root * (b % 2 ? 1.5 : 1), BEAT * .9, .32);
    }
  }
  // the question stamps, the card, the math, the dial, the verdict
  TL.q.forEach((t, j) => { thud(t); blip(t, [196, 220, 262][j], .1); });
  [1318.5, 1760].forEach((f, k) => { const g = gain(bells); env(g, TL.card + k * .09, .003, .3, .35); osc('sine', f, TL.card + k * .09, .45, g); });
  [TL.math + .3, TL.math + .7, TL.math + 1.1].forEach((t, k) => blip(t, [660, 880, 990][k], .08));
  whoosh(TL.dial - .15, .3, true, .12);
  if (VERDICT === 'TAKE') { bell(TL.verdict, 1046.5, .42); bell(TL.verdict + .1, 1567.98, .36); }
  else { const g = gain(drums); env(g, TL.verdict, .002, .75, .4); const o = osc('sine', 120, TL.verdict, .45, g); o.frequency.exponentialRampToValueAtTime(48, TL.verdict + .2); }
  whoosh(TL.lesson - .12, .25, false, .1);
  // the end card
  hit(TL.end);
  pad(TL.end, DURATION - TL.end, [130.81, 196, 329.63, 493.88, 587.33], .8);
  bass(TL.end, 65.41, DURATION - TL.end - .3, .45);
  bell(TL.markNeedle[1] - .05, 523.25, .45); bell(TL.markNeedle[1] + .07, 783.99, .3);
