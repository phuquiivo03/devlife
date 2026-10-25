import { test, expect } from "@playwright/test";

test("renders the 3D room by default", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByText("Đang tải phòng")).toBeHidden({ timeout: 15000 });
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".clay-side-block")).toBeVisible();
});

test("opens room editing and persists the desk variant", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  // Dismiss the character intro overlay first — it blocks every click.
  await page
    .getByRole("button", { name: "Bắt đầu" })
    .click({ timeout: 15000 });
  await page.keyboard.press("c");
  await page.getByRole("heading", { name: "Tùy chỉnh" }).waitFor();
  await page.getByTitle("Bàn nâng hạ").click();
  await page.reload();
  await expect(page.locator(".clay-side-block")).toBeVisible({
    timeout: 15000,
  });
  await page.keyboard.press("c");
  await page.getByRole("heading", { name: "Tùy chỉnh" }).waitFor();
  await expect(page.getByTitle("Bàn nâng hạ").first()).toBeVisible();
});
