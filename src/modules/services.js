// Usluge i cene — tabovi Muško / Žensko, podaci iz src/data/services.json.
import services from '../data/services.json';
import { t, getLang } from '../lib/i18n.js';
import { escapeHtml } from '../lib/ui.js';

const fmtPrice = (n) => new Intl.NumberFormat(getLang() === 'en' ? 'en-GB' : 'sr-RS').format(n);

function rowHtml(s) {
  const name = getLang() === 'en' ? s.name_en : s.name_sr;
  const price = s.price_rsd == null
    ? `<span class="price__value price__value--ask">${t('services.priceOnRequest')}</span>`
    : `<span class="price__value">${fmtPrice(s.price_rsd)} ${t('services.currency')}${s.duration_min ? `<small>${t('services.minutes', { n: s.duration_min })}</small>` : ''}</span>`;
  return `<li class="price">
    <span class="price__name">${escapeHtml(name)}</span>
    <span class="price__fill" aria-hidden="true"></span>
    ${price}
    <button class="price__book" type="button" data-book="${s.id}">${t('services.bookThis')} <span aria-hidden="true">→</span><span class="sr-only"> — ${escapeHtml(name)}</span></button>
  </li>`;
}

function render() {
  document.querySelectorAll('[data-services]').forEach((ul) => {
    const cat = ul.getAttribute('data-services');
    ul.innerHTML = services.filter((s) => s.category === cat).map(rowHtml).join('');
  });
  moveInk();
}

function moveInk() {
  const sel = document.querySelector('.tabs__btn[aria-selected="true"]');
  const ink = document.querySelector('.tabs__ink');
  if (!sel || !ink) return;
  const label = sel.querySelector('span') || sel;
  ink.style.setProperty('--ink-x', `${sel.offsetLeft}px`);
  ink.style.setProperty('--ink-w', `${label.offsetWidth}px`);
}

function initTabs() {
  const tabs = [...document.querySelectorAll('.tabs__btn')];
  const select = (tab, focus) => {
    tabs.forEach((b) => {
      const on = b === tab;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      document.getElementById(b.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
    moveInk();
  };
  tabs.forEach((b, i) => {
    b.addEventListener('click', () => select(b));
    b.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        select(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true);
      }
      if (e.key === 'Home') { e.preventDefault(); select(tabs[0], true); }
      if (e.key === 'End') { e.preventDefault(); select(tabs[tabs.length - 1], true); }
    });
  });
  window.addEventListener('resize', moveInk, { passive: true });
  document.fonts?.ready.then(moveInk);
}

export function initServices() {
  render();
  initTabs();
  document.addEventListener('langchange', render);
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-book]');
    if (!b) return;
    document.dispatchEvent(new CustomEvent('book-service', { detail: { id: b.dataset.book } }));
    document.getElementById('zakazivanje').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
}
