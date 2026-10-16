import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

// Integration test uses the real API and PostgreSQL. Refuse to write unless
// STS is running against the dedicated E2E database.
test.beforeEach(async ({ request }) => {
  const response = await request.get("/api/e2e/identity");
  expect(response.ok(), "Start the backend using the e2e profile on port 8081").toBeTruthy();
  expect(await response.json()).toEqual({ profile: "e2e", database: "myrtle_trip_e2e_test" });
});

test("configure an event planned round and verify persistence after reload", async ({ page, request }) => {
  const token = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  const eventName = `Playwright Rounds ${token}`;
  const courseName = `Playwright Course ${token}`;

  // Ensure this test is independent of course master data in a fresh database.
  // Fixture creation uses actual admin API endpoints, not mocks or direct SQL.
  const courseResponse = await request.post("/api/admin/courses", {
    data: {
      legacyCourseNumber: null, courseName, location: "E2E Test",
      addressLine1: "", addressLine2: "", city: "", state: "",
      postalCode: "", phoneNumber: "", websiteUrl: "", active: true,
    },
  });
  expect(courseResponse.ok(), await courseResponse.text()).toBeTruthy();
  const courseId = (await courseResponse.json()).courseId as number;
  expect(courseId).toBeGreaterThan(0);

  const teeResponse = await request.post(`/api/admin/courses/${courseId}/tees`, {
    data: {
      teeName: "E2E White", effectiveDate: null, retiredDate: null,
      courseRating: 70.5, slope: 125, parTotal: 72, yardageTotal: 6200, active: true,
    },
  });
  expect(teeResponse.ok(), await teeResponse.text()).toBeTruthy();
  const teeId = (await teeResponse.json()).teeId as number;
  expect(teeId).toBeGreaterThan(0);

  // The planning UI only offers men's tees with a complete 18-hole setup.
  // A newly created tee has zero holes and is intentionally excluded.
  const holesResponse = await request.put(`/api/admin/courses/tees/${teeId}/holes`, {
    data: Array.from({ length: 18 }, (_, index) => ({
      holeNumber: index + 1,
      par: 4,
      handicap: index + 1,
      yardage: index < 10 ? 345 : 344,
      womenPar: null,
      womenHandicap: null,
    })),
  });
  expect(holesResponse.ok(), await holesResponse.text()).toBeTruthy();
  expect((await holesResponse.json()).length).toBe(18);

  const eligibleTeesResponse = await request.get(`/api/courses/${courseId}/tees`);
  expect(eligibleTeesResponse.ok()).toBeTruthy();
  const eligibleTees = await eligibleTeesResponse.json() as Array<{
    courseTeeId: number; holeCount: number;
  }>;
  expect(eligibleTees.find((tee) => tee.courseTeeId === teeId)?.holeCount).toBe(18);

  await page.goto("/trips/new");
  await expect(page.getByRole("heading", { name: "Create Event" })).toBeVisible();
  await page.getByLabel("Event Name").fill(eventName);
  await page.getByLabel("Event Code").fill(`ROUNDS_${token}`);
  await page.getByLabel("Event Start Date").fill("2027-09-01");
  await page.getByLabel("Event End Date").fill("2027-09-05");
  await page.getByLabel("Number of Rounds").fill("1");
  await page.getByRole("button", { name: "Save Event", exact: true }).click();
  await expect(page).toHaveURL(/\/trips\/\d+$/);
  const tripId = Number(new URL(page.url()).pathname.split("/").at(-1));

  await page.goto(`/trips/${tripId}/planned-rounds`);
  await expect(page.getByRole("heading", { name: "Planned Rounds" })).toBeVisible();
  // A newly created event normally provides one blank planned round.
  // Account for a configuration where no blank round is provisioned yet.
  if ((await page.getByLabel("Date", { exact: true }).count()) === 0) {
    await page.getByRole("button", { name: "Add Round" }).first().click();
  }
  await page.getByLabel("Date", { exact: true }).first().fill("2027-09-02");
  // The Date field is inside the expanded round editor, so it is already open.
  // Do not click Round 1 here: that toggles the accordion CLOSED.
  // Identify the course select by its placeholder option to avoid an ambiguous
  // accessible label (the accordion summary also contains "Course").
  const courseSelect = page.locator('select:has(option:text-is("Select course"))').first();
  await expect(courseSelect).toBeVisible();
  await expect(courseSelect.locator(`option[value="${courseId}"]`)).toHaveCount(1);
  await courseSelect.selectOption(String(courseId));
  const teeSelect = page.getByLabel("Men's Default Tee").first();
  await expect(teeSelect.locator(`option[value="${teeId}"]`)).toHaveCount(1);
  await teeSelect.selectOption(String(teeId));
  const gameSelect = page.locator('select:has(option:text-is("Select game"))').first();
  await expect(gameSelect).toBeVisible();
  await expect(gameSelect.locator('option[value="STROKE_PLAY"]')).toHaveCount(1);
  await gameSelect.selectOption("STROKE_PLAY");
  await page.getByRole("button", { name: "Save Planned Rounds" }).first().click();
  await expect(page.getByText(/Planned rounds saved/)).toBeVisible();

  const readRounds = async () => {
    const response = await request.get(`/api/trips/${tripId}/planned-rounds`);
    expect(response.ok()).toBeTruthy();
    return (await response.json()) as Array<{
      roundDate: string; courseId: number; defaultTeeId: number; format: string;
    }>;
  };
  await expect.poll(async () => (await readRounds()).length).toBe(1);
  expect((await readRounds())[0]).toMatchObject({
    roundDate: "2027-09-02", courseId, defaultTeeId: teeId, format: "STROKE_PLAY",
  });

  await page.reload();
  await expect(page.getByRole("heading", { name: "Planned Rounds" })).toBeVisible();
  // The page initially renders with no rounds while the API request is pending.
  // Once the saved rounds load, the first round expands automatically. Checking
  // isVisible() immediately after reload can race with loading and cause a click
  // that collapses the newly opened editor.
  const reloadedDate = page.getByLabel("Date", { exact: true }).first();
  await expect(reloadedDate).toBeVisible();
  await expect(reloadedDate).toHaveValue("2027-09-02");
  await expect(page.locator('select:has(option:text-is("Select course"))').first()).toHaveValue(String(courseId));
  await expect(page.getByLabel("Men's Default Tee").first()).toHaveValue(String(teeId));
  await expect(page.locator('select:has(option:text-is("Select game"))').first()).toHaveValue("STROKE_PLAY");
});
