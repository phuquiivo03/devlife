/**
 * Capture the 3D room poses (dev server on :4317 must be running).
 * Screenshots land in /tmp/devlife-3d/.
 *
 *   node scripts/3d/capture-poses.mjs
 */
// devlife's own @playwright/test (1.64) dropped ubuntu20.04 support; borrow the
// 1.59.1 core (with its chromium-1217 already cached) from a sibling checkout.
import pwCore from "/home/quivo/node/tbh-website-v3/node_modules/playwright-core/index.js";
import fs from "node:fs";

const chromium = pwCore.chromium;

const outDir = "/tmp/devlife-3d";
fs.mkdirSync(outDir, { recursive: true });

const baseUrl = "http://127.0.0.1:4317";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

async function setStore(state) {
  await page.evaluate((s) => {
    const store = window.__store;
    if (!store) throw new Error("__store not exposed");
    store.setState((prev) => ({
      career: {
        ...prev.career,
        shop: {
          ...(prev.career.shop ?? { owned: [], pin: null }),
          owned: s.owned ?? [],
        },
        players: { ...prev.career.players, introSeen: true },
      },
      ...(s.taskJobId !== undefined ? { taskJobId: s.taskJobId } : {}),
      ...(s.sleep
        ? {
            sleepTransition: {
              active: true,
              startTime: Date.now(),
              fromMinutes: 0,
              toMinutes: 60 * 8,
            },
          }
        : {}),
    }));
  }, state);
}

async function shot(name, path, state) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas");
  await setStore(state);
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${outDir}/${name}.png` });
  console.log(`saved ${name}.png`);
}

// 1. Fresh student: floor pose at the folding table + laptop.
await shot("3d-floor", "/", { owned: [] });
// 2. Own the desk upgrades: seated on the chair (idle — no longer standing).
await shot("3d-idle-sit", "/", { owned: ["monitor2", "ergo_chair"] });
// 3. CRT task open: sitting on the chair.
await shot("3d-sit", "/", { owned: ["monitor2", "ergo_chair"], taskJobId: "debug-task" });
// 4. Sleep transition: player hidden.
await shot("3d-sleep", "/", { owned: ["monitor2", "ergo_chair"], sleep: true });
// 5. Everything owned: plant_big + fan_standing visible (4 wave2 GLBs missing → skipped).
await shot("3d-all-owned", "/", {
  owned: ["plant", "fan", "monitor2", "mattress", "aircon", "ergo_chair"],
});

await browser.close();
console.log("console errors:", consoleErrors.length ? consoleErrors : "none");
