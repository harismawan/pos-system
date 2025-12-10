import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../../api/authApi.js";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authApi.forgotPassword(email, { skipErrorHandling: true });
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to send reset link");
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
            <span style={{ fontSize: "28px" }}>🔐</span>
          </div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "var(--gray-900)",
              marginBottom: "8px",
            }}
          >
            Forgot Password
          </h1>
          <p style={{ color: "var(--gray-500)", fontSize: "14px" }}>
            Enter your email to receive a reset link
          </p>
        </div>

        {success ? (
          <div>
            <div
              style={{
                padding: "16px",
                background: "var(--success-50)",
                color: "var(--success-700)",
                borderRadius: "var(--radius-lg)",
                marginBottom: "24px",
                textAlign: "center",
              }}
            >
              <p style={{ marginBottom: "8px" }}>
                ✅ Reset link sent to <strong>{email}</strong>
              </p>
              <p style={{ fontSize: "14px", opacity: 0.9 }}>
                Check your email and click the link to reset your password. The
                link expires in 1 hour.
              </p>
            </div>
            <div style={{ textAlign: "center" }}>
              <Link
                to="/login"
                style={{ color: "var(--primary-600)", fontSize: "14px" }}
              >
                ← Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
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
              disabled={loading || !email}
              className="btn-primary btn-lg"
              style={{ width: "100%", marginTop: "8px" }}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>

            <div style={{ textAlign: "center", marginTop: "24px" }}>
              <Link
                to="/login"
                style={{ color: "var(--primary-600)", fontSize: "14px" }}
              >
                ← Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
