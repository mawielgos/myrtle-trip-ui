import { useCallback, useEffect, useRef } from "react";
import { useAppDialog } from "../components/common/AppDialog";

const DEFAULT_MESSAGE = "You have unsaved changes. Leave without saving?";

export function useUnsavedChangesWarning(
  hasChanges: boolean,
  message: string = DEFAULT_MESSAGE
) {
  const { confirmDialog } = useAppDialog();
  const hasChangesRef = useRef(hasChanges);

  useEffect(() => {
    hasChangesRef.current = hasChanges;
  }, [hasChanges]);

  const confirmIfNeeded = useCallback(async (): Promise<boolean> => {
    if (!hasChangesRef.current) {
      return true;
    }

    return confirmDialog({
      title: "Unsaved Changes",
      message,
      severity: "warning",
      confirmText: "Leave Page",
      cancelText: "Stay Here",
    });
  }, [confirmDialog, message]);


  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!hasChangesRef.current) {
        return;
      }

      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;

      if (!anchor) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);

      if (destination.origin !== current.origin) {
        return;
      }

      const currentPath = `${current.pathname}${current.search}${current.hash}`;
      const destinationPath = `${destination.pathname}${destination.search}${destination.hash}`;

      if (currentPath === destinationPath) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      void confirmDialog({
        title: "Unsaved Changes",
        message,
        severity: "warning",
        confirmText: "Leave Page",
        cancelText: "Stay Here",
      }).then((confirmed) => {
        if (confirmed) {
          window.location.assign(destination.href);
        }
      });
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [confirmDialog, message]);

  return confirmIfNeeded;
}
