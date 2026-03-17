import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

const Settings = () => {
    const [user, setUser] = useState({
        user_name: '',
        mob_num: '',
        client_id: '',
        role: ''
    });
    const [editMode, setEditMode] = useState(false);
    const [newName, setNewName] = useState('');
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ type: '', text: '', target: '' });

    const fetchProfile = useCallback(async () => {
        try {
            const res = await api.get('/users/profile');
            if (res.data) {
                setUser(res.data);
                setNewName(res.data.user_name || '');
                setStatusMsg({ type: '', text: '', target: 'profile' });
            }
        } catch (err) {
            console.error("Error fetching profile", err);
            // Try to fallback to cached user info in localStorage if API fails
            const cachedUser = JSON.parse(localStorage.getItem('userInfo'))?.user;
            if (cachedUser) {
                setUser(prev => ({ ...prev, ...cachedUser }));
                setNewName(cachedUser.user_name || '');
            }
            setStatusMsg({ type: 'danger', text: 'Failed to sync with server. showing cached details.', target: 'profile' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleUpdateName = async () => {
        if (!newName.trim() || newName === user.user_name) {
            setEditMode(false);
            return;
        }

        if (!window.confirm("Are you sure you want to update your profile name?")) {
            return;
        }

        setUpdating(true);
        setStatusMsg({ type: '', text: '', target: 'profile' });
        try {
            await api.put('/users/profile', { user_name: newName });
            setUser(prev => ({ ...prev, user_name: newName }));
            setStatusMsg({ type: 'success', text: 'Profile name updated successfully!', target: 'profile' });
            setEditMode(false);
        } catch (err) {
            setStatusMsg({ 
                type: 'danger', 
                text: err.response?.data?.msg || 'Error updating name.', 
                target: 'profile' 
            });
        } finally {
            setUpdating(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setStatusMsg({ type: '', text: '', target: 'password' });

        if (!passwords.currentPassword || !passwords.newPassword) {
            return setStatusMsg({ type: 'danger', text: 'Please fill in both password fields.', target: 'password' });
        }

        if (passwords.newPassword !== passwords.confirmPassword) {
            return setStatusMsg({ type: 'danger', text: 'New passwords do not match.', target: 'password' });
        }

        if (passwords.newPassword.length < 6) {
            return setStatusMsg({ type: 'danger', text: 'New password must be at least 6 characters.', target: 'password' });
        }

        if (!window.confirm("Update your password? You will need to use the new password for your next login.")) {
            return;
        }

        setUpdating(true);
        try {
            await api.post('/users/change-password', {
                currentPassword: passwords.currentPassword,
                newPassword: passwords.newPassword
            });
            setStatusMsg({ type: 'success', text: 'Password updated successfully!', target: 'password' });
            setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setStatusMsg({ 
                type: 'danger', 
                text: err.response?.data?.msg || 'Error updating password. Check your current password.', 
                target: 'password' 
            });
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <Layout title="Settings">
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
                    <p>Fetching your secure details...</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Settings">
            <div style={{ maxWidth: '850px', margin: '0 auto' }}>
                <div className="card">
                    {/* Header with Edit Toggle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Profile Information</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage your personal identity and security settings</p>
                        </div>
                        <button 
                            className={`btn ${editMode ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => {
                                if (editMode) setNewName(user.user_name);
                                setEditMode(!editMode);
                            }}
                        >
                            {editMode ? 'Cancel Editing' : 'Edit Profile'}
                        </button>
                    </div>

                    {statusMsg.target === 'profile' && statusMsg.text && (
                        <div style={{ 
                            padding: '12px', 
                            borderRadius: '8px', 
                            marginBottom: '1.5rem', 
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: statusMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
                            border: `1px solid ${statusMsg.type === 'success' ? 'var(--success)' : 'var(--danger)'}`
                        }}>
                            <i className={`fas fa-${statusMsg.type === 'success' ? 'check-circle' : 'exclamation-triangle'}`}></i>
                            {statusMsg.text}
                        </div>
                    )}

                    {/* Profile Fields Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', marginBottom: '1rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-muted)' }}>Full Name</label>
                            {editMode ? (
                                <input 
                                    type="text" 
                                    value={newName} 
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Enter your full name"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--primary)', background: 'var(--bg-body)', color: 'var(--text-main)', outline: 'none', boxShadow: '0 0 0 2px rgba(79, 70, 229, 0.1)' }}
                                />
                            ) : (
                                <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontWeight: '600', color: 'var(--text-main)' }}>
                                    {user.user_name || 'Not Available'}
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-muted)' }}>Username / Login ID</label>
                            <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--bg-body)', border: '1px solid var(--border)', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{user.mob_num || 'N/A'}</span>
                                <i className="fas fa-lock" style={{ fontSize: '0.75rem' }}></i>
                            </div>
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-muted)' }}>Internal Client ID</label>
                            <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--bg-body)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{user.client_id || 'ADMIN_ACCOUNT'}</span>
                                <i className="fas fa-lock" style={{ fontSize: '0.75rem' }}></i>
                            </div>
                        </div>
                    </div>

                    {editMode && (
                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                className="btn btn-primary" 
                                onClick={handleUpdateName}
                                disabled={updating}
                                style={{ padding: '10px 25px' }}
                            >
                                {updating ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : 'Save Profile Changes'}
                            </button>
                        </div>
                    )}

                    <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                            <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
                            For security purposes, Username and Client ID can only be changed by the System Administrator.
                        </p>
                    </div>

                    {/* Security Section */}
                    <div style={{ marginTop: '3rem', borderTop: '1px solid var(--border)', paddingTop: '2.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--text-main)' }}>Security & Password</h3>

                        {statusMsg.target === 'password' && statusMsg.text && (
                            <div style={{ 
                                padding: '12px', 
                                borderRadius: '8px', 
                                marginBottom: '1.5rem', 
                                fontSize: '0.9rem',
                                background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: statusMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
                                border: `1px solid ${statusMsg.type === 'success' ? 'var(--success)' : 'var(--danger)'}`
                            }}>
                                {statusMsg.text}
                            </div>
                        )}

                        <form onSubmit={handlePasswordChange}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Current Password</label>
                                <input 
                                    type="password" 
                                    placeholder="Verify your current password"
                                    value={passwords.currentPassword}
                                    onChange={(e) => setPasswords({...passwords, currentPassword: e.target.value})}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'var(--text-main)' }} 
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>New Password</label>
                                    <input 
                                        type="password" 
                                        placeholder="Min 6 characters"
                                        value={passwords.newPassword}
                                        onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'var(--text-main)' }} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Confirm New Password</label>
                                    <input 
                                        type="password" 
                                        placeholder="Repeat new password"
                                        value={passwords.confirmPassword}
                                        onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'var(--text-main)' }} 
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={updating} 
                                className="btn btn-primary"
                                style={{ padding: '12px 30px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            >
                                {updating ? <><i className="fas fa-spinner fa-spin"></i> Processing...</> : 'Update Secure Password'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default Settings;
