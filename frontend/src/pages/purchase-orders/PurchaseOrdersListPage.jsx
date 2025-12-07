import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from 'react-data-table-component';
import { useUiStore } from '../../store/uiStore.js';
import * as purchaseOrdersApi from '../../api/purchaseOrdersApi.js';
import { formatDateOnly } from '../../utils/dateUtils.js';

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
            paddingLeft: '16px',
            paddingRight: '16px',
        },
    },
    rows: {
        style: {
            minHeight: '60px',
            fontSize: '14px',
            '&:hover': {
                backgroundColor: 'var(--gray-50)',
            },
        },
    },
    cells: {
        style: {
            paddingLeft: '16px',
            paddingRight: '16px',
        },
    },
};

const statusBadgeMap = {
    DRAFT: 'badge-neutral',
    SUBMITTED: 'badge-info',
    APPROVED: 'badge-warning',
    PARTIALLY_RECEIVED: 'badge-warning',
    RECEIVED: 'badge-success',
    CANCELLED: 'badge-error',
};

function PurchaseOrdersListPage() {
    const navigate = useNavigate();
    const showNotification = useUiStore((state) => state.showNotification);

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalRows, setTotalRows] = useState(0);
    const [perPage, setPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => {
        loadOrders();
    }, [currentPage, perPage, filterStatus]);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const params = {
                page: currentPage,
                limit: perPage,
            };
            if (filterStatus) params.status = filterStatus;

            const result = await purchaseOrdersApi.getPurchaseOrders(params);
            setOrders(result.purchaseOrders || []);
            setTotalRows(result.pagination?.total || 0);
        } catch (err) {
            showNotification('Failed to load purchase orders', 'error');
        } finally {
            setLoading(false);
        }
    };

    const columns = useMemo(() => [
        {
            name: 'PO Number',
            selector: row => row.poNumber,
            sortable: true,
            width: '150px',
            cell: row => (
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary-600)' }}>
                    {row.poNumber}
                </span>
            ),
        },
        {
            name: 'Supplier',
            selector: row => row.supplier?.name,
            sortable: true,
            cell: row => (
                <div>
                    <div style={{ fontWeight: 500 }}>{row.supplier?.name || 'Unknown'}</div>
                    {row.supplier?.contactName && (
                        <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                            {row.supplier.contactName}
                        </div>
                    )}
                </div>
            ),
        },
        {
            name: 'Date',
            selector: row => row.orderDate,
            sortable: true,
            width: '120px',
            cell: row => formatDateOnly(row.orderDate),
        },
        {
            name: 'Total',
            selector: row => row.totalAmount,
            sortable: true,
            width: '140px',
            cell: row => (
                <span style={{ fontWeight: 600 }}>
                    Rp {parseFloat(row.totalAmount || 0).toLocaleString('id-ID')}
                </span>
            ),
        },
        {
            name: 'Status',
            selector: row => row.status,
            sortable: true,
            width: '140px',
            cell: row => (
                <span className={`badge ${statusBadgeMap[row.status] || 'badge-neutral'}`}>
                    {row.status?.replace('_', ' ')}
                </span>
            ),
        },
        {
            name: 'Actions',
            width: '150px',
            cell: row => (
                <div className="action-buttons">
                    <button
                        className="action-btn view"
                        onClick={() => navigate(`/purchase-orders/${row.id}`)}
                    >
                        View
                    </button>
                    {row.status === 'DRAFT' && (
                        <button
                            className="action-btn edit"
                            onClick={() => navigate(`/purchase-orders/${row.id}/edit`)}
                        >
                            Edit
                        </button>
                    )}
                </div>
            ),
        },
    ], [navigate]);

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Purchase Orders</h1>
                    <p className="page-subtitle">Manage your procurement</p>
                </div>
                <button className="btn-primary btn-lg" onClick={() => navigate('/purchase-orders/new')}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create PO
                </button>
            </div>

            <div className="filter-bar">
                <select
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                    style={{ width: '180px' }}
                >
                    <option value="">All Status</option>
                    <option value="DRAFT">Draft</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PARTIALLY_RECEIVED">Partially Received</option>
                    <option value="RECEIVED">Received</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
            </div>

            <div className="data-table-container">
                <DataTable
                    columns={columns}
                    data={orders}
                    progressPending={loading}
                    pagination
                    paginationServer
                    paginationTotalRows={totalRows}
                    onChangeRowsPerPage={(newPerPage, page) => { setPerPage(newPerPage); setCurrentPage(page); }}
                    onChangePage={setCurrentPage}
                    customStyles={customStyles}
                    highlightOnHover
                    pointerOnHover
                    onRowClicked={(row) => navigate(`/purchase-orders/${row.id}`)}
                    noDataComponent={
                        <div className="empty-state">
                            <div className="empty-state-icon">📋</div>
                            <div className="empty-state-title">No purchase orders</div>
                            <p>Create your first purchase order to restock inventory</p>
                        </div>
                    }
                />
            </div>
        </div>
    );
}

export default PurchaseOrdersListPage;
