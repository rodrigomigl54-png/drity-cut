// Pravi responzivne verzije fotografija (AVIF / WebP / JPG) iz assets-src/
// (izvori su već uvećani AI super-rezolucijom, EDSR x4) i varijante logoa.
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'src/assets/images';
const PUB = 'public';
mkdirSync(OUT, { recursive: true });

const photos = ['salon-1', 'salon-2', 'work-1', 'work-2'];
const widths = [480, 960, 1440];
const manifest = {};

for (const name of photos) {
  const src = sharp(`assets-src/${name}.jpg`);
  const meta = await src.metadata();
  manifest[name] = { w: meta.width, h: meta.height, widths: [] };
  for (const w of widths) {
    if (w > meta.width) continue;
    const base = sharp(`assets-src/${name}.jpg`).resize({ width: w });
    await base.clone().avif({ quality: 52 }).toFile(`${OUT}/${name}-${w}.avif`);
    await base.clone().webp({ quality: 74 }).toFile(`${OUT}/${name}-${w}.webp`);
    await base.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(`${OUT}/${name}-${w}.jpg`);
    manifest[name].widths.push(w);
  }
}
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));

// Logo: originalni piksel-sadržaj, samo uvećan i sa providnom pozadinom
// (crna pozadina -> alfa), tako da logo ostane identičan na bilo kojoj podlozi.
const { data, info } = await sharp('assets-src/logo-upscaled.jpg')
  .resize(720).raw().toBuffer({ resolveWithObject: true });
const rgba = Buffer.alloc(info.width * info.height * 4);
for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const a = Math.max(r, g, b);
  const k = a ? 255 / a : 0;
  rgba[j] = Math.min(255, r * k); rgba[j + 1] = Math.min(255, g * k); rgba[j + 2] = Math.min(255, b * k);
  rgba[j + 3] = a < 18 ? 0 : a;
}
const logo = sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } });
await logo.clone().resize(360).webp({ quality: 90 }).toFile(`${OUT}/logo-360.webp`);
await logo.clone().resize(360).png({ compressionLevel: 9 }).toFile(`${OUT}/logo-360.png`);
await logo.clone().resize(720).webp({ quality: 90 }).toFile(`${OUT}/logo-720.webp`);

// Favicon i ikonice: originalni logo na crnoj podlozi
await sharp('assets-src/logo-upscaled.jpg').resize(180).png().toFile(`${PUB}/apple-touch-icon.png`);
await sharp('assets-src/logo-upscaled.jpg').resize(48).png().toFile(`${PUB}/favicon-48.png`);
await sharp('assets-src/logo-upscaled.jpg').resize(512).png().toFile(`${PUB}/icon-512.png`);
console.log('images done', manifest);

// Open Graph slika: logo na betonu (1200x630)
const concrete = await sharp('src/intro/tex/concrete_color.jpg')
  .resize(1200, 1200).extract({ left: 0, top: 285, width: 1200, height: 630 })
  .modulate({ brightness: 0.42 }).toBuffer();
const vignette = Buffer.from(`<svg width="1200" height="630"><defs><radialGradient id="g" cx="50%" cy="50%" r="65%"><stop offset="40%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".75"/></radialGradient></defs><rect width="1200" height="630" fill="url(#g)"/></svg>`);
const ogLogo = await logo.clone().resize(520).png().toBuffer();
await sharp(concrete)
  .composite([{ input: vignette }, { input: ogLogo, left: 340, top: 55 }])
  .jpeg({ quality: 84 }).toFile(`${PUB}/og-image.jpg`);
console.log('og done');
