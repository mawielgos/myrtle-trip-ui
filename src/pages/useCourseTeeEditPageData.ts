import { useCallback, useEffect, useState } from "react";
import {
  getCourseTee,
  getCourseTeeComboHoles,
  getCourseTeeHoles,
  getCourseTees,
} from "../api/courseAdminApi";
import type { CourseTee, CourseTeeComboHole } from "../types/courseAdmin";
import {
  applyDefaultHoleStructureFromSource,
  comboSourcesFromResponse,
  defaultComboHoleSources,
  defaultHoleForms,
  emptyForm,
  formatCourseRatingInput,
  getDistinctComboSourceIds,
  holesFromResponse,
  inferHasMenData,
  inferHasWomenData,
  sortTeesByYardageDesc,
  type HoleForm,
  type TeeBuildMode,
  type TeeForm,
} from "./courseTeeEditLogic";

interface UseCourseTeeEditPageDataArgs {
  courseId: number | null;
  teeId: number | null;
  isNew: boolean;
}

export function useCourseTeeEditPageData({
  courseId,
  teeId,
  isNew,
}: UseCourseTeeEditPageDataArgs) {
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
  const [error, setError] = useState<string | null>(null);
  const [hydrationRevision, setHydrationRevision] = useState(0);

  const loadSourceHoles = useCallback(async (teeIds: number[]): Promise<Map<number, HoleForm[]>> => {
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
  }, []);

  const hydrateNewTeeDefaults = useCallback(async (): Promise<boolean> => {
    if (!courseId || !Number.isFinite(courseId)) {
      setError("Invalid course id.");
      setLoading(false);
      return false;
    }

    const existingTees = await getCourseTees(courseId);
    const sortedTees = sortTeesByYardageDesc(
      existingTees.filter((tee) => tee.teeId != null && tee.teeType !== "COMBO")
    );
    const sourceIds = sortedTees.map((tee) => tee.teeId).filter((id): id is number => id != null);
    const sourceHoles = await loadSourceHoles(sourceIds);

    const highestYardageTee = sortedTees.length > 0 ? sortedTees[0] : null;
    let startingHoles = defaultHoleForms();

    if (highestYardageTee?.teeId != null) {
      startingHoles = applyDefaultHoleStructureFromSource(sourceHoles.get(highestYardageTee.teeId) ?? []);
    }

    const firstComboSource = sortedTees.length > 0 ? String(sortedTees[0].teeId) : "";
    const secondComboSource = sortedTees.length > 1 ? String(sortedTees[1].teeId) : "";
    const startingComboSources: [string, string] = [firstComboSource, secondComboSource];
    const startingHoleSources = defaultComboHoleSources(firstComboSource);
    const blankForm = emptyForm();

    setAvailableTees(sortedTees);
    setSourceHoleMap(sourceHoles);
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
    setHydrationRevision((value) => value + 1);
    return true;
  }, [courseId, loadSourceHoles]);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      if (isNew) {
        await hydrateNewTeeDefaults();
        return;
      }

      if (!teeId || !Number.isFinite(teeId)) {
        setError("Invalid tee id.");
        return;
      }

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
      const loadedComboSourceIds: [string, string] = isComboTee
        ? getDistinctComboSourceIds(loadedComboHoles)
        : ["", ""];
      const loadedComboHoleSourceIds = isComboTee
        ? comboSourcesFromResponse(loadedComboHoles)
        : defaultComboHoleSources("");
      const loadedHasMenData = inferHasMenData(loadedForm, loadedHoleForms);
      const loadedHasWomenData = inferHasWomenData(loadedForm, loadedHoleForms);

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
      setHydrationRevision((value) => value + 1);
    } catch (loadError) {
      if (isNew) {
        console.warn("Unable to default new tee data.", loadError);
      } else {
        console.error(loadError);
        setError("Unable to load tee.");
      }
    } finally {
      setLoading(false);
    }
  }, [courseId, hydrateNewTeeDefaults, isNew, loadSourceHoles, teeId]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    form,
    setForm,
    initialForm,
    setInitialForm,
    holes,
    setHoles,
    initialHoles,
    setInitialHoles,
    availableTees,
    setAvailableTees,
    sourceHoleMap,
    setSourceHoleMap,
    teeBuildMode,
    setTeeBuildMode,
    initialTeeBuildMode,
    setInitialTeeBuildMode,
    comboSourceTeeIds,
    setComboSourceTeeIds,
    initialComboSourceTeeIds,
    setInitialComboSourceTeeIds,
    comboHoleSourceIds,
    setComboHoleSourceIds,
    initialComboHoleSourceIds,
    setInitialComboHoleSourceIds,
    hasMenData,
    setHasMenData,
    initialHasMenData,
    setInitialHasMenData,
    hasWomenData,
    setHasWomenData,
    initialHasWomenData,
    setInitialHasWomenData,
    loading,
    error,
    setError,
    hydrationRevision,
    reload: load,
    hydrateNewTeeDefaults,
  };
}

export type CourseTeeEditPageData = ReturnType<typeof useCourseTeeEditPageData>;
