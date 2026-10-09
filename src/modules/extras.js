// Mapa (lenjo učitavanje) i kursor-makaze.
import { links } from '../config.js';
import { t } from '../lib/i18n.js';
import { prefersReducedMotion } from '../lib/ui.js';

/* ── Google mapa: učitava se tek kada se sekcija približi ekranu ── */
export function initMap() {
  const box = document.getElementById('map');
  if (!box) return;
  let loaded = false;
  const load = () => {
    if (loaded) return;
    loaded = true;
    const f = document.createElement('iframe');
    f.src = links.mapEmbed();
    f.title = t('a11y.mapTitle');
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.allowFullscreen = true;
    box.appendChild(f);
  };
  // Ako okruženje zabrani Google mape (npr. pregled sa strogim CSP pravilima),
  // ukloni prazan okvir i prikaži karticu sa adresom i dugmetom za Google mape.
  document.addEventListener('securitypolicyviolation', (e) => {
    if (!/google\./.test(e.blockedURI || '')) return;
    box.querySelector('iframe')?.remove();
    box.classList.add('is-blocked');
    const btn = document.getElementById('map-load');
    if (btn && btn.tagName === 'BUTTON') {
      const a = document.createElement('a');
      a.className = btn.className;
      a.id = 'map-load';
      a.href = links.directions();
      a.target = '_blank';
      a.rel = 'noopener';
      a.innerHTML = '<span data-i18n="location.mapOpen"></span> <span aria-hidden="true">↗</span>';
      a.firstChild.textContent = t('location.mapOpen');
      btn.replaceWith(a);
      const note = box.querySelector('.map__note');
      if (note) { note.setAttribute('data-i18n', 'location.mapBlocked'); note.textContent = t('location.mapBlocked'); }
    }
  });
  document.getElementById('map-load')?.addEventListener('click', load);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '300px' });
    io.observe(box);
  }
  document.addEventListener('langchange', () => { const f = box.querySelector('iframe'); if (f) f.title = t('a11y.mapTitle'); });
}

/* ── Kursor-makaze: prati miš bez kašnjenja, "seče" na klik ── */
export function initCursor() {
  const mq = matchMedia('(pointer: fine) and (hover: hover)');
  if (!mq.matches || prefersReducedMotion()) return;
  const cur = document.getElementById('cursor');
  if (!cur) return;
  document.documentElement.classList.add('has-cursor');
  let x = -100, y = -100, raf = 0;
  const paint = () => { raf = 0; cur.style.transform = `translate3d(${x - 4}px, ${y - 4}px, 0)`; };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    cur.classList.remove('is-hidden');
    if (!raf) raf = requestAnimationFrame(paint);
    const interactive = e.target.closest?.('a, button, label, [role="tab"], .g-item, summary');
    const typing = e.target.closest?.('input, textarea, select');
    cur.classList.toggle('is-hover', !!interactive && !typing);
    cur.classList.toggle('is-hidden', !!typing);
  }, { passive: true });
  document.addEventListener('pointerleave', () => cur.classList.add('is-hidden'));
  window.addEventListener('pointerdown', () => {
    cur.classList.add('is-snip');
    setTimeout(() => cur.classList.remove('is-snip'), 140);
  });
}
