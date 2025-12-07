import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUiStore } from '../../store/uiStore.js';
import * as purchaseOrdersApi from '../../api/purchaseOrdersApi.js';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import { formatDateOnly } from '../../utils/dateUtils.js';

const statusBadgeMap = {
    DRAFT: 'badge-neutral',
    SUBMITTED: 'badge-info',
    APPROVED: 'badge-warning',
    PARTIALLY_RECEIVED: 'badge-warning',
    RECEIVED: 'badge-success',
    CANCELLED: 'badge-error',
};

function PurchaseOrderDetailPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const showNotification = useUiStore((state) => state.showNotification);

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [receiving, setReceiving] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [receiveQuantities, setReceiveQuantities] = useState({});
    const [showCancelModal, setShowCancelModal] = useState(false);

    useEffect(() => {
        loadOrder();
    }, [id]);

    const loadOrder = async () => {
        try {
            setLoading(true);
            const result = await purchaseOrdersApi.getPurchaseOrderById(id);
            setOrder(result);
            // Initialize receive quantities
            const quantities = {};
            result.items?.forEach(item => {
                quantities[item.id] = 0;
            });
            setReceiveQuantities(quantities);
        } catch (err) {
            showNotification('Failed to load purchase order', 'error');
            navigate('/purchase-orders');
        } finally {
            setLoading(false);
        }
    };

    const handleReceive = async () => {
        const itemsToReceive = Object.entries(receiveQuantities)
            .filter(([_, qty]) => qty > 0)
            .map(([itemId, quantity]) => ({ itemId, quantity }));

        if (itemsToReceive.length === 0) {
            showNotification('Please enter quantities to receive', 'warning');
            return;
        }

        try {
            setReceiving(true);
            await purchaseOrdersApi.receivePurchaseOrder(id, itemsToReceive);
            showNotification('Items received successfully', 'success');
            loadOrder();
        } catch (err) {
            showNotification(err.message || 'Failed to receive items', 'error');
        } finally {
            setReceiving(false);
        }
    };

    const handleCancel = async () => {
        try {
            setCancelling(true);
            await purchaseOrdersApi.cancelPurchaseOrder(id);
            showNotification('Purchase order cancelled', 'success');
            setShowCancelModal(false);
            loadOrder();
        } catch (err) {
            showNotification(err.message || 'Failed to cancel', 'error');
        } finally {
            setCancelling(false);
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                    <p style={{ marginTop: '16px', color: 'var(--gray-500)' }}>Loading...</p>
                </div>
            </div>
        );
    }

    if (!order) return null;

    const canReceive = ['APPROVED', 'PARTIALLY_RECEIVED'].includes(order.status);
    const canCancel = ['DRAFT', 'SUBMITTED'].includes(order.status);

    return (
        <div className="page-container" style={{ maxWidth: '1000px' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {order.poNumber}
                        <span className={`badge ${statusBadgeMap[order.status]}`}>
                            {order.status?.replace('_', ' ')}
                        </span>
                    </h1>
                    <p className="page-subtitle">Created on {formatDateOnly(order.createdAt)}</p>
                </div>
                <div className="flex gap-3">
                    {canCancel && (
                        <button className="btn-danger" onClick={() => setShowCancelModal(true)} disabled={cancelling}>
                            {cancelling ? 'Cancelling...' : 'Cancel PO'}
                        </button>
                    )}
                    <button className="btn-secondary" onClick={() => navigate('/purchase-orders')}>
                        Back to List
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                <div>
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Order Items</h2>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--gray-200)' }}>
                                    <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '13px', color: 'var(--gray-600)' }}>Product</th>
                                    <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '13px', color: 'var(--gray-600)' }}>Qty Ordered</th>
                                    <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '13px', color: 'var(--gray-600)' }}>Qty Received</th>
                                    <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '13px', color: 'var(--gray-600)' }}>Unit Cost</th>
                                    <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '13px', color: 'var(--gray-600)' }}>Subtotal</th>
                                    {canReceive && (
                                        <th style={{ textAlign: 'right', padding: '12px 0', fontSize: '13px', color: 'var(--gray-600)' }}>Receive</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {order.items?.map(item => {
                                    const remaining = item.quantity - (item.receivedQuantity || 0);
                                    return (
                                        <tr key={item.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                                            <td style={{ padding: '16px 0' }}>
                                                <div style={{ fontWeight: 500 }}>{item.product?.name}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                                                    SKU: {item.product?.sku}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right', padding: '16px 0' }}>{item.quantity}</td>
                                            <td style={{ textAlign: 'right', padding: '16px 0' }}>
                                                <span style={{
                                                    color: item.receivedQuantity >= item.quantity ? 'var(--success-500)' : 'var(--gray-600)'
                                                }}>
                                                    {item.receivedQuantity || 0}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right', padding: '16px 0' }}>
                                                Rp {parseFloat(item.unitCost || 0).toLocaleString('id-ID')}
                                            </td>
                                            <td style={{ textAlign: 'right', padding: '16px 0', fontWeight: 500 }}>
                                                Rp {(item.quantity * (item.unitCost || 0)).toLocaleString('id-ID')}
                                            </td>
                                            {canReceive && (
                                                <td style={{ textAlign: 'right', padding: '16px 0' }}>
                                                    {remaining > 0 ? (
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={remaining}
                                                            value={receiveQuantities[item.id] || ''}
                                                            onChange={(e) => setReceiveQuantities(prev => ({
                                                                ...prev,
                                                                [item.id]: Math.min(remaining, parseInt(e.target.value) || 0)
                                                            }))}
                                                            style={{ width: '80px', textAlign: 'right' }}
                                                            placeholder="0"
                                                        />
                                                    ) : (
                                                        <span className="badge badge-success">Complete</span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {canReceive && (
                            <div style={{ marginTop: '24px', textAlign: 'right' }}>
                                <button className="btn-success btn-lg" onClick={handleReceive} disabled={receiving}>
                                    {receiving ? 'Processing...' : 'Receive Items'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">Supplier</h2>
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <strong>{order.supplier?.name}</strong>
                        </div>
                        {order.supplier?.contactName && (
                            <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '4px' }}>
                                {order.supplier.contactName}
                            </div>
                        )}
                        {order.supplier?.email && (
                            <div style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '4px' }}>
                                {order.supplier.email}
                            </div>
                        )}
                        {order.supplier?.phone && (
                            <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                                {order.supplier.phone}
                            </div>
                        )}
                    </div>

                    <div className="card" style={{ marginTop: '16px' }}>
                        <div className="card-header">
                            <h2 className="card-title">Summary</h2>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ color: 'var(--gray-600)' }}>Subtotal</span>
                            <span>Rp {parseFloat(order.subtotal || 0).toLocaleString('id-ID')}</span>
                        </div>
                        {order.taxAmount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ color: 'var(--gray-600)' }}>Tax</span>
                                <span>Rp {parseFloat(order.taxAmount || 0).toLocaleString('id-ID')}</span>
                            </div>
                        )}
                        {order.shippingCost > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ color: 'var(--gray-600)' }}>Shipping</span>
                                <span>Rp {parseFloat(order.shippingCost || 0).toLocaleString('id-ID')}</span>
                            </div>
                        )}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            paddingTop: '12px',
                            borderTop: '2px solid var(--gray-200)',
                            fontSize: '18px',
                            fontWeight: 600
                        }}>
                            <span>Total</span>
                            <span style={{ color: 'var(--primary-600)' }}>
                                Rp {parseFloat(order.totalAmount || 0).toLocaleString('id-ID')}
                            </span>
                        </div>
                    </div>

                    {order.notes && (
                        <div className="card" style={{ marginTop: '16px' }}>
                            <div className="card-header">
                                <h2 className="card-title">Notes</h2>
                            </div>
                            <p style={{ color: 'var(--gray-600)', lineHeight: '1.6' }}>{order.notes}</p>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={handleCancel}
                title="Cancel Purchase Order"
                message="Are you sure you want to cancel this purchase order? This action cannot be undone."
                confirmText="Cancel PO"
                confirmStyle="danger"
                loading={cancelling}
            />
        </div>
    );
}

export default PurchaseOrderDetailPage;
