/**
 * Visual verification for the junior/senior 3D rooms (feat/3d-rooms-junior-senior).
 * Seeds the stage (+ owned rooms) into the save, then drives the real UI:
 * debug "Thêm tiền" → buy furniture → auto-place → owned-tab remove/place.
 * Run against the live dev server:  node scripts/3d/verify-rooms.mjs
 */
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:4317";
const PERSIST_KEY = "devlife:v1";
const OUT = process.argv[2] ?? "/tmp/devlife-rooms";
const EXE = "/home/quivo/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome";

const OWNED = ["room_junior", "room_senior"];

async function settle(page) {
  await page.getByRole("button", { name: "Bắt đầu" }).click({ timeout: 15000 }).catch(() => {});
  await page.locator("canvas").first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(2500); // let the GLB scene settle + frame
}

async function seedStage(page, stage) {
  // Set state through the exposed store: localStorage surgery loses the race
  // against the sim's per-minute re-persist.
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

const openStore = async (page) => {
  // The disabled HUD game button overlays the HUD store icon off-phase;
  // a JS click on the wide "Cửa hàng" bar bypasses the hit-test.
  await page.getByTestId("store-panel").or(page.getByTestId("open-store")).first().waitFor();
  const opened = await page.evaluate(() => {
    if (document.querySelector('[data-testid="store-panel"]')) return true;
    const buttons = [...document.querySelectorAll('[data-testid="open-store"]')];
    const wide = buttons.find((b) => b.textContent?.includes("Cửa hàng")) ?? buttons[0];
    wide?.click();
    return false;
  });
  if (!opened) await page.getByTestId("store-panel").waitFor({ timeout: 10000 });
};

const closeStore = async (page) => {
  await page.getByRole("button", { name: "Đóng" }).click();
  await page.waitForTimeout(600);
};

const addMoney = async (page, times) => {
  for (let i = 0; i < times; i += 1) {
    await page.getByRole("button", { name: "Thêm tiền" }).click();
  }
};

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Boot once so the app writes a complete fresh save, then seed on top of it.
await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.evaluate((key) => localStorage.removeItem(key), PERSIST_KEY);
await settle(page);

// 1. Student regression.
await page.screenshot({ path: `${OUT}/1-student.png` });

// 2. Junior defaults: shell + bed/desk/monitor/ergo/mug/plant/nightstand/poster.
await seedStage(page, "junior");
await page.screenshot({ path: `${OUT}/2-junior-defaults.png` });

// 3. Junior: buy the desk lamp → auto-place lights it on the desk.
await addMoney(page, 1);
await openStore(page);
await page.getByTestId("store-buy-lamp_desk").click();
await closeStore(page);
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/3-junior-lamp-placed.png` });

// 4. Junior: remove it via the owned tab, then place it back.
await openStore(page);
await page.getByTestId("store-mode-owned").click();
await page.getByTestId("owned-item-lamp_desk").click();
await closeStore(page);
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/4-junior-lamp-removed.png` });
await openStore(page);
await page.getByTestId("store-mode-owned").click();
await page.getByTestId("owned-item-lamp_desk").click();
await closeStore(page);
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/5-junior-lamp-replaced.png` });

// 6. Senior defaults: standing desk + dual monitor + rug + sideboard, no bed.
await seedStage(page, "senior");
await page.screenshot({ path: `${OUT}/6-senior-defaults.png` });

// 7. Senior: buy the VIP bed → auto-place fills the empty bed slot.
await addMoney(page, 20);
await openStore(page);
await page.getByTestId("store-buy-bed_vip").click();
await closeStore(page);
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/7-senior-bed-placed.png` });

await browser.close();
console.log(`screenshots in ${OUT}`);
