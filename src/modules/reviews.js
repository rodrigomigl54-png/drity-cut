// Ocene: Google blok (5.0 / 81), slajder pravih recenzija (iz reviews.json,
// prikazanih nasumičnim redosledom) i forma "Ostavi ocenu".
import reviews from '../data/reviews.json';
import { CONFIG, links } from '../config.js';
import { t, tRaw, getLang } from '../lib/i18n.js';
import { toast, copyText, openExternal, escapeHtml, prefersReducedMotion } from '../lib/ui.js';

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const order = shuffle(reviews);

function renderCards() {
  const slider = document.getElementById('reviews-slider');
  const track = document.getElementById('reviews-track');
  if (!order.length) { slider.hidden = true; return; }
  slider.hidden = false;
  const lang = getLang();
  track.innerHTML = order.map((r) => {
    const text = (lang === 'en' && r.text_en) ? r.text_en : r.text_sr;
    return `<article class="rcard">
      <div class="rcard__stars" role="img" aria-label="${t('a11y.stars', { n: r.rating })}">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
      <p class="rcard__text">${escapeHtml(text)}</p>
      <footer class="rcard__foot"><span class="rcard__author">${escapeHtml(r.author)}</span><span>${escapeHtml(r.date || '')}</span></footer>
    </article>`;
  }).join('');
}

function initDrag() {
  const track = document.getElementById('reviews-track');
  let down = false, startX = 0, startScroll = 0, moved = false;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return; // dodir koristi nativno skrolovanje
    down = true; moved = false; startX = e.clientX; startScroll = track.scrollLeft;
    track.classList.add('is-dragging');
  });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 3) moved = true;
    track.scrollLeft = startScroll - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!down) return;
    down = false;
    track.classList.remove('is-dragging');
  });
  track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') track.scrollBy({ left: 320, behavior: 'smooth' });
    if (e.key === 'ArrowLeft') track.scrollBy({ left: -320, behavior: 'smooth' });
  });
}

function initRatingAnim() {
  const stars = document.querySelector('.rating__stars');
  const num = document.querySelector('.rating__num');
  if (!stars) return;
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) { stars.classList.add('is-lit'); return; }
  const target = CONFIG.rating;
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    stars.classList.add('is-lit');
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 1100);
      num.textContent = (target * (1 - Math.pow(1 - p, 3))).toFixed(1);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, { threshold: 0.4 });
  io.observe(stars);
}

/* ── Ostavi ocenu ──────────────────────────────────────────── */

function initLeaveReview() {
  const form = document.getElementById('leave-review');
  const box = document.getElementById('star-input');
  const label = document.getElementById('star-label');
  let rating = 0;

  const paint = (n, cls) => box.querySelectorAll('label').forEach((l, i) => l.classList.toggle(cls, i < n));
  const updateLabel = () => { label.textContent = rating ? tRaw('reviews.ratingLabels')[rating - 1] : ''; };

  const renderStars = () => {
    box.innerHTML = [1, 2, 3, 4, 5].map((n) => `
      <input type="radio" name="rating" id="lr-star-${n}" value="${n}" ${rating === n ? 'checked' : ''}>
      <label for="lr-star-${n}" data-n="${n}"><span aria-hidden="true">★</span><span class="sr-only">${t('a11y.stars', { n })}</span></label>`).join('');
    paint(rating, 'is-on');
    updateLabel();
  };
  renderStars();

  box.addEventListener('change', (e) => {
    rating = +e.target.value;
    paint(rating, 'is-on');
    updateLabel();
    setError('rating', '');
  });
  box.addEventListener('pointerover', (e) => { const l = e.target.closest('label'); if (l) paint(+l.dataset.n, 'is-hover'); });
  box.addEventListener('pointerleave', () => paint(0, 'is-hover'));

  const setError = (name, msg) => { form.querySelector(`[data-error="${name}"]`).textContent = msg; };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const target = e.submitter?.value || 'google';
    const text = form.elements.text.value.trim();
    const name = form.elements.name.value.trim();
    let ok = true;
    if (!rating) { setError('rating', t('reviews.errRating')); ok = false; } else setError('rating', '');
    if (text.length < 10) { setError('text', t('reviews.errText')); ok = false; } else setError('text', '');
    if (!ok) { (rating ? form.elements.text : box.querySelector('input')).focus(); return; }

    if (target === 'google') {
      // Na Google ide samo tekst (zvezdice korisnik bira na samom Google-u)
      await copyText(text);
      toast(t('reviews.copiedGoogle'), 5200);
      openExternal(CONFIG.googleProfileUrl);
    } else {
      const msg = [
        t('reviews.messageIntro', { stars: '★'.repeat(rating) + '☆'.repeat(5 - rating), n: rating }),
        text,
        name ? t('reviews.messageFrom', { name }) : '',
      ].filter(Boolean).join('\n');
      openExternal(links.whatsapp(msg));
      toast(t('reviews.thanks'));
    }
  });

  document.addEventListener('langchange', renderStars);
}

export function initReviews() {
  renderCards();
  initDrag();
  initRatingAnim();
  initLeaveReview();
  document.addEventListener('langchange', renderCards);
}
