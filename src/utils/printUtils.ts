import { sanitizeFileName } from "./exportUtils";

export function buildReportFileTitle(...parts: Array<string | number | null | undefined>): string {
  const text = parts
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter(Boolean)
    .join(" - ");

  return sanitizeFileName(text || "report");
}

export function printWithReportTitle(title: string): void {
  const previousTitle = document.title;
  const cleanTitle = buildReportFileTitle(title);
  let restored = false;

  const restoreTitle = () => {
    if (restored) {
      return;
    }
    restored = true;
    document.title = previousTitle;
    window.removeEventListener("afterprint", restoreTitle);
  };

  document.title = cleanTitle;
  window.addEventListener("afterprint", restoreTitle);

  window.setTimeout(() => {
    window.print();
    window.setTimeout(restoreTitle, 1500);
  }, 0);
}
