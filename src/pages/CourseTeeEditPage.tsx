import { useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CourseTeeEditBody from "./CourseTeeEditBody";
import { useCourseTeeEditCommands } from "./useCourseTeeEditCommands";
import { useCourseTeeEditInteractions } from "./useCourseTeeEditInteractions";
import { useCourseTeeEditPageData } from "./useCourseTeeEditPageData";

export default function CourseTeeEditPage() {
  const navigate = useNavigate();
  const { courseId: courseIdParam, teeId: teeIdParam } = useParams();

  const courseId = courseIdParam ? Number(courseIdParam) : null;
  const teeId = teeIdParam ? Number(teeIdParam) : null;
  const isNew = teeId == null;
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  const data = useCourseTeeEditPageData({ courseId, teeId, isNew });
  const commands = useCourseTeeEditCommands({
    courseId,
    teeId,
    isNew,
    data,
    onReadyForAnother: () => {
      window.requestAnimationFrame(() => {
        firstFieldRef.current?.focus();
        firstFieldRef.current?.select();
      });
    },
  });
  const interactions = useCourseTeeEditInteractions({
    data,
    saving: commands.saving,
    clearSaveMessage: () => commands.setSaveMessage(null),
    firstFieldRef,
  });

  async function navigateBack(): Promise<void> {
    if (!(await interactions.confirmIfNeeded())) {
      return;
    }
    navigate(courseId ? `/admin/courses/${courseId}` : "/admin/courses");
  }

  async function navigateToCourseList(): Promise<void> {
    if (!(await interactions.confirmIfNeeded())) {
      return;
    }
    navigate("/admin/courses");
  }

  return (
    <CourseTeeEditBody
      isNew={isNew}
      firstFieldRef={firstFieldRef}
      data={data}
      commands={commands}
      interactions={interactions}
      onCourseDetail={() => void navigateBack()}
      onCourseList={() => void navigateToCourseList()}
      onCancel={() => void navigateBack()}
    />
  );
}
