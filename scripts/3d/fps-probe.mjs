/**
 * Mobile-emulation (Pixel 5-ish) FPS probe for the 3D room, frozen at the
 * evening key (4 point lights + shadows). Prints the average FPS over a
 * 4-second rAF window so lighting changes can be compared before/after.
 *   node scripts/3d/fps-probe.mjs [minutes=1185]
 */
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:4318";
const PERSIST_KEY = "devlife:v1";
const EXE = "/home/quivo/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome";
const MINUTES = Number(process.argv[2] ?? 19 * 60 + 45);

const browser = await chromium.launch({ executablePath: EXE });
// Pixel 5: 393×851 @2.625 — the Canvas dpr clamp [1,2] applies on top.
const page = await browser.newPage({
  viewport: { width: 393, height: 851 },
  deviceScaleFactor: 2.625,
  isMobile: true,
  hasTouch: true,
});

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.evaluate((key) => localStorage.removeItem(key), PERSIST_KEY);
await page.getByRole("button", { name: "Bắt đầu" }).click({ timeout: 15000 }).catch(() => {});
await page.locator("canvas").first().waitFor({ timeout: 20000 });
await page.waitForTimeout(3000);

await page.evaluate((m) => {
  window.__store.setState({ clockPaused: true, totalMinutes: m });
}, MINUTES);
await page.waitForTimeout(1500);

const fps = await page.evaluate(
  () =>
    new Promise((resolve) => {
      let frames = 0;
      const t0 = performance.now();
      const loop = () => {
        frames += 1;
        if (performance.now() - t0 < 4000) requestAnimationFrame(loop);
        else resolve(Math.round((frames / ((performance.now() - t0) / 1000)) * 10) / 10);
      };
      requestAnimationFrame(loop);
    }),
);
console.log(`FPS(headless, pixel5-ish, ${MINUTES}min): ${fps}`);
await browser.close();
