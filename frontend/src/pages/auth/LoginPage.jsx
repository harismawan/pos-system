import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";
import { useOutletStore } from "../../store/outletStore.js";
import {
  useFormValidation,
  validators,
} from "../../hooks/useFormValidation.js";

const validationRules = {
  username: [validators.required],
  password: [validators.required, validators.minLength(6)],
};

function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const setActiveOutlet = useOutletStore((state) => state.setActiveOutlet);

  const {
    values: formData,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    getError,
  } = useFormValidation({ username: "", password: "" }, validationRules);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const getInputClassName = (fieldName) => {
    if (!touched[fieldName]) return "";
    return errors[fieldName] ? "input-error" : "input-valid";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateAll()) {
      return;
    }

    setLoading(true);

    try {
      const data = await login(formData.username, formData.password, {
        skipErrorHandling: true,
      });

      if (data.outlets && data.outlets.length > 0) {
        const defaultOutlet =
          data.outlets.find((o) => o.isDefault) || data.outlets[0];
        setActiveOutlet(defaultOutlet);
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "420px",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div className="card" style={{ padding: "40px" }}>
        {/* Logo/Brand */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "var(--radius-xl)",
              background: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 24px rgba(96, 165, 250, 0.4)",
            }}
          >
            <svg
              width="32"
              height="32"
              fill="none"
              viewBox="0 0 24 24"
              stroke="white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "var(--gray-900)",
              marginBottom: "8px",
            }}
          >
            POS System
          </h1>
          <p style={{ color: "var(--gray-500)", fontSize: "14px" }}>
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter your username"
              className={getInputClassName("username")}
            />
            {getError("username") && (
              <p className="form-error">{getError("username")}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter your password"
              className={getInputClassName("password")}
            />
            {getError("password") && (
              <p className="form-error">{getError("password")}</p>
            )}
          </div>

          {error && (
            <div
              style={{
                marginBottom: "20px",
                padding: "12px 16px",
                background: "var(--error-50)",
                color: "var(--error-600)",
                borderRadius: "var(--radius-lg)",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>⚠️</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary btn-lg"
            style={{ width: "100%", marginTop: "8px" }}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>

          <div style={{ textAlign: "center", marginTop: "16px" }}>
            <Link
              to="/forgot-password"
              style={{ color: "var(--primary-600)", fontSize: "14px" }}
            >
              Forgot your password?
            </Link>
          </div>
        </form>
      </div>

      {/* Registration Info */}
      <div
        style={{
          marginTop: "16px",
          padding: "16px 20px",
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          borderRadius: "var(--radius-xl)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            color: "rgba(255, 255, 255, 0.9)",
            lineHeight: "1.5",
          }}
        >
          Interested in an account? Please contact{" "}
          <a
            href="mailto:mail@harismawan.com"
            style={{
              color: "white",
              fontWeight: 600,
              textDecoration: "underline",
            }}
          >
            mail@harismawan.com
          </a>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
