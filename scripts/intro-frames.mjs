// Snimci kadrova 3D intra.  node scripts/intro-frames.mjs <baseUrl> <outDir> [w] [h]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const [,, base, outDir, w = '1280', h = '720'] = process.argv;
mkdirSync(outDir, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
const frames = [['1-fall', 0.55], ['2-impact', 0.97], ['3-hold', 1.6], ['4-scissors', 2.15], ['5-stab', 2.36]];
for (const [name, t] of frames) {
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  const logs = [];
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(m.text()); });
  p.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await p.goto(`${base}/?intro=force&gl=force&introAt=${t}`);
  await p.waitForFunction(() => document.querySelector('#intro-stage canvas'), null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `${outDir}/intro-${w}-${name}.png` });
  console.log(name, await p.evaluate(() => document.documentElement.dataset.introMode), logs.join(' | '));
  await p.close();
}
// Rez: pusti intro uživo i uhvati trenutak razdvajanja
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(`${base}/?intro=force&gl=force&introCut=0.42`);
await p.waitForSelector('.intro-cut', { state: 'attached', timeout: 30000 });
await p.screenshot({ path: `${outDir}/intro-${w}-6-cut-a.png` });
await p.waitForTimeout(800);
await p.screenshot({ path: `${outDir}/intro-${w}-6-cut-b.png` });
await b.close();
