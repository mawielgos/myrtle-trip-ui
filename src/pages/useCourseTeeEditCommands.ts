import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createCourseTee,
  getCourseTeeHoles,
  saveCourseTeeComboHoles,
  saveCourseTeeHoles,
  updateCourseTee,
} from "../api/courseAdminApi";
import type { CourseHole } from "../types/courseAdmin";
import {
  buildComboHolePayload,
  buildHolePayload,
  buildTeePayload,
  formatCourseRatingInput,
  holesForSave,
  holesFromResponse,
  type TeeForm,
} from "./courseTeeEditLogic";
import type { CourseTeeEditPageData } from "./useCourseTeeEditPageData";

interface UseCourseTeeEditCommandsArgs {
  courseId: number | null;
  teeId: number | null;
  isNew: boolean;
  data: CourseTeeEditPageData;
  onReadyForAnother?: () => void;
}

export function useCourseTeeEditCommands({
  courseId,
  teeId,
  isNew,
  data,
  onReadyForAnother,
}: UseCourseTeeEditCommandsArgs) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function resetForAnotherNewTee(): Promise<void> {
    const hydrated = await data.hydrateNewTeeDefaults();
    if (!hydrated) {
      return;
    }

    setSaveMessage("Tee saved. Ready to add another tee.");
    onReadyForAnother?.();
  }

  async function save(afterSave: "stay" | "return" | "addAnother" = "stay"): Promise<void> {
    if (!courseId || !Number.isFinite(courseId)) {
      data.setError("Invalid course id.");
      return;
    }

    if (!isNew && (!teeId || !Number.isFinite(teeId))) {
      data.setError("Invalid tee id.");
      return;
    }

    if (data.teeBuildMode === "COMBO") {
      if (!data.comboSourceTeeIds[0] || !data.comboSourceTeeIds[1]) {
        data.setError("Combo tees require two source tees.");
        return;
      }

      if (data.comboSourceTeeIds[0] === data.comboSourceTeeIds[1]) {
        data.setError("Combo tee source 1 and source 2 must be different tees.");
        return;
      }

      for (let index = 0; index < 18; index += 1) {
        if (!data.comboHoleSourceIds[index]) {
          data.setError(`Hole ${index + 1}: select a source tee.`);
          return;
        }
      }
    }

    setSaving(true);
    data.setError(null);
    setSaveMessage(null);

    try {
      const preparedHoles = holesForSave(data.holes, data.hasMenData, data.hasWomenData);
      const teePayload = buildTeePayload(
        data.form,
        preparedHoles,
        data.teeBuildMode,
        data.hasMenData,
        data.hasWomenData
      );
      const saved = isNew
        ? await createCourseTee(courseId, teePayload)
        : await updateCourseTee(teeId as number, teePayload);

      let savedHoles: CourseHole[];

      if (data.teeBuildMode === "COMBO") {
        await saveCourseTeeComboHoles(saved.teeId, buildComboHolePayload(data.comboHoleSourceIds));
        savedHoles = await getCourseTeeHoles(saved.teeId);
      } else {
        savedHoles = await saveCourseTeeHoles(
          saved.teeId,
          buildHolePayload(preparedHoles, data.hasMenData, data.hasWomenData)
        );
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

      data.setForm(savedForm);
      data.setInitialForm(savedForm);
      data.setHoles(savedHoleForms);
      data.setInitialHoles(savedHoleForms);
      data.setInitialTeeBuildMode(data.teeBuildMode);
      data.setTeeBuildMode(data.teeBuildMode);
      data.setInitialComboSourceTeeIds(data.comboSourceTeeIds);
      data.setInitialComboHoleSourceIds(data.comboHoleSourceIds);
      data.setHasMenData(data.hasMenData);
      data.setInitialHasMenData(data.hasMenData);
      data.setHasWomenData(data.hasWomenData);
      data.setInitialHasWomenData(data.hasWomenData);
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
      data.setError(saveError instanceof Error ? saveError.message : "Unable to save tee.");
    } finally {
      setSaving(false);
    }
  }

  return {
    saving,
    saveMessage,
    setSaveMessage,
    save,
    resetForAnotherNewTee,
  };
}

export type CourseTeeEditCommands = ReturnType<typeof useCourseTeeEditCommands>;
