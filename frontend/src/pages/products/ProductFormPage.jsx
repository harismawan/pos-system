import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUiStore } from '../../store/uiStore.js';
import * as productsApi from '../../api/productsApi.js';

const initialFormState = {
    sku: '',
    barcode: '',
    name: '',
    description: '',
    category: '',
    unit: 'pcs',
    basePrice: '',
    costPrice: '',
    taxRate: '',
    isActive: true,
};

function ProductFormPage() {
    const navigate = useNavigate();
    const { id } = useParams();
    const showNotification = useUiStore((state) => state.showNotification);
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState(initialFormState);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (isEditMode) {
            loadProduct();
        }
    }, [id]);

    const loadProduct = async () => {
        try {
            setLoading(true);
            const product = await productsApi.getProductById(id);
            setFormData({
                sku: product.sku || '',
                barcode: product.barcode || '',
                name: product.name || '',
                description: product.description || '',
                category: product.category || '',
                unit: product.unit || 'pcs',
                basePrice: product.basePrice || '',
                costPrice: product.costPrice || '',
                taxRate: product.taxRate || '',
                isActive: product.isActive ?? true,
            });
        } catch (err) {
            showNotification('Failed to load product', 'error');
            navigate('/products');
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.sku.trim()) newErrors.sku = 'SKU is required';
        if (!formData.name.trim()) newErrors.name = 'Product name is required';
        if (!formData.basePrice || parseFloat(formData.basePrice) < 0) {
            newErrors.basePrice = 'Valid base price is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        // Clear error when field is modified
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setSaving(true);
            const payload = {
                ...formData,
                basePrice: parseFloat(formData.basePrice),
                costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
                taxRate: formData.taxRate ? parseFloat(formData.taxRate) : undefined,
            };

            if (isEditMode) {
                await productsApi.updateProduct(id, payload);
                showNotification('Product updated successfully', 'success');
            } else {
                await productsApi.createProduct(payload);
                showNotification('Product created successfully', 'success');
            }
            navigate('/products');
        } catch (err) {
            showNotification(err.message || 'Failed to save product', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="page-container">
                <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                    <p style={{ marginTop: '16px', color: 'var(--gray-500)' }}>Loading product...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container" style={{ maxWidth: '800px' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        {isEditMode ? 'Edit Product' : 'New Product'}
                    </h1>
                    <p className="page-subtitle">
                        {isEditMode ? 'Update product details' : 'Add a new product to your catalog'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Product Information</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="form-group">
                            <label className="form-label">SKU *</label>
                            <input
                                type="text"
                                name="sku"
                                value={formData.sku}
                                onChange={handleChange}
                                placeholder="e.g., PROD-001"
                                style={{ borderColor: errors.sku ? 'var(--error-500)' : undefined }}
                            />
                            {errors.sku && <p className="form-error">{errors.sku}</p>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Barcode</label>
                            <input
                                type="text"
                                name="barcode"
                                value={formData.barcode}
                                onChange={handleChange}
                                placeholder="Enter barcode"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Product Name *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter product name"
                            style={{ borderColor: errors.name ? 'var(--error-500)' : undefined }}
                        />
                        {errors.name && <p className="form-error">{errors.name}</p>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Enter product description"
                            rows={3}
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div className="form-group">
                            <label className="form-label">Category</label>
                            <input
                                type="text"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                placeholder="e.g., Electronics, Food"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Unit</label>
                            <select
                                name="unit"
                                value={formData.unit}
                                onChange={handleChange}
                            >
                                <option value="pcs">Pieces (pcs)</option>
                                <option value="kg">Kilogram (kg)</option>
                                <option value="g">Gram (g)</option>
                                <option value="l">Liter (l)</option>
                                <option value="ml">Milliliter (ml)</option>
                                <option value="box">Box</option>
                                <option value="pack">Pack</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ marginTop: '24px' }}>
                    <div className="card-header">
                        <h2 className="card-title">Pricing</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                        <div className="form-group">
                            <label className="form-label">Base Price (Rp) *</label>
                            <input
                                type="number"
                                name="basePrice"
                                value={formData.basePrice}
                                onChange={handleChange}
                                placeholder="0"
                                min="0"
                                step="0.01"
                                style={{ borderColor: errors.basePrice ? 'var(--error-500)' : undefined }}
                            />
                            {errors.basePrice && <p className="form-error">{errors.basePrice}</p>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Cost Price (Rp)</label>
                            <input
                                type="number"
                                name="costPrice"
                                value={formData.costPrice}
                                onChange={handleChange}
                                placeholder="0"
                                min="0"
                                step="0.01"
                            />
                            <p className="form-helper">Your purchase/production cost</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Tax Rate (%)</label>
                            <input
                                type="number"
                                name="taxRate"
                                value={formData.taxRate}
                                onChange={handleChange}
                                placeholder="0"
                                min="0"
                                max="100"
                                step="0.01"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                name="isActive"
                                checked={formData.isActive}
                                onChange={handleChange}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--primary-500)' }}
                            />
                            <span>
                                <strong>Active Product</strong>
                                <p style={{ fontSize: '13px', color: 'var(--gray-500)', marginTop: '2px' }}>
                                    Inactive products won't appear in POS or sales
                                </p>
                            </span>
                        </label>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                    <button
                        type="button"
                        className="btn-secondary btn-lg"
                        onClick={() => navigate('/products')}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn-primary btn-lg"
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <div className="spinner"></div>
                                Saving...
                            </>
                        ) : (
                            isEditMode ? 'Update Product' : 'Create Product'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ProductFormPage;
