import { test, expect } from '@playwright/test';
import { openSite, fillBooking, clickAndCatchPopup, textParam } from './helpers.js';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

const FULL = {
  service: 'sisanje-brada',
  date: '2026-10-14',
  time: '16:30',
  name: 'Đorđe Čučković',
  phone: '+381 64 123 4567',
  note: 'Kraće sa strane, duže gore — šiške ž',
};

test.describe('Zakazivanje — WhatsApp', () => {
  test('SR: tačan broj, poruka, kodiranje č ć š ž đ i prelomi redova', async ({ page, context }) => {
    await openSite(page, context, { lang: 'sr' });
    await fillBooking(page, FULL);
    const popup = await clickAndCatchPopup(page, context, '#bf-wa');
    const url = popup.url();

    expect(url.startsWith('https://wa.me/38166416253?text=')).toBe(true);
    expect(textParam(url)).toBe([
      'Zdravo, želim da zakažem termin u Dirty Cut-u.',
      'Usluga: Šišanje + brada',
      'Datum: sreda, 14. 10. 2026.',
      'Vreme: 16:30',
      'Ime: Đorđe Čučković',
      'Telefon: +381 64 123 4567',
      'Napomena: Kraće sa strane, duže gore — šiške ž',
    ].join('\n'));
    // Sirovo kodiranje: Đ=%C4%90, đ=%C4%91, Č=%C4%8C, ć=%C4%87, š=%C5%A1, ž=%C5%BE, novi red=%0A
    const raw = url.split('?text=')[1];
    for (const enc of ['%C4%90or%C4%91e', '%C4%8Cu%C4%8Dkovi%C4%87', '%C5%A0i%C5%A1anje', '%C5%BEelim', '%0A']) {
      expect(raw).toContain(enc);
    }
    expect(raw).not.toContain('\n');
    // Posle slanja: napomena da je ovo zahtev
    await expect(page.locator('#bform-done')).toBeVisible();
    await expect(page.locator('#bform-done')).toContainText('salon će ti potvrditi termin');
  });

  test('SR: prazna opciona polja se preskaču', async ({ page, context }) => {
    await openSite(page, context, { lang: 'sr' });
    await fillBooking(page, { ...FULL, phone: '', note: '   ' });
    const popup = await clickAndCatchPopup(page, context, '#bf-wa');
    const text = textParam(popup.url());
    expect(text).not.toContain('Telefon:');
    expect(text).not.toContain('Napomena:');
    expect(text.split('\n')).toHaveLength(5);
  });

  test('EN: poruka na engleskom', async ({ page, context }) => {
    await openSite(page, context, { lang: 'en' });
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await fillBooking(page, { ...FULL, service: 'fade', name: 'Ana Šarić', note: '' });
    const popup = await clickAndCatchPopup(page, context, '#bf-wa');
    expect(textParam(popup.url())).toBe([
      'Hello, I would like to book an appointment at Dirty Cut.',
      'Service: Fade',
      'Date: Wednesday, 14 Oct 2026',
      'Time: 16:30',
      'Name: Ana Šarić',
      'Phone: +381 64 123 4567',
    ].join('\n'));
  });
});

test.describe('Zakazivanje — Instagram', () => {
  test('kopira tačnu poruku i otvara ig.me', async ({ page, context }) => {
    await openSite(page, context, { lang: 'sr' });
    await fillBooking(page, FULL);
    const popup = await clickAndCatchPopup(page, context, '#bf-ig');
    expect(popup.url()).toBe('https://ig.me/m/_dirty_cut_');
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toBe(await page.locator('#bform-message').textContent());
    expect(clip.startsWith('Zdravo, želim da zakažem termin u Dirty Cut-u.\nUsluga: Šišanje + brada')).toBe(true);
    await expect(page.locator('#toast')).toHaveText('Poruka je kopirana — nalepi je u Instagram chat');
  });

  test('EN: toast i poruka na engleskom', async ({ page, context }) => {
    await openSite(page, context, { lang: 'en' });
    await fillBooking(page, FULL);
    await clickAndCatchPopup(page, context, '#bf-ig');
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip.split('\n')[0]).toBe('Hello, I would like to book an appointment at Dirty Cut.');
    await expect(page.locator('#toast')).toHaveText('Message copied — paste it into the Instagram chat');
  });
});

test.describe('Zakazivanje — validacija', () => {
  test('prazna forma: greške za sva obavezna polja, ništa se ne otvara', async ({ page, context }) => {
    await openSite(page, context, { lang: 'sr' });
    let opened = false;
    context.on('page', () => { opened = true; });
    await page.locator('#booking-form').scrollIntoViewIfNeeded();
    await page.click('#bf-wa');
    await expect(page.locator('[data-error="service"]')).toHaveText('Izaberi uslugu.');
    await expect(page.locator('[data-error="date"]')).toHaveText('Izaberi datum.');
    await expect(page.locator('[data-error="time"]')).toHaveText('Izaberi okvirno vreme.');
    await expect(page.locator('[data-error="name"]')).toHaveText('Upiši ime i prezime (najmanje 2 slova).');
    await expect(page.locator('#bform-summary')).toBeVisible();
    await page.waitForTimeout(300);
    expect(opened).toBe(false);
  });

  test('datum u prošlosti', async ({ page, context }) => {
    await openSite(page, context, { lang: 'sr' });
    await fillBooking(page, { service: 'fade', name: 'Marko' });
    await page.fill('#bf-date', '2026-10-01');
    await page.click('#bf-wa');
    await expect(page.locator('[data-error="date"]')).toHaveText('Taj datum je prošao. Izaberi današnji ili neki budući dan.');
  });

  test('dan kada salon ne radi (utorak / nedelja)', async ({ page, context }) => {
    await openSite(page, context, { lang: 'sr' });
    await fillBooking(page, { service: 'fade', name: 'Marko' });
    await page.fill('#bf-date', '2026-10-13'); // utorak
    await page.click('#bf-wa');
    await expect(page.locator('[data-error="date"]')).toHaveText('Salon ne radi u utorak. Izaberi drugi dan.');
    await page.fill('#bf-date', '2026-10-18'); // nedelja
    await expect(page.locator('[data-error="date"]')).toHaveText('Salon ne radi u nedelju. Izaberi drugi dan.');
    // U traci dana zatvoreni dani su onemogućeni i objašnjavaju zašto
    const tue = page.locator('#bf-days label[data-iso="2026-10-13"]');
    await expect(tue.locator('input')).toBeDisabled();
    // labela onemogućenog polja: klik korisnika i dalje stiže do labele (prikaz objašnjenja)
    await tue.click({ force: true });
    await expect(page.locator('[data-error="date"]')).toHaveText('Salon ne radi u utorak. Izaberi drugi dan.');
  });

  test('EN: poruke o greškama na engleskom', async ({ page, context }) => {
    await openSite(page, context, { lang: 'en' });
    await fillBooking(page, { service: 'fade', name: 'M', phone: 'abc' });
    await page.fill('#bf-date', '2026-10-13');
    await page.click('#bf-wa');
    await expect(page.locator('[data-error="date"]')).toHaveText('The salon is closed on Tuesday. Choose another day.');
    await expect(page.locator('[data-error="name"]')).toHaveText('Enter your full name (at least 2 letters).');
    await expect(page.locator('[data-error="phone"]')).toHaveText('The phone number is not valid.');
  });

  test('termini prate radno vreme (subota samo pre podne)', async ({ page, context }) => {
    await openSite(page, context, { lang: 'sr' });
    await page.locator('#booking-form').scrollIntoViewIfNeeded();
    await page.locator('#bf-days label[data-iso="2026-10-17"]').click();
    const slots = await page.locator('#bf-slots input').evaluateAll((els) => els.map((e) => e.value));
    expect(slots).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30']);
  });
});
