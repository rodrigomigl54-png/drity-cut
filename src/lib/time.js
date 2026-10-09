// Vreme po zoni salona (Europe/Belgrade), nezavisno od zone posetioca.
import { CONFIG, DAY_KEYS } from '../config.js';

const fmtCache = new Map();
function formatter(tz) {
  if (!fmtCache.has(tz)) {
    fmtCache.set(tz, new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }));
  }
  return fmtCache.get(tz);
}

/** Trenutni datum/vreme u Beogradu: { iso: 'YYYY-MM-DD', minutes, dow } */
export function salonNow(date = new Date()) {
  const parts = Object.fromEntries(formatter(CONFIG.timeZone).formatToParts(date).map((p) => [p.type, p.value]));
  const iso = `${parts.year}-${parts.month}-${parts.day}`;
  return { iso, minutes: Number(parts.hour) * 60 + Number(parts.minute), dow: dowOf(iso) };
}

export const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const fromMin = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

const isoToUTC = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
export const dowOf = (iso) => new Date(isoToUTC(iso)).getUTCDay();
export const addDays = (iso, n) => new Date(isoToUTC(iso) + n * 864e5).toISOString().slice(0, 10);
export const isValidISO = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso || '') && !Number.isNaN(isoToUTC(iso)) && new Date(isoToUTC(iso)).toISOString().slice(0, 10) === iso;

export const rangesFor = (iso) => CONFIG.hours[DAY_KEYS[dowOf(iso)]] || [];
export const isClosedDay = (iso) => rangesFor(iso).length === 0;

/** Termini (početna vremena) za dan, svakih N minuta. Za danas: samo budući. */
export function slotsFor(iso, now = salonNow()) {
  const step = CONFIG.booking.slotMinutes;
  const out = [];
  for (const [a, b] of rangesFor(iso)) {
    for (let m = toMin(a); m + step <= toMin(b); m += step) {
      if (iso === now.iso && m <= now.minutes) continue;
      out.push(fromMin(m));
    }
  }
  return out;
}

/**
 * Status radnog vremena.
 * { open: true, closesAt: 'HH:MM' }  ili
 * { open: false, next: { offset: dani do otvaranja, dayKey, time } }
 */
export function openStatus(now = salonNow()) {
  const today = rangesFor(now.iso);
  for (const [a, b] of today) {
    if (now.minutes >= toMin(a) && now.minutes < toMin(b)) return { open: true, closesAt: b };
  }
  for (const [a] of today) {
    if (toMin(a) > now.minutes) return { open: false, next: { offset: 0, dayKey: DAY_KEYS[now.dow], time: a } };
  }
  for (let i = 1; i <= 7; i++) {
    const iso = addDays(now.iso, i);
    const r = rangesFor(iso);
    if (r.length) return { open: false, next: { offset: i, dayKey: DAY_KEYS[dowOf(iso)], time: r[0][0] } };
  }
  return { open: false, next: null };
}
