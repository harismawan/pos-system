import React, { useState } from "react";
import { useAuthStore } from "../../store/authStore.js";
import ChangePasswordModal from "./ChangePasswordModal.jsx";

function ProfileModal({ isOpen, onClose }) {
  const { user, logout: authLogout } = useAuthStore();
  const [showChangePassword, setShowChangePassword] = useState(false);

  if (!isOpen) return null;

  const handleLogout = async () => {
    await authLogout();
    window.location.href = "/login";
  };

  return (
    <>
      <div
        className="modal-overlay"
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
      >
        <div
          className="card"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "400px",
            padding: "0",
            margin: "16px",
            overflow: "hidden",
          }}
        >
          {/* Header with gradient */}
          <div
            style={{
              background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
              padding: "32px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #60a5fa, #a78bfa)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: "32px",
                fontWeight: 700,
                color: "white",
                boxShadow: "0 4px 20px rgba(96, 165, 250, 0.4)",
              }}
            >
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <h2
              style={{
                color: "white",
                fontSize: "20px",
                fontWeight: 600,
                marginBottom: "4px",
              }}
            >
              {user?.name}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "14px" }}>
              @{user?.username}
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: "24px" }}>
            {/* User info */}
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: "1px solid var(--gray-100)",
                }}
              >
                <span style={{ color: "var(--gray-500)", fontSize: "14px" }}>
                  Role
                </span>
                <span
                  style={{
                    fontWeight: 500,
                    fontSize: "14px",
                    textTransform: "capitalize",
                  }}
                >
                  {user?.role?.toLowerCase().replace("_", " ")}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: "1px solid var(--gray-100)",
                }}
              >
                <span style={{ color: "var(--gray-500)", fontSize: "14px" }}>
                  Email
                </span>
                <span style={{ fontWeight: 500, fontSize: "14px" }}>
                  {user?.email || "—"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <button
                onClick={() => setShowChangePassword(true)}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "var(--gray-100)",
                  border: "none",
                  borderRadius: "8px",
                  color: "var(--gray-700)",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "var(--gray-200)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "var(--gray-100)";
                }}
              >
                🔑 Change Password
              </button>

              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "var(--error-50)",
                  border: "none",
                  borderRadius: "8px",
                  color: "var(--error-600)",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "var(--error-100)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "var(--error-50)";
                }}
              >
                🚪 Logout
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              background: "rgba(255,255,255,0.2)",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "white",
              fontSize: "18px",
            }}
          >
            ×
          </button>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </>
  );
}

export default ProfileModal;
