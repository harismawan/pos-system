import React, { useState, useEffect, useMemo } from 'react';
import DataTable from 'react-data-table-component';
import { useUiStore } from '../../store/uiStore.js';
import { useAuthStore } from '../../store/authStore.js';
import * as outletsApi from '../../api/outletsApi.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import OutletDetailModal from '../../components/settings/OutletDetailModal.jsx';

const customStyles = {
    headRow: {
        style: {
            backgroundColor: 'var(--gray-50)',
            borderBottom: '2px solid var(--gray-200)',
            minHeight: '52px',
        },
    },
    headCells: {
        style: {
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--gray-600)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
        },
    },
    rows: {
        style: {
            minHeight: '56px',
            fontSize: '14px',
            '&:hover': {
                backgroundColor: 'var(--gray-50)',
            },
        },
    },
};

function OutletsSettingsPage() {
    const showNotification = useUiStore((state) => state.showNotification);
    const refreshOutlets = useAuthStore((state) => state.refreshToken);

    const [outlets, setOutlets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalRows, setTotalRows] = useState(0);
    const [perPage, setPerPage] = useState(10);

    // Track page in a ref or just rely on DataTable's state management via local state? 
    // DataTable's onChangePage gives us the new page.
    const [currentPage, setCurrentPage] = useState(1);

    const [showModal, setShowModal] = useState(false);
    const [editingOutlet, setEditingOutlet] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' });
    const [deleting, setDeleting] = useState(false);

    // Detail modal state
    const [selectedOutlet, setSelectedOutlet] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        addressLine1: '',
        city: '',
        phone: '',
        isActive: true,
    });

    useEffect(() => {
        loadOutlets(1, perPage);
    }, []);

    const loadOutlets = async (page, limit) => {
        try {
            setLoading(true);
            const result = await outletsApi.getOutlets({ page, limit });
            setOutlets(result.outlets || []);
            setTotalRows(result.pagination?.total || 0);
        } catch (err) {
            showNotification('Failed to load outlets', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        loadOutlets(page, perPage);
    };

    const handlePerRowsChange = (newPerPage, page) => {
        setPerPage(newPerPage);
        setCurrentPage(page);
        loadOutlets(page, newPerPage);
    };

    const handleRowClick = (outlet) => {
        setSelectedOutlet(outlet);
        setShowDetailModal(true);
    };

    const openModal = (outlet = null) => {
        setEditingOutlet(outlet);
        setFormData(outlet ? {
            name: outlet.name || '',
            code: outlet.code || '',
            addressLine1: outlet.addressLine1 || '',
            city: outlet.city || '',
            phone: outlet.phone || '',
            isActive: outlet.isActive ?? true,
        } : { name: '', code: '', addressLine1: '', city: '', phone: '', isActive: true });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.code.trim()) {
            showNotification('Name and code are required', 'error');
            return;
        }
        try {
            setSaving(true);
            if (editingOutlet) {
                await outletsApi.updateOutlet(editingOutlet.id, formData);
                showNotification('Outlet updated', 'success');
            } else {
                await outletsApi.createOutlet(formData);
                showNotification('Outlet created', 'success');
            }
            setShowModal(false);
            loadOutlets();
        } catch (err) {
            showNotification(err.message || 'Failed to save', 'error');
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
            await outletsApi.deleteOutlet(deleteModal.id);
            showNotification('Outlet deleted', 'success');
            setDeleteModal({ open: false, id: null, name: '' });
            loadOutlets();
        } catch (err) {
            showNotification(err.message || 'Failed to delete', 'error');
        } finally {
            setDeleting(false);
        }
    };

    const columns = useMemo(() => [
        {
            name: 'Outlet',
            selector: row => row.name,
            sortable: true,
            cell: row => (
                <div>
                    <div style={{ fontWeight: 500 }}>{row.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>Code: {row.code}</div>
                </div>
            ),
        },
        {
            name: 'Location',
            selector: row => row.city,
            width: '180px',
            cell: row => row.city || row.addressLine1 || '-',
        },
        { name: 'Phone', selector: row => row.phone || '-', width: '140px' },
        {
            name: 'Status',
            width: '100px',
            cell: row => (
                <span className={`badge ${row.isActive ? 'badge-success' : 'badge-error'}`}>
                    {row.isActive ? 'Active' : 'Inactive'}
                </span>
            ),
        },
        {
            name: 'Actions',
            width: '140px',
            cell: row => (
                <div className="action-buttons">
                    <button className="action-btn edit" onClick={() => openModal(row)}>Edit</button>
                    <button className="action-btn delete" onClick={() => openDeleteModal(row.id, row.name)}>Delete</button>
                </div>
            ),
        },
    ], []);

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Outlets</h1>
                    <p className="page-subtitle">Manage your store locations</p>
                </div>
                <button className="btn-primary" onClick={() => openModal()}>
                    + Add Outlet
                </button>
            </div>

            <div className="data-table-container">
                <DataTable
                    columns={columns}
                    data={outlets}
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
                            <div className="empty-state-icon">🏪</div>
                            <div className="empty-state-title">No outlets yet</div>
                            <p>Add your first outlet to get started</p>
                        </div>
                    }
                />
            </div>

            <OutletDetailModal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                outlet={selectedOutlet}
            />

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingOutlet ? 'Edit Outlet' : 'New Outlet'}</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', fontSize: '24px', color: 'var(--gray-400)' }}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label className="form-label">Name *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                                            placeholder="Outlet name"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Code *</label>
                                        <input
                                            type="text"
                                            value={formData.code}
                                            onChange={(e) => setFormData(p => ({ ...p, code: e.target.value }))}
                                            placeholder="e.g., OUT001"
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Address</label>
                                    <input
                                        type="text"
                                        value={formData.addressLine1}
                                        onChange={(e) => setFormData(p => ({ ...p, addressLine1: e.target.value }))}
                                        placeholder="Street address"
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label className="form-label">City</label>
                                        <input
                                            type="text"
                                            value={formData.city}
                                            onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))}
                                            placeholder="City"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Phone</label>
                                        <input
                                            type="text"
                                            value={formData.phone}
                                            onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                                            placeholder="Phone"
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData(p => ({ ...p, isActive: e.target.checked }))}
                                            style={{ width: '16px', height: '16px', accentColor: 'var(--primary-500)' }}
                                        />
                                        Active outlet
                                    </label>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, id: null, name: '' })}
                onConfirm={handleDelete}
                title="Delete Outlet"
                message="Are you sure you want to delete"
                itemName={deleteModal.name}
                confirmText="Delete"
                confirmStyle="danger"
                loading={deleting}
            />
        </div>
    );
}

export default OutletsSettingsPage;
