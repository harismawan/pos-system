/**
 * ImpersonationBanner - Shows when Super Admin is impersonating a user
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore.js";

function ImpersonationBanner() {
  const navigate = useNavigate();
  const { isImpersonating, user, originalUser, stopImpersonation } =
    useAuthStore();

  if (!isImpersonating) return null;

  const handleExit = () => {
    stopImpersonation();
    navigate("/super-admin");
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "linear-gradient(135deg, #f59e0b, #d97706)",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
      }}
    >
      <svg
        width="20"
        height="20"
        fill="none"
        stroke="white"
        viewBox="0 0 24 24"
        style={{ flexShrink: 0 }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span
        style={{
          color: "white",
          fontWeight: 600,
          fontSize: "14px",
        }}
      >
        Impersonating: <strong>{user?.name}</strong>
        {user?.businessName && ` (${user.businessName})`}
        <span style={{ opacity: 0.8, marginLeft: "8px", fontWeight: 400 }}>
          — Logged in as {originalUser?.name}
        </span>
      </span>
      <button
        onClick={handleExit}
        style={{
          background: "rgba(255, 255, 255, 0.2)",
          border: "1px solid rgba(255, 255, 255, 0.4)",
          borderRadius: "6px",
          padding: "6px 14px",
          color: "white",
          fontWeight: 600,
          fontSize: "13px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          transition: "all 0.2s",
        }}
        onMouseOver={(e) => {
          e.target.style.background = "rgba(255, 255, 255, 0.3)";
        }}
        onMouseOut={(e) => {
          e.target.style.background = "rgba(255, 255, 255, 0.2)";
        }}
      >
        <svg
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        Exit Impersonation
      </button>
    </div>
  );
}

export default ImpersonationBanner;
