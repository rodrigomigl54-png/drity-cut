// Snimci toka zakazivanja, mobilnog menija i lightbox-a za izveštaj.
import { chromium, devices } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const base = process.argv[2] || 'http://localhost:4173';
const out = process.argv[3] || 'docs/screenshots/flows';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const log = [];

for (const [name, opts] of [['desktop', { viewport: { width: 1280, height: 900 } }], ['iphone', { ...devices['iPhone 13'] }]]) {
  const ctx = await b.newContext({ ...opts, permissions: ['clipboard-read', 'clipboard-write'] });
  for (const pat of ['https://wa.me/**', 'https://ig.me/**']) {
    await ctx.route(pat, (r) => r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><meta name=viewport content="width=device-width"><body style="font:16px system-ui;padding:24px;background:#111;color:#eee"><h3>Otvoren link (presretnut u testu — spoljni servis nije dostupan iz okruženja)</h3><p style="word-break:break-all">${r.request().url().replace(/&/g, '&amp;')}</p><h3>Dekodiran tekst:</h3><pre style="white-space:pre-wrap;background:#222;padding:12px">${(new URL(r.request().url()).searchParams.get('text') || '(Instagram ne podržava unapred popunjen tekst — poruka je u clipboardu)').replace(/</g, '&lt;')}</pre></body>` }));
  }
  const p = await ctx.newPage();
  await p.clock.install({ time: new Date('2026-10-12T08:00:00+02:00') });
  await p.goto(base + '/?intro=off');
  await p.locator('#zakazivanje').scrollIntoViewIfNeeded();
  await p.waitForTimeout(900);
  // greške validacije
  await p.click('#bf-wa');
  await p.waitForTimeout(300);
  await p.locator('#booking-form').screenshot({ path: `${out}/${name}-booking-errors.jpg` });
  // popunjena forma
  await p.selectOption('#bf-service', 'sisanje-brada');
  const day = p.locator('#bf-days label[data-iso="2026-10-14"]');
  await day.scrollIntoViewIfNeeded();
  const bx = await day.boundingBox();
  console.log(name, 'hit', bx, await p.evaluate(([x, y]) => document.elementFromPoint(x, y)?.outerHTML.slice(0, 90), [bx.x + bx.width / 2, bx.y + bx.height / 2]));
  await day.click();
  console.log(name, 'date=', await p.inputValue('#bf-date'), 'slots=', await p.locator('#bf-slots input').count());
  await p.locator('#bf-slots input[value="16:30"]').check({ force: true });
  await p.fill('#bf-name', 'Đorđe Čučković');
  await p.fill('#bf-phone', '+381 64 123 4567');
  await p.fill('#bf-note', 'Kraće sa strane, duže gore');
  await p.locator('#booking-form').screenshot({ path: `${out}/${name}-booking-filled.jpg` });
  const [wa] = await Promise.all([ctx.waitForEvent('page'), p.click('#bf-wa')]);
  await wa.waitForLoadState();
  await wa.screenshot({ path: `${out}/${name}-whatsapp-opened.jpg` });
  log.push(`${name} WhatsApp URL: ${wa.url()}`);
  await wa.close();
  await p.locator('#bform-done details').evaluate((d) => { d.open = true; });
  await p.locator('#booking-form').screenshot({ path: `${out}/${name}-booking-sent.jpg` });
  const [ig] = await Promise.all([ctx.waitForEvent('page'), p.click('#bf-ig')]);
  await ig.waitForLoadState();
  await ig.screenshot({ path: `${out}/${name}-instagram-opened.jpg` });
  log.push(`${name} Instagram URL: ${ig.url()}`);
  log.push(`${name} clipboard:\n${await p.evaluate(() => navigator.clipboard.readText())}`);
  await ig.close();
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${out}/${name}-instagram-toast.jpg` });

  if (name === 'iphone') {
    await p.evaluate(() => scrollTo(0, 0));
    await p.click('#burger');
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${out}/${name}-mobile-menu.jpg` });
    await p.keyboard.press('Escape');
  }
  await p.locator('#galerija').scrollIntoViewIfNeeded();
  await p.waitForTimeout(900);
  await p.locator('.g-item').first().click();
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${out}/${name}-lightbox.jpg` });
  await ctx.close();
}
writeFileSync(`${out}/urls.txt`, log.join('\n\n') + '\n');
console.log(log.join('\n\n'));
await b.close();
