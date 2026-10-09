# Dirty Cut — sajt frizerskog salona

Statički sajt (bez servera) za **Dirty Cut**, unisex frizerski salon u Novom Sadu.
Vite + vanilla JavaScript, Three.js (3D intro) i GSAP (animacije).

## Pokretanje

```bash
npm install
npm run dev        # lokalni razvoj na http://localhost:5173
npm run build      # pravi gotov sajt u folderu dist/
npm run preview    # pregled build verzije na http://localhost:4173
npm test           # Playwright testovi (desktop + iPhone + Android)
```

## Gde se šta menja

Sve se menja u **tekstualnim fajlovima**. Kod ne treba dirati. Posle svake izmene pokreni `npm run build` i ponovo objavi `dist/`.

### Telefon, WhatsApp, Instagram, adresa, ocena → `src/config.js`

```js
phoneDisplay: '066 416253',        // kako se broj prikazuje
phoneIntl: '+381 66 416253',
phoneTel: '+38166416253',          // za "tel:" link
whatsappNumber: '38166416253',     // bez + i razmaka
INSTAGRAM_HANDLE: '_dirty_cut_',   // bez @
rating: 5.0,
reviewCount: 81,                   // broj recenzija na Google-u
googleProfileUrl: 'https://share.google/H5fW93sCc0xVWWi6d',
siteUrl: 'https://dirtycut.rs',    // pravi domen sajta (za SEO / deljenje)
geo: null,                         // npr. { lat: 45.25, lng: 19.80 }
```

### Radno vreme → `src/config.js` → `hours`

Svaki dan ima listu intervala `['OD', 'DO']`. Prazna lista `[]` znači da je salon zatvoren.

```js
hours: {
  mon: [['09:00', '13:00'], ['16:00', '20:00']],
  tue: [],                        // utorak — zatvoreno
  sat: [['09:00', '13:00']],
  ...
}
```

Iz radnog vremena se automatski računaju:

- indikator „Otvoreno sada / Zatvoreno“ (uvek po beogradskom vremenu);
- tabela radnog vremena;
- dani i termini u formi za zakazivanje;
- strukturirani podaci za Google.

### Cene i usluge → `src/data/services.json`

```json
{ "id": "fade", "category": "musko", "name_sr": "Fade", "name_en": "Fade", "duration_min": 45, "price_rsd": 1500 }
```

- `category`: `"musko"` ili `"zensko"` (određuje tab).
- `price_rsd: null` → prikazuje se **„Cena na upit“**.
- `duration_min` je opciono; kada je upisano, prikazuje se ispod cene.
- Nova usluga se automatski pojavljuje i u cenovniku i u padajućem meniju forme.

### Recenzije → `src/data/reviews.json`

Upisuj **samo prave recenzije** kopirane sa Google profila. Ništa ne izmišljaj.

```json
[
  { "author": "Ime P.", "rating": 5, "text_sr": "Tekst recenzije…", "text_en": "", "date": "septembar 2026" }
]
```

- Ako je `text_en` prazan, i na engleskoj verziji se prikazuje srpski tekst.
- Kartice se prikazuju nasumičnim redosledom pri svakom učitavanju.
- Dok je fajl prazan (`[]`), prikazuje se samo blok „5.0 ★ / 81 recenzija“ sa dugmetom ka Google-u.
- Forma **„Ostavi ocenu“**: posetilac bira zvezdice i piše utisak, pa bira jedno od dva dugmeta:
  - **„Objavi na Google-u“** kopira tekst i otvara Google profil;
  - **„Pošalji salonu“** otvara WhatsApp sa porukom.

  Obe opcije su ponuđene za svaku ocenu, jer Google ne dozvoljava da se na Google šalju samo pozitivne ocene.

### Tekstovi (SR / EN) → `src/i18n/sr.json` i `src/i18n/en.json`

Svaki tekst na sajtu (naslovi, dugmad, poruke o greškama, poruka za WhatsApp) nalazi se u ova dva fajla.

### Fotografije

Originali (uvećani AI super-rezolucijom, EDSR ×4) nalaze se u `assets-src/`. Kad dodaš ili zameniš sliku tamo:

```bash
npm run assets     # pravi AVIF / WebP / JPG verzije u 3 veličine + logo varijante
```

Raspored galerije se podešava u `src/modules/gallery.js` (lista `ITEMS`).

## Objavljivanje (deploy)

Sajt je statički, pa radi na bilo kom hostingu:

- **Netlify:** Build command `npm run build`, Publish directory `dist`.
- **Vercel:** Framework „Vite“ (sve se podešava samo).
- **Klasičan hosting (cPanel / FTP):** pokreni `npm run build` i prebaci **sadržaj** foldera `dist/` u `public_html/`.

Posle objave upiši pravi domen u `siteUrl` (`src/config.js`) i `public/robots.txt` / `public/sitemap.xml`.

## Intro animacija

- **Šta prikazuje:** 3D natpis „Dirty Cut“ (vektorizovan iz originalnog logoa) pada na beton, makaze ga probadaju, a ekran se „preseca“ i otkriva sajt.
- **Kada se prikazuje:** samo pri prvoj poseti u sesiji. Dugme „Preskoči“ i taster Esc ga prekidaju.
- **Zvuk:** podrazumevano je isključen.
- **2D verzija:** prikazuje se laka 2D animacija logoa ako posetilac ima uključeno „smanjeno kretanje“, ako nema WebGL ili ako uređaj nema grafičko ubrzanje.

Za testiranje:

- `?intro=force`: uvek prikaži intro;
- `?intro=off`: bez intra;
- `?gl=force`: 3D čak i bez GPU-a;
- `?introAt=1.2`: zamrzni kadar u sekundi 1.2.

## Struktura

```
src/config.js            poslovni podaci (jedno mesto)
src/data/                usluge i recenzije
src/i18n/                prevodi SR / EN
src/intro/               3D intro (zaseban chunk, učitava se samo kad treba)
src/modules/             delovi sajta (zakazivanje, galerija, ocene, …)
src/lib/                 vreme po Beogradu, logika zakazivanja, i18n
tests/                   Playwright testovi
scripts/                 obrada slika, vektorizacija logoa, snimci ekrana
docs/                    izveštaj, Lighthouse, snimci ekrana
```
