import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DataTable from "react-data-table-component";
import { useUiStore } from "../../store/uiStore.js";
import * as customersApi from "../../api/customersApi.js";
import ConfirmModal from "../../components/ConfirmModal.jsx";
import CustomerDetailModal from "../../components/settings/CustomerDetailModal.jsx";
import { useDebounce } from "../../hooks/useDebounce.js";
import {
  useFormValidation,
  validators,
} from "../../hooks/useFormValidation.js";

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
      minHeight: "56px",
      fontSize: "14px",
      "&:hover": {
        backgroundColor: "var(--gray-50)",
      },
    },
  },
};

function CustomersSettingsPage() {
  const navigate = useNavigate();
  const showNotification = useUiStore((state) => state.showNotification);

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    id: null,
    name: "",
  });
  const [deleting, setDeleting] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Form validation for modal
  const customerValidationRules = {
    name: [validators.required],
    email: [validators.email],
    phone: [validators.phone],
  };

  const {
    values: formData,
    errors: formErrors,
    touched: formTouched,
    handleChange: handleFormChange,
    handleBlur: handleFormBlur,
    validateAll: validateForm,
    reset: resetForm,
    getError: getFormError,
  } = useFormValidation(
    {
      name: "",
      email: "",
      phone: "",
      code: "",
      priceTierId: "",
    },
    customerValidationRules,
  );

  const getInputClassName = (fieldName) => {
    if (!formTouched[fieldName]) return "";
    return formErrors[fieldName] ? "input-error" : "input-valid";
  };

  useEffect(() => {
    loadCustomers();
  }, [currentPage, perPage, debouncedSearchTerm]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params = { page: currentPage, limit: perPage };
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      const result = await customersApi.getCustomers(params);
      setCustomers(result.customers || []);
      setTotalRows(result.pagination?.total || 0);
    } catch (err) {
      // Error handled centrally
    } finally {
      setLoading(false);
    }
  };

  const openModal = (customer = null) => {
    setEditingCustomer(customer);
    resetForm(
      customer
        ? {
            name: customer.name || "",
            email: customer.email || "",
            phone: customer.phone || "",
            code: customer.code || "",
            priceTierId: customer.priceTierId || "",
          }
        : { name: "", email: "", phone: "", code: "", priceTierId: "" },
    );
    setShowModal(true);
  };

  const handleRowClick = (customer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showNotification("Please fix the errors in the form", "error");
      return;
    }
    try {
      setSaving(true);
      if (editingCustomer) {
        await customersApi.updateCustomer(editingCustomer.id, formData);
        showNotification("Customer updated", "success");
      } else {
        await customersApi.createCustomer(formData);
        showNotification("Customer created", "success");
      }
      setShowModal(false);
      loadCustomers();
    } catch (err) {
      // Error handled centrally
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (id, name) => {
    setDeleteModal({ open: true, id, name });
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await customersApi.deleteCustomer(deleteModal.id);
      showNotification("Customer deleted", "success");
      setDeleteModal({ open: false, id: null, name: "" });
      loadCustomers();
    } catch (err) {
      // Error handled centrally
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        name: "Name",
        selector: (row) => row.name,
        sortable: true,
        cell: (row) => (
          <div>
            <div style={{ fontWeight: 500 }}>{row.name}</div>
            {row.code && (
              <div style={{ fontSize: "12px", color: "var(--gray-500)" }}>
                #{row.code}
              </div>
            )}
          </div>
        ),
      },
      { name: "Email", selector: (row) => row.email || "-", width: "200px" },
      { name: "Phone", selector: (row) => row.phone || "-", width: "140px" },
      {
        name: "Price Tier",
        selector: (row) => row.priceTier?.name,
        width: "130px",
        cell: (row) =>
          row.priceTier?.name ? (
            <span className="badge badge-info">{row.priceTier.name}</span>
          ) : (
            "-"
          ),
      },
      {
        name: "Actions",
        width: "140px",
        cell: (row) => (
          <div className="action-buttons">
            <button className="action-btn edit" onClick={() => openModal(row)}>
              Edit
            </button>
            <button
              className="action-btn delete"
              onClick={() => openDeleteModal(row.id, row.name)}
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage your customer database</p>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>
          + Add Customer
        </button>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: "320px" }}
        />
      </div>

      <div className="data-table-container">
        <DataTable
          columns={columns}
          data={customers}
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
          pointerOnHover
          onRowClicked={handleRowClick}
          noDataComponent={
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">No customers yet</div>
              <p>Add your first customer to get started</p>
            </div>
          }
        />
      </div>

      <CustomerDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        customer={selectedCustomer}
      />

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingCustomer ? "Edit Customer" : "New Customer"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "none",
                  fontSize: "24px",
                  color: "var(--gray-400)",
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    onBlur={handleFormBlur}
                    placeholder="Customer name"
                    className={getInputClassName("name")}
                  />
                  {getFormError("name") && (
                    <p className="form-error">{getFormError("name")}</p>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Customer Code</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleFormChange}
                    placeholder="e.g., CUST001"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    onBlur={handleFormBlur}
                    placeholder="email@example.com"
                    className={getInputClassName("email")}
                  />
                  {getFormError("email") && (
                    <p className="form-error">{getFormError("email")}</p>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    onBlur={handleFormBlur}
                    placeholder="Phone number"
                    className={getInputClassName("phone")}
                  />
                  {getFormError("phone") && (
                    <p className="form-error">{getFormError("phone")}</p>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, name: "" })}
        onConfirm={handleDelete}
        title="Delete Customer"
        message="Are you sure you want to delete"
        itemName={deleteModal.name}
        confirmText="Delete"
        confirmStyle="danger"
        loading={deleting}
      />
    </div>
  );
}

export default CustomersSettingsPage;
