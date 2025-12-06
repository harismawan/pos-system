import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';
import { useOutletStore } from '../store/outletStore.js';

function AppLayout() {
    const navigate = useNavigate();
    const { user, outlets, logout } = useAuthStore();
    const { activeOutlet, setActiveOutlet } = useOutletStore();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleOutletChange = (e) => {
        const outletId = e.target.value;
        const outlet = outlets.find(o => o.id === outletId);
        setActiveOutlet(outlet || null);
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <aside style={{
                width: '250px',
                backgroundColor: '#2c3e50',
                color: 'white',
                padding: '20px',
            }}>
                <h2 style={{ marginBottom: '30px' }}>POS System</h2>

                <nav>
                    <ul style={{ listStyle: 'none' }}>
                        <li style={{ marginBottom: '10px' }}>
                            <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>
                                Dashboard
                            </Link>
                        </li>
                        <li style={{ marginBottom: '10px' }}>
                            <Link to="/pos" style={{ color: 'white', textDecoration: 'none' }}>
                                POS
                            </Link>
                        </li>
                        <li style={{ marginBottom: '10px' }}>
                            <Link to="/products" style={{ color: 'white', textDecoration: 'none' }}>
                                Products
                            </Link>
                        </li>
                        <li style={{ marginBottom: '10px' }}>
                            <Link to="/inventory" style={{ color: 'white', textDecoration: 'none' }}>
                                Inventory
                            </Link>
                        </li>
                        <li style={{ marginBottom: '10px' }}>
                            <Link to="/reports" style={{ color: 'white', textDecoration: 'none' }}>
                                Reports
                            </Link>
                        </li>
                    </ul>
                </nav>
            </aside>

            {/* Main content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Topbar */}
                <header style={{
                    height: '60px',
                    backgroundColor: 'white',
                    borderBottom: '1px solid #ddd',
                    padding: '0 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <label>
                            Outlet:
                            <select
                                value={activeOutlet?.id || ''}
                                onChange={handleOutletChange}
                                style={{
                                    marginLeft: '10px',
                                    padding: '5px 10px',
                                    borderRadius: '4px',
                                    border: '1px solid #ddd',
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <span>{user?.name}</span>
                        <button
                            onClick={handleLogout}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#e74c3c',
                                color: 'white',
                                borderRadius: '4px',
                            }}
                        >
                            Logout
                        </button>
                    </div>
                </header>

                {/* Page content */}
                <main style={{
                    flex: 1,
                    padding: '20px',
                    backgroundColor: '#f8f9fa',
                    overflow: 'auto',
                }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default AppLayout;
