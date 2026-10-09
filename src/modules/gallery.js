// Galerija radova + lightbox (prevlačenje na mobilnom, strelice na desktopu).
import manifest from '../assets/images/manifest.json';
import { t } from '../lib/i18n.js';
import { CONFIG, links } from '../config.js';

const urls = import.meta.glob('../assets/images/*-{480,960,1440,1800}.{avif,webp,jpg}', {
  eager: true, query: '?url', import: 'default',
});
const url = (name, w, ext) => urls[`../assets/images/${name}-${w}.${ext}`];

// Redosled i raspored fotografija
const ITEMS = [
  { name: 'work-1', alt: 'gallery.alt.work1', cls: 'g-item--a' },
  { name: 'salon-1', alt: 'gallery.alt.salon1', cls: 'g-item--b' },
  { name: 'work-2', alt: 'gallery.alt.work2', cls: 'g-item--c' },
  { name: 'salon-2', alt: 'gallery.alt.salon2', cls: 'g-item--d' },
];

const srcset = (name, ext) => manifest[name].widths.map((w) => `${url(name, w, ext)} ${w}w`).join(', ');
const largest = (name) => manifest[name].widths[manifest[name].widths.length - 1];

function pictureHtml(item, sizes, eager = false) {
  const m = manifest[item.name];
  const big = largest(item.name);
  return `<picture>
    <source type="image/avif" srcset="${srcset(item.name, 'avif')}" sizes="${sizes}">
    <source type="image/webp" srcset="${srcset(item.name, 'webp')}" sizes="${sizes}">
    <img src="${url(item.name, big >= 960 ? 960 : big, 'jpg')}" srcset="${srcset(item.name, 'jpg')}" sizes="${sizes}"
      width="${m.w}" height="${m.h}" alt="${t(item.alt)}" ${eager ? '' : 'loading="lazy"'} decoding="async">
  </picture>`;
}

function render(grid) {
  const tiles = ITEMS.map((item, i) => `
    <button type="button" class="g-item ${item.cls} reveal-img" data-index="${i}" aria-label="${t('gallery.open', { alt: t(item.alt) })}">
      ${pictureHtml(item, '(min-width: 900px) 50vw, 100vw')}
      <span class="g-item__no" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
    </button>`).join('');
  const insta = `
    <a class="g-insta reveal-img" href="${links.instagram()}" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor"/></svg>
      <span class="g-insta__title">${t('gallery.instaTitle')}</span>
      <span class="g-insta__cta">${t('gallery.instaCta', { handle: CONFIG.INSTAGRAM_HANDLE })} <span aria-hidden="true">↗</span></span>
    </a>`;
  grid.innerHTML = tiles + insta;
}

export function initGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;
  render(grid);
  document.addEventListener('langchange', () => {
    // Zadrži stanje animacije — samo osveži tekstove
    grid.querySelectorAll('.g-item').forEach((b) => {
      const item = ITEMS[+b.dataset.index];
      b.setAttribute('aria-label', t('gallery.open', { alt: t(item.alt) }));
      b.querySelector('img').alt = t(item.alt);
    });
    const insta = grid.querySelector('.g-insta');
    insta.querySelector('.g-insta__title').textContent = t('gallery.instaTitle');
    insta.querySelector('.g-insta__cta').firstChild.textContent = t('gallery.instaCta', { handle: CONFIG.INSTAGRAM_HANDLE }) + ' ';
  });
  initLightbox(grid);
}

function initLightbox(grid) {
  const lb = document.getElementById('lightbox');
  const pic = lb.querySelector('.lightbox__pic');
  const caption = lb.querySelector('.lightbox__caption');
  const counter = lb.querySelector('.lightbox__counter');
  const btnClose = lb.querySelector('.lightbox__close');
  const btnPrev = lb.querySelector('.lightbox__prev');
  const btnNext = lb.querySelector('.lightbox__next');
  let index = 0;
  let opener = null;

  const show = (i) => {
    index = (i + ITEMS.length) % ITEMS.length;
    const item = ITEMS[index];
    pic.innerHTML = pictureHtml(item, '92vw', true).replace(/<picture>|<\/picture>/g, '');
    pic.querySelector('img').classList.add('lightbox__img');
    caption.textContent = t(item.alt);
    counter.textContent = t('gallery.counter', { i: index + 1, n: ITEMS.length });
    lb.setAttribute('aria-label', t(item.alt));
    lb.classList.remove('is-anim');
    void lb.offsetWidth;
    lb.classList.add('is-anim');
  };
  const open = (i, from) => {
    opener = from;
    lb.hidden = false;
    document.body.classList.add('is-locked');
    show(i);
    btnClose.focus();
  };
  const close = () => {
    lb.hidden = true;
    document.body.classList.remove('is-locked');
    opener?.focus();
  };

  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.g-item');
    if (b) open(+b.dataset.index, b);
  });
  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', () => show(index - 1));
  btnNext.addEventListener('click', () => show(index + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lightbox__frame')) close(); });

  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'ArrowRight') show(index + 1);
    else if (e.key === 'Tab') {
      const f = [btnClose, btnPrev, btnNext];
      const i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
    }
  });

  // Prevlačenje (swipe)
  let x0 = null, y0 = null;
  lb.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; });
  lb.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
    x0 = null;
  });
  lb.addEventListener('pointercancel', () => { x0 = null; });
}
