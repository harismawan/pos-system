import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUiStore } from "../../store/uiStore.js";
import { useOutletStore } from "../../store/outletStore.js";
import { useAuthStore } from "../../store/authStore.js";
import * as warehousesApi from "../../api/warehousesApi.js";
import {
  useFormValidation,
  validators,
} from "../../hooks/useFormValidation.js";

const initialFormState = {
  name: "",
  code: "",
  type: "OUTLET",
  outletId: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  isDefault: false,
  isActive: true,
};

const validationRules = {
  name: [validators.required],
  code: [validators.required],
};

function WarehouseFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const showNotification = useUiStore((state) => state.showNotification);
  const activeOutlet = useOutletStore((state) => state.activeOutlet);
  const outlets = useAuthStore((state) => state.outlets);
  const isEditMode = Boolean(id);

  const {
    values: formData,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    getError,
  } = useFormValidation(initialFormState, validationRules);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      loadWarehouse();
    } else if (activeOutlet) {
      reset({ ...initialFormState, outletId: activeOutlet.id });
    }
  }, [id, activeOutlet]);

  const loadWarehouse = async () => {
    try {
      setLoading(true);
      const warehouse = await warehousesApi.getWarehouseById(id);
      reset({
        name: warehouse.name || "",
        code: warehouse.code || "",
        type: warehouse.type || "OUTLET",
        outletId: warehouse.outletId || "",
        addressLine1: warehouse.addressLine1 || "",
        addressLine2: warehouse.addressLine2 || "",
        city: warehouse.city || "",
        state: warehouse.state || "",
        postalCode: warehouse.postalCode || "",
        country: warehouse.country || "",
        isDefault: warehouse.isDefault ?? false,
        isActive: warehouse.isActive ?? true,
      });
    } catch (err) {
      // Show notification only if we're redirecting or if it's specific logic not covered
      // In this case, since we redirect, we might want to keep a notification OR let central handler do it
      // optimize: let central handler show "Not Found" etc, but if we redirect we might miss it if page reload?
      // No, SPA navigation keeps state.
      // But wait: if fetch failed, we throw.
      // Central handler shows toast.
      // Then we navigate.
      // So removing redundant toast is correct.
      navigate("/warehouses");
    } finally {
      setLoading(false);
    }
  };

  const getInputClassName = (fieldName) => {
    if (!touched[fieldName]) return "";
    return errors[fieldName] ? "input-error" : "input-valid";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) {
      showNotification("Please fix the errors in the form", "error");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        outletId: formData.outletId || undefined,
      };

      if (isEditMode) {
        await warehousesApi.updateWarehouse(id, payload);
        showNotification("Warehouse updated successfully", "success");
      } else {
        await warehousesApi.createWarehouse(payload);
        showNotification("Warehouse created successfully", "success");
      }
      navigate("/warehouses");
    } catch (err) {
      // Error handled centrally
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="card" style={{ textAlign: "center", padding: "60px" }}>
          <div className="spinner" style={{ margin: "0 auto" }}></div>
          <p style={{ marginTop: "16px", color: "var(--gray-500)" }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: "800px" }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isEditMode ? "Edit Warehouse" : "New Warehouse"}
          </h1>
          <p className="page-subtitle">
            {isEditMode
              ? "Update warehouse details"
              : "Add a new storage location"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Warehouse Information</h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g., Main Warehouse"
                className={getInputClassName("name")}
              />
              {getError("name") && (
                <p className="form-error">{getError("name")}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Code *</label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="e.g., WH-001"
                className={getInputClassName("code")}
              />
              {getError("code") && (
                <p className="form-error">{getError("code")}</p>
              )}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            <div className="form-group">
              <label className="form-label">Type</label>
              <select name="type" value={formData.type} onChange={handleChange}>
                <option value="OUTLET">Outlet Warehouse</option>
                <option value="CENTRAL">Central Warehouse</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Outlet</label>
              <select
                name="outletId"
                value={formData.outletId}
                onChange={handleChange}
              >
                <option value="">No specific outlet</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: "24px" }}>
          <div className="card-header">
            <h2 className="card-title">Address</h2>
          </div>

          <div className="form-group">
            <label className="form-label">Address Line 1</label>
            <input
              type="text"
              name="addressLine1"
              value={formData.addressLine1}
              onChange={handleChange}
              placeholder="Street address"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Address Line 2</label>
            <input
              type="text"
              name="addressLine2"
              value={formData.addressLine2}
              onChange={handleChange}
              placeholder="Apartment, suite, etc."
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            <div className="form-group">
              <label className="form-label">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="City"
              />
            </div>

            <div className="form-group">
              <label className="form-label">State / Province</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="State"
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            <div className="form-group">
              <label className="form-label">Postal Code</label>
              <input
                type="text"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleChange}
                placeholder="Postal code"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Country</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="Country"
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: "24px" }}>
          <div className="card-header">
            <h2 className="card-title">Settings</h2>
          </div>

          <div className="form-group">
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleChange}
                style={{
                  width: "18px",
                  height: "18px",
                  accentColor: "var(--primary-500)",
                }}
              />
              <span>
                <strong>Default Warehouse</strong>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--gray-500)",
                    marginTop: "2px",
                  }}
                >
                  Use this warehouse as the default for new orders
                </p>
              </span>
            </label>
          </div>

          <div className="form-group">
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                style={{
                  width: "18px",
                  height: "18px",
                  accentColor: "var(--primary-500)",
                }}
              />
              <span>
                <strong>Active Warehouse</strong>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--gray-500)",
                    marginTop: "2px",
                  }}
                >
                  Inactive warehouses won't be available for inventory
                  operations
                </p>
              </span>
            </label>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            marginTop: "24px",
          }}
        >
          <button
            type="button"
            className="btn-secondary btn-lg"
            onClick={() => navigate("/warehouses")}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary btn-lg"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="spinner"></div>
                Saving...
              </>
            ) : isEditMode ? (
              "Update Warehouse"
            ) : (
              "Create Warehouse"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default WarehouseFormPage;
