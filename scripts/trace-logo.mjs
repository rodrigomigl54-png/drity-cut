// Vektorizuje natpis "Dirty Cut" iz logoa (assets-src/wordmark.png) u SVG putanju
// koju koristi 3D intro (src/intro/wordmark.svg).
import potrace from 'potrace';
import { writeFileSync } from 'node:fs';

potrace.trace('assets-src/wordmark.png', {
  blackOnWhite: false,
  threshold: 120,
  turdSize: 20,
  optTolerance: 0.25,
  alphaMax: 1,
  color: '#F2F0EC',
  background: 'transparent',
}, (err, svg) => {
  if (err) throw err;
  writeFileSync('src/intro/wordmark.svg', svg);
  writeFileSync('src/assets/images/wordmark.svg', svg);
  console.log('wordmark.svg', svg.length, 'bytes');
});
