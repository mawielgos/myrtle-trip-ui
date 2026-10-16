import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

// Never write to a non-E2E database. This suite creates its own player and event.
test.beforeEach(async ({ request }) => {
  const identity = await request.get("/api/e2e/identity");
  expect(identity.ok(), "Start STS with the e2e profile on port 8081").toBeTruthy();
  expect(await identity.json()).toEqual({ profile: "e2e", database: "myrtle_trip_e2e_test" });
});

test("add an event player and persist withdrawal/reactivation after reload", async ({ page, request }) => {
  const token = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  const firstName = "Playwright";
  const lastName = `Roster${token}`;
  const playerName = `${firstName} ${lastName}`;
  const eventName = `Playwright Roster ${token}`;

  // Create a unique master player through the application's real UI.
  await page.goto("/admin/players/new");
  await expect(page.getByRole("heading", { name: "Add Player" })).toBeVisible();
  await page.getByText("First Name", { exact: true }).locator("..").locator("input").fill(firstName);
  await page.getByText("Last Name", { exact: true }).locator("..").locator("input").fill(lastName);
  await page.getByRole("button", { name: "Save Player" }).click();
  await expect(page).toHaveURL(/\/admin\/players\/\d+$/);
  const playerId = Number(new URL(page.url()).pathname.split("/").at(-1));
  expect(playerId).toBeGreaterThan(0);

  // Create a fresh event and select precisely the newly created player.
  await page.goto("/trips/new");
  await expect(page.getByRole("heading", { name: "Create Event" })).toBeVisible();
  await page.getByLabel("Event Name").fill(eventName);
  await page.getByLabel("Event Code").fill(`ROSTER_${token}`);
  await page.getByLabel("Event Start Date").fill("2027-08-01");
  await page.getByLabel("Event End Date").fill("2027-08-03");
  await page.getByLabel("Number of Rounds").fill("1");
  // Avoid depending on GHIN history in a fresh E2E database.
  await page.getByRole("checkbox", { name: /Scratch \/ no handicaps/ }).check();
  await page.getByLabel("Search Players").fill(lastName);
  const playerRow = page.getByRole("row").filter({ hasText: lastName });
  await expect(playerRow).toHaveCount(1);
  await playerRow.getByRole("checkbox").check();
  await expect(page.getByText("Selected Players:").locator("..")).toContainText("1");
  await page.getByRole("button", { name: "Save Event", exact: true }).click();
  await expect(page).toHaveURL(/\/trips\/\d+$/);
  const tripId = Number(new URL(page.url()).pathname.split("/").at(-1));
  expect(tripId).toBeGreaterThan(0);

  const readRoster = async () => {
    const response = await request.get(`/api/trips/${tripId}/players`);
    expect(response.ok()).toBeTruthy();
    return (await response.json()) as Array<{ playerId: number; participationStatus?: string }>;
  };
  expect((await readRoster()).some((player) => player.playerId === playerId)).toBe(true);

  // Change participation through the real maintenance page, then verify the database-facing API.
  await page.goto(`/trips/${tripId}/players`);
  await expect(page.getByRole("heading", { name: "Event Player Maintenance" })).toBeVisible();
  // Withdrawal requires a native browser confirmation; accept it before clicking.
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Mark Withdrawal" }).click();
  await expect.poll(async () => (await readRoster()).find((p) => p.playerId === playerId)?.participationStatus).toBe("WITHDRAWN");
  await page.reload();
  await expect(page.getByRole("button", { name: "Mark Active" })).toBeVisible();
  await page.getByRole("button", { name: "Mark Active" }).click();
  await expect.poll(async () => (await readRoster()).find((p) => p.playerId === playerId)?.participationStatus).toBe("ACTIVE");
  await page.reload();
  await expect(page.getByRole("button", { name: "Mark Withdrawal" })).toBeVisible();
  expect((await readRoster()).find((p) => p.playerId === playerId)?.participationStatus).toBe("ACTIVE");
  await expect(page.getByText(playerName).first()).toBeVisible();
});
