import React, { useState, useEffect } from "react";
import DataTable from "react-data-table-component";
import * as inventoryApi from "../../api/inventoryApi.js";
import * as productsApi from "../../api/productsApi.js";
import { formatDateTime } from "../../utils/dateUtils.js";

const customStyles = {
  headRow: {
    style: {
      backgroundColor: "var(--gray-50)",
      borderBottom: "1px solid var(--gray-200)",
      minHeight: "40px",
    },
  },
  headCells: {
    style: {
      fontSize: "12px",
      fontWeight: "600",
      color: "var(--gray-600)",
      textTransform: "uppercase",
      paddingLeft: "12px",
      paddingRight: "12px",
    },
  },
  rows: {
    style: {
      minHeight: "48px",
      fontSize: "13px",
    },
  },
  cells: {
    style: {
      paddingLeft: "12px",
      paddingRight: "12px",
    },
  },
};

function ProductDetailModal({ isOpen, onClose, product: initialProduct }) {
  const [product, setProduct] = useState(initialProduct);
  const [warehouseStock, setWarehouseStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && initialProduct) {
      setProduct(initialProduct);
      loadData();
    }
  }, [isOpen, initialProduct]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [inventoryResult, movementsResult, productResult] =
        await Promise.all([
          inventoryApi.getInventory({ productId: initialProduct.id }),
          inventoryApi.getStockMovements({
            productId: initialProduct.id,
            limit: 10,
          }),
          productsApi.getProductById(initialProduct.id),
        ]);

      setWarehouseStock(inventoryResult.inventories || []);
      setMovements(movementsResult.movements || []);

      if (productResult) {
        setProduct(productResult);
      }
    } catch (err) {
      console.error("Failed to load product details", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  // Columns for Warehouse Stock table
  const stockColumns = [
    {
      name: "Warehouse",
      selector: (row) => row.warehouse?.name,
      sortable: true,
    },
    {
      name: "Stock",
      selector: (row) => parseFloat(row.quantityOnHand),
      cell: (row) => (
        <span
          style={{
            fontWeight: 600,
            color:
              parseFloat(row.quantityOnHand) <= parseFloat(row.minimumStock)
                ? "var(--warning-600)"
                : "var(--success-600)",
          }}
        >
          {parseFloat(row.quantityOnHand)} {product.unit}
        </span>
      ),
    },
    {
      name: "Status",
      cell: (row) => {
        const qty = parseFloat(row.quantityOnHand);
        const min = parseFloat(row.minimumStock);
        return qty <= 0 ? (
          <span style={{ color: "var(--error-600)" }}>Out of Stock</span>
        ) : qty <= min ? (
          <span style={{ color: "var(--warning-600)" }}>Low Stock</span>
        ) : (
          <span style={{ color: "var(--success-600)" }}>OK</span>
        );
      },
    },
  ];

  // Columns for Movements table
  const movementColumns = [
    {
      name: "Date",
      selector: (row) => row.createdAt,
      format: (row) => formatDateTime(row.createdAt),
      width: "120px",
    },
    {
      name: "Type",
      selector: (row) => row.type,
      width: "110px",
      cell: (row) => {
        let bg = "var(--gray-100)";
        let color = "var(--gray-700)";
        let label = row.type;

        if (row.type === "PURCHASE" || row.type === "ADJUSTMENT_IN") {
          bg = "var(--success-50)";
          color = "var(--success-700)";
          label = row.type === "PURCHASE" ? "Purchase" : "Adj In";
        } else if (row.type === "SALE" || row.type === "ADJUSTMENT_OUT") {
          bg = "var(--error-50)";
          color = "var(--error-700)";
          label = row.type === "SALE" ? "Sale" : "Adj Out";
        } else if (row.type === "TRANSFER") {
          bg = "var(--primary-50)";
          color = "var(--primary-700)";
          label = "Transfer";
        }

        return (
          <span
            style={{
              background: bg,
              color: color,
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: 500,
            }}
          >
            {label}
          </span>
        );
      },
    },
    {
      name: "Qty",
      selector: (row) => row.quantity,
      width: "80px",
      cell: (row) => {
        const isPositive = ["PURCHASE", "ADJUSTMENT_IN"].includes(row.type);
        // Note: For transfers, it's context dependent, but simpler here to just show amount involved
        return (
          <span style={{ fontWeight: 600 }}>{parseFloat(row.quantity)}</span>
        );
      },
    },
    {
      name: "Warehouse",
      cell: (row) => {
        const from = row.fromWarehouse?.name;
        const to = row.toWarehouse?.name;
        if (row.type === "TRANSFER")
          return (
            <span style={{ fontSize: "11px" }}>
              {from} → {to}
            </span>
          );
        return <span style={{ fontSize: "11px" }}>{to || from || "-"}</span>;
      },
    },
  ];

  const totalStock = warehouseStock.reduce(
    (sum, item) => sum + parseFloat(item.quantityOnHand),
    0,
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: "800px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{product.name}</h2>
            <div
              style={{
                fontSize: "13px",
                color: "var(--gray-500)",
                marginTop: "4px",
              }}
            >
              SKU: {product.sku}
            </div>
          </div>
          <button onClick={onClose} className="modal-close">
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Product Details Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "16px",
              backgroundColor: "var(--gray-50)",
              padding: "16px",
              borderRadius: "var(--radius-lg)",
              marginBottom: "24px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--gray-500)",
                  textTransform: "uppercase",
                }}
              >
                Category
              </div>
              <div style={{ fontWeight: 500 }}>{product.category || "-"}</div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--gray-500)",
                  textTransform: "uppercase",
                }}
              >
                Barcode
              </div>
              <div style={{ fontWeight: 500 }}>{product.barcode || "-"}</div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--gray-500)",
                  textTransform: "uppercase",
                }}
              >
                Status
              </div>
              <div style={{ fontWeight: 500 }}>
                <span
                  className={`badge ${product.isActive ? "badge-success" : "badge-error"}`}
                >
                  {product.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--gray-500)",
                  textTransform: "uppercase",
                }}
              >
                Total Stock
              </div>
              <div style={{ fontWeight: 700, fontSize: "16px" }}>
                {totalStock} {product.unit}
              </div>
            </div>

            {/* Divider row if needed or just continue grid */}

            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--gray-500)",
                  textTransform: "uppercase",
                }}
              >
                Base Price
              </div>
              <div style={{ fontWeight: 600, color: "var(--success-700)" }}>
                Rp {parseFloat(product.basePrice).toLocaleString("id-ID")}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--gray-500)",
                  textTransform: "uppercase",
                }}
              >
                Cost Price
              </div>
              <div style={{ fontWeight: 600, color: "var(--gray-700)" }}>
                {product.costPrice
                  ? `Rp ${parseFloat(product.costPrice).toLocaleString("id-ID")}`
                  : "-"}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--gray-500)",
                  textTransform: "uppercase",
                }}
              >
                Tax Rate
              </div>
              <div style={{ fontWeight: 500 }}>
                {product.taxRate ? `${product.taxRate}%` : "0%"}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--gray-500)",
                  textTransform: "uppercase",
                }}
              >
                Unit
              </div>
              <div style={{ fontWeight: 500 }}>{product.unit}</div>
            </div>

            {product.description && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  marginTop: "8px",
                  paddingTop: "8px",
                  borderTop: "1px solid var(--gray-200)",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--gray-500)",
                    textTransform: "uppercase",
                    marginBottom: "4px",
                  }}
                >
                  Description
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--gray-700)",
                    lineHeight: "1.4",
                  }}
                >
                  {product.description}
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
            }}
          >
            {/* Stock by Warehouse */}
            <div>
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  marginBottom: "12px",
                  color: "var(--gray-700)",
                }}
              >
                Stock by Warehouse
              </h3>
              <div
                className="data-table-container"
                style={{
                  boxShadow: "none",
                  border: "1px solid var(--gray-200)",
                }}
              >
                <DataTable
                  columns={stockColumns}
                  data={warehouseStock}
                  progressPending={loading}
                  customStyles={customStyles}
                  dense
                  noDataComponent={
                    <div className="p-4 text-center text-gray-500">
                      No stock records
                    </div>
                  }
                />
              </div>
            </div>

            {/* Recent Movements */}
            <div>
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  marginBottom: "12px",
                  color: "var(--gray-700)",
                }}
              >
                Recent Activity
              </h3>
              <div
                className="data-table-container"
                style={{
                  boxShadow: "none",
                  border: "1px solid var(--gray-200)",
                }}
              >
                <DataTable
                  columns={movementColumns}
                  data={movements}
                  progressPending={loading}
                  customStyles={customStyles}
                  dense
                  noDataComponent={
                    <div className="p-4 text-center text-gray-500">
                      No recent activity
                    </div>
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          {/* Could add 'Edit Product' button here later */}
        </div>
      </div>
    </div>
  );
}

export default ProductDetailModal;
