import React, { useState, useEffect } from "react";
import { useUiStore } from "../../store/uiStore.js";
import * as productsApi from "../../api/productsApi.js";
import {
  useFormValidation,
  validators,
} from "../../hooks/useFormValidation.js";

const initialFormState = {
  sku: "",
  barcode: "",
  name: "",
  description: "",
  category: "",
  unit: "pcs",
  basePrice: "",
  costPrice: "",
  taxRate: "",
  isActive: true,
};

const validationRules = {
  sku: [validators.required],
  name: [validators.required, validators.minLength(2)],
  basePrice: [validators.required, validators.min(0)],
  costPrice: [validators.min(0)],
  taxRate: [validators.min(0), validators.max(100)],
};

function ProductEditModal({ isOpen, onClose, product, onSuccess }) {
  const showNotification = useUiStore((state) => state.showNotification);
  const isEditMode = Boolean(product?.id);

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
      if (product?.id) {
        loadProduct();
      } else {
        reset(initialFormState);
      }
    }
  }, [isOpen, product]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await productsApi.getProductById(product.id);
      reset({
        sku: data.sku || "",
        barcode: data.barcode || "",
        name: data.name || "",
        description: data.description || "",
        category: data.category || "",
        unit: data.unit || "pcs",
        basePrice: data.basePrice || "",
        costPrice: data.costPrice || "",
        taxRate: data.taxRate || "",
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
        basePrice: parseFloat(formData.basePrice),
        costPrice: formData.costPrice
          ? parseFloat(formData.costPrice)
          : undefined,
        taxRate: formData.taxRate ? parseFloat(formData.taxRate) : undefined,
      };

      if (isEditMode) {
        await productsApi.updateProduct(product.id, payload);
        showNotification("Product updated successfully", "success");
      } else {
        await productsApi.createProduct(payload);
        showNotification("Product created successfully", "success");
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
        style={{ maxWidth: "700px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            {isEditMode ? "Edit Product" : "New Product"}
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
              Loading product...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Basic Info */}
              <h4 style={{ marginBottom: "16px", color: "var(--gray-700)" }}>
                Product Information
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
                  <label className="form-label">SKU *</label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="e.g., PROD-001"
                    className={getInputClassName("sku")}
                  />
                  {getError("sku") && (
                    <p className="form-error">{getError("sku")}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Barcode</label>
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                    placeholder="Enter barcode"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Enter product name"
                  className={getInputClassName("name")}
                />
                {getError("name") && (
                  <p className="form-error">{getError("name")}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter product description"
                  rows={2}
                  style={{ resize: "vertical" }}
                />
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
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="e.g., Electronics, Food"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="g">Gram (g)</option>
                    <option value="l">Liter (l)</option>
                    <option value="ml">Milliliter (ml)</option>
                    <option value="box">Box</option>
                    <option value="pack">Pack</option>
                  </select>
                </div>
              </div>

              {/* Pricing */}
              <h4 style={{ marginBottom: "16px", color: "var(--gray-700)" }}>
                Pricing
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "16px",
                  marginBottom: "20px",
                }}
              >
                <div className="form-group">
                  <label className="form-label">Base Price (Rp) *</label>
                  <input
                    type="number"
                    name="basePrice"
                    value={formData.basePrice}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className={getInputClassName("basePrice")}
                  />
                  {getError("basePrice") && (
                    <p className="form-error">{getError("basePrice")}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Cost Price (Rp)</label>
                  <input
                    type="number"
                    name="costPrice"
                    value={formData.costPrice}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tax Rate (%)</label>
                  <input
                    type="number"
                    name="taxRate"
                    value={formData.taxRate}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Status */}
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
                    <strong>Active Product</strong>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--gray-500)",
                        marginTop: "2px",
                      }}
                    >
                      Inactive products won't appear in POS or sales
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
                style={{ minWidth: "120px" }}
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
                  "Update Product"
                ) : (
                  "Create Product"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ProductEditModal;
