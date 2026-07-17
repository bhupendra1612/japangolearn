import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of ["/", "/login", "/signup"]) {
  test(`@a11y ${path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? "")
      )
    ).toEqual([]);
  });
}

test("@a11y admin login has no serious accessibility violations", async ({ page }) => {
  await page.goto("http://127.0.0.1:3001/login");
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? "")
    )
  ).toEqual([]);
});
