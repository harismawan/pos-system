import React, { useState, useEffect } from 'react';
import DataTable from 'react-data-table-component';
import { format } from 'date-fns';
import * as suppliersApi from '../../api/suppliersApi.js';

const customStyles = {
    headRow: {
        style: {
            backgroundColor: 'var(--gray-50)',
            borderBottom: '1px solid var(--gray-200)',
            minHeight: '40px',
        },
    },
    headCells: {
        style: {
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--gray-600)',
            textTransform: 'uppercase',
            paddingLeft: '12px',
            paddingRight: '12px',
        },
    },
    rows: {
        style: {
            minHeight: '48px',
            fontSize: '13px',
        },
    },
    cells: {
        style: {
            paddingLeft: '12px',
            paddingRight: '12px',
        },
    },
};

function SupplierDetailModal({ isOpen, onClose, supplier: initialSupplier }) {
    const [supplier, setSupplier] = useState(initialSupplier);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && initialSupplier) {
            setSupplier(initialSupplier);
            loadDetails();
        }
    }, [isOpen, initialSupplier]);

    const loadDetails = async () => {
        try {
            setLoading(true);
            const data = await suppliersApi.getSupplierById(initialSupplier.id);
            setSupplier(data);
        } catch (err) {
            console.error('Failed to load supplier details', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !supplier) return null;

    const poColumns = [
        {
            name: 'PO Number',
            selector: row => row.poNumber,
            sortable: true,
            cell: row => <span style={{ fontWeight: 500 }}>{row.poNumber}</span>
        },
        {
            name: 'Date',
            selector: row => row.createdAt,
            format: row => format(new Date(row.createdAt), 'MMM d, yyyy')
        },
        { name: 'Warehouse', selector: row => row.warehouse.name },
        {
            name: 'Total',
            selector: row => row.totalAmount,
            format: row => `Rp ${parseFloat(row.totalAmount).toLocaleString('id-ID')}`
        },
        {
            name: 'Status',
            selector: row => row.status,
            cell: row => {
                let color = 'gray';
                if (row.status === 'RECEIVED') color = 'success';
                else if (row.status === 'ORDERED') color = 'primary';
                else if (row.status === 'CANCELLED') color = 'error';
                return <span className={`badge badge-${color}`}>{row.status}</span>;
            }
        }
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: '900px' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">{supplier.name}</h2>
                        <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '4px' }}>
                            Code: {supplier.code || '-'} • {supplier.contactName}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            fontSize: '24px',
                            color: 'var(--gray-400)',
                            padding: 0,
                            lineHeight: 1,
                        }}
                    >
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '16px',
                        backgroundColor: 'var(--gray-50)',
                        padding: '16px',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: '24px'
                    }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Email</div>
                            <div style={{ fontWeight: 500 }}>{supplier.email || '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Phone</div>
                            <div style={{ fontWeight: 500 }}>{supplier.phone || '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Address</div>
                            <div style={{ fontWeight: 500 }}>{supplier.addressLine1 || '-'} {supplier.city ? `, ${supplier.city}` : ''}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Status</div>
                            <div style={{ fontWeight: 500 }}>
                                <span className={`badge ${supplier.isActive ? 'badge-success' : 'badge-error'}`}>
                                    {supplier.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: 'var(--gray-700)' }}>Recent Purchase Orders</h3>
                        <div className="data-table-container" style={{ boxShadow: 'none', border: '1px solid var(--gray-200)' }}>
                            <DataTable
                                columns={poColumns}
                                data={supplier.purchaseOrders || []}
                                progressPending={loading}
                                customStyles={customStyles}
                                dense
                                noDataComponent={<div className="p-4 text-center text-gray-500">No purchase orders found</div>}
                                pagination
                                paginationPerPage={5}
                            />
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

export default SupplierDetailModal;
