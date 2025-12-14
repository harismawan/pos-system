import React, { useState, useEffect } from "react";
import { useUiStore } from "../../store/uiStore.js";
import { useOutletStore } from "../../store/outletStore.js";
import * as purchaseOrdersApi from "../../api/purchaseOrdersApi.js";
import * as suppliersApi from "../../api/suppliersApi.js";
import * as productsApi from "../../api/productsApi.js";
import * as warehousesApi from "../../api/warehousesApi.js";

function PurchaseOrderFormModal({ isOpen, onClose, order, onSuccess }) {
  const showNotification = useUiStore((state) => state.showNotification);
  const activeOutlet = useOutletStore((state) => state.activeOutlet);
  const isEditMode = Boolean(order?.id);

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    supplierId: "",
    warehouseId: "",
    notes: "",
  });

  const [items, setItems] = useState([
    { productId: "", quantity: "", unitCost: "" },
  ]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, activeOutlet]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [suppliersRes, productsRes, warehousesRes] = await Promise.all([
        suppliersApi.getSuppliers({ limit: 100 }),
        productsApi.getProducts({ isActive: "true", limit: 100 }),
        warehousesApi.getWarehouses({ outletId: activeOutlet?.id, limit: 100 }),
      ]);
      setSuppliers(suppliersRes.suppliers || []);
      setProducts(productsRes.products || []);
      setWarehouses(warehousesRes.warehouses || []);

      if (isEditMode && order?.id) {
        const orderData = await purchaseOrdersApi.getPurchaseOrderById(
          order.id,
        );
        setFormData({
          supplierId: orderData.supplierId || "",
          warehouseId: orderData.warehouseId || "",
          notes: orderData.notes || "",
        });
        setItems(
          orderData.items?.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: item.unitCost,
          })) || [{ productId: "", quantity: "", unitCost: "" }],
        );
      } else {
        setFormData({ supplierId: "", warehouseId: "", notes: "" });
        setItems([{ productId: "", quantity: "", unitCost: "" }]);
      }
      setErrors({});
    } catch (err) {
      showNotification("Failed to load data", "error");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });

    if (field === "productId" && value) {
      const product = products.find((p) => p.id === value);
      if (product?.costPrice) {
        setItems((prev) => {
          const newItems = [...prev];
          newItems[index] = { ...newItems[index], unitCost: product.costPrice };
          return newItems;
        });
      }
    }
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { productId: "", quantity: "", unitCost: "" },
    ]);
  };

  const removeItem = (index) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      return (
        sum +
        (parseFloat(item.quantity) || 0) * (parseFloat(item.unitCost) || 0)
      );
    }, 0);
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.supplierId) newErrors.supplierId = "Please select a supplier";
    if (!formData.warehouseId)
      newErrors.warehouseId = "Please select a warehouse";

    const validItems = items.filter(
      (item) => item.productId && item.quantity > 0,
    );
    if (validItems.length === 0) {
      newErrors.items = "Add at least one item";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSaving(true);
      const payload = {
        supplierId: formData.supplierId,
        warehouseId: formData.warehouseId,
        notes: formData.notes,
        items: items
          .filter((item) => item.productId && item.quantity)
          .map((item) => ({
            productId: item.productId,
            quantity: parseFloat(item.quantity),
            unitCost: parseFloat(item.unitCost) || 0,
          })),
      };

      if (isEditMode) {
        await purchaseOrdersApi.updatePurchaseOrder(order.id, payload);
        showNotification("Purchase order updated", "success");
      } else {
        await purchaseOrdersApi.createPurchaseOrder(payload);
        showNotification("Purchase order created", "success");
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
        style={{ maxWidth: "900px", maxHeight: "90vh", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            {isEditMode ? "Edit Purchase Order" : "New Purchase Order"}
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
                Order Details
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
                  <label className="form-label">Supplier *</label>
                  <select
                    name="supplierId"
                    value={formData.supplierId}
                    onChange={handleChange}
                    style={{
                      borderColor: errors.supplierId
                        ? "var(--error-500)"
                        : undefined,
                    }}
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {errors.supplierId && (
                    <p className="form-error">{errors.supplierId}</p>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Receiving Warehouse *</label>
                  <select
                    name="warehouseId"
                    value={formData.warehouseId}
                    onChange={handleChange}
                    style={{
                      borderColor: errors.warehouseId
                        ? "var(--error-500)"
                        : undefined,
                    }}
                  >
                    <option value="">Select warehouse</option>
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
              </div>

              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <h4 style={{ color: "var(--gray-700)" }}>Order Items</h4>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={addItem}
                >
                  + Add Item
                </button>
              </div>

              {errors.items && (
                <div
                  style={{
                    padding: "12px",
                    background: "var(--error-50)",
                    color: "var(--error-600)",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "16px",
                  }}
                >
                  {errors.items}
                </div>
              )}

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "500px",
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--gray-200)" }}>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "12px 0",
                          fontSize: "13px",
                          color: "var(--gray-600)",
                          width: "40%",
                        }}
                      >
                        Product
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "12px 0",
                          fontSize: "13px",
                          color: "var(--gray-600)",
                          width: "15%",
                        }}
                      >
                        Qty
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "12px 0",
                          fontSize: "13px",
                          color: "var(--gray-600)",
                          width: "20%",
                        }}
                      >
                        Unit Cost
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "12px 0",
                          fontSize: "13px",
                          color: "var(--gray-600)",
                          width: "20%",
                        }}
                      >
                        Subtotal
                      </th>
                      <th style={{ width: "5%" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr
                        key={index}
                        style={{ borderBottom: "1px solid var(--gray-100)" }}
                      >
                        <td style={{ padding: "12px 8px 12px 0" }}>
                          <select
                            value={item.productId}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "productId",
                                e.target.value,
                              )
                            }
                            style={{
                              fontFamily: "inherit",
                              fontSize: "14px",
                              outline: "none",
                              padding: "var(--space-2) var(--space-3)",
                              border: "1px solid var(--gray-300)",
                              borderRadius: "var(--radius-lg)",
                              background: "white",
                              color: "var(--gray-800)",
                              transition: "all var(--transition-fast)",
                              width: "100%",
                            }}
                          >
                            <option value="">Select product</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: "12px 8px" }}>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "quantity",
                                e.target.value,
                              )
                            }
                            placeholder="0"
                            min="1"
                            style={{
                              fontFamily: "inherit",
                              fontSize: "14px",
                              outline: "none",
                              padding: "var(--space-2) var(--space-3)",
                              border: "1px solid var(--gray-300)",
                              borderRadius: "var(--radius-lg)",
                              background: "white",
                              color: "var(--gray-800)",
                              transition: "all var(--transition-fast)",
                              width: "100%",
                            }}
                          />
                        </td>
                        <td style={{ padding: "12px 8px" }}>
                          <input
                            type="number"
                            value={item.unitCost}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "unitCost",
                                e.target.value,
                              )
                            }
                            placeholder="0"
                            min="0"
                            step="0.01"
                            style={{
                              fontFamily: "inherit",
                              fontSize: "14px",
                              outline: "none",
                              padding: "var(--space-2) var(--space-3)",
                              border: "1px solid var(--gray-300)",
                              borderRadius: "var(--radius-lg)",
                              background: "white",
                              color: "var(--gray-800)",
                              transition: "all var(--transition-fast)",
                              width: "100%",
                            }}
                          />
                        </td>
                        <td
                          style={{
                            padding: "12px 8px",
                            textAlign: "right",
                            fontWeight: 500,
                          }}
                        >
                          Rp{" "}
                          {(
                            (parseFloat(item.quantity) || 0) *
                            (parseFloat(item.unitCost) || 0)
                          ).toLocaleString("id-ID")}
                        </td>
                        <td style={{ padding: "12px 0 12px 8px" }}>
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--error-500)",
                                fontSize: "18px",
                                padding: "4px",
                                cursor: "pointer",
                              }}
                            >
                              ×
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td
                        colSpan="3"
                        style={{
                          textAlign: "right",
                          padding: "16px 8px",
                          fontWeight: 600,
                          fontSize: "16px",
                        }}
                      >
                        Total:
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "16px 8px",
                          fontWeight: 700,
                          fontSize: "18px",
                          color: "var(--primary-600)",
                        }}
                      >
                        Rp {calculateTotal().toLocaleString("id-ID")}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
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
                  "Update Order"
                ) : (
                  "Create Order"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default PurchaseOrderFormModal;
