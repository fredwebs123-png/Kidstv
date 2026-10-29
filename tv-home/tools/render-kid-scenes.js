// Turns the girls' backgrounds (tv-home/tools/kid-scenes/*.svg, the same drawings as the mockups in
// design/mockups) into the pictures the TV shows: tv-home/web/backgrounds/kid-<name>.jpg.
// Needs Playwright with Chromium:  node tv-home/tools/render-kid-scenes.js
const { chromium } = require("playwright");
const { readdirSync, readFileSync } = require("fs");
const { join } = require("path");

(async () => {
const here = __dirname;
const src = join(here, "kid-scenes"), out = join(here, "..", "web", "backgrounds");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
for (const f of readdirSync(src).filter((f) => f.endsWith(".svg"))) {
  const svg = readFileSync(join(src, f), "utf8");
  await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  const name = f.replace(/\.svg$/, "");
  await page.screenshot({ path: join(out, `kid-${name}.jpg`), type: "jpeg", quality: 88 });
  console.log("made", `kid-${name}.jpg`);
}
await browser.close();
})();
