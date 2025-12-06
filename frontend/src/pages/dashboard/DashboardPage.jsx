import React from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { useOutletStore } from '../../store/outletStore.js';

function DashboardPage() {
    const user = useAuthStore((state) => state.user);
    const activeOutlet = useOutletStore((state) => state.activeOutlet);

    return (
        <div>
            <h1 style={{ marginBottom: '20px' }}>Dashboard</h1>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '20px',
                marginBottom: '30px',
            }}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}>
                    <h3 style={{ marginBottom: '10px', color: '#666' }}>Welcome</h3>
                    <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{user?.name}</p>
                    <p style={{ color: '#888', marginTop: '5px' }}>Role: {user?.role}</p>
                </div>

                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}>
                    <h3 style={{ marginBottom: '10px', color: '#666' }}>Active Outlet</h3>
                    <p style={{ fontSize: '24px', fontWeight: 'bold' }}>
                        {activeOutlet?.name || 'No outlet selected'}
                    </p>
                    {activeOutlet && (
                        <p style={{ color: '#888', marginTop: '5px' }}>Code: {activeOutlet.code}</p>
                    )}
                </div>

                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}>
                    <h3 style={{ marginBottom: '10px', color: '#666' }}>Quick Actions</h3>
                    <p style={{ marginTop: '10px' }}>
                        <a href="/pos" style={{ color: '#3498db', textDecoration: 'none' }}>
                            Open POS →
                        </a>
                    </p>
                    <p style={{ marginTop: '10px' }}>
                        <a href="/products" style={{ color: '#3498db', textDecoration: 'none' }}>
                            Manage Products →
                        </a>
                    </p>
                </div>
            </div>

            <div style={{
                backgroundColor: 'white',
                padding: '20px',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}>
                <h2 style={{ marginBottom: '15px' }}>Getting Started</h2>
                <p style={{ marginBottom: '10px' }}>
                    Welcome to the POS System! This is a full-featured point-of-sale application with:
                </p>
                <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                    <li>Multi-outlet support with warehouse management</li>
                    <li>Advanced pricing tiers for different customer groups</li>
                    <li>Real-time inventory tracking and stock movements</li>
                    <li>Purchase order management for procurement</li>
                    <li>Background job processing (audit logs, emails, reports)</li>
                    <li>Role-based access control for team management</li>
                </ul>
                <p style={{ marginTop: '15px' }}>
                    Select an outlet from the dropdown in the header to get started.
                </p>
            </div>
        </div>
    );
}

export default DashboardPage;
