  // ── "Two drivers, one day". Dawn is sparse, midday grooves, the evening fills out, the night is quiet.
  pad(0, 2.2, [220, 261.63, 329.63], .8);
  const CH = [[110, [220, 261.63, 329.63]], [87.31, [174.61, 220, 261.63]], [130.81, [261.63, 329.63, 392]], [98, [196, 246.94, 293.66]]];
  for (let b = 0; b < 10; b++) {
    const t0 = TL.day[0] + b * 2, [root, notes] = CH[b % 4], energy = b < 2 ? 0 : b < 7 ? 1 : b < 9 ? 2 : .5;
    pad(t0, 2, notes, b < 2 ? 1 : .8);
    for (let k = 0; k < 4; k++) {
      const tb = t0 + k * .5;
      if (energy >= .5 && (energy >= 1 || k % 2 === 0)) kick(tb, energy >= 1 ? .8 : .55);
      if (energy >= 1) hat(tb + .25, .16);
      if (energy >= 2 && (k === 1 || k === 3)) clap(tb, .24);
      if (energy >= .5) { bass(tb, root, .2, .6); if (energy >= 1) bass(tb + .25, k === 3 ? root * 2 : root, .18, .4); }
      if (energy === 0) pluck(tb + .25, notes[(k + b) % 3] * 2, .22);
    }
  }
  // every decision has a sound: Sam's maths blips and dull accepts; Alex's bright TAKE and soft PASS
  OFFERS_DAY[0].forEach(([t0, t1, v]) => {
    for (let q = t0 + .1; q < t1; q += .2) blip(q, 700 + ((q * 10) % 5) * 90, .06);
    if (v === 'expired') { const g = gain(fx); env(g, t1, .005, .14, .3); const o = osc('sine', 820, t1, .35, g); o.frequency.exponentialRampToValueAtTime(380, t1 + .3); }
    else bell(t1, 392, .28);
  });
  OFFERS_DAY[1].forEach(([t0, t1, v]) => { if (v === 'take') { bell(t1, 1046.5, .26); bell(t1 + .09, 1567.98, .2); } else tick(t1, 1, .35); });
  // the night: the groove falls away
  whoosh(TL.night[0] - .1, .7, false, .2);
  pad(TL.night[0], 5, [174.61, 220, 261.63, 329.63], .8);
  bass(TL.night[0], 43.65, 4.6, .45);
  // the scorecard: counting ticks, then a hit on the line
  for (let q = TL.score[0] + .3; q < TL.score[0] + 1.5; q += .08) tick(q, (q * 12 | 0) % 2, .12);
  hit(TL.final);
  pad(TL.final, 2.1, [220, 261.63, 329.63, 440], .8);
  // the end card
  pad(TL.end, 3.4, [130.81, 196, 329.63, 493.88, 587.33], .9);
  bass(TL.end, 65.41, 3.1, .5);
  whoosh(TL.markArc[0], .55, true, .14);
  bell(TL.markNeedle[1] - .05, 523.25, .55); bell(TL.markNeedle[1] + .07, 783.99, .35);
