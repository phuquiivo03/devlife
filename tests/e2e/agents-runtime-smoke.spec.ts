import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import agentsConfig from "../../config/agents.json";
import taskRunConfig from "../../config/task_run.json";
import traitsConfig from "../../config/traits.json";

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
const CAREFUL_TIME =
  traitsConfig.traits.find((t) => t.id === "careful")?.job_time_multiplier ?? 1;
const COPILOT_M =
  agentsConfig.agents.find((a) => a.id === "copilot_inspired")?.time_multiplier ?? 1;
/** Real-time agent fix duration (careful seed + Câupilot). */
const AGENT_FIX_SEC_MS = taskRunConfig.test_sec * CAREFUL_TIME * COPILOT_M * 1000;

async function waitTaskRunStep(
  page: import("@playwright/test").Page,
  jobId: string,
  step: string,
  timeoutMs: number,
) {
  await page.waitForFunction(
    ({ id, want }) => {
      const raw = localStorage.getItem("devlife:v1");
      if (!raw) return false;
      const doc = JSON.parse(raw) as { state: { career: { player_jobs: { id: string; task_run: { step: string } | null }[] } } };
      const job = doc.state.career.player_jobs.find((row) => row.id === id);
      return job?.task_run?.step === want;
    },
    { id: jobId, want: step },
    { timeout: timeoutMs },
  );
}

async function showReadyAfterAgentFix(page: import("@playwright/test").Page, jobId: string) {
  await waitTaskRunStep(page, jobId, "ready", AGENT_FIX_SEC_MS + 10_000);
  const resume = page.getByTestId("task-resume");
  if (await resume.isVisible().catch(() => false)) await resume.click();
  await expect(page.getByTestId("task-step-ready")).toBeVisible();
}

async function openAgentFix(page: import("@playwright/test").Page, jobId: string) {
  await openJobsManage(page);
  await page.getByTestId(`job-do-${jobId}`).click();
  await page.getByTestId("task-resume").click();
  await page.getByTestId("task-fix-agent-copilot_inspired").click();
  await expect(page.getByTestId("task-step-agent-fix")).toBeVisible();
}

async function openJobsManage(page: import("@playwright/test").Page) {
  const jobs = page.getByTestId("open-jobs");
  await jobs.scrollIntoViewIfNeeded();
  await jobs.click();
  await expect(page.getByTestId("job-manage")).toBeVisible({ timeout: 15_000 });
}

test.describe.configure({ mode: "serial", timeout: 180_000 });

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

  test("agent fix 1 bug real timer progress and ready", async ({ page }) => {
    await bootSeeded(page, { width: 1440, height: 900 });
    await openAgentFix(page, "smoke-fix-1bug");
    const eta0 = Number.parseInt(
      (await page.getByTestId("task-agent-fix-eta").innerText()).replace(/\D/g, ""),
      10,
    );
    await page.waitForTimeout(2000);
    const eta2 = Number.parseInt(
      (await page.getByTestId("task-agent-fix-eta").innerText()).replace(/\D/g, ""),
      10,
    );
    expect(eta2).toBeLessThan(eta0);
    await page.waitForTimeout(Math.floor(AGENT_FIX_SEC_MS * 0.5));
    await expect(page.getByTestId("task-step-agent-fix")).toBeVisible();
    await expect(page.getByTestId("task-step-ready")).toBeHidden();
    await showReadyAfterAgentFix(page, "smoke-fix-1bug");
    const moneyBefore = await page.evaluate(() => {
      const doc = JSON.parse(localStorage.getItem("devlife:v1")!) as {
        state: { career: { players: { money: number } } };
      };
      return doc.state.career.players.money;
    });
    await page.getByTestId("task-commit-xong").click();
    await expect(page.getByTestId("task-step-result")).toBeVisible({ timeout: 10000 });
    const moneyAfter = await page.evaluate(() => {
      const doc = JSON.parse(localStorage.getItem("devlife:v1")!) as {
        state: { career: { players: { money: number } } };
      };
      return doc.state.career.players.money;
    });
    expect(moneyAfter).toBeGreaterThan(moneyBefore);
  });

  test("agent fix 3 bugs not instant complete", async ({ page }) => {
    await bootSeeded(page, { width: 1440, height: 900 });
    await openAgentFix(page, "smoke-fix-3bug");
    await page.waitForTimeout(Math.floor(AGENT_FIX_SEC_MS * 0.5));
    await expect(page.getByTestId("task-step-agent-fix")).toBeVisible();
    const countMid = await page.getByTestId("task-agent-fix-count").innerText();
    expect(countMid).toMatch(/Đã sửa \d\/3/);
    await showReadyAfterAgentFix(page, "smoke-fix-3bug");
  });

  test("agent fix pause switch fixer and resume", async ({ page }) => {
    await bootSeeded(page, { width: 1440, height: 900 });
    await openAgentFix(page, "smoke-fix-3bug");
    await page.waitForTimeout(1500);
    const partial = await page.evaluate(() => {
      const doc = JSON.parse(localStorage.getItem("devlife:v1")!);
      const run = doc.state.career.player_jobs.find((j: { id: string }) => j.id === "smoke-fix-3bug")
        .task_run;
      return { fixed: run.fixed_bug_ids.length, step: run.step };
    });
    expect(partial.step).toBe("agent_fix");
    await page.getByRole("button", { name: "Đổi cách sửa" }).click();
    await page.getByTestId("task-resume").click();
    await expect(page.getByTestId("task-step-bug-choice")).toBeVisible();
    await page.getByTestId("task-fix-agent-copilot_inspired").click();
    await expect(page.getByTestId("task-step-agent-fix")).toBeVisible();
    const after = await page.evaluate(() => {
      const doc = JSON.parse(localStorage.getItem("devlife:v1")!);
      return doc.state.career.player_jobs.find((j: { id: string }) => j.id === "smoke-fix-3bug").task_run
        .fixed_bug_ids.length;
    });
    expect(after).toBeGreaterThanOrEqual(partial.fixed);
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
