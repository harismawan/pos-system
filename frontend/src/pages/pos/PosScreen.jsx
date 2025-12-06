import React, { useState, useEffect } from 'react';
import { usePosStore } from '../../store/posStore.js';
import { useOutletStore } from '../../store/outletStore.js';
import { useUiStore } from '../../store/uiStore.js';
import * as productsApi from '../../api/productsApi.js';
import * as posApi from '../../api/posApi.js';

function PosScreen() {
    const activeOutlet = useOutletStore((state) => state.activeOutlet);
    const showNotification = useUiStore((state) => state.showNotification);

    const {
        orderItems,
        customer,
        addItem,
        removeItem,
        updateItemQuantity,
        clearOrder,
        getTotals,
    } = usePosStore();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('CASH');

    useEffect(() => {
        if (activeOutlet) {
            loadProducts();
        }
    }, [activeOutlet]);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const data = await productsApi.getProducts({
                outletId: activeOutlet?.id,
                isActive: true,
                limit: 20,
            });
            setProducts(data.products || []);
        } catch (err) {
            showNotification('Failed to load products', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddProduct = (product) => {
        addItem(product, 1);
        showNotification(`Added ${product.name} to cart`, 'success');
    };

    const handleCheckout = async () => {
        if (orderItems.length === 0) {
            showNotification('Cart is empty', 'error');
            return;
        }

        if (!activeOutlet) {
            showNotification('Please select an outlet', 'error');
            return;
        }

        try {
            setLoading(true);

            // Create order
            const orderData = {
                outletId: activeOutlet.id,
                warehouseId: activeOutlet.defaultWarehouseId || activeOutlet.id, // Simplified
                customerId: customer?.id || null,
                items: orderItems.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    discountAmount: item.discountAmount || 0,
                })),
            };

            const order = await posApi.createPosOrder(orderData);

            // Add payment
            const totals = getTotals();
            await posApi.addPayment(order.id, {
                method: paymentMethod,
                amount: totals.total,
            });

            // Complete order
            await posApi.completePosOrder(order.id);

            showNotification(`Order ${order.orderNumber} completed!`, 'success');
            clearOrder();
        } catch (err) {
            showNotification(err.message || 'Checkout failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const totals = getTotals();

    if (!activeOutlet) {
        return (
            <div>
                <h1>POS</h1>
                <p style={{ marginTop: '20px', color: '#888' }}>
                    Please select an outlet from the dropdown in the header to use the POS.
                </p>
            </div>
        );
    }

    return (
        <div>
            <h1 style={{ marginBottom: '20px' }}>Point of Sale</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                {/* Products grid */}
                <div>
                    <h2 style={{ marginBottom: '15px' }}>Products</h2>
                    {loading ? (
                        <p>Loading products...</p>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                            gap: '15px',
                        }}>
                            {products.map((product) => (
                                <div
                                    key={product.id}
                                    onClick={() => handleAddProduct(product)}
                                    style={{
                                        backgroundColor: 'white',
                                        padding: '15px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        transition: 'transform 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <h3 style={{ fontSize: '14px', marginBottom: '8px' }}>{product.name}</h3>
                                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#3498db' }}>
                                        Rp {parseFloat(product.basePrice).toLocaleString()}
                                    </p>
                                    <p style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                                        SKU: {product.sku}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Cart */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    height: 'fit-content',
                }}>
                    <h2 style={{ marginBottom: '15px' }}>Cart</h2>

                    {orderItems.length === 0 ? (
                        <p style={{ color: '#888', textAlign: 'center', padding: '40px 0' }}>
                            Cart is empty
                        </p>
                    ) : (
                        <>
                            <div style={{ marginBottom: '20px' }}>
                                {orderItems.map((item) => (
                                    <div key={item.productId} style={{
                                        marginBottom: '15px',
                                        paddingBottom: '15px',
                                        borderBottom: '1px solid #eee',
                                    }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                                            {item.product.name}
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginTop: '8px',
                                        }}>
                                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                                <button
                                                    onClick={() => updateItemQuantity(item.productId, Math.max(1, item.quantity - 1))}
                                                    style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        backgroundColor: '#ecf0f1',
                                                        borderRadius: '4px',
                                                    }}
                                                >
                                                    -
                                                </button>
                                                <span style={{ width: '30px', textAlign: 'center' }}>
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                                                    style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        backgroundColor: '#ecf0f1',
                                                        borderRadius: '4px',
                                                    }}
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <div>
                                                Rp {(item.unitPrice * item.quantity).toLocaleString()}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeItem(item.productId)}
                                            style={{
                                                marginTop: '8px',
                                                fontSize: '12px',
                                                color: '#e74c3c',
                                                background: 'none',
                                                textDecoration: 'underline',
                                            }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div style={{
                                borderTop: '2px solid #ddd',
                                paddingTop: '15px',
                                marginBottom: '15px',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span>Subtotal:</span>
                                    <span>Rp {totals.subtotal.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span>Tax:</span>
                                    <span>Rp {totals.tax.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span>Discount:</span>
                                    <span>Rp {totals.discount.toLocaleString()}</span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '20px',
                                    fontWeight: 'bold',
                                    marginTop: '10px',
                                }}>
                                    <span>Total:</span>
                                    <span>Rp {totals.total.toLocaleString()}</span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                                    Payment Method
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '4px',
                                        border: '1px solid #ddd',
                                    }}
                                >
                                    <option value="CASH">Cash</option>
                                    <option value="CARD">Card</option>
                                    <option value="E_WALLET">E-Wallet</option>
                                    <option value="BANK_TRANSFER">Bank Transfer</option>
                                </select>
                            </div>

                            <button
                                onClick={handleCheckout}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    padding: '15px',
                                    backgroundColor: '#27ae60',
                                    color: 'white',
                                    borderRadius: '4px',
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    opacity: loading ? 0.6 : 1,
                                }}
                            >
                                {loading ? 'Processing...' : 'Complete Order'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PosScreen;
