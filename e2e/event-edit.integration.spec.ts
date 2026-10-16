import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

// Integration-only suite: requires STS backend with Spring profile=e2e
// and its isolated PostgreSQL database. Verify BEFORE any test writes.
test.beforeEach(async ({ request }) => {
  const response = await request.get("/api/e2e/identity");
  expect(response.ok(), "E2E identity unavailable: start the STS e2e backend on port 8081").toBeTruthy();
  expect(await response.json()).toEqual({ profile: "e2e", database: "myrtle_trip_e2e_test" });
});

test("edit a newly created event and verify persistence after reload", async ({ page, request }) => {
  const token = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  const originalName = `Playwright Edit Before ${token}`;
  const updatedName = `Playwright Edit After ${token}`;
  const code = `EDIT_${token}`;

  // Create through the actual React UI; never seed an event directly into the DB.
  await page.goto("/trips/new");
  await expect(page.getByRole("heading", { name: "Create Event" })).toBeVisible();
  await page.getByLabel("Event Name").fill(originalName);
  await page.getByLabel("Event Code").fill(code);
  await page.getByLabel("Event Start Date").fill("2027-07-01");
  await page.getByLabel("Event End Date").fill("2027-07-04");
  await page.getByLabel("Number of Rounds").fill("1");
  await page.getByRole("button", { name: "Save Event", exact: true }).click();

  await expect(page).toHaveURL(/\/trips\/\d+$/);
  const tripId = Number(new URL(page.url()).pathname.split("/").at(-1));
  expect(tripId).toBeGreaterThan(0);

  // Edit through the UI; assert the loaded values instead of assuming edit hydration.
  await page.getByRole("button", { name: "Edit Event" }).click();
  await expect(page).toHaveURL(new RegExp(`/trips/${tripId}/edit$`));
  await expect(page.getByLabel("Event Name")).toHaveValue(originalName);
  await expect(page.getByLabel("Event Code")).toHaveValue(code);
  await page.getByLabel("Event Name").fill(updatedName);
  await page.getByLabel("Entry Fee").fill("125");
  await page.getByLabel("Number of Rounds").fill("2");
  await page.getByRole("button", { name: "Save Event Changes", exact: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`/trips/${tripId}$`));

  // Verify directly through the real backend, not through client-side state.
  const response = await request.get(`/api/trips/${tripId}`);
  expect(response.ok()).toBeTruthy();
  const persisted = await response.json();
  expect(persisted.tripName).toBe(updatedName);
  expect(persisted.tripCode).toBe(code);
  expect(Number(persisted.entryFee)).toBe(125);
  expect(Number(persisted.plannedRoundCount)).toBe(2);

  // Fresh browser request must reconstruct the updated data from persistence.
  await page.reload();
  await expect(page.getByText(updatedName).first()).toBeVisible();
  await page.getByRole("button", { name: "Edit Event" }).click();
  await expect(page.getByLabel("Event Name")).toHaveValue(updatedName);
  await expect(page.getByLabel("Entry Fee")).toHaveValue("125");
  await expect(page.getByLabel("Number of Rounds")).toHaveValue("2");
});
