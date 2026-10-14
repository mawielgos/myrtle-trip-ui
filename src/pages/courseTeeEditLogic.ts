import type {
  CourseHole,
  CourseTee,
  CourseTeeComboHole,
  SaveCourseHoleRequest,
  SaveCourseTeeComboHoleRequest,
  SaveCourseTeeRequest,
} from "../types/courseAdmin";

export type TeeForm = {
  teeName: string;
  effectiveDate: string;
  retiredDate: string;
  courseRating: string;
  slope: string;
  womenCourseRating: string;
  womenSlope: string;
  active: boolean;
};

export type HoleForm = {
  holeNumber: number;
  par: string;
  handicap: string;
  yardage: string;
  womenPar: string;
  womenHandicap: string;
};

export type TeeBuildMode = "REGULAR" | "COMBO";

export type ComboSourceSlot = 0 | 1;

export function formatCourseRatingInput(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "";
  }

  return Number(value).toFixed(1);
}

export function emptyForm(): TeeForm {
  return {
    teeName: "",
    effectiveDate: "1900-01-01",
    retiredDate: "",
    courseRating: "",
    slope: "",
    womenCourseRating: "",
    womenSlope: "",
    active: true,
  };
}

export function defaultHoleForms(): HoleForm[] {
  const holes: HoleForm[] = [];

  for (let holeNumber = 1; holeNumber <= 18; holeNumber += 1) {
    holes.push({
      holeNumber,
      par: "4",
      handicap: String(holeNumber),
      yardage: "",
      womenPar: "",
      womenHandicap: "",
    });
  }

  return holes;
}

export function defaultComboHoleSources(sourceId: string): string[] {
  const result: string[] = [];

  for (let index = 0; index < 18; index += 1) {
    result.push(sourceId);
  }

  return result;
}

export function normalizeForm(form: TeeForm): TeeForm {
  return {
    ...form,
    teeName: form.teeName.trim(),
    effectiveDate: form.effectiveDate.trim(),
    retiredDate: form.retiredDate.trim(),
    courseRating: form.courseRating.trim(),
    slope: form.slope.trim(),
    womenCourseRating: form.womenCourseRating.trim(),
    womenSlope: form.womenSlope.trim(),
  };
}

export function normalizeHoleForms(holes: HoleForm[]): HoleForm[] {
  return holes.map((hole) => ({
    holeNumber: hole.holeNumber,
    par: hole.par.trim(),
    handicap: hole.handicap.trim(),
    yardage: hole.yardage.trim(),
    womenPar: hole.womenPar.trim(),
    womenHandicap: hole.womenHandicap.trim(),
  }));
}

export function parseNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function calculateHoleTotal(holes: HoleForm[], field: "par" | "yardage" | "womenPar"): number | null {
  let total = 0;
  let hasAnyValue = false;

  for (const hole of holes) {
    const value = parseNumber(hole[field]);

    if (value != null) {
      total += value;
      hasAnyValue = true;
    }
  }

  return hasAnyValue ? Math.trunc(total) : null;
}

export function hasAnyHoleValue(holes: HoleForm[], fields: Array<keyof HoleForm>): boolean {
  for (const hole of holes) {
    for (const field of fields) {
      const value = String(hole[field] ?? "").trim();

      if (value) {
        return true;
      }
    }
  }

  return false;
}

export function inferHasMenData(form: TeeForm, holes: HoleForm[]): boolean {
  return !!form.courseRating.trim() || !!form.slope.trim() || hasAnyHoleValue(holes, ["par", "handicap"]);
}

export function inferHasWomenData(form: TeeForm, holes: HoleForm[]): boolean {
  return !!form.womenCourseRating.trim() || !!form.womenSlope.trim() || hasAnyHoleValue(holes, ["womenPar", "womenHandicap"]);
}

export function clearMenHoleData(holes: HoleForm[]): HoleForm[] {
  return holes.map((hole) => ({
    ...hole,
    par: "",
    handicap: "",
  }));
}

export function clearWomenHoleData(holes: HoleForm[]): HoleForm[] {
  return holes.map((hole) => ({
    ...hole,
    womenPar: "",
    womenHandicap: "",
  }));
}


export function hasWomenHoleDefaults(sourceHoles: HoleForm[]): boolean {
  return hasAnyHoleValue(sourceHoles, ["womenPar", "womenHandicap"]);
}

export function findLongestWomenSourceHoles(availableTees: CourseTee[], sourceHoleMap: Map<number, HoleForm[]>): HoleForm[] | null {
  const sorted = sortTeesByYardageDesc(availableTees.filter((tee) => tee.teeId != null));

  for (const tee of sorted) {
    if (tee.teeId == null) {
      continue;
    }

    const sourceHoles = sourceHoleMap.get(tee.teeId) ?? [];
    const teeHasWomenData = tee.womenCourseRating != null || tee.womenSlope != null || hasWomenHoleDefaults(sourceHoles);

    if (teeHasWomenData && sourceHoles.length > 0) {
      return sourceHoles;
    }
  }

  return null;
}

export function applyWomenHoleDefaults(
  currentHoles: HoleForm[],
  availableTees: CourseTee[],
  sourceHoleMap: Map<number, HoleForm[]>
): HoleForm[] {
  const womenSourceHoles = findLongestWomenSourceHoles(availableTees, sourceHoleMap);

  return currentHoles.map((hole) => {
    const sourceHole = womenSourceHoles ? findHole(womenSourceHoles, hole.holeNumber) : null;
    const defaultWomenPar = sourceHole?.womenPar || sourceHole?.par || hole.par;
    const defaultWomenHandicap = sourceHole?.womenHandicap || sourceHole?.handicap || hole.handicap;

    return {
      ...hole,
      womenPar: hole.womenPar || defaultWomenPar || "",
      womenHandicap: hole.womenHandicap || defaultWomenHandicap || "",
    };
  });
}

export function holesForSave(holes: HoleForm[], hasMenData: boolean, hasWomenData: boolean): HoleForm[] {
  let prepared = holes;

  if (!hasMenData) {
    prepared = clearMenHoleData(prepared);
  }

  if (!hasWomenData) {
    prepared = clearWomenHoleData(prepared);
  }

  return prepared;
}


export function getTeeDisplayName(tee: CourseTee): string {
  const effectiveDate = tee.effectiveDate ? ` • ${tee.effectiveDate}` : "";
  const yardage = tee.yardageTotal ? ` • ${tee.yardageTotal} yds` : "";
  return `${tee.teeName}${yardage}${effectiveDate}`;
}

export function sortTeesByYardageDesc(tees: CourseTee[]): CourseTee[] {
  return [...tees].sort((a, b) => {
    const bYardage = b.yardageTotal ?? -1;
    const aYardage = a.yardageTotal ?? -1;

    if (bYardage !== aYardage) {
      return bYardage - aYardage;
    }

    return a.teeName.localeCompare(b.teeName);
  });
}

export function holesFromResponse(holes: CourseHole[]): HoleForm[] {
  if (holes.length === 0) {
    return defaultHoleForms();
  }

  const byHoleNumber = new Map<number, CourseHole>();

  for (const hole of holes) {
    byHoleNumber.set(hole.holeNumber, hole);
  }

  return defaultHoleForms().map((defaultHole) => {
    const hole = byHoleNumber.get(defaultHole.holeNumber);

    if (!hole) {
      return defaultHole;
    }

    return {
      holeNumber: defaultHole.holeNumber,
      par: hole.par == null ? "" : String(hole.par),
      handicap: hole.handicap == null ? "" : String(hole.handicap),
      yardage: hole.yardage == null ? "" : String(hole.yardage),
      womenPar: hole.womenPar == null ? "" : String(hole.womenPar),
      womenHandicap: hole.womenHandicap == null ? "" : String(hole.womenHandicap),
    };
  });
}

export function applyDefaultHoleStructureFromSource(sourceHoles: HoleForm[]): HoleForm[] {
  const sourceByHoleNumber = new Map<number, HoleForm>();

  for (const sourceHole of sourceHoles) {
    sourceByHoleNumber.set(sourceHole.holeNumber, sourceHole);
  }

  return defaultHoleForms().map((defaultHole) => {
    const sourceHole = sourceByHoleNumber.get(defaultHole.holeNumber);

    if (!sourceHole) {
      return defaultHole;
    }

    return {
      holeNumber: defaultHole.holeNumber,
      par: sourceHole.par || defaultHole.par,
      handicap: sourceHole.handicap || defaultHole.handicap,
      yardage: "",
      womenPar: sourceHole.womenPar || "",
      womenHandicap: sourceHole.womenHandicap || "",
    };
  });
}

export function findHole(sourceHoles: HoleForm[], holeNumber: number): HoleForm | null {
  for (const hole of sourceHoles) {
    if (hole.holeNumber === holeNumber) {
      return hole;
    }
  }

  return null;
}

export function applyComboSources(
  currentHoles: HoleForm[],
  comboHoleSourceIds: string[],
  sourceHoleMap: Map<number, HoleForm[]>
): HoleForm[] {
  return currentHoles.map((hole, index) => {
    const selectedSourceId = Number(comboHoleSourceIds[index]);

    if (!Number.isFinite(selectedSourceId)) {
      return hole;
    }

    const sourceHole = findHole(sourceHoleMap.get(selectedSourceId) ?? [], hole.holeNumber);

    if (!sourceHole) {
      return hole;
    }

    return {
      holeNumber: hole.holeNumber,
      par: sourceHole.par,
      handicap: sourceHole.handicap,
      yardage: sourceHole.yardage,
      womenPar: sourceHole.womenPar,
      womenHandicap: sourceHole.womenHandicap,
    };
  });
}

export function comboSourcesFromResponse(comboHoles: CourseTeeComboHole[]): string[] {
  const byHoleNumber = new Map<number, CourseTeeComboHole>();

  for (const comboHole of comboHoles) {
    byHoleNumber.set(comboHole.holeNumber, comboHole);
  }

  return defaultHoleForms().map((hole) => {
    const comboHole = byHoleNumber.get(hole.holeNumber);
    return comboHole?.sourceTeeId == null ? "" : String(comboHole.sourceTeeId);
  });
}

export function getDistinctComboSourceIds(comboHoles: CourseTeeComboHole[]): [string, string] {
  const sourceIds: string[] = [];

  for (const comboHole of comboHoles) {
    const sourceId = comboHole.sourceTeeId == null ? "" : String(comboHole.sourceTeeId);

    if (sourceId && !sourceIds.includes(sourceId)) {
      sourceIds.push(sourceId);
    }
  }

  return [sourceIds[0] ?? "", sourceIds[1] ?? ""];
}

export function buildComboHolePayload(comboHoleSourceIds: string[]): SaveCourseTeeComboHoleRequest[] {
  if (comboHoleSourceIds.length !== 18) {
    throw new Error("Exactly 18 combo tee hole mappings are required.");
  }

  const payload: SaveCourseTeeComboHoleRequest[] = [];

  for (let index = 0; index < 18; index += 1) {
    const sourceTeeId = Number(comboHoleSourceIds[index]);

    if (!Number.isFinite(sourceTeeId) || sourceTeeId <= 0) {
      throw new Error(`Hole ${index + 1}: select a source tee.`);
    }

    payload.push({
      holeNumber: index + 1,
      sourceTeeId: Math.trunc(sourceTeeId),
    });
  }

  return payload;
}

export function buildTeePayload(form: TeeForm, holes: HoleForm[], teeBuildMode: TeeBuildMode, hasMenData: boolean, hasWomenData: boolean): SaveCourseTeeRequest {
  const courseRating = parseNumber(form.courseRating);
  const slope = parseNumber(form.slope);
  const womenCourseRating = parseNumber(form.womenCourseRating);
  const womenSlope = parseNumber(form.womenSlope);
  const calculatedMenParTotal = calculateHoleTotal(holes, "par");
  const calculatedWomenParTotal = calculateHoleTotal(holes, "womenPar");
  const calculatedYardageTotal = calculateHoleTotal(holes, "yardage");

  if (!form.teeName.trim()) {
    throw new Error("Tee name is required.");
  }

  if (!form.effectiveDate.trim()) {
    throw new Error("Effective date is required.");
  }

  if (form.retiredDate.trim() && form.retiredDate.trim() < form.effectiveDate.trim()) {
    throw new Error("Retired date cannot be before effective date.");
  }

  if (!hasMenData && !hasWomenData) {
    throw new Error("Select Men's Tee Data, Women's Tee Data, or both.");
  }

  if (hasMenData && (courseRating == null || courseRating <= 0 || slope == null || slope <= 0)) {
    throw new Error("Men's course rating and slope are required when Men's Tee Data is checked.");
  }

  if (hasWomenData && (womenCourseRating == null || womenCourseRating <= 0 || womenSlope == null || womenSlope <= 0)) {
    throw new Error("Women's course rating and slope are required when Women's Tee Data is checked.");
  }

  if (hasMenData && (calculatedMenParTotal == null || calculatedMenParTotal <= 0)) {
    throw new Error("Men's par must be defined in the scorecard when Men's Tee Data is checked.");
  }

  if (hasWomenData && (calculatedWomenParTotal == null || calculatedWomenParTotal <= 0)) {
    throw new Error("Women's par must be defined in the scorecard when Women's Tee Data is checked.");
  }

  return {
    teeName: form.teeName.trim(),
    teeType: teeBuildMode,
    effectiveDate: form.effectiveDate.trim(),
    retiredDate: form.retiredDate.trim() || null,
    courseRating: hasMenData ? courseRating : null,
    slope: hasMenData ? Math.trunc(slope as number) : null,
    parTotal: Math.trunc((hasMenData ? calculatedMenParTotal : calculatedWomenParTotal) ?? 0),
    yardageTotal: calculatedYardageTotal,
    womenCourseRating: hasWomenData ? womenCourseRating : null,
    womenSlope: hasWomenData ? Math.trunc(womenSlope as number) : null,
    womenParTotal: hasWomenData && calculatedWomenParTotal != null ? Math.trunc(calculatedWomenParTotal) : null,
    active: form.active,
  };
}

export function validateGenderHoleSet(
  holes: HoleForm[],
  parField: "par" | "womenPar",
  handicapField: "handicap" | "womenHandicap",
  label: string
): boolean {
  let hasAny = false;
  let complete = true;
  const usedHandicaps = new Set<number>();

  for (const hole of holes) {
    const par = parseNumber(hole[parField]);
    const handicap = parseNumber(hole[handicapField]);
    const hasHoleData = par != null || handicap != null;

    if (!hasHoleData) {
      complete = false;
      continue;
    }

    hasAny = true;

    if (par == null || par <= 0) {
      throw new Error(`Hole ${hole.holeNumber}: ${label} par is required and must be greater than 0.`);
    }

    if (handicap == null || handicap < 1 || handicap > 18) {
      throw new Error(`Hole ${hole.holeNumber}: ${label} handicap must be between 1 and 18.`);
    }

    if (usedHandicaps.has(Math.trunc(handicap))) {
      throw new Error(`${label} handicap ${Math.trunc(handicap)} is duplicated.`);
    }

    usedHandicaps.add(Math.trunc(handicap));
  }

  if (hasAny && !complete) {
    throw new Error(`${label} par and handicap must be complete for all 18 holes, or blank for all 18 holes.`);
  }

  return hasAny;
}

export function buildHolePayload(holes: HoleForm[], hasMenData: boolean, hasWomenData: boolean): SaveCourseHoleRequest[] {
  if (holes.length !== 18) {
    throw new Error("Exactly 18 holes are required.");
  }

  if (!hasMenData && !hasWomenData) {
    throw new Error("Select Men's Tee Data, Women's Tee Data, or both.");
  }

  if (hasMenData) {
    validateGenderHoleSet(holes, "par", "handicap", "Men's");
  }

  if (hasWomenData) {
    validateGenderHoleSet(holes, "womenPar", "womenHandicap", "Women's");
  }

  const payload: SaveCourseHoleRequest[] = [];

  for (const hole of holes) {
    const yardage = parseNumber(hole.yardage);

    if (yardage != null && yardage <= 0) {
      throw new Error(`Hole ${hole.holeNumber}: yardage must be greater than 0 when entered.`);
    }

    const par = parseNumber(hole.par);
    const handicap = parseNumber(hole.handicap);
    const womenPar = parseNumber(hole.womenPar);
    const womenHandicap = parseNumber(hole.womenHandicap);

    payload.push({
      holeNumber: hole.holeNumber,
      par: par == null ? null : Math.trunc(par),
      handicap: handicap == null ? null : Math.trunc(handicap),
      yardage: yardage == null ? null : Math.trunc(yardage),
      womenPar: womenPar == null ? null : Math.trunc(womenPar),
      womenHandicap: womenHandicap == null ? null : Math.trunc(womenHandicap),
    });
  }

  return payload;
}
