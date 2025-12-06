import React, { useState, useEffect, useMemo } from 'react';
import DataTable from 'react-data-table-component';
import { useUiStore } from '../../store/uiStore.js';
import { useAuthStore } from '../../store/authStore.js';
import * as usersApi from '../../api/usersApi.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useFormValidation, validators } from '../../hooks/useFormValidation.js';
import { usePermissions, PERMISSIONS } from '../../hooks/usePermissions.js';

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

const ROLE_OPTIONS = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'CASHIER', label: 'Cashier' },
    { value: 'WAREHOUSE_STAFF', label: 'Warehouse Staff' },
];

const ROLE_BADGES = {
    OWNER: { label: 'Owner', className: 'badge-primary' },
    ADMIN: { label: 'Admin', className: 'badge-warning' },
    MANAGER: { label: 'Manager', className: 'badge-info' },
    CASHIER: { label: 'Cashier', className: 'badge-success' },
    WAREHOUSE_STAFF: { label: 'Warehouse', className: 'badge-secondary' },
};

function UsersSettingsPage() {
    const showNotification = useUiStore((state) => state.showNotification);
    const currentUser = useAuthStore((state) => state.user);
    const { can } = usePermissions();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalRows, setTotalRows] = useState(0);
    const [perPage, setPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm);
    const [roleFilter, setRoleFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' });
    const [deleting, setDeleting] = useState(false);

    // Form validation
    const userValidationRules = {
        name: [validators.required],
        username: [validators.required, validators.minLength(3)],
        email: [validators.email],
        password: editingUser ? [] : [validators.required, validators.minLength(6)],
        role: [validators.required],
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
    } = useFormValidation({
        name: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        role: 'CASHIER',
        isActive: true,
    }, userValidationRules);

    const getInputClassName = (fieldName) => {
        if (!formTouched[fieldName]) return '';
        return formErrors[fieldName] ? 'input-error' : 'input-valid';
    };

    useEffect(() => {
        loadUsers();
    }, [currentPage, perPage, debouncedSearchTerm, roleFilter]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const params = { page: currentPage, limit: perPage };
            if (debouncedSearchTerm) params.search = debouncedSearchTerm;
            if (roleFilter) params.role = roleFilter;
            const result = await usersApi.getUsers(params);
            setUsers(result.users || []);
            setTotalRows(result.pagination?.total || 0);
        } catch (err) {
            showNotification('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handlePerRowsChange = (newPerPage, page) => {
        setPerPage(newPerPage);
        setCurrentPage(page);
    };

    const openModal = (user = null) => {
        setEditingUser(user);
        resetForm(user ? {
            name: user.name || '',
            username: user.username || '',
            email: user.email || '',
            phone: user.phone || '',
            password: '',
            role: user.role || 'CASHIER',
            isActive: user.isActive ?? true,
        } : { name: '', username: '', email: '', phone: '', password: '', role: 'CASHIER', isActive: true });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            showNotification('Please fix the errors in the form', 'error');
            return;
        }
        try {
            setSaving(true);
            const payload = { ...formData };
            // Remove password if empty on edit
            if (editingUser && !payload.password) {
                delete payload.password;
            }
            // Remove username on edit (can't change)
            if (editingUser) {
                delete payload.username;
            }

            if (editingUser) {
                await usersApi.updateUser(editingUser.id, payload);
                showNotification('User updated', 'success');
            } else {
                await usersApi.createUser(payload);
                showNotification('User created', 'success');
            }
            setShowModal(false);
            loadUsers();
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
            await usersApi.deleteUser(deleteModal.id);
            showNotification('User deactivated', 'success');
            setDeleteModal({ open: false, id: null, name: '' });
            loadUsers();
        } catch (err) {
            showNotification(err.message || 'Failed to delete', 'error');
        } finally {
            setDeleting(false);
        }
    };

    const columns = useMemo(() => [
        {
            name: 'User',
            selector: row => row.name,
            sortable: true,
            cell: row => (
                <div>
                    <div style={{ fontWeight: 500 }}>{row.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>@{row.username}</div>
                </div>
            ),
        },
        { name: 'Email', selector: row => row.email || '-', width: '200px' },
        { name: 'Phone', selector: row => row.phone || '-', width: '140px' },
        {
            name: 'Role',
            width: '130px',
            cell: row => {
                const badge = ROLE_BADGES[row.role] || { label: row.role, className: 'badge-secondary' };
                return <span className={`badge ${badge.className}`}>{badge.label}</span>;
            },
        },
        {
            name: 'Outlets',
            width: '120px',
            cell: row => (
                <span style={{ color: 'var(--gray-500)', fontSize: '13px' }}>
                    {row.outletUsers?.length || 0} outlet{row.outletUsers?.length !== 1 ? 's' : ''}
                </span>
            ),
        },
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
                    {can(PERMISSIONS.USERS_EDIT) && row.id !== currentUser?.id && (
                        <button className="action-btn edit" onClick={() => openModal(row)}>Edit</button>
                    )}
                    {can(PERMISSIONS.USERS_DELETE) && row.id !== currentUser?.id && row.role !== 'OWNER' && (
                        <button className="action-btn delete" onClick={() => openDeleteModal(row.id, row.name)}>Delete</button>
                    )}
                </div>
            ),
        },
    ], [currentUser, can]);

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Users</h1>
                    <p className="page-subtitle">Manage staff accounts and permissions</p>
                </div>
                {can(PERMISSIONS.USERS_CREATE) && (
                    <button className="btn-primary" onClick={() => openModal()}>
                        + Add User
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ flex: 1, minWidth: '200px' }}
                    />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        style={{ width: '160px' }}
                    >
                        <option value="">All Roles</option>
                        <option value="OWNER">Owner</option>
                        {ROLE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="data-table-container">
                <DataTable
                    columns={columns}
                    data={users}
                    progressPending={loading}
                    customStyles={customStyles}
                    highlightOnHover
                    pagination
                    paginationServer
                    paginationTotalRows={totalRows}
                    onChangeRowsPerPage={handlePerRowsChange}
                    onChangePage={handlePageChange}
                    paginationPerPage={perPage}
                    noDataComponent={
                        <div className="empty-state">
                            <div className="empty-state-icon">👥</div>
                            <div className="empty-state-title">No users found</div>
                            <p>Add staff members to manage your business</p>
                        </div>
                    }
                />
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingUser ? 'Edit User' : 'New User'}</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', fontSize: '24px', color: 'var(--gray-400)' }}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Full Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleFormChange}
                                        onBlur={handleFormBlur}
                                        placeholder="Enter full name"
                                        className={getInputClassName('name')}
                                    />
                                    {getFormError('name') && <p className="form-error">{getFormError('name')}</p>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Username *</label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleFormChange}
                                        onBlur={handleFormBlur}
                                        placeholder="Enter username"
                                        disabled={!!editingUser}
                                        className={getInputClassName('username')}
                                        style={editingUser ? { backgroundColor: 'var(--gray-100)' } : {}}
                                    />
                                    {getFormError('username') && <p className="form-error">{getFormError('username')}</p>}
                                    {editingUser && <p className="form-helper">Username cannot be changed</p>}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleFormChange}
                                            onBlur={handleFormBlur}
                                            placeholder="Email address"
                                            className={getInputClassName('email')}
                                        />
                                        {getFormError('email') && <p className="form-error">{getFormError('email')}</p>}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Phone</label>
                                        <input
                                            type="text"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleFormChange}
                                            placeholder="Phone number"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">{editingUser ? 'New Password' : 'Password *'}</label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleFormChange}
                                        onBlur={handleFormBlur}
                                        placeholder={editingUser ? 'Leave blank to keep current' : 'Enter password'}
                                        className={getInputClassName('password')}
                                    />
                                    {getFormError('password') && <p className="form-error">{getFormError('password')}</p>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Role *</label>
                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleFormChange}
                                        className={getInputClassName('role')}
                                    >
                                        {ROLE_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {editingUser && (
                                    <div className="form-group">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                name="isActive"
                                                checked={formData.isActive}
                                                onChange={handleFormChange}
                                                style={{ width: '16px', height: '16px', accentColor: 'var(--primary-500)' }}
                                            />
                                            Active user
                                        </label>
                                    </div>
                                )}
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
                title="Deactivate User"
                message="Are you sure you want to deactivate"
                itemName={deleteModal.name}
                confirmText="Deactivate"
                confirmStyle="danger"
                loading={deleting}
            />
        </div>
    );
}

export default UsersSettingsPage;
