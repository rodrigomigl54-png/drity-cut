import { defineConfig } from 'vite';
import sr from './src/i18n/sr.json' with { type: 'json' };
import { translate, varPreset, cfgValues, jsonLd } from './src/lib/i18n-core.js';

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return m ? m[1] : null;
};

const setAttr = (tag, name, value) => {
  const re = new RegExp(`(\\s${name}=")[^"]*(")`);
  if (re.test(tag)) return tag.replace(re, `$1${esc(value)}$2`);
  return tag.replace(/(\s*\/?>)$/, ` ${name}="${esc(value)}"$1`);
};

/**
 * Upisuje srpski tekst (podrazumevani jezik) i vrednosti iz config.js direktno u HTML,
 * tako da pretraživači i korisnici bez JS-a vide pun sadržaj. U izvornom HTML-u nema
 * ručno upisanog teksta — sve dolazi iz src/i18n/sr.json i src/config.js.
 */
function hydrateHtml() {
  const cfg = cfgValues();
  return {
    name: 'dirty-cut-hydrate-html',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        // 1) Atributi na svim tagovima koji imaju data-i18n / data-cfg
        html = html.replace(/<([a-z][a-z0-9]*)\b[^>]*?(data-i18n|data-cfg)[^>]*>/gi, (tag) => {
          let out = tag;
          const vars = varPreset(attr(tag, 'data-i18n-vars'));
          const ia = attr(tag, 'data-i18n-attr');
          if (ia) for (const pair of ia.split(';')) {
            const [name, key] = pair.split(':');
            out = setAttr(out, name, translate(sr, key, vars));
          }
          const ca = attr(tag, 'data-cfg-attr');
          if (ca) for (const pair of ca.split(';')) {
            const [name, key] = pair.split(':');
            out = setAttr(out, name, cfg[key]);
          }
          const key = attr(tag, 'data-i18n');
          if (key && /\bh-cut\b/.test(tag)) out = setAttr(out, 'data-text', translate(sr, key, vars));
          return out;
        });
        // 2) Tekstualni sadržaj praznih elemenata
        html = html.replace(/(<([a-z][a-z0-9]*)\b[^>]*?\sdata-i18n="([^"]+)"[^>]*>)(<\/\2>)/gi, (m, open, tag, key, close) => {
          const vars = varPreset(attr(open, 'data-i18n-vars'));
          return open + esc(translate(sr, key, vars)) + close;
        });
        html = html.replace(/(<([a-z][a-z0-9]*)\b[^>]*?\sdata-cfg="([^"]+)"[^>]*>)(<\/\2>)/gi, (m, open, tag, key, close) =>
          open + esc(cfg[key] ?? '') + close,
        );
        // 3) Strukturirani podaci
        html = html.replace('<!--JSON-LD-->', `<script type="application/ld+json">${JSON.stringify(jsonLd())}</script>`);
        return html;
      },
    },
  };
}

/** Dodaje <link rel="preload"> za hero sliku sa konačnim (heširanim) putanjama. */
function preloadHero() {
  return {
    name: 'dirty-cut-preload-hero',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const page = bundle['index.html'];
      if (!page || typeof page.source !== 'string') return;
      const m = page.source.match(/<source type="image\/avif" srcset="([^"]*work-1[^"]*)" sizes="([^"]*)"/);
      if (!m) return;
      const link = `<link rel="preload" as="image" type="image/avif" imagesrcset="${m[1]}" imagesizes="${m[2]}" fetchpriority="high">`;
      page.source = page.source.replace('</title>', `</title>\n  ${link}`);
    },
  };
}

export default defineConfig({
  plugins: [hydrateHtml(), preloadHero()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/gsap')) return 'gsap';
        },
      },
    },
  },
  server: { host: true },
  preview: { host: true },
});
