import React, { useState, useEffect } from 'react';
import DataTable from 'react-data-table-component';
import { format } from 'date-fns';
import * as inventoryApi from '../../api/inventoryApi.js';

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

function InventoryDetailModal({ isOpen, onClose, inventoryItem }) {
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && inventoryItem) {
            loadMovements();
        }
    }, [isOpen, inventoryItem]);

    const loadMovements = async () => {
        try {
            setLoading(true);
            const result = await inventoryApi.getStockMovements({
                productId: inventoryItem.product.id,
                warehouseId: inventoryItem.warehouse.id,
                limit: 20, // Last 20 movements
            });
            setMovements(result.movements || []);
        } catch (err) {
            console.error('Failed to load movements', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !inventoryItem) return null;

    const columns = [
        {
            name: 'Date',
            selector: row => row.createdAt,
            format: row => format(new Date(row.createdAt), 'MMM d, yyyy HH:mm'),
            width: '150px',
        },
        {
            name: 'Type',
            selector: row => row.type,
            cell: row => {
                let color = 'var(--gray-600)';
                let bg = 'var(--gray-100)';
                let label = row.type;

                switch (row.type) {
                    case 'PURCHASE':
                    case 'ADJUSTMENT_IN':
                        color = 'var(--success-700)';
                        bg = 'var(--success-50)';
                        label = row.type === 'PURCHASE' ? 'Purchase' : 'Adjustment In';
                        break;
                    case 'SALE':
                    case 'ADJUSTMENT_OUT':
                        color = 'var(--error-700)';
                        bg = 'var(--error-50)';
                        label = row.type === 'SALE' ? 'Sale' : 'Adjustment Out';
                        break;
                    case 'TRANSFER':
                        color = 'var(--primary-700)';
                        bg = 'var(--primary-50)';
                        label = 'Transfer';
                        break;
                }

                return (
                    <span style={{
                        backgroundColor: bg,
                        color: color,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600
                    }}>
                        {label}
                    </span>
                );
            }
        },
        {
            name: 'Qty',
            selector: row => row.quantity,
            width: '100px',
            cell: row => {
                const isPositive = ['PURCHASE', 'ADJUSTMENT_IN'].includes(row.type) ||
                    (row.type === 'TRANSFER' && row.toWarehouseId === inventoryItem.warehouse.id);
                return (
                    <span style={{
                        color: isPositive ? 'var(--success-600)' : 'var(--error-600)',
                        fontWeight: 600
                    }}>
                        {isPositive ? '+' : ''}{parseFloat(row.quantity)}
                    </span>
                );
            }
        },
        {
            name: 'Notes',
            selector: row => row.notes,
            wrap: true,
            cell: row => row.notes || <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>-</span>
        },
        {
            name: 'By',
            selector: row => row.createdBy?.name,
            width: '120px',
        }
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">{inventoryItem.product?.name}</h2>
                        <div style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '4px' }}>
                            SKU: {inventoryItem.product?.sku} • {inventoryItem.warehouse?.name}
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
                    {/* Product Details
                    <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: 'var(--gray-700)' }}>Product Details</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '16px',
                        marginBottom: '24px',
                        paddingBottom: '20px',
                        borderBottom: '1px solid var(--gray-200)'
                    }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '4px' }}>Category</div>
                            <div style={{ fontSize: '14px', color: 'var(--gray-800)' }}>{inventoryItem.product?.category || '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '4px' }}>Base Price</div>
                            <div style={{ fontSize: '14px', color: 'var(--gray-800)' }}>
                                Rp {(inventoryItem.product?.basePrice || 0).toLocaleString('id-ID')}
                            </div>
                        </div>
                         <div>
                            <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '4px' }}>Cost Price</div>
                            <div style={{ fontSize: '14px', color: 'var(--gray-800)' }}>
                                Rp {(inventoryItem.product?.costPrice || 0).toLocaleString('id-ID')}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '4px' }}>Barcode</div>
                            <div style={{ fontSize: '14px', color: 'var(--gray-800)' }}>{inventoryItem.product?.barcode || '-'}</div>
                        </div>
                        {inventoryItem.product?.description && (
                            <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '4px' }}>Description</div>
                                <div style={{ fontSize: '14px', color: 'var(--gray-700)', lineHeight: '1.4' }}>{inventoryItem.product?.description}</div>
                            </div>
                        )}
                    </div> */}

                    {/* Stats */}
                    <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px', color: 'var(--gray-700)' }}>Inventory Stats</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '16px',
                        marginBottom: '24px',
                        backgroundColor: 'var(--gray-50)',
                        padding: '16px',
                        borderRadius: 'var(--radius-lg)'
                    }}>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Current Stock</div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--gray-900)' }}>
                                {parseFloat(inventoryItem.quantityOnHand)} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--gray-500)' }}>{inventoryItem.product?.unit}</span>
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Reorder Point</div>
                            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--gray-700)' }}>
                                {parseFloat(inventoryItem.minimumStock)}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--gray-500)', textTransform: 'uppercase' }}>Value</div>
                            <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--gray-700)' }}>
                                Rp {(parseFloat(inventoryItem.quantityOnHand) * parseFloat(inventoryItem.product?.costPrice || 0)).toLocaleString('id-ID')}
                            </div>
                        </div>
                    </div>

                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--gray-800)' }}>Recent Movements</h3>

                    <div className="data-table-container" style={{ boxShadow: 'none', border: '1px solid var(--gray-200)' }}>
                        <DataTable
                            columns={columns}
                            data={movements}
                            progressPending={loading}
                            customStyles={customStyles}
                            pagination
                            paginationPerPage={5}
                            paginationRowsPerPageOptions={[5, 10, 20]}
                            noDataComponent={<div className="p-4 text-center text-gray-500">No movement history found</div>}
                        />
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

export default InventoryDetailModal;
