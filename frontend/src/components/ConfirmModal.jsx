import React from "react";

function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to delete",
  itemName = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmStyle = "danger",
  loading = false,
}) {
  if (!isOpen) return null;

  const confirmButtonClass =
    confirmStyle === "danger" ? "btn-danger" : "btn-primary";

  return (
    <div className="modal-overlay" onClick={() => !loading && onClose()}>
      <div
        className="modal"
        style={{ maxWidth: "420px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button
            onClick={() => !loading && onClose()}
            disabled={loading}
            style={{
              background: "none",
              fontSize: "24px",
              color: "var(--gray-400)",
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "var(--radius-full)",
                background:
                  confirmStyle === "danger"
                    ? "var(--error-50)"
                    : "var(--primary-50)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                flexShrink: 0,
              }}
            >
              {confirmStyle === "danger" ? "⚠️" : "❓"}
            </div>
            <div>
              <p
                style={{
                  color: "var(--gray-700)",
                  fontSize: "15px",
                  lineHeight: 1.6,
                }}
              >
                {message} <br />
                {itemName && <strong>{itemName}</strong>}?
              </p>
            </div>
          </div>

          {confirmStyle === "danger" && (
            <div
              style={{
                marginTop: "16px",
                padding: "12px 16px",
                background: "var(--error-500)",
                borderRadius: "var(--radius-lg)",
                color: "white",
                fontSize: "13px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              This action cannot be undone.
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            className={confirmButtonClass}
            onClick={onConfirm}
            disabled={loading}
            style={{ minWidth: "100px" }}
          >
            {loading ? (
              <>
                <div
                  className="spinner"
                  style={{ width: "14px", height: "14px" }}
                ></div>
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
