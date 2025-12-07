import React, { useState, useEffect, useMemo } from "react";
import DataTable from "react-data-table-component";
import { useUiStore } from "../../store/uiStore.js";
import * as suppliersApi from "../../api/suppliersApi.js";
import ConfirmModal from "../../components/ConfirmModal.jsx";
import SupplierDetailModal from "../../components/settings/SupplierDetailModal.jsx";
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

function SuppliersSettingsPage() {
  const showNotification = useUiStore((state) => state.showNotification);

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    id: null,
    name: "",
  });
  const [deleting, setDeleting] = useState(false);

  // Detail modal state
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Form validation for modal
  const supplierValidationRules = {
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
      code: "",
      contactName: "",
      email: "",
      phone: "",
      isActive: true,
    },
    supplierValidationRules,
  );

  const getInputClassName = (fieldName) => {
    if (!formTouched[fieldName]) return "";
    return formErrors[fieldName] ? "input-error" : "input-valid";
  };

  useEffect(() => {
    loadSuppliers(1, perPage);
  }, []);

  const loadSuppliers = async (page, limit) => {
    try {
      setLoading(true);
      const result = await suppliersApi.getSuppliers({ page, limit });
      setSuppliers(result.suppliers || []);
      setTotalRows(result.pagination?.total || 0);
    } catch (err) {
      showNotification("Failed to load suppliers", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadSuppliers(page, perPage);
  };

  const handlePerRowsChange = (newPerPage, page) => {
    setPerPage(newPerPage);
    setCurrentPage(page);
    loadSuppliers(page, newPerPage);
  };

  const handleRowClick = (supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailModal(true);
  };

  const openModal = (supplier = null) => {
    setEditingSupplier(supplier);
    resetForm(
      supplier
        ? {
            name: supplier.name || "",
            code: supplier.code || "",
            contactName: supplier.contactName || "",
            email: supplier.email || "",
            phone: supplier.phone || "",
            isActive: supplier.isActive ?? true,
          }
        : {
            name: "",
            code: "",
            contactName: "",
            email: "",
            phone: "",
            isActive: true,
          },
    );
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showNotification("Please fix the errors in the form", "error");
      return;
    }
    try {
      setSaving(true);
      if (editingSupplier) {
        await suppliersApi.updateSupplier(editingSupplier.id, formData);
        showNotification("Supplier updated", "success");
      } else {
        await suppliersApi.createSupplier(formData);
        showNotification("Supplier created", "success");
      }
      setShowModal(false);
      loadSuppliers();
    } catch (err) {
      showNotification(err.message || "Failed to save", "error");
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
      await suppliersApi.deleteSupplier(deleteModal.id);
      showNotification("Supplier deleted", "success");
      setDeleteModal({ open: false, id: null, name: "" });
      loadSuppliers();
    } catch (err) {
      showNotification(err.message || "Failed to delete", "error");
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        name: "Supplier",
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
      {
        name: "Contact",
        selector: (row) => row.contactName || "-",
        width: "160px",
      },
      { name: "Email", selector: (row) => row.email || "-", width: "200px" },
      { name: "Phone", selector: (row) => row.phone || "-", width: "140px" },
      {
        name: "Status",
        width: "100px",
        cell: (row) => (
          <span
            className={`badge ${row.isActive ? "badge-success" : "badge-error"}`}
          >
            {row.isActive ? "Active" : "Inactive"}
          </span>
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
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">Manage your product suppliers</p>
        </div>
        <button className="btn-primary" onClick={() => openModal()}>
          + Add Supplier
        </button>
      </div>

      <div className="data-table-container">
        <DataTable
          columns={columns}
          data={suppliers}
          progressPending={loading}
          customStyles={customStyles}
          highlightOnHover
          pointerOnHover
          onRowClicked={handleRowClick}
          pagination
          paginationServer
          paginationTotalRows={totalRows}
          onChangeRowsPerPage={handlePerRowsChange}
          onChangePage={handlePageChange}
          paginationPerPage={perPage}
          noDataComponent={
            <div className="empty-state">
              <div className="empty-state-icon">🚚</div>
              <div className="empty-state-title">No suppliers yet</div>
              <p>Add suppliers to create purchase orders</p>
            </div>
          }
        />
      </div>

      <SupplierDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        supplier={selectedSupplier}
      />

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingSupplier ? "Edit Supplier" : "New Supplier"}
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
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">Company Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      onBlur={handleFormBlur}
                      placeholder="Supplier name"
                      className={getInputClassName("name")}
                    />
                    {getFormError("name") && (
                      <p className="form-error">{getFormError("name")}</p>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Code</label>
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={handleFormChange}
                      placeholder="e.g., SUP001"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Name</label>
                  <input
                    type="text"
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleFormChange}
                    placeholder="Contact person"
                  />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleFormChange}
                      onBlur={handleFormBlur}
                      placeholder="Email"
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
                      placeholder="Phone"
                      className={getInputClassName("phone")}
                    />
                    {getFormError("phone") && (
                      <p className="form-error">{getFormError("phone")}</p>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleFormChange}
                      style={{
                        width: "16px",
                        height: "16px",
                        accentColor: "var(--primary-500)",
                      }}
                    />
                    Active supplier
                  </label>
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
        title="Delete Supplier"
        message="Are you sure you want to delete"
        itemName={deleteModal.name}
        confirmText="Delete"
        confirmStyle="danger"
        loading={deleting}
      />
    </div>
  );
}

export default SuppliersSettingsPage;
