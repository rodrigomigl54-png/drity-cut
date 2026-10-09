import '@fontsource/anton/400.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import './styles/main.css';

import { initI18n } from './lib/i18n.js';
import { initStatus } from './modules/status.js';
import { initHeader } from './modules/header.js';
import { initServices } from './modules/services.js';
import { initGallery } from './modules/gallery.js';
import { initReviews } from './modules/reviews.js';
import { initBooking } from './modules/booking.js';
import { initMap, initCursor } from './modules/extras.js';
import { runIntro } from './intro/controller.js';

const root = document.documentElement;
const ready = () => root.classList.add('is-ready');

// 1) Sajt se kompletno iscrtava odmah (ispod intra)
initI18n();
initHeader();
initStatus();
initServices();
initGallery();
initReviews();
initBooking();
initMap();
initCursor();

// 2) Intro (3D deo se učitava kao zaseban chunk)
document.addEventListener('intro:reveal', ready, { once: true });
runIntro().then(ready);

// 3) Scroll animacije (GSAP) — učitavaju se posle prvog iscrtavanja
const loadReveal = () => import('./modules/reveal.js').then((m) => m.initReveal());
if (document.readyState === 'complete') loadReveal();
else window.addEventListener('load', loadReveal, { once: true });
