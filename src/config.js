// ─────────────────────────────────────────────────────────────
//  DIRTY CUT — svi poslovni podaci na jednom mestu.
//  Menjaj samo ovde; ništa od ovoga nije upisano drugde u kodu.
// ─────────────────────────────────────────────────────────────

export const CONFIG = {
  name: 'Dirty Cut',
  tagline: 'Hair and Barber Shop',

  // Telefon: prikaz + međunarodni format
  phoneDisplay: '066 416253',
  phoneIntl: '+381 66 416253',
  phoneTel: '+38166416253',

  // WhatsApp broj (bez +, bez razmaka)
  whatsappNumber: '38166416253',

  // Instagram nalog (bez @)
  INSTAGRAM_HANDLE: '_dirty_cut_',

  address: {
    street: 'Bulevar Jovana Dučića 39D',
    postalCode: '21000',
    city: 'Novi Sad',
    country: 'RS',
    countryName: 'Srbija',
  },

  // Geo koordinate (za Google strukturirane podatke). Upiši tačne kada ih imaš,
  // npr. { lat: 45.25, lng: 19.80 }. Dok je null, ne šalje se u schema.org.
  geo: null,

  // Google ocena
  rating: 5.0,
  reviewCount: 81,
  googleProfileUrl: 'https://share.google/H5fW93sCc0xVWWi6d',

  // Vremenska zona po kojoj se računa "Otvoreno sada"
  timeZone: 'Europe/Belgrade',

  // Radno vreme. Svaki dan je lista intervala ["OD", "DO"] (24h format).
  // Prazna lista [] = zatvoreno.
  hours: {
    mon: [['09:00', '13:00'], ['16:00', '20:00']],
    tue: [],
    wed: [['09:00', '13:00'], ['16:00', '20:00']],
    thu: [['09:00', '13:00'], ['16:00', '20:00']],
    fri: [['09:00', '13:00'], ['16:00', '20:00']],
    sat: [['09:00', '13:00']],
    sun: [],
  },

  // Zakazivanje: korak termina u minutima i koliko dana unapred se nudi u traci
  booking: {
    slotMinutes: 30,
    daysAhead: 14,
  },

  siteUrl: 'https://dirtycut.rs',
};

export const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const links = {
  tel: () => `tel:${CONFIG.phoneTel}`,
  whatsapp: (text) =>
    `https://wa.me/${CONFIG.whatsappNumber}` + (text ? `?text=${encodeURIComponent(text)}` : ''),
  instagram: () => `https://instagram.com/${CONFIG.INSTAGRAM_HANDLE}`,
  instagramDM: () => `https://ig.me/m/${CONFIG.INSTAGRAM_HANDLE}`,
  directions: () =>
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      `${CONFIG.address.street}, ${CONFIG.address.postalCode} ${CONFIG.address.city}`,
    )}`,
  mapEmbed: () =>
    `https://www.google.com/maps?q=${encodeURIComponent(
      `${CONFIG.address.street}, ${CONFIG.address.postalCode} ${CONFIG.address.city}`,
    )}&output=embed`,
};
