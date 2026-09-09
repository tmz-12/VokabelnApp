import { expect, test } from "@playwright/test";

test("new-user learning, persistence, favorites, override, and locale flows", async ({ page }, testInfo) => {
  const stamp = `${Date.now()}-${testInfo.project.name}`.replace(/[^a-z0-9-]/gi, "");
  const email = `e2e-${stamp}@vokabeln.local`;
  const password = "Vokabeln-E2E-2026!";

  await page.goto("/en/sign-in");
  await page.waitForLoadState("networkidle");
  const registrationToggle = page.getByRole("button", { name: "Create account" });
  await registrationToggle.click();
  await page.waitForTimeout(500);
  if (!(await page.getByLabel("Name").isVisible())) await registrationToggle.click();
  await page.getByLabel("Name").fill("E2E Learner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.locator("form").getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/en\/onboarding$/);
  await page.getByRole("button", { name: "English" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Start learning" }).click();
  await expect(page).toHaveURL(/\/en\/home$/);

  await page.locator(".station-1").click();
  await expect(page.getByRole("link", { name: "Open Kapitel" })).toBeVisible();
  await page.getByRole("link", { name: "Open Kapitel" }).click();
  await page.getByRole("button", { name: /Start new session/ }).click();
  await expect(page).toHaveURL(/\/en\/study\//);

  const firstWord = (await page.locator(".word-center h1").textContent())?.trim();
  expect(firstWord).toBeTruthy();
  const reveal = page.getByRole("button", { name: "Reveal meaning" });
  const complete = page.getByRole("heading", { name: "Session complete" });
  async function answerCard(outcome: "Still learning" | "I know it") {
    await reveal.click();
    await page.getByRole("button", { name: outcome }).click();
    await Promise.race([
      reveal.waitFor({ state: "visible", timeout: 10_000 }),
      complete.waitFor({ state: "visible", timeout: 10_000 }),
    ]);
  }
  await page.getByRole("button", { name: "Add to favorites" }).click();
  await answerCard("Still learning");

  for (let index = 0; index < 3; index += 1) {
    await answerCard("I know it");
  }
  const progressBeforeRefresh = await page.locator(".study-progress").innerText();
  await page.reload();
  await expect(page.locator(".study-progress")).toContainText(progressBeforeRefresh.split("\n")[0]);

  for (let index = 0; index < 2; index += 1) {
    await answerCard("I know it");
  }
  await expect(page.locator(".word-center h1")).toHaveText(firstWord!);

  for (let guard = 0; guard < 30; guard += 1) {
    if (await complete.isVisible()) break;
    await answerCard("I know it");
  }
  await expect(complete).toBeVisible();
  await expect(page.locator(".xp-earned")).not.toContainText("+0");
  await expect(page.getByText("First Session")).toBeVisible();

  await page.getByRole("link", { name: "Favorites" }).click();
  await expect(page.getByText(firstWord!, { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Study favorites" }).click();
  await expect(page.locator(".word-center h1")).toHaveText(firstWord!);
  await page.getByRole("button", { name: "Remove from favorites" }).click();
  await page.getByRole("link", { name: "Favorites" }).click();
  await expect(page.getByText("Star words you want to revisit")).toBeVisible();

  await page.getByRole("link", { name: "Search" }).click();
  await page.getByPlaceholder("Type a word or meaning").fill("die Klette");
  await page.locator(".search-tools").getByRole("button", { name: "Search" }).click();
  await page.getByRole("button", { name: /Word details: die Klette/ }).click();
  await expect(page.locator(".word-sheet")).toContainText("Without chapter");
  await page.getByRole("button", { name: "Edit my version" }).click();
  const marker = `persistent override ${stamp}`;
  await page.getByLabel("English").fill(marker);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".word-sheet")).toContainText(marker);
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByPlaceholder("Type a word or meaning").fill(marker);
  await page.locator(".search-tools").getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(new RegExp(encodeURIComponent(marker).replace(/%20/g, "(?:%20|\\+)")));
  await expect(page.getByText("die Klette", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: /Word details: die Klette/ }).click();
  await page.getByRole("button", { name: "Reset to original" }).click();
  await expect(page.locator(".result-count")).toHaveText("0 results");

  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByLabel("Interface language").selectOption("zh-TW");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/zh-TW\/settings$/);
  await expect(page.getByRole("heading", { name: "設定" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("介面語言")).toHaveValue("zh-TW");
});
