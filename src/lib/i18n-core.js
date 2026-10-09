// Zajednička logika za prevode i konfiguracione vrednosti.
// Koristi je i pregledač (src/lib/i18n.js) i Vite plugin pri buildu
// (da bi srpski tekst bio upisan direktno u HTML — bolje za SEO).
import { CONFIG, links } from '../config.js';

export function lookup(dict, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), dict);
}

export function format(str, vars = {}) {
  if (typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
}

export function translate(dict, key, vars) {
  const v = lookup(dict, key);
  if (v == null) return key;
  return format(v, vars);
}

// Imenovani skupovi promenljivih za data-i18n-vars="..."
export function varPreset(name) {
  switch (name) {
    case 'reviewCount': return { count: CONFIG.reviewCount };
    case 'phoneDisplay': return { phone: CONFIG.phoneDisplay };
    case 'year': return { year: new Date().getFullYear() };
    case 'ratingN': return { n: CONFIG.rating.toFixed(1) };
    case 'instagram': return { handle: CONFIG.INSTAGRAM_HANDLE };
    default: return {};
  }
}

// Vrednosti za data-cfg="..." (tekst) i data-cfg-attr="href:..."
export function cfgValues() {
  const a = CONFIG.address;
  return {
    phoneDisplay: CONFIG.phoneDisplay,
    phoneIntl: CONFIG.phoneIntl,
    telHref: links.tel(),
    whatsappHref: links.whatsapp(),
    instagramHref: links.instagram(),
    instagramAt: '@' + CONFIG.INSTAGRAM_HANDLE,
    googleProfileUrl: CONFIG.googleProfileUrl,
    directionsHref: links.directions(),
    street: a.street,
    cityLine: `${a.postalCode} ${a.city}, ${a.countryName}`,
    ratingText: CONFIG.rating.toFixed(1),
    siteUrl: CONFIG.siteUrl + '/',
    ogImage: CONFIG.siteUrl + '/og-image.jpg',
  };
}

const DAY_SCHEMA = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

// schema.org HairSalon (bez aggregateRating — Google ne dozvoljava
// samoobjavljene ocene za lokalne biznise).
export function jsonLd() {
  const a = CONFIG.address;
  const spec = [];
  for (const [day, ranges] of Object.entries(CONFIG.hours)) {
    for (const [opens, closes] of ranges) {
      spec.push({ '@type': 'OpeningHoursSpecification', dayOfWeek: DAY_SCHEMA[day], opens, closes });
    }
  }
  const data = {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    name: CONFIG.name,
    image: CONFIG.siteUrl + '/og-image.jpg',
    logo: CONFIG.siteUrl + '/icon-512.png',
    url: CONFIG.siteUrl + '/',
    telephone: CONFIG.phoneIntl,
    address: {
      '@type': 'PostalAddress',
      streetAddress: a.street,
      postalCode: a.postalCode,
      addressLocality: a.city,
      addressCountry: a.country,
    },
    openingHoursSpecification: spec,
    sameAs: [links.instagram()],
    hasMap: CONFIG.googleProfileUrl,
  };
  if (CONFIG.geo) data.geo = { '@type': 'GeoCoordinates', latitude: CONFIG.geo.lat, longitude: CONFIG.geo.lng };
  return data;
}
