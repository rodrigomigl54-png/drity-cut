// Snimci svake sekcije u zadatoj širini.  node scripts/sections.mjs <baseUrl> <outDir> <w> <h> [lang]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const [,, base, outDir, w = '1280', h = '800', lang = 'sr'] = process.argv;
mkdirSync(outDir, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: +w < 700, hasTouch: +w < 700 });
await ctx.addInitScript((l) => { try { localStorage.setItem('dc-lang', l); } catch {} }, lang);
const p = await ctx.newPage();
const logs = [];
p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`); });
p.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
await p.goto(base + '/?intro=off', { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
const sw = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
const ids = ['top', 'usluge', 'galerija', 'ocene', 'o-nama', 'zakazivanje', 'lokacija'];
for (const id of ids) {
  await p.evaluate((id) => { const el = document.getElementById(id); window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - (id === 'top' ? 0 : 70), behavior: 'instant' }); }, id);
  await p.waitForTimeout(1100);
  await p.screenshot({ path: `${outDir}/${w}-${lang}-${id}.jpg`, type: 'jpeg', quality: 80 });
}
await p.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
await p.waitForTimeout(700);
await p.screenshot({ path: `${outDir}/${w}-${lang}-footer.jpg`, type: 'jpeg', quality: 80 });
console.log(`scrollWidth=${sw[0]} innerWidth=${sw[1]}`);
console.log(logs.join('\n') || 'no console errors');
await b.close();
