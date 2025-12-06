import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { useOutletStore } from '../../store/outletStore.js';

function LoginPage() {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const setActiveOutlet = useOutletStore((state) => state.setActiveOutlet);

    const [username, setUsername] = useState('owner');
    const [password, setPassword] = useState('password123');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await login(username, password);

            if (data.outlets && data.outlets.length > 0) {
                const defaultOutlet = data.outlets.find(o => o.isDefault) || data.outlets[0];
                setActiveOutlet(defaultOutlet);
            }

            navigate('/dashboard');
        } catch (err) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            width: '100%',
            maxWidth: '420px',
            position: 'relative',
            zIndex: 1,
        }}>
            <div className="card" style={{ padding: '40px' }}>
                {/* Logo/Brand */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: 'var(--radius-xl)',
                        background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        boxShadow: 'var(--shadow-lg)',
                    }}>
                        <span style={{ fontSize: '28px' }}>🛒</span>
                    </div>
                    <h1 style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        color: 'var(--gray-900)',
                        marginBottom: '8px'
                    }}>
                        POS System
                    </h1>
                    <p style={{ color: 'var(--gray-500)', fontSize: '14px' }}>
                        Sign in to your account
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            placeholder="Enter your username"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter your password"
                        />
                    </div>

                    {error && (
                        <div style={{
                            marginBottom: '20px',
                            padding: '12px 16px',
                            background: 'var(--error-50)',
                            color: 'var(--error-600)',
                            borderRadius: 'var(--radius-lg)',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}>
                            <span>⚠️</span>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary btn-lg"
                        style={{ width: '100%', marginTop: '8px' }}
                    >
                        {loading ? (
                            <>
                                <div className="spinner"></div>
                                Signing in...
                            </>
                        ) : 'Sign In'}
                    </button>
                </form>
            </div>

            {/* Demo credentials */}
            <div style={{
                marginTop: '16px',
                padding: '16px 20px',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
            }}>
                <div style={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.7)',
                    marginBottom: '8px',
                    fontWeight: 500,
                }}>
                    Demo Credentials
                </div>
                <div style={{
                    display: 'flex',
                    gap: '24px',
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.9)',
                }}>
                    <div>
                        <span style={{ opacity: 0.6 }}>Username:</span> <strong>owner</strong>
                    </div>
                    <div>
                        <span style={{ opacity: 0.6 }}>Password:</span> <strong>password123</strong>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
