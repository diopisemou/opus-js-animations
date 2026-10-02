// page_audio.mjs, but pulls the base64 WAV in 1 MB slices (one large CDP message stalls in this container)
import { writeFileSync } from 'node:fs';
import { openFilm } from './lib.mjs';
const [html, out] = process.argv.slice(2);
const f = await openFilm(html);
const n = await f.ev('__film.wav().then(s => (window.__wavB64 = s).length)');
let b64 = '';
for (let i = 0; i < n; i += 1 << 20) b64 += await f.ev(`window.__wavB64.slice(${i}, ${i + (1 << 20)})`);
writeFileSync(out, Buffer.from(b64, 'base64')); f.close(); console.log(out, n); process.exit(0);
