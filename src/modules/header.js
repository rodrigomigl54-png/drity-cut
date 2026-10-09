// Header koji se smanjuje pri skrolovanju, aktivni link i mobilni meni.
import { t } from '../lib/i18n.js';

export function initHeader() {
  const header = document.getElementById('header');
  const onScroll = () => header.classList.toggle('is-solid', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Aktivni link u navigaciji
  const links = [...document.querySelectorAll('.nav__link')];
  const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const a = map.get(e.target.id);
      if (a && e.isIntersecting) {
        links.forEach((l) => { l.classList.remove('is-active'); l.removeAttribute('aria-current'); });
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'true');
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });

  initMobileMenu();
}

function initMobileMenu() {
  const burger = document.getElementById('burger');
  const menu = document.getElementById('mobile-menu');
  let lastFocus = null;

  const focusables = () => [burger, ...menu.querySelectorAll('a, button')];

  const open = () => {
    lastFocus = document.activeElement;
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add('is-open'));
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', t('a11y.menuClose'));
    document.body.classList.add('is-locked');
    menu.querySelector('a')?.focus({ preventScroll: true });
  };
  const close = (restore = true) => {
    menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', t('a11y.menuOpen'));
    document.body.classList.remove('is-locked');
    setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 560);
    if (restore) (lastFocus || burger).focus({ preventScroll: true });
  };
  const isOpen = () => burger.getAttribute('aria-expanded') === 'true';

  burger.addEventListener('click', () => (isOpen() ? close() : open()));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) close(false); });
  document.addEventListener('keydown', (e) => {
    if (!isOpen()) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = focusables();
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  window.matchMedia('(min-width: 1081px)').addEventListener('change', (m) => { if (m.matches && isOpen()) close(false); });
  document.addEventListener('langchange', () => burger.setAttribute('aria-label', t(isOpen() ? 'a11y.menuClose' : 'a11y.menuOpen')));
}
