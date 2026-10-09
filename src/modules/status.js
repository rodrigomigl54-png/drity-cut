// "Otvoreno sada / Zatvoreno" indikator + tabela radnog vremena.
import { CONFIG, DAY_KEYS } from '../config.js';
import { t } from '../lib/i18n.js';
import { salonNow, openStatus } from '../lib/time.js';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function statusText(now = salonNow()) {
  const s = openStatus(now);
  if (s.open) return { open: true, label: t('status.open'), detail: t('status.closesAt', { time: s.closesAt }) };
  let detail = '';
  if (s.next) {
    if (s.next.offset === 0) detail = t('status.opensAt', { time: s.next.time });
    else if (s.next.offset === 1) detail = t('status.opensTomorrow', { time: s.next.time });
    else detail = t('status.opensOn', { day: t(`days.on${cap(s.next.dayKey)}`), time: s.next.time });
  }
  return { open: false, label: t('status.closed'), detail };
}

function renderStatus() {
  const s = statusText();
  document.querySelectorAll('[data-status]').forEach((el) => {
    el.classList.toggle('is-open', s.open);
    el.dataset.state = s.open ? 'open' : 'closed';
    const label = el.querySelector('[data-status-label]');
    const detail = el.querySelector('[data-status-detail]');
    if (label) label.textContent = s.label;
    if (detail) detail.textContent = '· ' + s.detail;
  });
}

function renderHours() {
  const table = document.getElementById('hours-table');
  if (!table) return;
  const todayKey = DAY_KEYS[salonNow().dow];
  const order = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const rows = order.map((k) => {
    const ranges = CONFIG.hours[k];
    const val = ranges.length ? ranges.map(([a, b]) => `${a} – ${b}`).join(' / ') : t('location.closed');
    return `<tr class="${k === todayKey ? 'is-today' : ''}"><th scope="row">${t(`days.${k}`)}</th><td class="${ranges.length ? '' : 'is-closed'}">${val}</td></tr>`;
  });
  table.innerHTML = `<tbody>${rows.join('')}</tbody>`;
}

export function initStatus() {
  const render = () => { renderStatus(); renderHours(); };
  render();
  setInterval(render, 30_000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  document.addEventListener('langchange', render);
}
