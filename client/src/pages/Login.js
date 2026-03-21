// Import Files
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Login = () => {
    const [mob_num, setMobNum] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();


    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const { data } = await api.post('/users/login', {
                mob_num: mob_num.trim(),
                password
            });

            if (!data || !data.user) {
                setError('Login failed: Invalid server response structure');
                return;
            }

            localStorage.setItem('userInfo', JSON.stringify(data));
            if (data.user.role === 'admin') {

                navigate('/admin-dashboard');
            } else if (data.user.status === 'active') {
                navigate('/Dashboard');
            } else {
                setError('Account is not active');
            }

        } catch (err) {
            console.error("LOGIN ERROR CATCH:", err);
            setError(err.response?.data?.msg || err.message || 'Invalid Mobile Number or Password');
        }
    };

    return (
        <div style={{
            height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'var(--bg-body)', color: 'var(--text-main)'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <div style={{
                        width: '48px', height: '48px', background: 'var(--primary)', borderRadius: '12px',
                        display: 'grid', placeItems: 'center', color: 'white', fontSize: '1.5rem', margin: '0 auto 1rem'
                    }}>
                        <i className="fas fa-layer-group"></i>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Smart SIP</h2>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Secure Login Terminal
                    </p>
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
                            onChange={(e) => setMobNum(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            style={{ width: '100%', padding: '12px', background: 'var(--bg-body)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '8px', outline: 'none' }}
                            placeholder="Enter 10-digit mobile number"
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
                    <button type="submit" className="btn btn-primary" style={{
                        width: '100%', padding: '12px', fontSize: '1rem', fontWeight: '600',
                        display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                        Login to Account
                    </button>
                </form>

                <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.4' }}>
                    <span>Forgot password? Contact support for recovery.</span>
                </div>

            </div>
        </div>
    );
};

export default Login;