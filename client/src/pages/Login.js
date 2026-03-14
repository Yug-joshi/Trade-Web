// Import Files
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Login = () => {
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [mob_num, setMobNum] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();



        try {
            const { data } = await api.post('/users/login', {
                mob_num,
                password
            });

            localStorage.setItem('userInfo', JSON.stringify(data));
            if (data.user.role === 'admin') {
                navigate('/admin-dashboard');
            } else if (data.user.status === 'active') {
                navigate('/');
            } else {
                setError('Account is not active');
            }

        } catch (err) {
            console.error("LOGIN ERROR CATCH:", err);
            console.error("RESPONSE DATA:", err.response?.data);
            setError(err.response?.data?.msg || err.message || 'Invalid Mobile Number or Password');
        }
    };

    return (
        <div style={{
            height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'var(--bg-body)', color: 'var(--text-main)'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                <div style={{
                    textAlign: 'center', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 'bold',
                    padding: '10px', backgroundColor: 'rgba(251, 191, 36, 0.1)', borderRadius: '6px'
                }}>
                    ⚠️ DISCLAIMER: No real money involved. This is a simulation.
                </div>

                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '48px', height: '48px', background: 'var(--primary)', borderRadius: '12px',
                        display: 'grid', placeItems: 'center', color: 'white', fontSize: '1.5rem', margin: '0 auto 1rem'
                    }}>
                        <i className="fas fa-layer-group"></i>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>BrokerConnect</h2>
                </div>

                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                    <button
                        type="button"
                        onClick={() => setIsAdminMode(false)}
                        style={{
                            flex: 1, padding: '10px', background: 'none', border: 'none', cursor: 'pointer',
                            color: !isAdminMode ? 'var(--primary)' : 'var(--text-muted)',
                            borderBottom: !isAdminMode ? '2px solid var(--primary)' : '2px solid transparent',
                            fontWeight: '600', fontSize: '1rem', transition: 'all 0.3s'
                        }}
                    >
                        User Login
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsAdminMode(true)}
                        style={{
                            flex: 1, padding: '10px', background: 'none', border: 'none', cursor: 'pointer',
                            color: isAdminMode ? 'var(--primary)' : 'var(--text-muted)',
                            borderBottom: isAdminMode ? '2px solid var(--primary)' : '2px solid transparent',
                            fontWeight: '600', fontSize: '1rem', transition: 'all 0.3s'
                        }}
                    >
                        Admin Login
                    </button>
                </div>

                {error && <div style={{
                    background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '10px',
                    borderRadius: '6px', fontSize: '0.9rem', textAlign: 'center'
                }}>{error}</div>}

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '1.2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Mobile Number</label>
                        <input
                            type="text"
                            className="form-control"
                            value={mob_num}
                            onChange={(e) => setMobNum(e.target.value)}
                            style={{ width: '100%', padding: '12px', background: 'var(--bg-body)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '8px', outline: 'none' }}
                            placeholder="Enter mobile number"
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ width: '100%', padding: '12px', background: 'var(--bg-body)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '8px', outline: 'none' }}
                            placeholder="Enter password"
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: '600' }}>
                        {isAdminMode ? 'Admin Login' : 'User Login'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                    {!isAdminMode ? (
                        <span>Forgot password? Contact admin for new password.</span>
                    ) : (
                        <span>Please login with phone number and password provided by developer.</span>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Login;