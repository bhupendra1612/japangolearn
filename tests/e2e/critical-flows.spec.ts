import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

function readUsers() {
  return JSON.parse(fs.readFileSync(path.resolve(".logs", "e2e-users.json"), "utf8"));
}

async function login(page: import("@playwright/test").Page) {
  const users = readUsers();
  await page.goto("/login");
  await page.getByLabel("Email").fill(users.regular.email);
  await page.getByLabel("Password").fill(users.regular.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("signup creates a learner account", async ({ page }) => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await page.goto("/signup");
  await page.getByLabel("Full Name").fill("Signup Test");
  await page.getByLabel("Email").fill(`signup-${suffix}@example.test`);
  await page.getByLabel("Password").fill("Signup-password-123!");
  await page.getByRole("button", { name: /create|sign up/i }).click();
  await expect(page.getByRole("heading", { name: /check your email/i })).toBeVisible();
});

test("login, quiz completion and daily quest verification", async ({ page }) => {
  await login(page);
  await page.goto("/dashboard/vocabulary");
  await page.getByTestId("start-vocabulary-quiz").click();

  for (let question = 0; question < 5; question += 1) {
    await page.getByTestId("vocabulary-quiz-option").first().click();
    if (question < 4) {
      await expect(page.getByTestId("vocabulary-quiz-option").first()).toBeEnabled({
        timeout: 4_000,
      });
    }
  }

  await expect(page.getByRole("heading", { name: "Quiz Complete!" })).toBeVisible({
    timeout: 8_000,
  });
  await page.goto("/dashboard/tasks");
  await expect(page.getByText("1/3 verified attempts completed")).toBeVisible();
});

test("admin authorization rejects learners and accepts admins", async ({ browser }) => {
  const users = readUsers();
  const learner = await browser.newPage();
  await learner.goto("http://127.0.0.1:3001/login");
  await learner.getByLabel("Email").fill(users.regular.email);
  await learner.getByLabel("Password").fill(users.regular.password);
  await learner.getByRole("button", { name: "Sign in" }).click();
  await expect(learner).toHaveURL(/\/forbidden/);

  const administrator = await browser.newPage();
  await administrator.goto("http://127.0.0.1:3001/login");
  await administrator.getByLabel("Email").fill(users.admin.email);
  await administrator.getByLabel("Password").fill(users.admin.password);
  await administrator.getByRole("button", { name: "Sign in" }).click();
  await expect(administrator).toHaveURL("http://127.0.0.1:3001/");
  await expect(administrator.getByRole("heading", { name: "Admin Console" })).toBeVisible();
});
