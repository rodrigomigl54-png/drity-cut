// Čista logika zakazivanja (bez DOM-a): validacija i sastavljanje poruke.
import services from '../data/services.json';
import { DAY_KEYS, links } from '../config.js';
import { tFor } from './i18n.js';
import { salonNow, isValidISO, isClosedDay, slotsFor, rangesFor, toMin, dowOf } from './time.js';

export const serviceById = (id) => services.find((s) => s.id === id);
export const serviceName = (s, lang) => (lang === 'en' ? s.name_en : s.name_sr);

export function formatDate(iso, lang) {
  const [y, m, d] = iso.split('-').map(Number);
  const dayKey = DAY_KEYS[dowOf(iso)];
  const dayName = tFor(lang, `days.${dayKey}`);
  if (lang === 'en') return `${dayName}, ${d} ${tFor('en', 'months.short')[m - 1]} ${y}`;
  return `${dayName}, ${d}. ${m}. ${y}.`;
}

const PHONE_RE = /^\+?[0-9][0-9 ()/.-]{5,20}$/;

/**
 * Validira podatke forme. Vraća objekat { polje: poruka } (prazan = ispravno).
 * data: { service, date, time, name, phone, note }
 */
export function validateBooking(data, lang, now = salonNow()) {
  const e = {};
  const err = (k, vars) => tFor(lang, `booking.errors.${k}`, vars);

  if (!data.service || !serviceById(data.service)) e.service = err('service');

  if (!data.date) e.date = err('date');
  else if (!isValidISO(data.date)) e.date = err('date');
  else if (data.date < now.iso) e.date = err('datePast');
  else if (isClosedDay(data.date)) {
    e.date = err('dateClosed', { day: tFor(lang, `days.on${cap(DAY_KEYS[dowOf(data.date)])}`) });
  }

  if (!e.date) {
    if (!data.time) e.time = err('time');
    else {
      const inHours = rangesFor(data.date).some(([a, b]) => toMin(data.time) >= toMin(a) && toMin(data.time) < toMin(b));
      const future = slotsFor(data.date, now).includes(data.time);
      if (!inHours || !future) e.time = err('timeInvalid');
    }
  } else if (!data.time) {
    e.time = err('time');
  }

  const name = (data.name || '').trim();
  if (name.replace(/[^\p{L}]/gu, '').length < 2) e.name = err('name');

  const phone = (data.phone || '').trim();
  if (phone && !PHONE_RE.test(phone)) e.phone = err('phone');

  return e;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Sastavlja tekst poruke za WhatsApp/Instagram. Prazna opciona polja se preskaču. */
export function buildMessage(data, lang) {
  const L = (k) => tFor(lang, `booking.message.${k}`);
  const s = serviceById(data.service);
  const lines = [
    L('greeting'),
    `${L('service')}: ${s ? serviceName(s, lang) : data.service}`,
    `${L('date')}: ${formatDate(data.date, lang)}`,
    `${L('time')}: ${data.time}`,
    `${L('name')}: ${data.name.trim()}`,
  ];
  if (data.phone && data.phone.trim()) lines.push(`${L('phone')}: ${data.phone.trim()}`);
  if (data.note && data.note.trim()) lines.push(`${L('note')}: ${data.note.trim().replace(/\s*\n\s*/g, ' ')}`);
  return lines.join('\n');
}

export const whatsappUrl = (message) => links.whatsapp(message);
