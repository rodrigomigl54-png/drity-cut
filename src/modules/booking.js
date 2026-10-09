// Forma za zakazivanje: WhatsApp (popunjena poruka) i Instagram (kopiraj + otvori DM).
import services from '../data/services.json';
import { CONFIG, DAY_KEYS, links } from '../config.js';
import { t, tRaw, getLang } from '../lib/i18n.js';
import { salonNow, addDays, dowOf, isClosedDay, slotsFor, isValidISO } from '../lib/time.js';
import { validateBooking, buildMessage, whatsappUrl, serviceName } from '../lib/booking-core.js';
import { toast, copyText, openExternal, escapeHtml } from '../lib/ui.js';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function initBooking() {
  const form = document.getElementById('booking-form');
  if (!form) return;
  const el = {
    service: form.elements.service,
    date: form.elements.date,
    days: document.getElementById('bf-days'),
    slots: document.getElementById('bf-slots'),
    name: form.elements.name,
    phone: form.elements.phone,
    note: form.elements.note,
    summary: document.getElementById('bform-summary'),
    done: document.getElementById('bform-done'),
    message: document.getElementById('bform-message'),
  };
  let time = '';
  let attempted = false;

  /* ── Usluge u padajućem meniju ── */
  const renderServices = () => {
    const lang = getLang();
    const cur = el.service.value;
    const group = (cat, label) => `<optgroup label="${label}">${services
      .filter((s) => s.category === cat)
      .map((s) => `<option value="${s.id}">${escapeHtml(serviceName(s, lang))}</option>`).join('')}</optgroup>`;
    el.service.innerHTML = `<option value="">${t('booking.servicePlaceholder')}</option>`
      + group('musko', t('booking.groupMen')) + group('zensko', t('booking.groupWomen'));
    el.service.value = cur;
  };

  /* ── Traka sa danima ── */
  const renderDays = () => {
    const now = salonNow();
    const months = tRaw('months.short');
    el.date.min = now.iso;
    const chips = [];
    for (let i = 0; i < CONFIG.booking.daysAhead; i++) {
      const iso = addDays(now.iso, i);
      const key = DAY_KEYS[dowOf(iso)];
      const closed = isClosedDay(iso);
      const full = !closed && slotsFor(iso, now).length === 0;
      const disabled = closed || full;
      const [, m, d] = iso.split('-').map(Number);
      const dow = i === 0 ? t('days.today') : t(`days.short.${key}`);
      const aria = `${t(`days.${key}`)} ${d}. ${months[m - 1]}${closed ? ` — ${t('days.closed')}` : ''}`;
      chips.push(`<label class="chip${disabled ? ' is-closed' : ''}" data-iso="${iso}" data-closed="${closed}">
        <input type="radio" name="day" value="${iso}" ${disabled ? 'disabled' : ''} ${el.date.value === iso ? 'checked' : ''} aria-label="${aria}">
        <span class="chip__face"><span class="chip__dow">${dow}</span><span class="chip__day">${d}</span><span class="chip__mon">${closed ? t('days.closed') : months[m - 1]}</span></span>
      </label>`);
    }
    el.days.innerHTML = chips.join('');
  };

  /* ── Termini ── */
  const renderSlots = () => {
    const iso = el.date.value;
    if (!iso || !isValidISO(iso) || iso < salonNow().iso || isClosedDay(iso)) {
      el.slots.innerHTML = `<p class="slots__hint">${t('booking.timeHint')}</p>`;
      time = '';
      return;
    }
    const slots = slotsFor(iso);
    if (!slots.length) {
      el.slots.innerHTML = `<p class="slots__hint">${t('booking.noSlots')}</p>`;
      time = '';
      return;
    }
    if (!slots.includes(time)) time = '';
    el.slots.innerHTML = slots.map((s) => `<label class="chip chip--slot">
      <input type="radio" name="time" value="${s}" ${s === time ? 'checked' : ''}>
      <span class="chip__face">${s}</span></label>`).join('');
  };

  const data = () => ({
    service: el.service.value,
    date: el.date.value,
    time,
    name: el.name.value,
    phone: el.phone.value,
    note: el.note.value,
  });

  /* ── Greške ── */
  const fieldOf = (name) => form.querySelector(`[data-error="${name}"]`)?.closest('.field');
  const showErrors = (errors) => {
    for (const name of ['service', 'date', 'time', 'name', 'phone']) {
      const msg = errors[name] || '';
      form.querySelector(`[data-error="${name}"]`).textContent = msg;
      fieldOf(name)?.classList.toggle('is-invalid', !!msg);
      const input = { service: el.service, name: el.name, phone: el.phone, date: el.date }[name];
      if (input) input.setAttribute('aria-invalid', String(!!msg));
    }
    const n = Object.keys(errors).length;
    el.summary.hidden = n === 0;
    el.summary.textContent = n ? t('booking.errors.summary') : '';
  };
  const validateLive = () => { if (attempted) showErrors(validateBooking(data(), getLang())); };

  /* ── Događaji ── */
  el.days.addEventListener('change', (e) => {
    if (e.target.name !== 'day') return;
    el.date.value = e.target.value;
    renderSlots();
    validateLive();
  });
  // Klik na zatvoren dan: objasni zašto nije moguće
  el.days.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip.is-closed');
    if (!chip) return;
    const iso = chip.dataset.iso;
    const msg = chip.dataset.closed === 'true'
      ? t('booking.errors.dateClosed', { day: t(`days.on${cap(DAY_KEYS[dowOf(iso)])}`) })
      : t('booking.noSlots');
    form.querySelector('[data-error="date"]').textContent = msg;
    fieldOf('date').classList.add('is-invalid');
  });
  el.date.addEventListener('change', () => {
    el.days.querySelectorAll('input').forEach((r) => { r.checked = r.value === el.date.value; });
    renderSlots();
    attempted = attempted || !!el.date.value;
    validateLive();
  });
  el.slots.addEventListener('change', (e) => {
    if (e.target.name === 'time') { time = e.target.value; validateLive(); }
  });
  ['service', 'name', 'phone'].forEach((k) => el[k].addEventListener('input', validateLive));
  el.service.addEventListener('change', validateLive);

  document.addEventListener('book-service', (e) => {
    el.service.value = e.detail.id;
    validateLive();
    setTimeout(() => el.service.focus({ preventScroll: true }), 500);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    attempted = true;
    const lang = getLang();
    const d = data();
    const errors = validateBooking(d, lang);
    showErrors(errors);
    if (Object.keys(errors).length) {
      const first = Object.keys(errors)[0];
      const target = { service: el.service, name: el.name, phone: el.phone, date: el.days.querySelector('input:not(:disabled)') || el.date, time: el.slots.querySelector('input') || el.date }[first];
      target?.focus();
      return;
    }

    const message = buildMessage(d, lang);
    el.message.textContent = message;
    el.done.hidden = false;

    if (e.submitter?.value === 'instagram') {
      const ok = await copyText(message);
      if (ok) toast(t('booking.copied'), 5200);
      else { toast(t('booking.copyFailed'), 6000); el.done.querySelector('details').open = true; }
      openExternal(links.instagramDM(), links.instagram());
    } else {
      openExternal(whatsappUrl(message));
    }
  });

  const renderAll = () => { renderServices(); renderDays(); renderSlots(); validateLive(); };
  renderAll();
  document.addEventListener('langchange', () => {
    renderAll();
    if (!el.done.hidden && !Object.keys(validateBooking(data(), getLang())).length) {
      el.message.textContent = buildMessage(data(), getLang());
    }
  });
  // Osveži traku dana iza ponoći / posle dužeg mirovanja
  setInterval(() => { renderDays(); renderSlots(); }, 5 * 60_000);
}
