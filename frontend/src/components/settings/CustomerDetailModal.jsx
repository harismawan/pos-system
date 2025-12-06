import React, { useState, useEffect } from 'react';
import DataTable from 'react-data-table-component';
import { format } from 'date-fns';
import * as customersApi from '../../api/customersApi.js';

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

function CustomerDetailModal({ isOpen, onClose, customer: initialCustomer }) {
    const [customer, setCustomer] = useState(initialCustomer);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && initialCustomer) {
            setCustomer(initialCustomer);
            loadDetails();
        }
    }, [isOpen, initialCustomer]);

    const loadDetails = async () => {
        try {
            setLoading(true);
            const data = await customersApi.getCustomerById(initialCustomer.id);
            setCustomer(data);
        } catch (err) {
            console.error('Failed to load customer details', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !customer) return null;

    const orderColumns = [
        {
            name: 'Order ID',
            selector: row => row.id,
            sortable: true,
            format: row => `#${row.id.slice(0, 8)}`,
            width: '120px'
        },
        {
            name: 'Date',
            selector: row => row.createdAt,
            format: row => format(new Date(row.createdAt), 'MMM d, yyyy HH:mm'),
            width: '160px'
        },
        {
            name: 'Total',
            selector: row => row.totalAmount,
            format: row => `Rp ${parseFloat(row.totalAmount).toLocaleString('id-ID')}`
        },
        {
            name: 'Status',
            selector: row => row.status,
            width: '120px',
            cell: row => {
                let color = 'gray';
                if (row.status === 'COMPLETED') color = 'success';
                else if (row.status === 'PENDING') color = 'warning';
                else if (row.status === 'CANCELLED') color = 'error';
                return <span className={`badge badge-${color}`}>{row.status}</span>;
            }
        }
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">{customer.name}</h2>
                        <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '4px' }}>
                            {customer.code ? `#${customer.code}` : 'No Code'} • {customer.phone || 'No Phone'}
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
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '16px',
                        backgroundColor: 'var(--gray-50)',
                        padding: '16px',
                        borderRadius: 'var(--radius-lg)',
                        marginBottom: '24px'
                    }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Email</div>
                            <div style={{ fontWeight: 500 }}>{customer.email || '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Price Tier</div>
                            <div style={{ fontWeight: 500 }}>
                                {customer.priceTier ? (
                                    <span className="badge badge-info">{customer.priceTier.name}</span>
                                ) : '-'}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Membership</div>
                            <div style={{ fontWeight: 500 }}>
                                {customer.isMember ? (
                                    <span className="badge badge-primary">Member</span>
                                ) : 'Regular'}
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: 'var(--gray-700)' }}>Recent Orders</h3>
                        <div className="data-table-container" style={{ boxShadow: 'none', border: '1px solid var(--gray-200)' }}>
                            <DataTable
                                columns={orderColumns}
                                data={customer.posOrders || []}
                                progressPending={loading}
                                customStyles={customStyles}
                                dense
                                noDataComponent={<div className="p-4 text-center text-gray-500">No recent orders</div>}
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

export default CustomerDetailModal;
