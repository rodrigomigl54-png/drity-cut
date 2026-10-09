// Mali pomoćni alati: toast, kopiranje u clipboard, otvaranje spoljnih linkova.

let toastTimer;
export function toast(message, ms = 4200) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), ms);
}

/** Kopira tekst; koristi Clipboard API, a za starije pregledače textarea + execCommand. */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* pada na rezervnu metodu */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Otvara link u novoj kartici; ako je popup blokiran, otvara rezervni URL u istoj kartici. */
export function openExternal(url, fallbackUrl = url) {
  const w = window.open(url, '_blank');
  if (w) {
    try { w.opener = null; } catch { /* ignore */ }
    return true;
  }
  window.location.href = fallbackUrl;
  return false;
}

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
