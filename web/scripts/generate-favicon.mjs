// Renders the "V" of the ViñaMar wordmark into PNG icons.
//
//   cd web && npm run favicon
//
// Why rasterise: an SVG favicon cannot load a webfont in the browser, so the
// script bakes the glyph into a bitmap. Run it by hand after a logo change; the
// resulting PNGs are committed.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');

const INK = '#1F3A34';
const PAPER = '#FBF8F3';

const page = (size) => `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Kaushan+Script&display=block" rel="stylesheet">
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  .icon {
    width: ${size}px; height: ${size}px; border-radius: 50%;
    background: ${INK}; color: ${PAPER};
    display: flex; align-items: center; justify-content: center;
    font-family: 'Kaushan Script', cursive; text-transform: uppercase;
    font-size: ${Math.round(size * 0.56)}px;
    line-height: 1; padding-bottom: ${Math.round(size * 0.04)}px;
  }
</style></head>
<body><div class="icon" id="icon">V</div></body></html>`;

const TARGETS = [
  { file: 'icon.png', size: 512 },
  { file: 'apple-icon.png', size: 180 },
];

const browser = await chromium.launch();
try {
  await mkdir(APP_DIR, { recursive: true });
  for (const { file, size } of TARGETS) {
    const tab = await browser.newPage({ viewport: { width: size, height: size } });
    await tab.setContent(page(size));
    // Without this the screenshot can capture a fallback glyph.
    await tab.evaluate(() => document.fonts.ready);
    await tab.locator('#icon').screenshot({ path: path.join(APP_DIR, file), omitBackground: true });
    await tab.close();
    console.log(`${file} — ${size}×${size}`);
  }
} finally {
  await browser.close();
}
