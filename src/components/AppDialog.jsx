import { createContext, useContext, useState } from "react";

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const showAlert = (message, options = {}) => {
    return new Promise((resolve) => {
      setDialog({
        type: "alert",
        title: options.title || "İşletme Defteri",
        message,
        confirmText: options.confirmText || "Tamam",
        danger: options.danger || false,
        resolve,
      });
    });
  };

  const showConfirm = (message, options = {}) => {
    return new Promise((resolve) => {
      setDialog({
        type: "confirm",
        title: options.title || "Emin misiniz?",
        message,
        confirmText: options.confirmText || "Onayla",
        cancelText: options.cancelText || "Vazgeç",
        danger: options.danger || false,
        resolve,
      });
    });
  };

  const closeDialog = (result) => {
    if (!dialog) return;

    dialog.resolve(result);
    setDialog(null);
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {dialog && (
        <div
          className="app-dialog-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && dialog.type === "alert") {
              closeDialog(true);
            }
          }}
        >
          <div
            className="app-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-dialog-title"
          >
            <h2 id="app-dialog-title">{dialog.title}</h2>

            <p>{dialog.message}</p>

            <div className="app-dialog-actions">
              {dialog.type === "confirm" && (
                <button
                  type="button"
                  className="app-dialog-cancel"
                  onClick={() => closeDialog(false)}
                >
                  {dialog.cancelText}
                </button>
              )}

              <button
                type="button"
                className={
                  dialog.danger
                    ? "app-dialog-confirm app-dialog-danger"
                    : "app-dialog-confirm"
                }
                onClick={() => closeDialog(true)}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useAppDialog() {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error("useAppDialog, DialogProvider içerisinde kullanılmalıdır.");
  }

  return context;
}
