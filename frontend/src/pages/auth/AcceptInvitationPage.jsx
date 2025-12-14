import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import * as invitationsApi from "../../api/invitationsApi.js";

function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      setError("Invalid invitation link");
      setLoading(false);
    }
  }, [token]);

  async function verifyToken() {
    try {
      setLoading(true);
      const response = await invitationsApi.verifyInvitation(token);
      setInvitation(response.invitation);
    } catch (err) {
      setError(err.message || "Invalid or expired invitation");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      setSubmitting(true);
      await invitationsApi.acceptInvitation({
        token,
        name: formData.name,
        username: formData.username,
        password: formData.password,
        phone: formData.phone || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px" }}>
        <div className="spinner"></div>
        <p style={{ marginTop: "16px", color: "var(--gray-500)" }}>
          Verifying invitation...
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div
        className="card"
        style={{
          maxWidth: "400px",
          margin: "40px auto",
          padding: "32px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
        <h2 style={{ marginBottom: "16px" }}>Account Created!</h2>
        <p style={{ color: "var(--gray-500)", marginBottom: "24px" }}>
          Your account has been created successfully. You can now log in.
        </p>
        <Link
          to="/login"
          className="btn-primary"
          style={{ display: "inline-block" }}
        >
          Go to Login
        </Link>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div
        className="card"
        style={{
          maxWidth: "400px",
          margin: "40px auto",
          padding: "32px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
        <h2 style={{ marginBottom: "16px" }}>Invalid Invitation</h2>
        <p style={{ color: "var(--gray-500)", marginBottom: "24px" }}>
          {error}
        </p>
        <Link
          to="/login"
          className="btn-secondary"
          style={{ display: "inline-block" }}
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{ maxWidth: "450px", margin: "40px auto", padding: "32px" }}
    >
      <h2 style={{ marginBottom: "8px" }}>Accept Invitation</h2>
      <p style={{ color: "var(--gray-500)", marginBottom: "24px" }}>
        You've been invited to join <strong>{invitation?.businessName}</strong>{" "}
        as <strong>{invitation?.role?.replace("_", " ")}</strong>
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{ display: "block", marginBottom: "4px", fontWeight: 500 }}
          >
            Email
          </label>
          <input
            type="email"
            value={invitation?.email || ""}
            disabled
            className="input"
            style={{ width: "100%", background: "var(--gray-100)" }}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{ display: "block", marginBottom: "4px", fontWeight: 500 }}
          >
            Full Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="input"
            style={{ width: "100%" }}
            placeholder="Enter your full name"
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{ display: "block", marginBottom: "4px", fontWeight: 500 }}
          >
            Username *
          </label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            className="input"
            style={{ width: "100%" }}
            placeholder="Choose a username"
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{ display: "block", marginBottom: "4px", fontWeight: 500 }}
          >
            Phone (optional)
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="input"
            style={{ width: "100%" }}
            placeholder="Phone number"
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{ display: "block", marginBottom: "4px", fontWeight: 500 }}
          >
            Password *
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="input"
            style={{ width: "100%" }}
            placeholder="Min 8 characters"
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label
            style={{ display: "block", marginBottom: "4px", fontWeight: 500 }}
          >
            Confirm Password *
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="input"
            style={{ width: "100%" }}
            placeholder="Confirm your password"
          />
        </div>

        {error && (
          <div
            style={{
              padding: "12px",
              background: "#fee2e2",
              color: "#991b1b",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary"
          disabled={submitting}
          style={{ width: "100%" }}
        >
          {submitting ? "Creating Account..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}

export default AcceptInvitationPage;
