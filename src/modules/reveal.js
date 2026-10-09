// Scroll animacije (GSAP + ScrollTrigger): naslovi se "seku" na mesto,
// slike se otkrivaju čistim clip-path potezom. Kratko (≤600 ms) i nenametljivo.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initReveal() {
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // Naslovi sekcija (hero ima svoju animaciju)
    gsap.utils.toArray('.section .h-cut').forEach((el) => {
      gsap.fromTo(el, { '--s': 1 }, {
        '--s': 0, duration: 0.6, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });

    // Slike: wipe po dijagonali
    gsap.utils.toArray('.reveal-img').forEach((el, i) => {
      gsap.fromTo(el,
        { clipPath: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)' },
        {
          clipPath: 'polygon(0% 0%, 112% 0%, 100% 100%, -12% 100%)', duration: 0.6, ease: 'power3.inOut',
          delay: (i % 3) * 0.06,
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
          onComplete: () => { el.style.clipPath = ''; },
        });
    });

    // Redovi cenovnika i ostali elementi: kratko podizanje
    gsap.utils.toArray('.price-list, .rating, .leave, .facts, .bform, .contact, .hours').forEach((el) => {
      gsap.from(el.children, {
        y: 16, opacity: 0, duration: 0.5, ease: 'power2.out', stagger: 0.04,
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        clearProps: 'transform,opacity',
      });
    });

    // Akcentni odsjaj koji preleti preko dijagonalnih razdelnika
    gsap.utils.toArray('.divider').forEach((el) => {
      gsap.fromTo(el, { '--glint': '-120%' }, {
        '--glint': '920%', duration: 1.1, ease: 'power2.inOut',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      });
    });

    // Blagi paralaks hero fotografije
    gsap.to('.hero__media', {
      yPercent: 8, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
  });

  // Ponovo izračunaj pozicije kada se promene sadržaji (jezik, fontovi)
  document.addEventListener('langchange', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
