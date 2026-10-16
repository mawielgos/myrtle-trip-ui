import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

const expectedDatabase = "myrtle_trip_e2e_test";

// Fail closed BEFORE any writes if the proxied backend cannot prove its
// active Spring profile and actual PostgreSQL database name.
test.beforeEach(async ({ request }) => {
  const response = await request.get("/api/e2e/identity");
  expect(response.ok(), "E2E identity endpoint missing: check STS e2e profile and Vite port 5174").toBeTruthy();
  const identity: { profile?: string; database?: string } = await response.json();
  expect(identity).toEqual({ profile: "e2e", database: expectedDatabase });
});

test("create event and verify database persistence after reloading", async ({ page, request }) => {
  const eventName = `Playwright E2E ${randomUUID().slice(0, 8)}`;
  const eventCode = `E2E_${randomUUID().slice(0, 10).replaceAll("-", "").toUpperCase()}`;

  await page.goto("/trips/new");
  await expect(page.getByRole("heading", { name: "Create Event" })).toBeVisible();
  await page.getByLabel("Event Name").fill(eventName);
  await page.getByLabel("Event Code").fill(eventCode);
  await page.getByLabel("Event Start Date").fill("2027-06-01");
  await page.getByLabel("Event End Date").fill("2027-06-05");
  await page.getByLabel("Number of Rounds").fill("1");

  await page.getByRole("button", { name: "Save Event", exact: true }).click();
  await expect(page).toHaveURL(/\/trips\/\d+$/);
  const tripId = Number(new URL(page.url()).pathname.split("/").at(-1));
  expect(tripId).toBeGreaterThan(0);

  // Query the real backend after navigation: no mocked API calls.
  const saved = await request.get(`/api/trips/${tripId}`);
  expect(saved.ok()).toBeTruthy();
  const payload = await saved.json();
  expect(payload.tripName).toBe(eventName);
  expect(payload.tripCode).toBe(eventCode);

  await page.reload();
  await expect(page.getByText(eventName).first()).toBeVisible();
});
