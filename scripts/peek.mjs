// Brzi pregled: snimak cele strane + greške iz konzole.  node scripts/peek.mjs <url> <out.png> [w] [h] [full]
import { chromium } from '@playwright/test';
const [,, url, out, w = '1280', h = '800', full = '1', wait = '1200'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`${m.type()}: ${m.text()}`); });
p.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
await p.goto(url, { waitUntil: 'networkidle' });
await p.waitForTimeout(+wait);
if (full === '1') {
  // skroluj do kraja da se aktiviraju animacije
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); });
  await p.waitForTimeout(800);
}
await p.screenshot({ path: out, fullPage: full === '1' });
console.log(logs.join('\n') || 'no console errors');
await b.close();
