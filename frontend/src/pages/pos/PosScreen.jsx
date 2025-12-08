import React, { useState, useEffect } from "react";
import { usePosStore } from "../../store/posStore.js";
import { useOutletStore } from "../../store/outletStore.js";
import { useAuthStore } from "../../store/authStore.js";
import { useUiStore } from "../../store/uiStore.js";
import * as productsApi from "../../api/productsApi.js";
import * as posApi from "../../api/posApi.js";
import * as warehousesApi from "../../api/warehousesApi.js";
import * as outletsApi from "../../api/outletsApi.js";

function PosScreen() {
  const activeOutlet = useOutletStore((state) => state.activeOutlet);
  const user = useAuthStore((state) => state.user);
  const showNotification = useUiStore((state) => state.showNotification);

  const {
    orderItems,
    customer,
    addItem,
    removeItem,
    updateItemQuantity,
    clearOrder,
    getTotals,
  } = usePosStore();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [defaultWarehouseId, setDefaultWarehouseId] = useState(null);

  // Checkout modal state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [orderNote, setOrderNote] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (activeOutlet) {
      loadProducts();
      loadWarehouse();
      loadStaff();
    }
  }, [activeOutlet]);

  useEffect(() => {
    // Set default staff to current user
    if (user) {
      setSelectedStaff(user.id);
    }
  }, [user]);

  const loadWarehouse = async () => {
    try {
      const result = await warehousesApi.getWarehouses({
        outletId: activeOutlet.id,
        limit: 10,
      });
      if (result.warehouses && result.warehouses.length > 0) {
        const defaultWh =
          result.warehouses.find((w) => w.isDefault) || result.warehouses[0];
        setDefaultWarehouseId(defaultWh.id);
      }
    } catch (err) {
      console.error("Failed to load warehouse", err);
    }
  };

  const loadStaff = async () => {
    try {
      const result = await outletsApi.getOutletUsers(activeOutlet.id);
      setStaffList(result || []);
    } catch (err) {
      console.error("Failed to load staff", err);
      // Fallback to just current user
      if (user) {
        setStaffList([{ user: user, outletRole: user.role }]);
      }
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productsApi.getProducts({
        outletId: activeOutlet?.id,
        isActive: "true",
        limit: 50,
      });
      setProducts(data.products || []);
    } catch (err) {
      // Error handled centrally
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = (product) => {
    addItem(product, 1);
  };

  const openCheckoutModal = () => {
    if (orderItems.length === 0) {
      showNotification("Cart is empty", "error");
      return;
    }

    if (!activeOutlet) {
      showNotification("Please select an outlet", "error");
      return;
    }

    if (!defaultWarehouseId) {
      showNotification("No warehouse configured for this outlet", "error");
      return;
    }

    setShowCheckoutModal(true);
  };

  const handleConfirmPayment = async () => {
    try {
      setProcessing(true);

      const orderData = {
        outletId: activeOutlet.id,
        warehouseId: defaultWarehouseId,
        customerId: customer?.id || null,
        notes: orderNote || null,
        items: orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          discountAmount: item.discountAmount || 0,
        })),
      };

      const order = await posApi.createPosOrder(orderData);

      const totals = getTotals();
      await posApi.addPayment(order.id, {
        method: paymentMethod,
        amount: totals.total,
      });

      await posApi.completePosOrder(order.id);

      showNotification(
        `Order ${order.orderNumber} completed successfully!`,
        "success",
      );
      clearOrder();
      setShowCheckoutModal(false);
      setOrderNote("");
    } catch (err) {
      // Error handled centrally
    } finally {
      setProcessing(false);
    }
  };

  const totals = getTotals();

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (!activeOutlet) {
    return (
      <div
        className="page-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <div
          className="card"
          style={{ textAlign: "center", maxWidth: "400px" }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🛒</div>
          <h2 style={{ marginBottom: "12px" }}>Point of Sale</h2>
          <p style={{ color: "var(--gray-500)" }}>
            Please select an outlet from the dropdown in the header to start
            selling.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 380px",
        height: "calc(100vh - 64px)",
        overflow: "hidden",
      }}
    >
      {/* Products Panel */}
      <div
        style={{
          padding: "24px",
          overflowY: "auto",
          background: "var(--gray-50)",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <h1 className="page-title" style={{ marginBottom: "8px" }}>
            Point of Sale
          </h1>
          <p style={{ color: "var(--gray-500)", fontSize: "14px" }}>
            {activeOutlet.name} • {filteredProducts.length} products available
          </p>
        </div>

        <input
          type="text"
          className="search-input"
          placeholder="Search products by name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ marginBottom: "20px", maxWidth: "400px" }}
        />

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px" }}>
            <div className="spinner" style={{ margin: "0 auto 16px" }}></div>
            <p style={{ color: "var(--gray-500)" }}>Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <div className="empty-state-title">No products found</div>
            <p>Try a different search term</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: "16px",
            }}
          >
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => handleAddProduct(product)}
                style={{
                  background: "white",
                  padding: "16px",
                  borderRadius: "var(--radius-xl)",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-sm)",
                  border: "1px solid var(--gray-100)",
                  transition: "all var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "80px",
                    background:
                      "linear-gradient(135deg, var(--gray-100), var(--gray-50))",
                    borderRadius: "var(--radius-lg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "12px",
                    fontSize: "32px",
                  }}
                >
                  📦
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "14px",
                    marginBottom: "4px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {product.name}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--gray-400)",
                    marginBottom: "8px",
                  }}
                >
                  {product.sku}
                </div>
                <div style={{ fontWeight: 700, color: "var(--primary-600)" }}>
                  Rp {parseFloat(product.basePrice).toLocaleString("id-ID")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Panel */}
      <div
        style={{
          background: "white",
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid var(--gray-200)",
        }}
      >
        <div
          style={{
            padding: "20px 24px",
            background: "linear-gradient(135deg, #1e293b, #334155)",
            color: "white",
          }}
        >
          <h2
            style={{ fontSize: "18px", fontWeight: 600, marginBottom: "4px" }}
          >
            Current Order
          </h2>
          <p style={{ fontSize: "13px", opacity: 0.7 }}>
            {orderItems.length} items in cart
          </p>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {orderItems.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: "var(--gray-400)",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🛒</div>
              <p>Cart is empty</p>
              <p style={{ fontSize: "13px", marginTop: "4px" }}>
                Click on products to add them
              </p>
            </div>
          ) : (
            <div>
              {orderItems.map((item) => (
                <div
                  key={item.productId}
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid var(--gray-100)",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 500,
                      marginBottom: "8px",
                      color: "var(--gray-800)",
                    }}
                  >
                    {item.product.name}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <button
                        onClick={() =>
                          updateItemQuantity(
                            item.productId,
                            Math.max(1, item.quantity - 1),
                          )
                        }
                        className="btn-secondary btn-sm"
                        style={{ width: "28px", height: "28px", padding: 0 }}
                      >
                        −
                      </button>
                      <span
                        style={{
                          width: "32px",
                          textAlign: "center",
                          fontWeight: 600,
                          fontSize: "15px",
                        }}
                      >
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateItemQuantity(item.productId, item.quantity + 1)
                        }
                        className="btn-secondary btn-sm"
                        style={{ width: "28px", height: "28px", padding: 0 }}
                      >
                        +
                      </button>
                    </div>
                    <div style={{ fontWeight: 600, color: "var(--gray-800)" }}>
                      Rp{" "}
                      {(item.unitPrice * item.quantity).toLocaleString("id-ID")}
                    </div>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId)}
                    style={{
                      marginTop: "8px",
                      fontSize: "12px",
                      color: "var(--error-500)",
                      background: "none",
                      padding: 0,
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout Section */}
        {orderItems.length > 0 && (
          <div
            style={{
              padding: "20px 24px",
              borderTop: "1px solid var(--gray-200)",
              background: "var(--gray-50)",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  fontSize: "14px",
                }}
              >
                <span style={{ color: "var(--gray-500)" }}>Subtotal</span>
                <span>Rp {totals.subtotal.toLocaleString("id-ID")}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  fontSize: "14px",
                }}
              >
                <span style={{ color: "var(--gray-500)" }}>Tax</span>
                <span>Rp {totals.tax.toLocaleString("id-ID")}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: "12px",
                  borderTop: "2px solid var(--gray-200)",
                  fontSize: "20px",
                  fontWeight: 700,
                }}
              >
                <span>Total</span>
                <span style={{ color: "var(--primary-600)" }}>
                  Rp {totals.total.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={clearOrder}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Clear
              </button>
              <button
                onClick={openCheckoutModal}
                className="btn-success btn-lg"
                style={{ flex: 2 }}
              >
                Checkout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div
          className="modal-overlay"
          onClick={() => !processing && setShowCheckoutModal(false)}
        >
          <div
            className="modal"
            style={{ maxWidth: "540px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{
                background: "linear-gradient(135deg, #1e293b, #334155)",
                color: "white",
              }}
            >
              <h2 className="modal-title">Complete Order</h2>
              <button
                onClick={() => !processing && setShowCheckoutModal(false)}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  fontSize: "18px",
                  color: "white",
                  width: "32px",
                  height: "32px",
                  borderRadius: "var(--radius-full)",
                }}
                disabled={processing}
              >
                ×
              </button>
            </div>
            <div
              className="modal-body"
              style={{ maxHeight: "60vh", overflowY: "auto" }}
            >
              {/* Order Summary */}
              <div style={{ marginBottom: "20px" }}>
                <h4
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--gray-500)",
                    marginBottom: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Order Items
                </h4>
                <div
                  style={{
                    background: "var(--gray-50)",
                    borderRadius: "var(--radius-lg)",
                    padding: "12px",
                  }}
                >
                  {orderItems.map((item, index) => (
                    <div
                      key={item.productId}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        borderBottom:
                          index < orderItems.length - 1
                            ? "1px solid var(--gray-200)"
                            : "none",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>
                          {item.product.name}
                        </div>
                        <div
                          style={{ fontSize: "12px", color: "var(--gray-400)" }}
                        >
                          {item.quantity} × Rp{" "}
                          {parseFloat(item.unitPrice).toLocaleString("id-ID")}
                        </div>
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        Rp{" "}
                        {(item.quantity * item.unitPrice).toLocaleString(
                          "id-ID",
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px",
                  background:
                    "linear-gradient(135deg, var(--primary-50), var(--primary-100))",
                  borderRadius: "var(--radius-lg)",
                  marginBottom: "20px",
                }}
              >
                <span style={{ fontSize: "16px", fontWeight: 500 }}>
                  Total Amount
                </span>
                <span
                  style={{
                    fontSize: "24px",
                    fontWeight: 700,
                    color: "var(--primary-600)",
                  }}
                >
                  Rp {totals.total.toLocaleString("id-ID")}
                </span>
              </div>

              {/* Payment Method */}
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "8px",
                  }}
                >
                  {[
                    { value: "CASH", label: "Cash", icon: "💵" },
                    { value: "CARD", label: "Card", icon: "💳" },
                    { value: "E_WALLET", label: "E-Wallet", icon: "📱" },
                    {
                      value: "BANK_TRANSFER",
                      label: "Bank Transfer",
                      icon: "🏦",
                    },
                  ].map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      style={{
                        padding: "12px",
                        borderRadius: "var(--radius-lg)",
                        border:
                          paymentMethod === method.value
                            ? "2px solid var(--primary-500)"
                            : "1px solid var(--gray-200)",
                        background:
                          paymentMethod === method.value
                            ? "var(--primary-50)"
                            : "white",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        fontWeight: 500,
                      }}
                    >
                      <span style={{ fontSize: "20px" }}>{method.icon}</span>
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Staff/Salesperson */}
              <div className="form-group">
                <label className="form-label">Sales Staff</label>
                <select
                  value={selectedStaff || ""}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                >
                  {staffList.length > 0 ? (
                    staffList.map((staff) => (
                      <option
                        key={staff.user?.id || staff.id}
                        value={staff.user?.id || staff.id}
                      >
                        {staff.user?.name || staff.name} (
                        {staff.outletRole || staff.role})
                      </option>
                    ))
                  ) : (
                    <option value={user?.id}>
                      {user?.name} (Current User)
                    </option>
                  )}
                </select>
                <p className="form-helper">
                  Select the staff member responsible for this sale
                </p>
              </div>

              {/* Order Notes */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Order Notes (Optional)</label>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Add any special instructions or notes..."
                  rows={2}
                  style={{ resize: "none" }}
                />
              </div>
            </div>
            <div
              className="modal-footer"
              style={{ background: "var(--gray-50)" }}
            >
              <button
                className="btn-secondary"
                onClick={() => setShowCheckoutModal(false)}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                className="btn-success btn-lg"
                onClick={handleConfirmPayment}
                disabled={processing}
                style={{ minWidth: "180px" }}
              >
                {processing ? (
                  <>
                    <div
                      className="spinner"
                      style={{ width: "16px", height: "16px" }}
                    ></div>
                    Processing...
                  </>
                ) : (
                  `Pay Rp ${totals.total.toLocaleString("id-ID")}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PosScreen;
