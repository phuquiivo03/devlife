import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";

const PERSIST = readFileSync(
  join(process.cwd(), "tests/e2e/fixtures/agent-smoke-persist.json"),
  "utf8",
);

async function bootSeeded(page: import("@playwright/test").Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.addInitScript((raw) => {
    if (localStorage.getItem("devlife:v1")) return;
    localStorage.setItem("devlife:v1", raw);
  }, PERSIST);
  await page.goto("/?debug=1");
  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByTestId("intro-video")).toBeHidden({ timeout: 15000 }).catch(() => {});
  const begin = page.getByRole("button", { name: "Bắt đầu" });
  if (await begin.isVisible().catch(() => false)) await begin.click();
}

/** Clay sidebar: action tiles must receive real clicks (not force bypass). */
async function openJobsManage(page: import("@playwright/test").Page) {
  const jobs = page.getByTestId("open-jobs");
  await jobs.scrollIntoViewIfNeeded();
  await jobs.click();
  await expect(page.getByTestId("job-manage")).toBeVisible({ timeout: 15_000 });
}

test.describe.configure({ mode: "serial", timeout: 120_000 });

test.describe("agent runtime smoke (seeded save)", () => {
  test("shop AI tab desktop + mobile", async ({ page }) => {
    await bootSeeded(page, { width: 1440, height: 900 });
    const storeBar = page.getByTestId("open-store-bar").or(page.getByRole("button", { name: "Cửa hàng" }));
    await storeBar.scrollIntoViewIfNeeded();
    await storeBar.click();
    await expect(page.getByTestId("store-modal")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("store-tab-agents").click({ force: true });
    await expect(page.getByTestId("agent-shop-grid")).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/runtime-shop-agents-desktop.png" });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId("store-tab-agents").click({ force: true });
    await expect(page.getByTestId("agent-card-copilot_inspired")).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/runtime-shop-agents-mobile.png" });
  });

  test("task bug choice desktop", async ({ page }) => {
    await bootSeeded(page, { width: 1440, height: 900 });
    await openJobsManage(page);
    await page.getByTestId("job-do-smoke-bugs").click();
    await page.getByTestId("task-resume").click();
    await expect(page.getByTestId("task-step-bug-choice")).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/runtime-task-bug-choice-desktop.png" });
  });

  test("task ready and Xong desktop", async ({ page }) => {
    await bootSeeded(page, { width: 1440, height: 900 });
    await openJobsManage(page);
    await page.getByTestId("job-do-smoke-ready").click();
    await page.getByTestId("task-resume").click();
    await expect(page.getByTestId("task-step-ready")).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/runtime-task-ready-xong-desktop.png" });
    const moneyBefore = await page.evaluate(() => {
      const raw = localStorage.getItem("devlife:v1");
      if (!raw) return null;
      const doc = JSON.parse(raw) as { state: { career: { players: { money: number } } } };
      return doc.state?.career?.players?.money ?? null;
    });
    await page.getByTestId("task-commit-xong").click();
    await expect(page.getByTestId("task-step-result")).toBeVisible({ timeout: 10000 });
    await page.waitForFunction(() => {
      const raw = localStorage.getItem("devlife:v1");
      if (!raw) return false;
      const doc = JSON.parse(raw) as { state: { career: { players: { money: number } } } };
      return doc.state.career.players.money > 3_500_000;
    });
    const moneyAfter = await page.evaluate(() => {
      const raw = localStorage.getItem("devlife:v1");
      if (!raw) return null;
      const doc = JSON.parse(raw) as { state: { career: { players: { money: number } } } };
      return doc.state?.career?.players?.money ?? null;
    });
    expect(moneyAfter).toBeGreaterThan(moneyBefore ?? 0);
    await expect(page.getByTestId("task-step-result")).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/runtime-task-xong-result-desktop.png" });

    await page.reload();
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 20000 });
    const moneyReload = await page.evaluate(() => {
      const raw = localStorage.getItem("devlife:v1");
      const doc = JSON.parse(raw!) as { state: { career: { players: { money: number } } } };
      return doc.state.career.players.money;
    });
    expect(moneyReload).toBe(moneyAfter);
    await openJobsManage(page);
    await expect(page.getByTestId("job-row-smoke-ready")).toHaveCount(0);
  });

  test("task select desktop", async ({ page }) => {
    await bootSeeded(page, { width: 1440, height: 900 });
    await openJobsManage(page);
    await page.getByTestId("job-do-smoke-select").click();
    await expect(page.getByTestId("task-step-select")).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/runtime-task-select-desktop.png" });
  });

  test("mobile select step", async ({ page }) => {
    await bootSeeded(page, { width: 390, height: 844 });
    await openJobsManage(page);
    await page.getByTestId("job-do-smoke-select").click();
    await expect(page.getByTestId("task-step-select")).toBeVisible();
    await expect(page.getByTestId("task-step-select")).toBeVisible();
    await page.screenshot({ path: "/opt/cursor/artifacts/runtime-task-select-mobile.png" });
  });
});
