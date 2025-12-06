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

            // Set default outlet if available
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
            width: '400px',
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        }}>
            <h1 style={{ marginBottom: '30px', textAlign: 'center' }}>POS System</h1>

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Username
                    </label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                        }}
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                        Password
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                        }}
                    />
                </div>

                {error && (
                    <div style={{
                        marginBottom: '20px',
                        padding: '10px',
                        backgroundColor: '#ffebee',
                        color: '#c62828',
                        borderRadius: '4px',
                        fontSize: '14px',
                    }}>
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#3498db',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        opacity: loading ? 0.6 : 1,
                    }}
                >
                    {loading ? 'Logging in...' : 'Login'}
                </button>
            </form>

            <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                fontSize: '12px',
            }}>
                <strong>Demo Credentials:</strong>
                <br />
                Username: owner
                <br />
                Password: password123
            </div>
        </div>
    );
}

export default LoginPage;
