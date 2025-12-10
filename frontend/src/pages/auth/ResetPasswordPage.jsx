import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../../api/authApi.js";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid reset link. Please request a new one.");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword(token, formData.newPassword);
      navigate("/login", {
        state: { message: "Password reset successfully. Please login." },
      });
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  // Show error if no token
  if (!token) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div className="card" style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: "var(--gray-900)",
              marginBottom: "12px",
            }}
          >
            Invalid Reset Link
          </h1>
          <p
            style={{
              color: "var(--gray-500)",
              fontSize: "14px",
              marginBottom: "24px",
            }}
          >
            This password reset link is invalid or has expired.
          </p>
          <Link to="/forgot-password" className="btn-primary">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

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
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "var(--radius-xl)",
              background:
                "linear-gradient(135deg, var(--primary-500), var(--primary-600))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <span style={{ fontSize: "28px" }}>🔑</span>
          </div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "var(--gray-900)",
              marginBottom: "8px",
            }}
          >
            Reset Password
          </h1>
          <p style={{ color: "var(--gray-500)", fontSize: "14px" }}>
            Enter your new password
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Enter new password"
              minLength={6}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm new password"
              required
            />
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
              }}
            >
              ⚠️ {error}
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
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </button>

          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <Link
              to="/login"
              style={{ color: "var(--gray-500)", fontSize: "14px" }}
            >
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
