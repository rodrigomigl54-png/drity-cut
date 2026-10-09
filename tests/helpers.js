// Zajednički pomoćnici za testove.

/** Ponedeljak 12. 10. 2026. u 08:00 po Beogradu (pre otvaranja). */
export const MONDAY_MORNING = new Date('2026-10-12T08:00:00+02:00');

/** Fiksira sat, presreće spoljne linkove i otvara sajt bez intra. */
export async function openSite(page, context, { lang = 'sr', time = MONDAY_MORNING, query = '?intro=off' } = {}) {
  // Lažni sat koji teče normalno (GSAP animacije rade), počinje od zadatog trenutka
  await page.clock.install({ time });
  // Jezik se postavlja samo pri prvom učitavanju, da test može da proveri pamćenje izbora
  await context.addInitScript((l) => {
    try {
      if (!sessionStorage.getItem('dc-test-lang')) {
        localStorage.setItem('dc-lang', l);
        sessionStorage.setItem('dc-test-lang', '1');
      }
    } catch {}
  }, lang);
  // Spoljni servisi se ne učitavaju u testu — proveravamo samo tačan URL.
  for (const pattern of ['https://wa.me/**', 'https://ig.me/**', 'https://instagram.com/**', 'https://www.instagram.com/**', 'https://www.google.com/maps**', 'https://share.google/**']) {
    await context.route(pattern, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title><p>external</p>' }));
  }
  await page.goto('/' + query);
  await page.waitForFunction(() => document.documentElement.dataset.intro === 'off' || document.documentElement.dataset.intro === 'done');
}

/** Popunjava formu za zakazivanje. */
export async function fillBooking(page, { service, date, time, name, phone, note }) {
  const form = page.locator('#booking-form');
  await form.scrollIntoViewIfNeeded();
  if (service) await page.selectOption('#bf-service', service);
  if (date) await page.locator(`#bf-days label[data-iso="${date}"]`).click();
  if (time) await page.locator(`#bf-slots input[value="${time}"]`).check({ force: true });
  if (name != null) await page.fill('#bf-name', name);
  if (phone != null) await page.fill('#bf-phone', phone);
  if (note != null) await page.fill('#bf-note', note);
}

/** Klikne dugme i vrati URL prozora koji se otvori. */
export async function clickAndCatchPopup(page, context, selector) {
  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    page.click(selector),
  ]);
  await popup.waitForLoadState('domcontentloaded').catch(() => {});
  return popup;
}

export function textParam(url) {
  return new URL(url).searchParams.get('text');
}
