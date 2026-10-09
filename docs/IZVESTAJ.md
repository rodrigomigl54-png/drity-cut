# Izveštaj — Dirty Cut sajt

Datum provere: 9. 10. 2026.

## Šta je urađeno

### Slike i logo

**Logo i fotografije.** Sve četiri fotografije su uvećane 4–8× AI super-rezolucijom (EDSR). Za svaku postoje verzije u AVIF, WebP i JPG formatu, u veličinama 480, 960 i 1440 px.

**Vektorizovani natpis.** Natpis „Dirty Cut“ je vektorizovan iz logoa uvećanog 4×. Poređenje originala i SVG-a je u istoriji rada, a oblik se poklapa.

**Logo na sajtu.** Logo nije menjan: koristi se originalni piksel-sadržaj, samo sa providnom pozadinom.

### 3D intro (Three.js + GSAP, ~3,4 s)

Tok animacije:

1. Natpis pada na beton.
2. Udar: drmanje kamere, prašina, pukotine koje rastu i odskok natpisa.
3. Mirovanje od 1 s.
4. Makaze ulete iz gornjeg desnog ugla i zabodu se u slovo „C“, uz varnice i bordo odsjaj na sečivu.
5. Ekran se preseca po liniji makaza, a polovine se razmiču i otkrivaju sajt.

Ponašanje:

- Dugme „Preskoči“ je vidljivo od prvog kadra; Esc takođe prekida intro.
- Intro se prikazuje samo jednom po sesiji.
- Zvuk je sintetizovan i podrazumevano isključen.
- Lakša 2D verzija se prikazuje kod smanjenog kretanja, bez WebGL-a i na uređajima bez GPU-a.
- Sigurnosni tajmer obezbeđuje da sajt nikad ne ostane zaglavljen na intru.
- Na kraju se svi WebGL resursi oslobađaju.

### Sajt

**Sekcije:** header, hero, usluge (Muško / Žensko), galerija sa lightbox-om, ocene, o nama, zakazivanje, lokacija sa mapom i footer.

**Funkcije:**

- „Otvoreno sada“ po beogradskom vremenu.
- SR/EN prevod bez ponovnog učitavanja, sa pamćenjem izabranog jezika.
- Kursor-makaze na desktopu.
- Zrno preko celog sajta i tekstura betona.
- Animacija „reza“ na naslovima i dijagonalni razdelnici.

**Zakazivanje** ide preko WhatsApp-a (unapred popunjena poruka) ili Instagrama (poruka se kopira, pa se otvara `ig.me`). Kod forme je i link za poziv.

**Ocene:**

- blok 5.0 ★ / 81 recenzija na Google-u;
- slajder za prave recenzije, sa nasumičnim redosledom;
- forma „Ostavi ocenu“ (Google ili WhatsApp salonu).

**SEO:**

- meta i Open Graph tagovi;
- OG slika sa logom na betonu;
- JSON-LD `HairSalon`, bez `aggregateRating`;
- robots.txt, sitemap.xml i manifest.

## Testovi (Playwright)

Testovi su pokrenuti na tri profila: **desktop** (1280×800), **iPhone 13** i **Pixel 7** (Android), sva tri u Chromium emulaciji.

**Rezultat: 86 prošlo, 0 palo, 1 preskočen.** Preskočen je test mobilnog menija na desktop profilu, namerno.

| Grupa | Šta se proverava | Rezultat |
|---|---|---|
| WhatsApp SR | tačan broj `38166416253`, tačan tekst, kodiranje č ć š ž đ (`%C4%90or%C4%91e`…), prelomi redova `%0A` | ✅ ×3 |
| WhatsApp SR | prazna opciona polja (telefon, napomena) se preskaču | ✅ ×3 |
| WhatsApp EN | poruka na engleskom („Hello, I would like…“, „Wednesday, 14 Oct 2026“) | ✅ ×3 |
| Instagram | clipboard sadrži identičnu poruku, otvara se `https://ig.me/m/_dirty_cut_`, toast SR/EN | ✅ ×6 |
| Validacija | prazna forma, datum u prošlosti, zatvoren dan (utorak/nedelja), neispravan telefon, greške na EN | ✅ ×12 |
| Termini | subota nudi samo 09:00–12:30 | ✅ ×3 |
| Jezik | SR→EN bez reload-a, `<html lang>`, „Price on request“, pamti izbor posle reload-a | ✅ ×3 |
| Otvoreno sada | 6 situacija (otvoreno, pauza, posle posla, utorak, subota posle 13h, ponoć UTC ≠ Beograd) | ✅ ×18 |
| Intro | „Preskoči“ od prvog kadra, samo jednom po sesiji, reduced-motion → 2D, bez WebGL-a → 2D, softverski WebGL → 2D | ✅ ×15 |
| Navigacija | mobilni meni (iPhone, Android), lightbox (strelice, Esc), „Zakaži“ iz cenovnika popunjava formu | ✅ ×8 |
| Kvalitet | bez grešaka u konzoli, bez horizontalnog skrola | ✅ ×6 |
| Ocene | blok 81 recenzija + Google link, bez izmišljenih kartica, „Ostavi ocenu“ → WhatsApp | ✅ ×6 |

Primer generisanog WhatsApp linka (iz `docs/screenshots/flows/urls.txt`):

```
https://wa.me/38166416253?text=Zdravo%2C%20%C5%BEelim%20da%20zaka%C5%BEem%20termin%20u%20Dirty%20Cut-u.%0AUsluga%3A%20%C5%A0i%C5%A1anje%20%2B%20brada%0ADatum%3A%20sreda%2C%2014.%2010.%202026.%0AVreme%3A%2016%3A30%0AIme%3A%20%C4%90or%C4%91e%20%C4%8Cu%C4%8Dkovi%C4%87%0ATelefon%3A%20%2B381%2064%20123%204567%0ANapomena%3A%20Kra%C4%87e%20sa%20strane%2C%20du%C5%BEe%20gore
```

> ⚠️ **Ručna provera WhatsApp linka nije bila moguća.** Iz okruženja u kome je sajt pravljen
> `wa.me`, `api.whatsapp.com`, `instagram.com` i Google mape nisu dostupni (mreža ih blokira).
> Testovi zato presreću te adrese i proveravaju tačan URL i tekst. Snimci `*-whatsapp-opened.jpg`
> prikazuju presretnuti link i dekodiranu poruku, a ne pravu WhatsApp stranu.
> **Pre objave otvori sajt na telefonu, popuni formu i pošalji sebi probnu poruku.**

## Lighthouse (mobilni profil)

| Merenje | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Sajt (ponovna poseta, bez intra) | **97** | **100** | **100** | **100** |
| Prva poseta (sa introm) | **94** | **100** | **100** | **100** |
| Desktop, bez intra | **100** | **100** | **100** | **100** |

Kompletni izveštaji su u `docs/lighthouse/*.report.html`.

> Napomena: ovo okruženje nema GPU, pa je WebGL softverski (SwiftShader). Na takvim uređajima
> sajt namerno prikazuje 2D intro, jer bi 3D išao 1–2 kadra u sekundi. Zato je merenje „prva poseta“
> izmerilo 2D verziju. 3D intro se učitava kao zaseban chunk tek posle iscrtavanja sajta, ali
> njegov uticaj na pravom telefonu sa GPU-om ovde nije mogao da se izmeri.

## Snimci ekrana

- Sekcije u širinama 375, 768, 1280 i 1920 px: `docs/screenshots/sections/`.
- Engleska verzija: `docs/screenshots/sections-en/`.
- Kadrovi intra (desktop 1280×720 i telefon 390×844): `docs/screenshots/intro/`:
  - `1-fall` — pad;
  - `2-impact` — udar, prašina, pukotine;
  - `3-hold` — mirovanje;
  - `4-scissors` — ulet makaza;
  - `5-stab` — ubod i varnice;
  - `6-cut-b` — rez i razdvajanje.
- Tok zakazivanja, mobilni meni i lightbox: `docs/screenshots/flows/`.

## Čeka tvoje podatke

1. **Cene i trajanje usluga.** Sada svuda piše „Cena na upit“. Upisuju se u `src/data/services.json`.
2. **Prave recenzije sa Google-a.** Nisam mogao da ih preuzmem, jer Google nije dostupan iz okruženja, a izmišljanje recenzija nije dozvoljeno. Kopiraj 5–10 recenzija sa 5★ u `src/data/reviews.json`; slajder će se sam pojaviti.
3. **Tim.** Izostavljen po dogovoru.
4. **Domen sajta.** `siteUrl` je trenutno `https://dirtycut.rs`, kao pretpostavka. Upiši pravi domen u `src/config.js`, `public/robots.txt` i `public/sitemap.xml`.
5. **Geo koordinate salona.** Opciono, za Google: `geo` u `src/config.js`.
6. **Bolje fotografije i logo u većoj rezoluciji (SVG).** Kada stignu, kvalitet galerije i 3D natpisa može biti još bolji.
