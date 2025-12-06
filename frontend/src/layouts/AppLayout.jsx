import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { useOutletStore } from '../store/outletStore.js';

const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/pos', label: 'POS', icon: '🛒' },
    { path: '/products', label: 'Products', icon: '📦' },
    { path: '/inventory', label: 'Inventory', icon: '📋' },
    { path: '/warehouses', label: 'Warehouses', icon: '🏭' },
    { path: '/purchase-orders', label: 'Purchase Orders', icon: '📝' },
    {
        label: 'Reports',
        icon: '📈',
        children: [
            { path: '/reports', label: 'Overview' },
            { path: '/reports/sales', label: 'Sales' },
            { path: '/reports/orders', label: 'Order History' },
            { path: '/reports/products', label: 'Products' },
            { path: '/reports/inventory', label: 'Inventory' },
        ]
    },
    {
        label: 'Settings',
        icon: '⚙️',
        children: [
            { path: '/settings/outlets', label: 'Outlets' },
            { path: '/settings/customers', label: 'Customers' },
            { path: '/settings/suppliers', label: 'Suppliers' },
        ]
    },
];

function AppLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, outlets, logout } = useAuthStore();
    const { activeOutlet, setActiveOutlet } = useOutletStore();
    const [expandedMenu, setExpandedMenu] = useState(null);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleOutletChange = (e) => {
        const outletId = e.target.value;
        const outlet = outlets.find(o => o.id === outletId);
        setActiveOutlet(outlet || null);
    };

    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <aside style={{
                width: '260px',
                background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
            }}>
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}>
                    <h2 style={{
                        fontSize: '20px',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        POS System
                    </h2>
                </div>

                <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
                    {navItems.map((item, index) => (
                        <div key={index}>
                            {item.children ? (
                                <>
                                    <button
                                        onClick={() => setExpandedMenu(expandedMenu === item.label ? null : item.label)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px 16px',
                                            marginBottom: '4px',
                                            borderRadius: '8px',
                                            color: 'rgba(255,255,255,0.7)',
                                            background: expandedMenu === item.label ? 'rgba(255,255,255,0.05)' : 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            textAlign: 'left',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <span style={{ fontSize: '18px' }}>{item.icon}</span>
                                        <span style={{ flex: 1 }}>{item.label}</span>
                                        <span style={{
                                            transform: expandedMenu === item.label ? 'rotate(90deg)' : 'rotate(0)',
                                            transition: 'transform 0.2s',
                                        }}>▶</span>
                                    </button>
                                    {expandedMenu === item.label && (
                                        <div style={{ marginLeft: '44px', marginBottom: '8px' }}>
                                            {item.children.map((child, childIndex) => (
                                                <Link
                                                    key={childIndex}
                                                    to={child.path}
                                                    style={{
                                                        display: 'block',
                                                        padding: '8px 16px',
                                                        marginBottom: '2px',
                                                        borderRadius: '6px',
                                                        color: isActive(child.path) ? 'white' : 'rgba(255,255,255,0.6)',
                                                        background: isActive(child.path) ? 'rgba(96, 165, 250, 0.2)' : 'transparent',
                                                        textDecoration: 'none',
                                                        fontSize: '13px',
                                                        transition: 'all 0.2s',
                                                    }}
                                                >
                                                    {child.label}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <Link
                                    to={item.path}
                                    onClick={() => setExpandedMenu(null)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        marginBottom: '4px',
                                        borderRadius: '8px',
                                        color: isActive(item.path) ? 'white' : 'rgba(255,255,255,0.7)',
                                        background: isActive(item.path)
                                            ? 'linear-gradient(135deg, rgba(96, 165, 250, 0.3), rgba(167, 139, 250, 0.2))'
                                            : 'transparent',
                                        textDecoration: 'none',
                                        fontSize: '14px',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <span style={{ fontSize: '18px' }}>{item.icon}</span>
                                    <span>{item.label}</span>
                                </Link>
                            )}
                        </div>
                    ))}
                </nav>

                <div style={{
                    padding: '16px',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(0,0,0,0.2)',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                    }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                        }}>
                            {user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 500, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user?.name}
                            </div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                                {user?.role}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--gray-50)' }}>
                {/* Topbar */}
                <header style={{
                    height: '64px',
                    backgroundColor: 'white',
                    borderBottom: '1px solid var(--gray-200)',
                    padding: '0 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Outlet:</span>
                            <select
                                value={activeOutlet?.id || ''}
                                onChange={handleOutletChange}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--gray-300)',
                                    background: 'white',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    minWidth: '180px',
                                }}
                            >
                                <option value="">Select Outlet</option>
                                {outlets.map(outlet => (
                                    <option key={outlet.id} value={outlet.id}>
                                        {outlet.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={handleLogout}
                            className="btn-secondary"
                            style={{ padding: '8px 16px' }}
                        >
                            Logout
                        </button>
                    </div>
                </header>

                {/* Page content */}
                <main style={{
                    flex: 1,
                    overflow: 'auto',
                }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default AppLayout;
