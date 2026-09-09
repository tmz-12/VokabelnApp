import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

async function createLearner(context: BrowserContext, page: Page, suffix: string) {
  const response = await context.request.post(`${baseURL}/api/auth/sign-up/email`, {
    headers: { Origin: baseURL },
    data: {name:"QA Learner", email:`qa-${Date.now()}-${suffix}@local.test`, password:"Vokabeln-Test-2026!"},
  });
  expect(response.ok()).toBe(true);
  await page.goto("/en/onboarding");
  await page.getByRole("button", {name:"Next", exact:true}).click();
  await page.getByRole("button", {name:"Next", exact:true}).click();
  await page.getByRole("button", {name:"Start learning"}).click();
  await expect(page).toHaveURL(/\/en\/home$/);
}

test("two browser accounts isolate favorites, overrides, progress, and sessions", async ({browser, context, page}) => {
  await createLearner(context, page, "owner");
  const otherContext = await browser.newContext({baseURL});
  const other = await otherContext.newPage();
  try {
    await createLearner(otherContext, other, "other");
    await page.goto("/en/search?q=die%20Klette");
    await page.getByRole("button", {name:/Word details: die Klette/}).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("button", {name:"Add to favorites"}).click();
    await sheet.getByRole("button", {name:"Known", exact:true}).click();
    await expect(sheet.getByRole("button", {name:"Known", exact:true})).toHaveAttribute("aria-pressed", "true");
    await sheet.getByRole("button", {name:"Edit my version"}).click();
    const marker = `private-meaning-${Date.now()}`;
    await sheet.getByLabel("English", {exact:true}).fill(marker);
    await sheet.getByRole("button", {name:"Save changes"}).click();
    await expect(sheet).toContainText(marker);
    await other.goto(`/en/search?q=${marker}`);
    await expect(other.locator(".result-count")).toHaveText("0 results");
    await other.goto("/en/favorites");
    await expect(other.getByText("Star words you want to revisit", {exact:false})).toBeVisible();
    await other.goto("/en/home");
    await expect(other.locator(".gamification-line")).toContainText("0 XP");
    await page.goto("/en/favorites");
    await page.getByRole("button", {name:"Study favorites"}).click();
    await expect(page).toHaveURL(/\/study\//);
    await other.goto(page.url());
    await expect(other.locator(".flashcard")).toHaveCount(0);
  } finally { await otherContext.close(); }
});

test("responsive real-data views, themes, reduced motion, and keyboard study", async ({context, page}, testInfo) => {
  await createLearner(context, page, "layout");
  await page.emulateMedia({reducedMotion:"reduce"});
  for (const theme of ["light", "dark"] as const) {
    await page.goto("/en/settings");
    await page.getByRole("radio", {name:theme === "light" ? "Light" : "Dark", exact:true}).check();
    await page.getByRole("button", {name:"Save changes"}).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme",theme);
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({width,height:900});
      await page.goto("/de/chapter/4");
      await expect(page.locator(".vocab-count")).toContainText("436");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.screenshot({path:testInfo.outputPath(`${theme}-${width}.png`)});
    }
  }
  await page.goto("/en/chapter/1");
  await page.getByRole("button", {name:/Start new session/}).click();
  await expect(page.locator(".word-center h1")).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", {name:/I know it/})).toBeVisible();
  expect(await page.locator(".flashcard").evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThan(0.01);
  await page.keyboard.press("2");
  await expect(page.locator(".study-progress")).toContainText("Card 2 of 20");
  await page.goto("/zh-TW/search?q=Zusammengehörigkeitsgefühl");
  await expect(page.getByRole("heading", {name:"搜尋任何詞彙"})).toBeVisible();
  await page.setViewportSize({width:320,height:812});
  await page.getByRole("button", {name:/詞彙詳細資料: das Zusammengehörigkeitsgefühl/}).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(await page.getByRole("dialog").evaluate(el=>el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath("chinese-long-word-sheet.png")});
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
