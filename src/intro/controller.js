// Upravlja uvodom: da li se prikazuje, 3D ili 2D verzija, "Preskoči", zvuk,
// sigurnosni tajmer. Sajt se iscrtava ispod intra za sve vreme trajanja.
import { t } from '../lib/i18n.js';
import { prefersReducedMotion } from '../lib/ui.js';
import { setSoundEnabled, isSoundEnabled } from './sound.js';

const SEEN_KEY = 'dc-intro-seen';
const root = document.documentElement;

function markSeen() {
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
}

/**
 * 'hw' = WebGL sa GPU ubrzanjem, 'sw' = softverski WebGL (SwiftShader/llvmpipe —
 * 3D bi išao 1–2 fps i blokirao stranu), false = nema WebGL-a.
 * ?gl=force preskače proveru (za testove i snimke ekrana).
 */
export function webglSupport() {
  if (/[?&]webgl=off/.test(location.search)) return false;
  try {
    const c = document.createElement('canvas');
    const gl = window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'));
    if (!gl) return false;
    if (/[?&]gl=force/.test(location.search)) return 'hw';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer) ? 'sw' : 'hw';
  } catch {
    return false;
  }
}

/**
 * Pokreće intro. Vraća Promise koji se razrešava kada je sajt potpuno vidljiv.
 */
export function runIntro() {
  const intro = document.getElementById('intro');
  if (root.dataset.intro !== 'pending' || !intro) {
    root.dataset.intro = 'off';
    intro?.remove();
    return Promise.resolve('off');
  }

  root.dataset.intro = 'playing';
  markSeen();

  return new Promise((resolve) => {
    let finished = false;
    let scene = null;
    const skipBtn = document.getElementById('intro-skip');
    const soundBtn = document.getElementById('intro-sound');

    const finish = (how = 'done') => {
      if (finished) return;
      finished = true;
      clearTimeout(safety);
      document.removeEventListener('keydown', onKey);
      root.dataset.intro = 'done';
      root.dataset.introResult = how;
      intro.remove();
      try { scene?.dispose(); } catch { /* ignore */ }
      scene = null;
      resolve(how);
    };

    const skip = () => {
      if (finished) return;
      if (scene?.skip) { scene.skip(); return; }
      intro.classList.add('is-leaving');
      setTimeout(() => finish('skipped'), 350);
    };

    const onKey = (e) => { if (e.key === 'Escape') skip(); };
    document.addEventListener('keydown', onKey);
    skipBtn.addEventListener('click', skip);
    skipBtn.focus({ preventScroll: true });

    soundBtn.addEventListener('click', () => {
      const on = !isSoundEnabled();
      setSoundEnabled(on);
      soundBtn.setAttribute('aria-pressed', String(on));
      soundBtn.setAttribute('aria-label', t(on ? 'a11y.soundOff' : 'a11y.soundOn'));
    });

    // Sajt se nikada ne sme zaglaviti na intru: rok za učitavanje, pa rok za animaciju
    const debug = /[?&]intro(At|Cut)=/.test(location.search);
    let safety = debug ? 0 : setTimeout(() => finish('timeout'), 8000);
    const onStart = (seconds) => {
      clearTimeout(safety);
      if (!debug) safety = setTimeout(() => finish('timeout'), (seconds + 5) * 1000);
    };

    const fallback2D = (reason) => {
      if (finished) return;
      root.dataset.introMode = '2d';
      root.dataset.introReason = reason;
      intro.classList.add('is-fallback');
      intro.querySelector('.intro__stage').innerHTML = '';
      requestAnimationFrame(() => intro.classList.add('is-run'));
      const dur = prefersReducedMotion() ? 1400 : 1700;
      setTimeout(() => finish('fallback'), dur);
    };

    if (prefersReducedMotion()) { fallback2D('reduced-motion'); return; }
    const gl = webglSupport();
    if (!gl) { fallback2D('no-webgl'); return; }
    if (gl === 'sw') { fallback2D('software-webgl'); return; }

    root.dataset.introMode = '3d';
    import('./scene.js')
      .then(({ createIntroScene }) => createIntroScene({
        container: intro.querySelector('.intro__stage'),
        overlay: intro,
        onStart,
        onDone: (how) => finish(how),
      }))
      .then((s) => {
        if (finished) { s.dispose(); return; }
        scene = s;
        scene.play();
      })
      .catch((err) => {
        console.warn('[intro] 3D nije uspeo, prelazim na 2D:', err?.message || err);
        fallback2D('error');
      });
  });
}
