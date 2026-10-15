import { expect, test } from "@playwright/test";

// Self-contained browser smoke test: no Spring Boot instance or database needed.
// A later pass will add persistence tests against an isolated E2E database.
test("events page loads and opens event creation", async ({ page }) => {
  await page.route("**/api/trips?**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await page.goto("/trips");
  await expect(page.getByRole("heading", { name: "Events" })).toBeVisible();
  await expect(page.getByText("No events found. Create an event to get started.")).toBeVisible();

  await page.getByRole("button", { name: "Create Event" }).click();
  await expect(page).toHaveURL(/\/trips\/new$/);
  await expect(page.getByRole("heading", { name: "Create Event" })).toBeVisible();
});
