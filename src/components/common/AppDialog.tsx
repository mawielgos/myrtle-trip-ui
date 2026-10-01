import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  buttonStyle,
  dangerButtonStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  strongBorderColor,
  subtleBorderColor,
} from "../../styles/uiStyles";

type DialogSeverity = "info" | "warning" | "danger" | "success";

type ConfirmOptions = {
  title: string;
  message: ReactNode;
  severity?: DialogSeverity;
  confirmText?: string;
  cancelText?: string;
};

type AlertOptions = {
  title: string;
  message: ReactNode;
  severity?: DialogSeverity;
  confirmText?: string;
};

type DialogRequest = {
  kind: "alert" | "confirm";
  title: string;
  message: ReactNode;
  severity: DialogSeverity;
  confirmText: string;
  cancelText: string;
  resolve: (confirmed: boolean) => void;
};

type DialogContextValue = {
  alertDialog: (options: AlertOptions) => Promise<void>;
  confirmDialog: (options: ConfirmOptions) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 10000,
  background: "rgba(20, 25, 30, 0.36)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "18px",
  boxSizing: "border-box",
};

const dialogStyle: CSSProperties = {
  width: "min(520px, 100%)",
  borderRadius: "12px",
  border: `1px solid ${strongBorderColor}`,
  background: "#fff",
  boxShadow: "0 18px 45px rgba(0, 0, 0, 0.22)",
  overflow: "hidden",
};

const bodyStyle: CSSProperties = {
  padding: "18px 20px 16px",
};

const titleRowStyle: CSSProperties = {
  display: "flex",
  gap: "10px",
  alignItems: "flex-start",
  marginBottom: "10px",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "18px",
  lineHeight: 1.25,
  fontWeight: 800,
  color: "#222",
};

const messageStyle: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.45,
  color: "#444",
  whiteSpace: "pre-line",
};

const footerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "8px",
  padding: "12px 20px",
  borderTop: `1px solid ${subtleBorderColor}`,
  background: "#fafafa",
};

function getSeverityStyle(severity: DialogSeverity): CSSProperties {
  if (severity === "danger") {
    return { background: "#fff0ed", color: "#a33a2a", borderColor: "#f1b6ad" };
  }
  if (severity === "warning") {
    return { background: "#fff7e6", color: "#8a5a00", borderColor: "#f2d39b" };
  }
  if (severity === "success") {
    return { background: "#eaf7ea", color: "#1f6b2a", borderColor: "#b9dfbf" };
  }
  return { background: "#eef5ff", color: "#245f3d", borderColor: "#cbd8ef" };
}

function getIcon(severity: DialogSeverity): string {
  if (severity === "danger") return "!";
  if (severity === "warning") return "!";
  if (severity === "success") return "✓";
  return "i";
}

function getConfirmButtonStyle(severity: DialogSeverity): CSSProperties {
  if (severity === "danger") {
    return dangerButtonStyle;
  }
  if (severity === "warning") {
    return primaryButtonStyle;
  }
  return primaryButtonStyle;
}

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null);

  const closeDialog = useCallback((confirmed: boolean) => {
    setRequest((current) => {
      if (current) {
        current.resolve(confirmed);
      }
      return null;
    });
  }, []);

  const confirmDialog = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setRequest({
        kind: "confirm",
        title: options.title,
        message: options.message,
        severity: options.severity ?? "warning",
        confirmText: options.confirmText ?? "Continue",
        cancelText: options.cancelText ?? "Cancel",
        resolve,
      });
    });
  }, []);

  const alertDialog = useCallback(async (options: AlertOptions) => {
    await new Promise<boolean>((resolve) => {
      setRequest({
        kind: "alert",
        title: options.title,
        message: options.message,
        severity: options.severity ?? "info",
        confirmText: options.confirmText ?? "OK",
        cancelText: "",
        resolve,
      });
    });
  }, []);

  const value = useMemo(
    () => ({ alertDialog, confirmDialog }),
    [alertDialog, confirmDialog],
  );

  return (
    <DialogContext.Provider value={value}>
      {children}
      {request ? (
        <div style={overlayStyle} role="presentation" onMouseDown={() => closeDialog(false)}>
          <div
            style={dialogStyle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div style={bodyStyle}>
              <div style={titleRowStyle}>
                <span
                  style={{
                    ...getSeverityStyle(request.severity),
                    width: "28px",
                    height: "28px",
                    minWidth: "28px",
                    borderRadius: "999px",
                    border: "1px solid",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: "15px",
                    lineHeight: 1,
                  }}
                  aria-hidden="true"
                >
                  {getIcon(request.severity)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <h2 id="app-dialog-title" style={titleStyle}>{request.title}</h2>
                  <div style={messageStyle}>{request.message}</div>
                </div>
              </div>
            </div>
            <div style={footerStyle}>
              {request.kind === "confirm" ? (
                <button type="button" style={secondaryButtonStyle} onClick={() => closeDialog(false)}>
                  {request.cancelText}
                </button>
              ) : null}
              <button
                type="button"
                style={request.kind === "confirm" ? getConfirmButtonStyle(request.severity) : buttonStyle}
                onClick={() => closeDialog(true)}
                autoFocus
              >
                {request.confirmText}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DialogContext.Provider>
  );
}

export function useAppDialog(): DialogContextValue {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useAppDialog must be used inside AppDialogProvider.");
  }
  return context;
}
