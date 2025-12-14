import React, { useState, useEffect } from "react";
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

function WarehouseFormModal({ isOpen, onClose, warehouse, onSuccess }) {
  const showNotification = useUiStore((state) => state.showNotification);
  const activeOutlet = useOutletStore((state) => state.activeOutlet);
  const outlets = useAuthStore((state) => state.outlets);
  const isEditMode = Boolean(warehouse?.id);

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
    if (isOpen) {
      if (warehouse?.id) {
        loadWarehouse();
      } else {
        reset({ ...initialFormState, outletId: activeOutlet?.id || "" });
      }
    }
  }, [isOpen, warehouse, activeOutlet]);

  const loadWarehouse = async () => {
    try {
      setLoading(true);
      const data = await warehousesApi.getWarehouseById(warehouse.id);
      reset({
        name: data.name || "",
        code: data.code || "",
        type: data.type || "OUTLET",
        outletId: data.outletId || "",
        addressLine1: data.addressLine1 || "",
        addressLine2: data.addressLine2 || "",
        city: data.city || "",
        state: data.state || "",
        postalCode: data.postalCode || "",
        country: data.country || "",
        isDefault: data.isDefault ?? false,
        isActive: data.isActive ?? true,
      });
    } catch (err) {
      onClose();
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
        await warehousesApi.updateWarehouse(warehouse.id, payload);
        showNotification("Warehouse updated successfully", "success");
      } else {
        await warehousesApi.createWarehouse(payload);
        showNotification("Warehouse created successfully", "success");
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      // Error handled centrally
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: "700px", maxHeight: "90vh", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            {isEditMode ? "Edit Warehouse" : "New Warehouse"}
          </h2>
          <button onClick={onClose} className="modal-close">
            ×
          </button>
        </div>

        {loading ? (
          <div
            className="modal-body"
            style={{ textAlign: "center", padding: "60px" }}
          >
            <div className="spinner" style={{ margin: "0 auto" }}></div>
            <p style={{ marginTop: "16px", color: "var(--gray-500)" }}>
              Loading...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <h4 style={{ marginBottom: "16px", color: "var(--gray-700)" }}>
                Warehouse Information
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "20px",
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
                  gap: "16px",
                  marginBottom: "20px",
                }}
              >
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                  >
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

              <h4 style={{ marginBottom: "16px", color: "var(--gray-700)" }}>
                Address
              </h4>
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label className="form-label">Address Line 1</label>
                <input
                  type="text"
                  name="addressLine1"
                  value={formData.addressLine1}
                  onChange={handleChange}
                  placeholder="Street address"
                />
              </div>

              <div className="form-group" style={{ marginBottom: "16px" }}>
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
                  gap: "16px",
                  marginBottom: "16px",
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
                  gap: "16px",
                  marginBottom: "20px",
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

              <h4 style={{ marginBottom: "16px", color: "var(--gray-700)" }}>
                Settings
              </h4>
              <div className="form-group" style={{ marginBottom: "16px" }}>
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

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
                style={{ minWidth: "140px" }}
              >
                {saving ? (
                  <>
                    <div
                      className="spinner"
                      style={{
                        width: "16px",
                        height: "16px",
                        borderWidth: "2px",
                      }}
                    ></div>
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
        )}
      </div>
    </div>
  );
}

export default WarehouseFormModal;
