/**
 * Visual verification for the real junior/senior models
 * (feat/3d-rooms-junior-senior, replacing the stand-in GLBs).
 * Boots a fresh save, seeds each stage (+ owned rooms), screenshots the room
 * from the default iso angle. Run against the live dev server:
 *   node scripts/3d/shot-room-defaults.mjs [outDir]
 */
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:4317";
const PERSIST_KEY = "devlife:v1";
const OUT = process.argv[2] ?? "test-results";
const EXE = "/home/quivo/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome";

const OWNED = ["room_junior", "room_senior"];

async function settle(page) {
  await page.getByRole("button", { name: "Bắt đầu" }).click({ timeout: 15000 }).catch(() => {});
  await page.locator("canvas").first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(3000); // GLB scene + frame settle (persist rehydrate ~3s)
}

async function seedStage(page, stage) {
  // Set state through the exposed store: localStorage surgery loses the race
  // against the sim's per-minute re-persist, and a reload re-persists the
  // in-memory state before rehydrating. setState persists immediately.
  await page.evaluate(
    ({ stage, owned }) => {
      const store = window.__store;
      store.setState((s) => ({
        stage,
        career: {
          ...s.career,
          players: { ...s.career.players, stage },
          shop: { ...(s.career.shop ?? { owned: [], pin: null }), owned },
        },
      }));
    },
    { stage, owned: OWNED },
  );
  await page.waitForTimeout(2500); // let the 3D scene swap shells + settle
}

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.evaluate((key) => localStorage.removeItem(key), PERSIST_KEY);
await settle(page);
await page.screenshot({ path: `${OUT}/rooms-junior-senior-models-student.png` });

await seedStage(page, "junior");
await page.screenshot({ path: `${OUT}/rooms-junior-senior-models-junior.png` });

await seedStage(page, "senior");
await page.screenshot({ path: `${OUT}/rooms-junior-senior-models-senior.png` });

await browser.close();
console.log(`screenshots in ${OUT}`);
