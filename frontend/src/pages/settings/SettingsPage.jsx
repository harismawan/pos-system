import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const settingsNav = [
    { path: '/settings/customers', label: 'Customers', icon: '👥' },
    { path: '/settings/outlets', label: 'Outlets', icon: '🏪' },
    { path: '/settings/suppliers', label: 'Suppliers', icon: '🚚' },
];

function SettingsPage() {
    const location = useLocation();
    const isSubpage = settingsNav.some(item => location.pathname.startsWith(item.path));

    if (isSubpage) {
        return <Outlet />;
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Settings</h1>
                    <p className="page-subtitle">Manage your business configuration</p>
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '20px'
            }}>
                {settingsNav.map(item => (
                    <Link
                        key={item.path}
                        to={item.path}
                        style={{
                            display: 'block',
                            padding: '24px',
                            background: 'white',
                            borderRadius: 'var(--radius-xl)',
                            boxShadow: 'var(--shadow-md)',
                            textDecoration: 'none',
                            color: 'inherit',
                            transition: 'all var(--transition-normal)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                        }}
                    >
                        <div style={{ fontSize: '32px', marginBottom: '12px' }}>{item.icon}</div>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                            {item.label}
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--gray-500)' }}>
                            Manage {item.label.toLowerCase()} settings
                        </p>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export default SettingsPage;
