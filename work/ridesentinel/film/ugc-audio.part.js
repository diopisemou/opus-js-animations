  // ── "Drivers, quick one". The voice is the ad; a light creator beat sits low under it and ducks hard on every line.
  if (voiceBuf) {
    const src = ac.createBufferSource(); src.buffer = voiceBuf;
    const vg = ac.createGain(); vg.gain.value = 1.15; src.connect(vg).connect(master); src.start(0);
  }
  LN.forEach(l => { duck.gain.setTargetAtTime(.3, Math.max(0, l.t0 - .08), .05); duck.gain.setTargetAtTime(.75, l.t1 + .05, .2); });
  // a 100 BPM lo-fi loop: soft kick, rim on 2 and 4, swung hats, warm chords, a round bass
  const BEAT = .6, CH = [[110, [220, 277.18, 329.63, 415.3]], [92.5, [185, 233.08, 277.18, 369.99]], [123.47, [246.94, 293.66, 369.99, 440]], [82.41, [164.81, 207.65, 246.94, 329.63]]];
  for (let b = 0; b * 4 * BEAT < TL.end; b++) {
    const t0 = b * 4 * BEAT, [root, notes] = CH[b % 4], len = Math.min(4 * BEAT, TL.end - t0);
    pad(t0, len, notes, .55);
    for (let k = 0; k < 4 && t0 + k * BEAT < TL.end; k++) {
      const tb = t0 + k * BEAT;
      if (k === 0 || k === 2) kick(tb, .55);
      if (k === 1 || k === 3) clap(tb, .12);
      hat(tb + BEAT * .5 + .04, .1); hat(tb, .06);
      if (k === 0) bass(tb, root, BEAT * 1.6, .45); if (k === 2) bass(tb, root * (b % 2 ? 1.5 : 1), BEAT * .9, .35);
    }
  }
  // sound design on the picture
  CUTS.forEach(([s], i) => { if (i && s < TL.end) whoosh(s - .1, .2, i % 2 === 1, .1); });
  TL.stamps.forEach((t, j) => { thud(t); blip(t, [220, 247, 196][j], .12); });
  UG.frags.forEach((s, k) => blip(LN[2].t0 + .15 + k * .55, [660, 880, 990, 740][k], .09));
  [1318.5, 1760].forEach((f, k) => { const g = gain(bells); env(g, TL.offers[0].arrive + k * .09, .003, .3, .35); osc('sine', f, TL.offers[0].arrive + k * .09, .45, g); });
  bell(TL.brand, 783.99, .32); bell(TL.brand + .08, 1174.66, .22);
  { const t = TL.pass, g = gain(drums); env(g, t, .002, .7, .4); const o = osc('sine', 120, t, .45, g); o.frequency.exponentialRampToValueAtTime(48, t + .2); }
  bell(TL.take, 1046.5, .42); bell(TL.take + .1, 1567.98, .36);
  { const t = TL.lock + .05; tick(t, 1, .5); tick(t + .07, 0, .35); }
  // the end card
  hit(TL.end);
  pad(TL.end, DURATION - TL.end, [130.81, 196, 329.63, 493.88, 587.33], .8);
  bass(TL.end, 65.41, DURATION - TL.end - .3, .45);
  bell(TL.markNeedle[1] - .05, 523.25, .45); bell(TL.markNeedle[1] + .07, 783.99, .3);
