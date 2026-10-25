/**
 * Lighting acceptance shots (feat/3d-lighting-trailer): freezes the clock at
 * the trailer v3 TOD keys (07:00 / 15:30 / 19:45 / 23:10) and captures the
 * room frame per phase — student in all four, junior/senior in the evening,
 * plus a lamp-removed evening to verify the lamp gate.
 * Run against a live dev server:
 *   node scripts/3d/shot-lighting.mjs [outDir]
 */
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:4318";
const PERSIST_KEY = "devlife:v1";
const OUT = process.argv[2] ?? "artifacts/lighting";
const EXE = "/home/quivo/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome";

/** Minute-of-day per trailer key. Night's 23:10 in the trailer is still
 * "Tối" on the game clock (night starts at 00:00), so night freezes at 01:00. */
const TIMES = {
  morning: 7 * 60,
  noon: 15 * 60 + 30,
  evening: 19 * 60 + 45,
  night: 1 * 60,
};
const OWNED = ["lamp_desk", "fairy_lights"];

async function settle(page) {
  await page.getByRole("button", { name: "Bắt đầu" }).click({ timeout: 15000 }).catch(() => {});
  await page.locator("canvas").first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(3000); // GLB scene + frame settle (persist rehydrate ~3s)
}

async function seedStage(page, stage) {
  // Set state through the exposed store: localStorage surgery loses the race
  // against the sim's per-minute re-persist. setState persists immediately.
  await page.evaluate(
    ({ stage, owned }) => {
      const store = window.__store;
      store.setState((s) => ({
        stage,
        career: {
          ...s.career,
          players: { ...s.career.players, stage },
          shop: {
            ...(s.career.shop ?? { owned: [], pin: null }),
            owned: [...new Set([...(s.career.shop?.owned ?? []), ...owned])],
          },
        },
        loadouts: Object.fromEntries(
          Object.entries(s.loadouts).map(([st, lo]) => [
            st,
            { ...lo, desk_lamp: owned.includes("lamp_desk") ? "store:lamp_desk" : lo.desk_lamp },
          ]),
        ),
      }));
    },
    { stage, owned: OWNED },
  );
  await page.waitForTimeout(2500); // let the 3D scene swap shells + settle
}

async function freezeAt(page, minutes) {
  await page.evaluate((m) => {
    window.__store.setState({ clockPaused: true, totalMinutes: m });
  }, minutes);
  await page.waitForTimeout(1200); // 500ms light tween + settle
}

async function shotWell(page, name) {
  await page.locator(".clay-scene-well").first().screenshot({ path: `${OUT}/${name}.png` });
  console.log(`shot ${OUT}/${name}.png`);
}

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(BASE, { waitUntil: "domcontentloaded" });
await page.evaluate((key) => localStorage.removeItem(key), PERSIST_KEY);
await settle(page);

// Student owns the desk lamp (evening/night pool) in all four TOD keys.
await seedStage(page, "student");
for (const [phase, minutes] of Object.entries(TIMES)) {
  await freezeAt(page, minutes);
  await shotWell(page, `student_${phase}`);
}

// Junior / senior evening: same preset, per-stage lamp + fairy spots.
await seedStage(page, "junior");
await freezeAt(page, TIMES.evening);
await shotWell(page, "junior_evening");

await seedStage(page, "senior");
await freezeAt(page, TIMES.evening);
await shotWell(page, "senior_evening");

// Lamp gate: pull the lamp from the student loadout — evening must lose the
// warm pool (fairy glow, spill, and the phase grade stay).
await seedStage(page, "student");
await freezeAt(page, TIMES.evening);
await page.evaluate(() => {
  window.__store.setState((s) => ({
    loadouts: { ...s.loadouts, student: { ...s.loadouts.student, desk_lamp: null } },
  }));
});
await page.waitForTimeout(800);
await shotWell(page, "student_evening_nolamp");

await browser.close();
console.log("done");
