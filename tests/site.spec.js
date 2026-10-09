import { test, expect } from '@playwright/test';
import { openSite } from './helpers.js';

test.describe('Jezik', () => {
  test('SR → EN bez ponovnog učitavanja, pamti izbor', async ({ page, context }) => {
    await openSite(page, context, { lang: 'sr' });
    await expect(page.locator('h1')).toContainText('Prljavo ime.');
    await expect(page.locator('.price__value--ask').first()).toHaveText('Cena na upit');

    const btn = page.locator('.lang__btn[data-lang="en"]:visible').first();
    if (await btn.count()) await btn.click();
    else { await page.click('#burger'); await page.locator('#mobile-menu .lang__btn[data-lang="en"]').click(); await page.keyboard.press('Escape'); }

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1')).toContainText('Dirty name.');
    await expect(page.locator('.price__value--ask').first()).toHaveText('Price on request');
    await expect(page).toHaveTitle(/men's & women's haircuts/);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1')).toContainText('Dirty name.');
  });
});

test.describe('Otvoreno sada (Europe/Belgrade)', () => {
  const cases = [
    ['2026-10-12T10:00:00+02:00', 'Otvoreno sada', '· Zatvara se u 13:00'],
    ['2026-10-12T14:00:00+02:00', 'Zatvoreno', '· Otvara se u 16:00'],
    ['2026-10-12T21:00:00+02:00', 'Zatvoreno', '· Otvara se u sredu u 09:00'],
    ['2026-10-13T12:00:00+02:00', 'Zatvoreno', '· Otvara se sutra u 09:00'],
    ['2026-10-17T14:00:00+02:00', 'Zatvoreno', '· Otvara se u ponedeljak u 09:00'],
    // 23:30 UTC u nedelju = 01:30 u ponedeljak po Beogradu → zona salona, ne posetioca
    ['2026-10-11T23:30:00Z', 'Zatvoreno', '· Otvara se u 09:00'],
  ];
  for (const [iso, label, detail] of cases) {
    test(`${iso} → ${label} ${detail}`, async ({ page, context }) => {
      await openSite(page, context, { time: new Date(iso) });
      const st = page.locator('.hero [data-status]');
      await expect(st.locator('[data-status-label]')).toHaveText(label);
      await expect(st.locator('[data-status-detail]')).toHaveText(detail);
      await expect(st).toHaveAttribute('data-state', label === 'Otvoreno sada' ? 'open' : 'closed');
    });
  }
});

test.describe('Intro', () => {
  // Napomena: u test okruženju WebGL radi softverski (SwiftShader) i jako opterećuje
  // glavni thread, pa se 3D intro zamrzava na ranom kadru (?introAt=…), a klik se
  // šalje direktno — na pravom GPU-u intro teče normalno.
  test('dugme "Preskoči" je vidljivo od prvog kadra i prekida 3D intro', async ({ page }) => {
    await page.goto('/?intro=force&gl=force&introAt=0.3', { waitUntil: 'domcontentloaded' });
    const skip = page.locator('#intro-skip');
    await expect(skip).toBeVisible();
    await expect(skip).toHaveText(/Preskoči/);
    await page.waitForFunction(() => document.documentElement.dataset.introMode === '3d');
    await page.evaluate(() => document.getElementById('intro-skip').click());
    await page.waitForFunction(() => document.documentElement.dataset.intro === 'done');
    expect(await page.evaluate(() => document.documentElement.dataset.introResult)).toBe('skipped');
    await expect(page.locator('#intro')).toHaveCount(0);
    await expect(page.locator('#intro-stage canvas')).toHaveCount(0); // WebGL resursi oslobođeni
    await expect(page.locator('h1')).toBeVisible();
  });

  test('prikazuje se samo jednom po sesiji', async ({ page }) => {
    await page.goto('/?gl=force&introAt=0.3', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-intro', 'playing');
    await page.evaluate(() => document.getElementById('intro-skip').click());
    await page.waitForFunction(() => document.documentElement.dataset.intro === 'done');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-intro', 'off');
    await expect(page.locator('#intro')).toHaveCount(0);
  });

  test('softverski WebGL (bez GPU-a): laka 2D verzija', async ({ page }) => {
    await page.goto('/?intro=force');
    await page.waitForFunction(() => document.documentElement.dataset.introMode);
    const [mode, reason] = await page.evaluate(() => [document.documentElement.dataset.introMode, document.documentElement.dataset.introReason]);
    // Test okruženje nema GPU (SwiftShader) → očekuje se 2D
    expect(mode).toBe('2d');
    expect(reason).toBe('software-webgl');
    await page.waitForFunction(() => document.documentElement.dataset.intro === 'done', null, { timeout: 5000 });
  });

  test('prefers-reduced-motion: 2D logo umesto 3D', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.waitForFunction(() => document.documentElement.dataset.introMode === '2d');
    expect(await page.evaluate(() => document.documentElement.dataset.introReason)).toBe('reduced-motion');
    await page.waitForFunction(() => document.documentElement.dataset.intro === 'done', null, { timeout: 5000 });
    expect(await page.evaluate(() => document.documentElement.dataset.introResult)).toBe('fallback');
    expect(await page.locator('canvas').count()).toBe(0);
    await ctx.close();
  });

  test('bez WebGL-a: 2D logo, sajt se nikad ne zaglavi', async ({ page }) => {
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        if (/webgl/i.test(type)) return null;
        return orig.call(this, type, ...rest);
      };
    });
    await page.goto('/?intro=force');
    await page.waitForFunction(() => document.documentElement.dataset.introMode === '2d');
    expect(await page.evaluate(() => document.documentElement.dataset.introReason)).toBe('no-webgl');
    await page.waitForFunction(() => document.documentElement.dataset.intro === 'done', null, { timeout: 5000 });
    await expect(page.locator('#intro')).toHaveCount(0);
  });
});

test.describe('Navigacija i galerija', () => {
  test('mobilni meni (samo telefon)', async ({ page, context, isMobile }) => {
    test.skip(!isMobile, 'samo za mobilne uređaje');
    await openSite(page, context);
    const burger = page.locator('#burger');
    await expect(burger).toBeVisible();
    await burger.click();
    await expect(burger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#mobile-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(burger).toHaveAttribute('aria-expanded', 'false');
    await burger.click();
    await page.locator('#mobile-menu a[href="#galerija"]').click();
    await expect(burger).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#mobile-menu')).toBeHidden();
    await expect(page.locator('#galerija h2')).toBeInViewport();
  });

  test('lightbox: otvaranje, strelice, Escape', async ({ page, context }) => {
    await openSite(page, context);
    await page.locator('.g-item').first().click();
    const lb = page.locator('#lightbox');
    await expect(lb).toBeVisible();
    await expect(lb.locator('.lightbox__counter')).toHaveText('1 / 4');
    await page.keyboard.press('ArrowRight');
    await expect(lb.locator('.lightbox__counter')).toHaveText('2 / 4');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(lb.locator('.lightbox__counter')).toHaveText('4 / 4');
    await page.keyboard.press('Escape');
    await expect(lb).toBeHidden();
  });

  test('"Zakaži" kod usluge popunjava formu', async ({ page, context }) => {
    await openSite(page, context);
    await page.locator('[data-book="brada"]').click();
    await expect(page.locator('#bf-service')).toHaveValue('brada');
  });

  test('bez grešaka u konzoli', async ({ page, context }) => {
    const errors = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    await openSite(page, context);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    });
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });

  test('nema horizontalnog skrola', async ({ page, context }) => {
    await openSite(page, context);
    const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(sw).toBeLessThanOrEqual(iw);
  });
});

test.describe('Ocene', () => {
  test('blok 5.0 / 81 i link ka Google profilu; bez izmišljenih recenzija', async ({ page, context }) => {
    await openSite(page, context);
    await expect(page.locator('.rating__count')).toHaveText('81 recenzija na Google-u');
    await expect(page.locator('#ocene a[href="https://share.google/H5fW93sCc0xVWWi6d"]')).toHaveCount(1);
    await expect(page.locator('#reviews-slider')).toBeHidden(); // reviews.json je prazan
  });

  test('ostavi ocenu → WhatsApp salonu', async ({ page, context }) => {
    await openSite(page, context);
    const form = page.locator('#leave-review');
    await form.scrollIntoViewIfNeeded();
    await form.locator('button[value="salon"]').click();
    await expect(form.locator('[data-error="rating"]')).toHaveText('Izaberi broj zvezdica.');
    await form.locator('label[for="lr-star-5"]').click();
    await form.locator('#lr-text').fill('Najbolji fade u gradu, preporuka!');
    await form.locator('#lr-name').fill('Đorđe');
    const [popup] = await Promise.all([context.waitForEvent('page'), form.locator('button[value="salon"]').click()]);
    const text = new URL(popup.url()).searchParams.get('text');
    expect(text).toBe('Ocena za Dirty Cut: ★★★★★ (5/5)\nNajbolji fade u gradu, preporuka!\n— Đorđe');
  });
});
