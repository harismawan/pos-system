import React, { useState, useEffect } from 'react';
import { useUiStore } from '../../store/uiStore.js';
import { useOutletStore } from '../../store/outletStore.js';
import * as inventoryApi from '../../api/inventoryApi.js';
import * as warehousesApi from '../../api/warehousesApi.js';
import * as productsApi from '../../api/productsApi.js';

function InventoryTransferModal({ isOpen, onClose, onSuccess, preselectedProductId, preselectedWarehouseId }) {
    const showNotification = useUiStore((state) => state.showNotification);
    const activeOutlet = useOutletStore((state) => state.activeOutlet);

    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        productId: '',
        fromWarehouseId: '',
        toWarehouseId: '',
        quantity: '',
        notes: '',
    });

    useEffect(() => {
        if (isOpen) {
            loadData();
            // Reset form when opening
            setFormData({
                productId: preselectedProductId || '',
                fromWarehouseId: preselectedWarehouseId || '',
                toWarehouseId: '',
                quantity: '',
                notes: '',
            });
            setErrors({});
        }
    }, [isOpen, activeOutlet, preselectedProductId, preselectedWarehouseId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [warehouseResult, productResult] = await Promise.all([
                warehousesApi.getWarehouses({ outletId: activeOutlet?.id, limit: 100 }),
                productsApi.getProducts({ isActive: 'true', limit: 100 }),
            ]);
            setWarehouses(warehouseResult.warehouses || []);
            setProducts(productResult.products || []);
        } catch (err) {
            showNotification('Failed to load data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.productId) newErrors.productId = 'Please select a product';
        if (!formData.fromWarehouseId) newErrors.fromWarehouseId = 'Please select source warehouse';
        if (!formData.toWarehouseId) newErrors.toWarehouseId = 'Please select destination warehouse';
        if (formData.fromWarehouseId === formData.toWarehouseId) {
            newErrors.toWarehouseId = 'Destination must be different from source';
        }
        if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
            newErrors.quantity = 'Please enter a valid quantity';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setSaving(true);
            await inventoryApi.transferInventory({
                ...formData,
                quantity: parseFloat(formData.quantity),
            });
            showNotification('Stock transferred successfully', 'success');
            onSuccess?.();
            onClose();
        } catch (err) {
            showNotification(err.message || 'Transfer failed', 'error');
        } finally {
            setSaving(false);
        }
    };

    const selectedProduct = products.find(p => p.id === formData.productId);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Transfer Stock</h2>
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

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <div className="spinner" style={{ margin: '0 auto' }}></div>
                                <p style={{ marginTop: '16px', color: 'var(--gray-500)' }}>Loading data...</p>
                            </div>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Product *</label>
                                    <select
                                        name="productId"
                                        value={formData.productId}
                                        onChange={handleChange}
                                        disabled={!!preselectedProductId}
                                        style={{
                                            borderColor: errors.productId ? 'var(--error-500)' : undefined,
                                            backgroundColor: preselectedProductId ? 'var(--gray-100)' : 'white'
                                        }}
                                    >
                                        <option value="">Select a product</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                                        ))}
                                    </select>
                                    {errors.productId && <p className="form-error">{errors.productId}</p>}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'end' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">From Warehouse *</label>
                                        <select
                                            name="fromWarehouseId"
                                            value={formData.fromWarehouseId}
                                            onChange={handleChange}
                                            disabled={!!preselectedWarehouseId}
                                            style={{
                                                borderColor: errors.fromWarehouseId ? 'var(--error-500)' : undefined,
                                                backgroundColor: preselectedWarehouseId ? 'var(--gray-100)' : 'white'
                                            }}
                                        >
                                            <option value="">Select source</option>
                                            {warehouses.map(w => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))}
                                        </select>
                                        {errors.fromWarehouseId && <p className="form-error">{errors.fromWarehouseId}</p>}
                                    </div>

                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: 'var(--primary-100)',
                                        borderRadius: '50%',
                                        color: 'var(--primary-600)',
                                        marginBottom: '4px'
                                    }}>
                                        →
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">To Warehouse *</label>
                                        <select
                                            name="toWarehouseId"
                                            value={formData.toWarehouseId}
                                            onChange={handleChange}
                                            style={{ borderColor: errors.toWarehouseId ? 'var(--error-500)' : undefined }}
                                        >
                                            <option value="">Select destination</option>
                                            {warehouses.filter(w => w.id !== formData.fromWarehouseId).map(w => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))}
                                        </select>
                                        {errors.toWarehouseId && <p className="form-error">{errors.toWarehouseId}</p>}
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginTop: '20px' }}>
                                    <label className="form-label">
                                        Quantity * {selectedProduct && <span style={{ fontWeight: 'normal', color: 'var(--gray-500)' }}>({selectedProduct.unit})</span>}
                                    </label>
                                    <input
                                        type="number"
                                        name="quantity"
                                        value={formData.quantity}
                                        onChange={handleChange}
                                        placeholder="Enter quantity to transfer"
                                        min="0.01"
                                        step="0.01"
                                        style={{
                                            borderColor: errors.quantity ? 'var(--error-500)' : undefined,
                                            maxWidth: '200px'
                                        }}
                                    />
                                    {errors.quantity && <p className="form-error">{errors.quantity}</p>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Notes</label>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        placeholder="Optional notes for this transfer"
                                        rows={2}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={saving || loading}
                            style={{ minWidth: '120px' }}
                        >
                            {saving ? (
                                <>
                                    <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                                    Transferring...
                                </>
                            ) : 'Transfer Stock'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default InventoryTransferModal;
