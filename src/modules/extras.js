// Mapa (lenjo učitavanje), kursor-makaze, zrno, tekstura betona.
import { links } from '../config.js';
import { t } from '../lib/i18n.js';
import { prefersReducedMotion } from '../lib/ui.js';
import concreteUrl from '../assets/images/concrete-dark.jpg?url';

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
    f.addEventListener('load', () => box.querySelector('.map__placeholder')?.remove(), { once: true });
  };
  document.getElementById('map-load')?.addEventListener('click', load);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '300px' });
    io.observe(box);
  }
  document.addEventListener('langchange', () => { const f = box.querySelector('iframe'); if (f) f.title = t('a11y.mapTitle'); });
}

/* ── Zrno i beton (CSS promenljive) ── */
export function initTextures() {
  const root = document.documentElement;
  root.style.setProperty('--concrete-url', `url("${concreteUrl}")`);
  const make = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(160, 160);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    root.style.setProperty('--noise', `url("${c.toDataURL('image/png')}")`);
  };
  ('requestIdleCallback' in window ? requestIdleCallback : setTimeout)(make);
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
