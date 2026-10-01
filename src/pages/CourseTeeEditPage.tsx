import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createCourseTee,
  getCourseTee,
  getCourseTeeComboHoles,
  getCourseTeeHoles,
  getCourseTees,
  saveCourseTeeComboHoles,
  saveCourseTeeHoles,
  updateCourseTee,
} from "../api/courseAdminApi";
import PageHeader from "../components/common/PageHeader";
import ScorecardHoleGrid from "../components/course/ScorecardHoleGrid";
import { useUnsavedChangesWarning } from "../hooks/useUnsavedChangesWarning";
import {
  buttonStyle,
  errorBoxStyle,
  formInputStyle,
  labelStyle,
  pageContainerWideStyle,
  primaryButtonStyle,
  sectionStyle,
  successBoxStyle,
} from "../styles/uiStyles";
import type {
  CourseHole,
  CourseTee,
  CourseTeeComboHole,
  SaveCourseHoleRequest,
  SaveCourseTeeComboHoleRequest,
  SaveCourseTeeRequest,
} from "../types/courseAdmin";

type TeeForm = {
  teeName: string;
  effectiveDate: string;
  retiredDate: string;
  courseRating: string;
  slope: string;
  womenCourseRating: string;
  womenSlope: string;
  active: boolean;
};

type HoleForm = {
  holeNumber: number;
  par: string;
  handicap: string;
  yardage: string;
  womenPar: string;
  womenHandicap: string;
};

type TeeBuildMode = "REGULAR" | "COMBO";

type ComboSourceSlot = 0 | 1;

const comboSourceSelectorStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "12px",
  marginTop: "12px",
};

const teeCapabilityPanelStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: "12px",
  marginTop: "14px",
};

const teeCapabilityCardStyle = {
  border: "1px solid #d7dce5",
  borderRadius: "10px",
  padding: "12px",
  background: "#f8fafc",
};

const teeCapabilityHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "10px",
  fontWeight: 800,
};

const teeCapabilityFieldsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "10px",
};


function formatCourseRatingInput(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) {
    return "";
  }

  return Number(value).toFixed(1);
}

function emptyForm(): TeeForm {
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

function defaultHoleForms(): HoleForm[] {
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

function defaultComboHoleSources(sourceId: string): string[] {
  const result: string[] = [];

  for (let index = 0; index < 18; index += 1) {
    result.push(sourceId);
  }

  return result;
}

function normalizeForm(form: TeeForm): TeeForm {
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

function normalizeHoleForms(holes: HoleForm[]): HoleForm[] {
  return holes.map((hole) => ({
    holeNumber: hole.holeNumber,
    par: hole.par.trim(),
    handicap: hole.handicap.trim(),
    yardage: hole.yardage.trim(),
    womenPar: hole.womenPar.trim(),
    womenHandicap: hole.womenHandicap.trim(),
  }));
}

function parseNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function calculateHoleTotal(holes: HoleForm[], field: "par" | "yardage" | "womenPar"): number | null {
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

function hasAnyHoleValue(holes: HoleForm[], fields: Array<keyof HoleForm>): boolean {
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

function inferHasMenData(form: TeeForm, holes: HoleForm[]): boolean {
  return !!form.courseRating.trim() || !!form.slope.trim() || hasAnyHoleValue(holes, ["par", "handicap"]);
}

function inferHasWomenData(form: TeeForm, holes: HoleForm[]): boolean {
  return !!form.womenCourseRating.trim() || !!form.womenSlope.trim() || hasAnyHoleValue(holes, ["womenPar", "womenHandicap"]);
}

function clearMenHoleData(holes: HoleForm[]): HoleForm[] {
  return holes.map((hole) => ({
    ...hole,
    par: "",
    handicap: "",
  }));
}

function clearWomenHoleData(holes: HoleForm[]): HoleForm[] {
  return holes.map((hole) => ({
    ...hole,
    womenPar: "",
    womenHandicap: "",
  }));
}


function hasWomenHoleDefaults(sourceHoles: HoleForm[]): boolean {
  return hasAnyHoleValue(sourceHoles, ["womenPar", "womenHandicap"]);
}

function findLongestWomenSourceHoles(availableTees: CourseTee[], sourceHoleMap: Map<number, HoleForm[]>): HoleForm[] | null {
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

function applyWomenHoleDefaults(
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

function holesForSave(holes: HoleForm[], hasMenData: boolean, hasWomenData: boolean): HoleForm[] {
  let prepared = holes;

  if (!hasMenData) {
    prepared = clearMenHoleData(prepared);
  }

  if (!hasWomenData) {
    prepared = clearWomenHoleData(prepared);
  }

  return prepared;
}


function getTeeDisplayName(tee: CourseTee): string {
  const effectiveDate = tee.effectiveDate ? ` • ${tee.effectiveDate}` : "";
  const yardage = tee.yardageTotal ? ` • ${tee.yardageTotal} yds` : "";
  return `${tee.teeName}${yardage}${effectiveDate}`;
}

function sortTeesByYardageDesc(tees: CourseTee[]): CourseTee[] {
  return [...tees].sort((a, b) => {
    const bYardage = b.yardageTotal ?? -1;
    const aYardage = a.yardageTotal ?? -1;

    if (bYardage !== aYardage) {
      return bYardage - aYardage;
    }

    return a.teeName.localeCompare(b.teeName);
  });
}

function holesFromResponse(holes: CourseHole[]): HoleForm[] {
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

function applyDefaultHoleStructureFromSource(sourceHoles: HoleForm[]): HoleForm[] {
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

function findHole(sourceHoles: HoleForm[], holeNumber: number): HoleForm | null {
  for (const hole of sourceHoles) {
    if (hole.holeNumber === holeNumber) {
      return hole;
    }
  }

  return null;
}

function applyComboSources(
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

function comboSourcesFromResponse(comboHoles: CourseTeeComboHole[]): string[] {
  const byHoleNumber = new Map<number, CourseTeeComboHole>();

  for (const comboHole of comboHoles) {
    byHoleNumber.set(comboHole.holeNumber, comboHole);
  }

  return defaultHoleForms().map((hole) => {
    const comboHole = byHoleNumber.get(hole.holeNumber);
    return comboHole?.sourceTeeId == null ? "" : String(comboHole.sourceTeeId);
  });
}

function getDistinctComboSourceIds(comboHoles: CourseTeeComboHole[]): [string, string] {
  const sourceIds: string[] = [];

  for (const comboHole of comboHoles) {
    const sourceId = comboHole.sourceTeeId == null ? "" : String(comboHole.sourceTeeId);

    if (sourceId && !sourceIds.includes(sourceId)) {
      sourceIds.push(sourceId);
    }
  }

  return [sourceIds[0] ?? "", sourceIds[1] ?? ""];
}

function buildComboHolePayload(comboHoleSourceIds: string[]): SaveCourseTeeComboHoleRequest[] {
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

function buildTeePayload(form: TeeForm, holes: HoleForm[], teeBuildMode: TeeBuildMode, hasMenData: boolean, hasWomenData: boolean): SaveCourseTeeRequest {
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

function validateGenderHoleSet(
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

function buildHolePayload(holes: HoleForm[], hasMenData: boolean, hasWomenData: boolean): SaveCourseHoleRequest[] {
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

export default function CourseTeeEditPage() {
  const navigate = useNavigate();
  const { courseId: courseIdParam, teeId: teeIdParam } = useParams();

  const courseId = courseIdParam ? Number(courseIdParam) : null;
  const teeId = teeIdParam ? Number(teeIdParam) : null;
  const isNew = teeId == null;
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<TeeForm>(emptyForm());
  const [initialForm, setInitialForm] = useState<TeeForm>(emptyForm());
  const [holes, setHoles] = useState<HoleForm[]>(defaultHoleForms());
  const [initialHoles, setInitialHoles] = useState<HoleForm[]>(defaultHoleForms());
  const [availableTees, setAvailableTees] = useState<CourseTee[]>([]);
  const [sourceHoleMap, setSourceHoleMap] = useState<Map<number, HoleForm[]>>(new Map());
  const [teeBuildMode, setTeeBuildMode] = useState<TeeBuildMode>("REGULAR");
  const [initialTeeBuildMode, setInitialTeeBuildMode] = useState<TeeBuildMode>("REGULAR");
  const [comboSourceTeeIds, setComboSourceTeeIds] = useState<[string, string]>(["", ""]);
  const [initialComboSourceTeeIds, setInitialComboSourceTeeIds] = useState<[string, string]>(["", ""]);
  const [comboHoleSourceIds, setComboHoleSourceIds] = useState<string[]>(defaultComboHoleSources(""));
  const [initialComboHoleSourceIds, setInitialComboHoleSourceIds] = useState<string[]>(defaultComboHoleSources(""));
  const [hasMenData, setHasMenData] = useState(true);
  const [initialHasMenData, setInitialHasMenData] = useState(true);
  const [hasWomenData, setHasWomenData] = useState(false);
  const [initialHasWomenData, setInitialHasWomenData] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const teeHasChanges = useMemo(() => {
    return JSON.stringify(normalizeForm(form)) !== JSON.stringify(normalizeForm(initialForm));
  }, [form, initialForm]);

  const holesHaveChanges = useMemo(() => {
    return JSON.stringify(normalizeHoleForms(holes)) !== JSON.stringify(normalizeHoleForms(initialHoles));
  }, [holes, initialHoles]);

  const comboHasChanges = useMemo(() => {
    return (
      teeBuildMode !== initialTeeBuildMode ||
      JSON.stringify(comboSourceTeeIds) !== JSON.stringify(initialComboSourceTeeIds) ||
      JSON.stringify(comboHoleSourceIds) !== JSON.stringify(initialComboHoleSourceIds)
    );
  }, [comboHoleSourceIds, comboSourceTeeIds, initialComboHoleSourceIds, initialComboSourceTeeIds, initialTeeBuildMode, teeBuildMode]);

  const capabilityHasChanges = hasMenData !== initialHasMenData || hasWomenData !== initialHasWomenData;

  const confirmIfNeeded = useUnsavedChangesWarning((teeHasChanges || holesHaveChanges || comboHasChanges || capabilityHasChanges) && !saving);

  useEffect(() => {
    firstFieldRef.current?.focus();
    firstFieldRef.current?.select();
  }, [loading]);

  useEffect(() => {
    let cancelled = false;

    async function loadSourceHoles(teeIds: number[]): Promise<Map<number, HoleForm[]>> {
      const loaded = new Map<number, HoleForm[]>();

      for (const sourceTeeId of teeIds) {
        try {
          const sourceHoles = holesFromResponse(await getCourseTeeHoles(sourceTeeId));
          loaded.set(sourceTeeId, sourceHoles);
        } catch (holeLoadError) {
          console.warn("Unable to load source tee holes.", holeLoadError);
        }
      }

      return loaded;
    }

    async function load(): Promise<void> {
      if (isNew) {
        if (!courseId || !Number.isFinite(courseId)) {
          setError("Invalid course id.");
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);

        try {
          const existingTees = await getCourseTees(courseId);
          const sortedTees = sortTeesByYardageDesc(
            existingTees.filter((tee) => tee.teeId != null && tee.teeType !== "COMBO")
          );
          const sourceIds = sortedTees.map((tee) => tee.teeId).filter((id): id is number => id != null);
          const sourceHoles = await loadSourceHoles(sourceIds);

          if (cancelled) {
            return;
          }

          setAvailableTees(sortedTees);
          setSourceHoleMap(sourceHoles);

          const highestYardageTee = sortedTees.length > 0 ? sortedTees[0] : null;
          let startingHoles = defaultHoleForms();

          if (highestYardageTee) {
            const defaultSourceHoles = sourceHoles.get(highestYardageTee.teeId) ?? [];
            startingHoles = applyDefaultHoleStructureFromSource(defaultSourceHoles);
          }

          setHoles(startingHoles);
          setInitialHoles(startingHoles);

          const firstComboSource = sortedTees.length > 0 ? String(sortedTees[0].teeId) : "";
          const secondComboSource = sortedTees.length > 1 ? String(sortedTees[1].teeId) : "";
          const startingComboSources: [string, string] = [firstComboSource, secondComboSource];
          const startingHoleSources = defaultComboHoleSources(firstComboSource);

          setComboSourceTeeIds(startingComboSources);
          setInitialComboSourceTeeIds(startingComboSources);
          setComboHoleSourceIds(startingHoleSources);
          setInitialComboHoleSourceIds(startingHoleSources);
          setTeeBuildMode("REGULAR");
          setInitialTeeBuildMode("REGULAR");
          setHasMenData(true);
          setInitialHasMenData(true);
          setHasWomenData(false);
          setInitialHasWomenData(false);
        } catch (loadDefaultsError) {
          console.warn("Unable to default new tee data.", loadDefaultsError);
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }

        return;
      }

      if (!teeId || !Number.isFinite(teeId)) {
        setError("Invalid tee id.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const tee = await getCourseTee(teeId);
        const isComboTee = tee.teeType === "COMBO";
        const loadedHoles = await getCourseTeeHoles(teeId);

        let sortedTees: CourseTee[] = [];
        let loadedComboHoles: CourseTeeComboHole[] = [];

        if (courseId && Number.isFinite(courseId)) {
          const existingTees = await getCourseTees(courseId);
          sortedTees = sortTeesByYardageDesc(
            existingTees.filter(
              (sourceTee) =>
                sourceTee.teeId != null &&
                sourceTee.teeId !== teeId &&
                sourceTee.teeType !== "COMBO"
            )
          );
        }

        if (isComboTee) {
          loadedComboHoles = await getCourseTeeComboHoles(teeId);
        }

        const sourceIds = sortedTees.map((sourceTee) => sourceTee.teeId).filter((id): id is number => id != null);
        const sourceHoles = await loadSourceHoles(sourceIds);

        const loadedForm: TeeForm = {
          teeName: tee.teeName ?? "",
          effectiveDate: tee.effectiveDate ?? "1900-01-01",
          retiredDate: tee.retiredDate ?? "",
          courseRating: formatCourseRatingInput(tee.courseRating),
          slope: tee.slope == null ? "" : String(tee.slope),
          womenCourseRating: formatCourseRatingInput(tee.womenCourseRating),
          womenSlope: tee.womenSlope == null ? "" : String(tee.womenSlope),
          active: tee.active ?? true,
        };

        const loadedHoleForms = holesFromResponse(loadedHoles);
        const loadedBuildMode: TeeBuildMode = isComboTee ? "COMBO" : "REGULAR";
        const loadedComboSourceIds: [string, string] = isComboTee ? getDistinctComboSourceIds(loadedComboHoles) : ["", ""];
        const loadedComboHoleSourceIds = isComboTee
          ? comboSourcesFromResponse(loadedComboHoles)
          : defaultComboHoleSources("");
        const loadedHasMenData = inferHasMenData(loadedForm, loadedHoleForms);
        const loadedHasWomenData = inferHasWomenData(loadedForm, loadedHoleForms);

        if (!cancelled) {
          setAvailableTees(sortedTees);
          setSourceHoleMap(sourceHoles);
          setForm(loadedForm);
          setInitialForm(loadedForm);
          setHoles(loadedHoleForms);
          setInitialHoles(loadedHoleForms);
          setTeeBuildMode(loadedBuildMode);
          setInitialTeeBuildMode(loadedBuildMode);
          setComboSourceTeeIds(loadedComboSourceIds);
          setInitialComboSourceTeeIds(loadedComboSourceIds);
          setComboHoleSourceIds(loadedComboHoleSourceIds);
          setInitialComboHoleSourceIds(loadedComboHoleSourceIds);
          setHasMenData(loadedHasMenData);
          setInitialHasMenData(loadedHasMenData);
          setHasWomenData(loadedHasWomenData);
          setInitialHasWomenData(loadedHasWomenData);
        }
      } catch (loadError) {
        console.error(loadError);
        if (!cancelled) {
          setError("Unable to load tee.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [courseId, isNew, teeId]);

  function updateField<K extends keyof TeeForm>(field: K, value: TeeForm[K]): void {
    setForm((current) => ({ ...current, [field]: value }));
    setSaveMessage(null);
  }

  function updateHoleField(index: number, field: keyof Omit<HoleForm, "holeNumber">, value: string): void {
    setHoles((current) => {
      const updated = [...current];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
    setSaveMessage(null);
  }

  function updateHasMenData(value: boolean): void {
    setHasMenData(value);
    setSaveMessage(null);
  }

  function updateHasWomenData(value: boolean): void {
    setHasWomenData(value);

    if (value) {
      setHoles((current) => applyWomenHoleDefaults(current, availableTees, sourceHoleMap));
    }

    setSaveMessage(null);
  }

  function setBuildMode(mode: TeeBuildMode): void {
    setTeeBuildMode(mode);
    setSaveMessage(null);

    if (mode === "COMBO") {
      setHoles((current) => applyComboSources(current, comboHoleSourceIds, sourceHoleMap));
    }
  }

  function updateComboSource(slot: ComboSourceSlot, teeIdValue: string): void {
    setComboSourceTeeIds((current) => {
      const updated: [string, string] = [...current] as [string, string];
      updated[slot] = teeIdValue;
      return updated;
    });

    setComboHoleSourceIds((current) => {
      const fallbackSource = slot === 0 ? teeIdValue : comboSourceTeeIds[0];
      const previousSource = comboSourceTeeIds[slot];
      const updated = current.map((sourceId) => {
        if (!sourceId || sourceId === previousSource) {
          return teeIdValue || fallbackSource || "";
        }

        return sourceId;
      });

      setHoles((currentHoles) => applyComboSources(currentHoles, updated, sourceHoleMap));
      return updated;
    });

    setSaveMessage(null);
  }

  function updateComboHoleSource(index: number, teeIdValue: string): void {
    setComboHoleSourceIds((current) => {
      const updated = [...current];
      updated[index] = teeIdValue;

      setHoles((currentHoles) => applyComboSources(currentHoles, updated, sourceHoleMap));
      return updated;
    });

    setSaveMessage(null);
  }


  async function navigateBack(): Promise<void> {
    if (!(await confirmIfNeeded())) {
      return;
    }

    navigate(courseId ? `/admin/courses/${courseId}` : "/admin/courses");
  }

  async function navigateToCourseList(): Promise<void> {
    if (!(await confirmIfNeeded())) {
      return;
    }

    navigate("/admin/courses");
  }


  async function resetForAnotherNewTee(): Promise<void> {
    if (!courseId || !Number.isFinite(courseId)) {
      return;
    }

    const existingTees = await getCourseTees(courseId);
    const sortedTees = sortTeesByYardageDesc(
      existingTees.filter((tee) => tee.teeId != null && tee.teeType !== "COMBO")
    );

    const loadedSourceHoles = new Map<number, HoleForm[]>();

    for (const sourceTee of sortedTees) {
      if (sourceTee.teeId == null) {
        continue;
      }

      try {
        const sourceHoles = holesFromResponse(await getCourseTeeHoles(sourceTee.teeId));
        loadedSourceHoles.set(sourceTee.teeId, sourceHoles);
      } catch (holeLoadError) {
        console.warn("Unable to load source tee holes.", holeLoadError);
      }
    }

    const highestYardageTee = sortedTees.length > 0 ? sortedTees[0] : null;
    let startingHoles = defaultHoleForms();

    if (highestYardageTee?.teeId != null) {
      const defaultSourceHoles = loadedSourceHoles.get(highestYardageTee.teeId) ?? [];
      startingHoles = applyDefaultHoleStructureFromSource(defaultSourceHoles);
    }

    const firstComboSource = sortedTees.length > 0 ? String(sortedTees[0].teeId) : "";
    const secondComboSource = sortedTees.length > 1 ? String(sortedTees[1].teeId) : "";
    const startingComboSources: [string, string] = [firstComboSource, secondComboSource];
    const startingHoleSources = defaultComboHoleSources(firstComboSource);
    const blankForm = emptyForm();

    setAvailableTees(sortedTees);
    setSourceHoleMap(loadedSourceHoles);
    setForm(blankForm);
    setInitialForm(blankForm);
    setHoles(startingHoles);
    setInitialHoles(startingHoles);
    setTeeBuildMode("REGULAR");
    setInitialTeeBuildMode("REGULAR");
    setComboSourceTeeIds(startingComboSources);
    setInitialComboSourceTeeIds(startingComboSources);
    setComboHoleSourceIds(startingHoleSources);
    setInitialComboHoleSourceIds(startingHoleSources);
    setHasMenData(true);
    setInitialHasMenData(true);
    setHasWomenData(false);
    setInitialHasWomenData(false);
    setSaveMessage("Tee saved. Ready to add another tee.");

    window.requestAnimationFrame(() => {
      firstFieldRef.current?.focus();
      firstFieldRef.current?.select();
    });
  }

  async function handleSave(afterSave: "stay" | "return" | "addAnother" = "stay"): Promise<void> {
    if (!courseId || !Number.isFinite(courseId)) {
      setError("Invalid course id.");
      return;
    }

    if (!isNew && (!teeId || !Number.isFinite(teeId))) {
      setError("Invalid tee id.");
      return;
    }

    if (teeBuildMode === "COMBO") {
      if (!comboSourceTeeIds[0] || !comboSourceTeeIds[1]) {
        setError("Combo tees require two source tees.");
        return;
      }

      if (comboSourceTeeIds[0] === comboSourceTeeIds[1]) {
        setError("Combo tee source 1 and source 2 must be different tees.");
        return;
      }

      for (let index = 0; index < 18; index += 1) {
        if (!comboHoleSourceIds[index]) {
          setError(`Hole ${index + 1}: select a source tee.`);
          return;
        }
      }
    }

    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const preparedHoles = holesForSave(holes, hasMenData, hasWomenData);
      const teePayload = buildTeePayload(form, preparedHoles, teeBuildMode, hasMenData, hasWomenData);
      const saved = isNew
        ? await createCourseTee(courseId, teePayload)
        : await updateCourseTee(teeId as number, teePayload);

      let savedHoles: CourseHole[];

      if (teeBuildMode === "COMBO") {
        await saveCourseTeeComboHoles(saved.teeId, buildComboHolePayload(comboHoleSourceIds));
        savedHoles = await getCourseTeeHoles(saved.teeId);
      } else {
        savedHoles = await saveCourseTeeHoles(saved.teeId, buildHolePayload(preparedHoles, hasMenData, hasWomenData));
      }

      const savedHoleForms = holesFromResponse(savedHoles);

      const savedForm: TeeForm = {
        teeName: saved.teeName ?? "",
        effectiveDate: saved.effectiveDate ?? "1900-01-01",
        retiredDate: saved.retiredDate ?? "",
        courseRating: formatCourseRatingInput(saved.courseRating),
        slope: saved.slope == null ? "" : String(saved.slope),
        womenCourseRating: formatCourseRatingInput(saved.womenCourseRating),
        womenSlope: saved.womenSlope == null ? "" : String(saved.womenSlope),
        active: saved.active ?? true,
      };

      setForm(savedForm);
      setInitialForm(savedForm);
      setHoles(savedHoleForms);
      setInitialHoles(savedHoleForms);
      setInitialTeeBuildMode(teeBuildMode);
      setTeeBuildMode(teeBuildMode);
      setInitialComboSourceTeeIds(comboSourceTeeIds);
      setInitialComboHoleSourceIds(comboHoleSourceIds);
      setHasMenData(hasMenData);
      setInitialHasMenData(hasMenData);
      setHasWomenData(hasWomenData);
      setInitialHasWomenData(hasWomenData);
      setSaveMessage("Tee saved.");

      if (afterSave === "return") {
        navigate(`/admin/courses/${courseId}`);
        return;
      }

      if (afterSave === "addAnother") {
        await resetForAnotherNewTee();
        return;
      }

      if (isNew) {
        navigate(`/admin/courses/${courseId}/tees/${saved.teeId}`, { replace: true });
      }
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "Unable to save tee.");
    } finally {
      setSaving(false);
    }
  }

  const comboSourceOptions = availableTees.filter((tee) => tee.teeId != null);
  const comboSourceOneName = comboSourceOptions.find((tee) => String(tee.teeId) === comboSourceTeeIds[0])?.teeName ?? "Source 1";
  const comboSourceTwoName = comboSourceOptions.find((tee) => String(tee.teeId) === comboSourceTeeIds[1])?.teeName ?? "Source 2";

  return (
    <div style={pageContainerWideStyle}>
      <PageHeader
        title={isNew ? "Add Tee" : "Edit Tee"}
        subtitle="Maintain tee version history, rating, slope, par, yardage, and hole data."
        actions={
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" style={buttonStyle} onClick={() => void navigateBack()} disabled={saving}>
              Course Detail
            </button>
            <button type="button" style={buttonStyle} onClick={() => void navigateToCourseList()} disabled={saving}>
              Course List
            </button>
          </div>
        }
      />

      {error ? <div style={errorBoxStyle}>{error}</div> : null}
      {saveMessage ? <div style={successBoxStyle}>{saveMessage}</div> : null}

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, marginBottom: "12px", fontSize: "18px" }}>Tee Details</h2>

        {loading ? (
          <div>Loading tee...</div>
        ) : (
          <>
            {isNew ? (
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
                <button
                  type="button"
                  style={teeBuildMode === "REGULAR" ? primaryButtonStyle : buttonStyle}
                  onClick={() => setBuildMode("REGULAR")}
                  disabled={saving}
                >
                  Regular Tee
                </button>
                <button
                  type="button"
                  style={teeBuildMode === "COMBO" ? primaryButtonStyle : buttonStyle}
                  onClick={() => setBuildMode("COMBO")}
                  disabled={saving || comboSourceOptions.length < 2}
                  title={comboSourceOptions.length < 2 ? "At least two tees are required to build a combo tee." : undefined}
                >
                  Combo Tee
                </button>
              </div>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
                alignItems: "end",
              }}
            >
              <label style={labelStyle} htmlFor="teeName">
                Tee Name
                <input
                  id="teeName"
                  ref={firstFieldRef}
                  style={formInputStyle}
                  value={form.teeName}
                  onChange={(event) => updateField("teeName", event.target.value)}
                  onFocus={(event) => event.currentTarget.select()}
                  disabled={saving}
                  placeholder={teeBuildMode === "COMBO" ? "Orange" : undefined}
                />
              </label>

              <label style={labelStyle} htmlFor="effectiveDate">
                Effective Date
                <input
                  id="effectiveDate"
                  type="date"
                  style={formInputStyle}
                  value={form.effectiveDate}
                  onChange={(event) => updateField("effectiveDate", event.target.value)}
                  disabled={saving}
                />
              </label>

              <label style={labelStyle} htmlFor="retiredDate">
                Retired Date
                <input
                  id="retiredDate"
                  type="date"
                  style={formInputStyle}
                  value={form.retiredDate}
                  onChange={(event) => updateField("retiredDate", event.target.value)}
                  disabled={saving}
                />
              </label>

              <label
                style={{
                  ...labelStyle,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: 0,
                }}
                htmlFor="active"
              >
                <input
                  id="active"
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => updateField("active", event.target.checked)}
                  disabled={saving}
                />
                Active
              </label>
            </div>

            <div style={teeCapabilityPanelStyle}>
              <div style={{ ...teeCapabilityCardStyle, background: hasMenData ? "#f8fbff" : "#f8fafc" }}>
                <label style={teeCapabilityHeaderStyle} htmlFor="hasMenData">
                  <input
                    id="hasMenData"
                    type="checkbox"
                    checked={hasMenData}
                    onChange={(event) => updateHasMenData(event.target.checked)}
                    disabled={saving}
                  />
                  Men's Tee Data
                </label>

                <div style={teeCapabilityFieldsStyle}>
                  <label style={labelStyle} htmlFor="courseRating">
                    Course Rating
                    <input
                      id="courseRating"
                      type="number"
                      step="0.1"
                      style={formInputStyle}
                      value={form.courseRating}
                      onChange={(event) => updateField("courseRating", event.target.value)}
                      onFocus={(event) => event.currentTarget.select()}
                      disabled={saving || !hasMenData}
                    />
                  </label>

                  <label style={labelStyle} htmlFor="slope">
                    Slope
                    <input
                      id="slope"
                      type="number"
                      step="1"
                      style={formInputStyle}
                      value={form.slope}
                      onChange={(event) => updateField("slope", event.target.value)}
                      onFocus={(event) => event.currentTarget.select()}
                      disabled={saving || !hasMenData}
                    />
                  </label>
                </div>
              </div>

              <div style={{ ...teeCapabilityCardStyle, background: hasWomenData ? "#fff8fd" : "#f8fafc" }}>
                <label style={teeCapabilityHeaderStyle} htmlFor="hasWomenData">
                  <input
                    id="hasWomenData"
                    type="checkbox"
                    checked={hasWomenData}
                    onChange={(event) => updateHasWomenData(event.target.checked)}
                    disabled={saving}
                  />
                  Women's Tee Data
                </label>

                <div style={teeCapabilityFieldsStyle}>
                  <label style={labelStyle} htmlFor="womenCourseRating">
                    Course Rating
                    <input
                      id="womenCourseRating"
                      type="number"
                      step="0.1"
                      style={formInputStyle}
                      value={form.womenCourseRating}
                      onChange={(event) => updateField("womenCourseRating", event.target.value)}
                      onFocus={(event) => event.currentTarget.select()}
                      disabled={saving || !hasWomenData}
                    />
                  </label>

                  <label style={labelStyle} htmlFor="womenSlope">
                    Slope
                    <input
                      id="womenSlope"
                      type="number"
                      step="1"
                      style={formInputStyle}
                      value={form.womenSlope}
                      onChange={(event) => updateField("womenSlope", event.target.value)}
                      onFocus={(event) => event.currentTarget.select()}
                      disabled={saving || !hasWomenData}
                    />
                  </label>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {!loading && teeBuildMode === "COMBO" ? (
        <section style={sectionStyle}>
          <h2 style={{ marginTop: 0, marginBottom: "8px", fontSize: "18px" }}>Combo Tee Builder</h2>
          <p style={{ marginTop: 0, color: "#555", fontSize: "13px" }}>
            Pick the two source tees, then choose which tee supplies each hole. The selected par, handicap, and yardage are copied into this new tee when saved.
          </p>

          <div style={comboSourceSelectorStyle}>
            <label style={labelStyle} htmlFor="comboSource1">
              Source Tee 1
              <select
                id="comboSource1"
                style={formInputStyle}
                value={comboSourceTeeIds[0]}
                onChange={(event) => updateComboSource(0, event.target.value)}
                disabled={saving}
              >
                <option value="">Select tee...</option>
                {comboSourceOptions.map((tee) => (
                  <option key={tee.teeId} value={tee.teeId} disabled={String(tee.teeId) === comboSourceTeeIds[1]}>
                    {getTeeDisplayName(tee)}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle} htmlFor="comboSource2">
              Source Tee 2
              <select
                id="comboSource2"
                style={formInputStyle}
                value={comboSourceTeeIds[1]}
                onChange={(event) => updateComboSource(1, event.target.value)}
                disabled={saving}
              >
                <option value="">Select tee...</option>
                {comboSourceOptions.map((tee) => (
                  <option key={tee.teeId} value={tee.teeId} disabled={String(tee.teeId) === comboSourceTeeIds[0]}>
                    {getTeeDisplayName(tee)}
                  </option>
                ))}
              </select>
            </label>
          </div>

        </section>
      ) : null}

      {!loading ? (
        <section style={sectionStyle}>
          <ScorecardHoleGrid
            holes={holes}
            disabled={saving}
            holeFieldsDisabled={teeBuildMode === "COMBO"}
            onHoleChange={updateHoleField}
            comboMode={teeBuildMode === "COMBO"}
            comboSourceTeeIds={comboSourceTeeIds}
            comboHoleSourceIds={comboHoleSourceIds}
            sourceNames={[comboSourceOneName, comboSourceTwoName]}
            onComboChange={updateComboHoleSource}
            showMenData={hasMenData}
            showWomenData={hasWomenData}
          />
        </section>
      ) : null}

      {!loading ? (
        <section style={sectionStyle}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" style={primaryButtonStyle} onClick={() => void handleSave("return")} disabled={saving}>
              {saving ? "Saving..." : "Save & Return to Course"}
            </button>

            <button type="button" style={buttonStyle} onClick={() => void handleSave("addAnother")} disabled={saving}>
              Save & Add Another Tee
            </button>

            <button type="button" style={buttonStyle} onClick={() => void handleSave()} disabled={saving}>
              Save Tee
            </button>

            <button type="button" style={buttonStyle} onClick={() => void navigateBack()} disabled={saving}>
              Cancel
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
