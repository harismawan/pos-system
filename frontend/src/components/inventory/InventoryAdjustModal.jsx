import React, { useState, useEffect } from "react";
import { useUiStore } from "../../store/uiStore.js";
import { useOutletStore } from "../../store/outletStore.js";
import * as inventoryApi from "../../api/inventoryApi.js";
import * as warehousesApi from "../../api/warehousesApi.js";
import * as productsApi from "../../api/productsApi.js";

function InventoryAdjustModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedProductId,
  preselectedWarehouseId,
}) {
  const showNotification = useUiStore((state) => state.showNotification);
  const activeOutlet = useOutletStore((state) => state.activeOutlet);

  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    productId: "",
    warehouseId: "",
    adjustmentType: "add",
    quantity: "",
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      // Reset form when opening
      setFormData({
        productId: preselectedProductId || "",
        warehouseId: preselectedWarehouseId || "",
        adjustmentType: "add",
        quantity: "",
        notes: "",
      });
      setErrors({});
    }
  }, [isOpen, activeOutlet, preselectedProductId, preselectedWarehouseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [warehouseResult, productResult] = await Promise.all([
        warehousesApi.getWarehouses({ outletId: activeOutlet?.id, limit: 100 }),
        productsApi.getProducts({ isActive: "true", limit: 100 }),
      ]);
      setWarehouses(warehouseResult.warehouses || []);
      setProducts(productResult.products || []);
    } catch (err) {
      showNotification("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.productId) newErrors.productId = "Please select a product";
    if (!formData.warehouseId)
      newErrors.warehouseId = "Please select a warehouse";
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = "Please enter a valid quantity";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSaving(true);
      const quantity = parseFloat(formData.quantity);
      await inventoryApi.adjustInventory({
        productId: formData.productId,
        warehouseId: formData.warehouseId,
        type:
          formData.adjustmentType === "subtract"
            ? "ADJUSTMENT_OUT"
            : "ADJUSTMENT_IN",
        quantity: quantity,
        notes: formData.notes,
      });
      showNotification("Stock adjusted successfully", "success");
      onSuccess?.();
      onClose();
    } catch (err) {
      showNotification(err.message || "Adjustment failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === formData.productId);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: "600px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">Adjust Stock</h2>
          <button onClick={onClose} className="modal-close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <div className="spinner" style={{ margin: "0 auto" }}></div>
                <p style={{ marginTop: "16px", color: "var(--gray-500)" }}>
                  Loading data...
                </p>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">Product *</label>
                  <select
                    name="productId"
                    value={formData.productId}
                    onChange={handleChange}
                    disabled={!!preselectedProductId}
                    style={{
                      borderColor: errors.productId
                        ? "var(--error-500)"
                        : undefined,
                      backgroundColor: preselectedProductId
                        ? "var(--gray-100)"
                        : "white",
                    }}
                  >
                    <option value="">Select a product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                  {errors.productId && (
                    <p className="form-error">{errors.productId}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Warehouse *</label>
                  <select
                    name="warehouseId"
                    value={formData.warehouseId}
                    onChange={handleChange}
                    disabled={!!preselectedWarehouseId}
                    style={{
                      borderColor: errors.warehouseId
                        ? "var(--error-500)"
                        : undefined,
                      backgroundColor: preselectedWarehouseId
                        ? "var(--gray-100)"
                        : "white",
                    }}
                  >
                    <option value="">Select a warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  {errors.warehouseId && (
                    <p className="form-error">{errors.warehouseId}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Adjustment Type *</label>
                  <div style={{ display: "flex", gap: "16px" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px 20px",
                        borderRadius: "var(--radius-lg)",
                        border:
                          formData.adjustmentType === "add"
                            ? "2px solid var(--success-500)"
                            : "1px solid var(--gray-300)",
                        backgroundColor:
                          formData.adjustmentType === "add"
                            ? "var(--success-50)"
                            : "white",
                        cursor: "pointer",
                        flex: 1,
                        justifyContent: "center",
                        transition: "all var(--transition-fast)",
                      }}
                    >
                      <input
                        type="radio"
                        name="adjustmentType"
                        value="add"
                        checked={formData.adjustmentType === "add"}
                        onChange={handleChange}
                        style={{ display: "none" }}
                      />
                      <span style={{ fontSize: "20px" }}>➕</span>
                      <span
                        style={{ fontWeight: 500, color: "var(--success-600)" }}
                      >
                        Add Stock
                      </span>
                    </label>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "12px 20px",
                        borderRadius: "var(--radius-lg)",
                        border:
                          formData.adjustmentType === "subtract"
                            ? "2px solid var(--error-500)"
                            : "1px solid var(--gray-300)",
                        backgroundColor:
                          formData.adjustmentType === "subtract"
                            ? "var(--error-50)"
                            : "white",
                        cursor: "pointer",
                        flex: 1,
                        justifyContent: "center",
                        transition: "all var(--transition-fast)",
                      }}
                    >
                      <input
                        type="radio"
                        name="adjustmentType"
                        value="subtract"
                        checked={formData.adjustmentType === "subtract"}
                        onChange={handleChange}
                        style={{ display: "none" }}
                      />
                      <span style={{ fontSize: "20px" }}>➖</span>
                      <span
                        style={{ fontWeight: 500, color: "var(--error-600)" }}
                      >
                        Remove Stock
                      </span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Quantity *{" "}
                    {selectedProduct && (
                      <span
                        style={{
                          fontWeight: "normal",
                          color: "var(--gray-500)",
                        }}
                      >
                        ({selectedProduct.unit})
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="Enter quantity"
                    min="0.01"
                    step="0.01"
                    style={{
                      borderColor: errors.quantity
                        ? "var(--error-500)"
                        : undefined,
                      maxWidth: "200px",
                    }}
                  />
                  {errors.quantity && (
                    <p className="form-error">{errors.quantity}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Reason / Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="e.g., Damaged goods, Inventory count correction, etc."
                    rows={2}
                  />
                  <p className="form-helper">
                    Provide a reason for this adjustment for audit purposes
                  </p>
                </div>
              </>
            )}
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
              className={
                formData.adjustmentType === "subtract"
                  ? "btn-danger"
                  : "btn-success"
              }
              disabled={saving || loading}
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
                  Adjusting...
                </>
              ) : formData.adjustmentType === "subtract" ? (
                "Remove Stock"
              ) : (
                "Add Stock"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InventoryAdjustModal;
