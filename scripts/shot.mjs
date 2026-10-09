import { chromium } from '@playwright/test';
const [,, url, out, w='1000', h='400'] = process.argv;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(url); await p.waitForTimeout(500);
await p.screenshot({ path: out }); await b.close();
