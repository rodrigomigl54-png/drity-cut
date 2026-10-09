import sr from '../i18n/sr.json';
import en from '../i18n/en.json';
import { translate, lookup, varPreset, cfgValues } from './i18n-core.js';

const DICTS = { sr, en };
const STORAGE_KEY = 'dc-lang';

let lang = 'sr';
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && DICTS[saved]) lang = saved;
} catch { /* privatni režim / blokiran storage */ }

export const getLang = () => lang;
export const dict = () => DICTS[lang];
export const t = (key, vars) => translate(DICTS[lang], key, vars);
export const tRaw = (key) => lookup(DICTS[lang], key);
export const tFor = (l, key, vars) => translate(DICTS[l] || sr, key, vars);

export function applyI18n(root = document) {
  const d = DICTS[lang];
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const vars = varPreset(el.getAttribute('data-i18n-vars'));
    const text = translate(d, el.getAttribute('data-i18n'), vars);
    if (el.textContent !== text) el.textContent = text;
    if (el.classList.contains('h-cut')) el.setAttribute('data-text', text);
  });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    const vars = varPreset(el.getAttribute('data-i18n-vars'));
    for (const pair of el.getAttribute('data-i18n-attr').split(';')) {
      const [name, key] = pair.split(':');
      el.setAttribute(name, translate(d, key, vars));
    }
  });
  const cfg = cfgValues();
  root.querySelectorAll('[data-cfg]').forEach((el) => {
    el.textContent = cfg[el.getAttribute('data-cfg')] ?? '';
  });
  root.querySelectorAll('[data-cfg-attr]').forEach((el) => {
    for (const pair of el.getAttribute('data-cfg-attr').split(';')) {
      const [name, key] = pair.split(':');
      el.setAttribute(name, cfg[key] ?? '');
    }
  });
}

export function setLang(next) {
  if (!DICTS[next] || next === lang) return;
  lang = next;
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  document.documentElement.lang = next;
  applyI18n();
  document.querySelectorAll('.lang__btn').forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.lang === next)),
  );
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: next } }));
}

export function initI18n() {
  document.documentElement.lang = lang;
  applyI18n();
  document.querySelectorAll('.lang__btn').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    b.addEventListener('click', () => setLang(b.dataset.lang));
  });
}
