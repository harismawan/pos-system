import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "react-data-table-component";
import * as reportsApi from "../../api/reportsApi.js";
import { useUiStore } from "../../store/uiStore.js";
import {
  formatDateOnly,
  formatTimeOnly,
  formatDateTime,
} from "../../utils/dateUtils.js";

const customStyles = {
  headRow: {
    style: {
      backgroundColor: "var(--gray-50)",
      borderBottom: "2px solid var(--gray-200)",
      minHeight: "52px",
    },
  },
  headCells: {
    style: {
      fontSize: "13px",
      fontWeight: "600",
      color: "var(--gray-600)",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
    },
  },
  rows: {
    style: {
      minHeight: "60px",
      fontSize: "14px",
      cursor: "pointer",
      "&:hover": {
        backgroundColor: "var(--gray-50)",
      },
    },
  },
};

function OrderHistoryPage() {
  const navigate = useNavigate();
  const showNotification = useUiStore((state) => state.showNotification);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Date filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );

  useEffect(() => {
    loadOrders();
  }, [currentPage, perPage, statusFilter, startDate, endDate]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: perPage,
      };
      if (statusFilter) params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate + "T23:59:59";

      const result = await reportsApi.getOrderHistory(params);
      setOrders(result.orders || []);
      setTotalRows(result.pagination?.total || 0);
    } catch (err) {
      // Error handled centrally
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "COMPLETED":
        return "badge-success";
      case "CANCELLED":
        return "badge-error";
      default:
        return "badge-warning";
    }
  };

  const columns = useMemo(
    () => [
      {
        name: "Order #",
        selector: (row) => row.orderNumber,
        sortable: true,
        width: "160px",
        cell: (row) => (
          <div style={{ fontWeight: 600, color: "var(--primary-600)" }}>
            {row.orderNumber}
          </div>
        ),
      },
      {
        name: "Date",
        selector: (row) => row.createdAt,
        sortable: true,
        width: "180px",
        cell: (row) => (
          <div>
            <div>{formatDateOnly(row.createdAt)}</div>
            <div style={{ fontSize: "12px", color: "var(--gray-400)" }}>
              {formatTimeOnly(row.createdAt)}
            </div>
          </div>
        ),
      },
      {
        name: "Customer",
        selector: (row) => row.customer?.name,
        cell: (row) =>
          row.customer?.name || (
            <span style={{ color: "var(--gray-400)" }}>Walk-in</span>
          ),
      },
      {
        name: "Items",
        selector: (row) => row.items?.length || 0,
        width: "80px",
        cell: (row) => (
          <span className="badge badge-neutral">{row.items?.length || 0}</span>
        ),
      },
      {
        name: "Total",
        selector: (row) => parseFloat(row.totalAmount),
        sortable: true,
        width: "140px",
        cell: (row) => (
          <div style={{ fontWeight: 600 }}>
            Rp {parseFloat(row.totalAmount).toLocaleString("id-ID")}
          </div>
        ),
      },
      {
        name: "Status",
        selector: (row) => row.status,
        width: "150px",
        cell: (row) => (
          <span className={`badge ${getStatusStyle(row.status)}`}>
            {row.status}
          </span>
        ),
      },
      {
        name: "Cashier",
        selector: (row) => row.cashier?.name,
        width: "130px",
        cell: (row) => row.cashier?.name || "-",
      },
    ],
    [],
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Order History</h1>
          <p className="page-subtitle">
            View all transactions and order details
          </p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: "4px" }}>
            From
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setCurrentPage(1);
            }}
            style={{ width: "160px" }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: "4px" }}>
            To
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setCurrentPage(1);
            }}
            style={{ width: "160px" }}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ marginBottom: "4px" }}>
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{ width: "150px" }}
          >
            <option value="">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="OPEN">Open</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="data-table-container">
        <DataTable
          columns={columns}
          data={orders}
          progressPending={loading}
          pagination
          paginationServer
          paginationTotalRows={totalRows}
          onChangeRowsPerPage={(n, p) => {
            setPerPage(n);
            setCurrentPage(p);
          }}
          onChangePage={setCurrentPage}
          customStyles={customStyles}
          highlightOnHover
          onRowClicked={(row) => setSelectedOrder(row)}
          noDataComponent={
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <div className="empty-state-title">No orders found</div>
              <p>Try adjusting your date range or filters</p>
            </div>
          }
        />
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div
            className="modal"
            style={{ maxWidth: "600px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Order {selectedOrder.orderNumber}</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  background: "none",
                  fontSize: "24px",
                  color: "var(--gray-400)",
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "24px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--gray-500)",
                      marginBottom: "4px",
                    }}
                  >
                    Date
                  </div>
                  <div style={{ fontWeight: 500 }}>
                    {formatDateTime(selectedOrder.createdAt)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--gray-500)",
                      marginBottom: "4px",
                    }}
                  >
                    Status
                  </div>
                  <span
                    className={`badge ${getStatusStyle(selectedOrder.status)}`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--gray-500)",
                      marginBottom: "4px",
                    }}
                  >
                    Customer
                  </div>
                  <div style={{ fontWeight: 500 }}>
                    {selectedOrder.customer?.name || "Walk-in"}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--gray-500)",
                      marginBottom: "4px",
                    }}
                  >
                    Cashier
                  </div>
                  <div style={{ fontWeight: 500 }}>
                    {selectedOrder.cashier?.name || "-"}
                  </div>
                </div>
              </div>

              <h4 style={{ marginBottom: "12px" }}>Items</h4>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginBottom: "16px",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--gray-200)" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px 0",
                        fontSize: "12px",
                        color: "var(--gray-500)",
                      }}
                    >
                      Product
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        padding: "8px 0",
                        fontSize: "12px",
                        color: "var(--gray-500)",
                      }}
                    >
                      Qty
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "8px 0",
                        fontSize: "12px",
                        color: "var(--gray-500)",
                      }}
                    >
                      Price
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "8px 0",
                        fontSize: "12px",
                        color: "var(--gray-500)",
                      }}
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items?.map((item) => (
                    <tr
                      key={item.id}
                      style={{ borderBottom: "1px solid var(--gray-100)" }}
                    >
                      <td style={{ padding: "8px 0" }}>{item.product?.name}</td>
                      <td style={{ textAlign: "center", padding: "8px 0" }}>
                        {parseFloat(item.quantity)}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 0" }}>
                        Rp {parseFloat(item.unitPrice).toLocaleString("id-ID")}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "8px 0",
                          fontWeight: 500,
                        }}
                      >
                        Rp {parseFloat(item.lineTotal).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div
                style={{
                  background: "var(--gray-50)",
                  padding: "16px",
                  borderRadius: "var(--radius-lg)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span>Subtotal</span>
                  <span>
                    Rp{" "}
                    {parseFloat(selectedOrder.subtotalAmount).toLocaleString(
                      "id-ID",
                    )}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span>Tax</span>
                  <span>
                    Rp{" "}
                    {parseFloat(selectedOrder.totalTaxAmount).toLocaleString(
                      "id-ID",
                    )}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span>Discount</span>
                  <span>
                    -Rp{" "}
                    {parseFloat(
                      selectedOrder.totalDiscountAmount,
                    ).toLocaleString("id-ID")}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "18px",
                    fontWeight: 700,
                    paddingTop: "8px",
                    borderTop: "2px solid var(--gray-200)",
                  }}
                >
                  <span>Total</span>
                  <span style={{ color: "var(--primary-600)" }}>
                    Rp{" "}
                    {parseFloat(selectedOrder.totalAmount).toLocaleString(
                      "id-ID",
                    )}
                  </span>
                </div>
              </div>

              {selectedOrder.payments?.length > 0 && (
                <div style={{ marginTop: "16px" }}>
                  <h4 style={{ marginBottom: "8px" }}>Payments</h4>
                  {selectedOrder.payments.map((payment) => (
                    <div
                      key={payment.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        borderBottom: "1px solid var(--gray-100)",
                      }}
                    >
                      <span className="badge badge-info">{payment.method}</span>
                      <span style={{ fontWeight: 500 }}>
                        Rp {parseFloat(payment.amount).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderHistoryPage;
