import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import Loader from '../components/Loader';

const Rules = ({ standalone = false }) => {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [form, setForm] = useState({ title: '', content: '', displayOrder: 0 });

    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const isAdmin = userInfo?.user?.role?.toLowerCase() === 'admin';

    // If we're an admin, we might be inside AdminDashboard which HAS its own sidebar
    // If standalone is true, we don't wrap in Layout
    const shouldWrap = !standalone;

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            const { data } = await api.get('/rules');
            setRules(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching rules:', error);
            setLoading(false);
        }
    };

    const handleOpenModal = (rule = null) => {
        if (rule) {
            setEditingRule(rule);
            setForm({ title: rule.title, content: rule.content, displayOrder: rule.displayOrder || 0 });
        } else {
            setEditingRule(null);
            setForm({ title: '', content: '', displayOrder: rules.length });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingRule) {
                await api.put(`/rules/${editingRule._id}`, form);
                setMessage('Rule updated successfully!');
            } else {
                await api.post('/rules', form);
                setMessage('Rule created successfully!');
            }
            fetchRules();
            setShowModal(false);
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('RULE SAVE ERROR FULL:', error);
            const errorMsg = error.response?.data?.msg || error.response?.data?.error || error.message || 'Error saving rule.';
            setMessage(errorMsg);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this rule?')) return;
        try {
            await api.delete(`/rules/${id}`);
            setMessage('Rule deleted successfully!');
            fetchRules();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error deleting rule:', error);
            setMessage(error.response?.data?.msg || 'Error deleting rule.');
        }
    };

    if (loading) return <Loader message="Fetching trading rules..." />;

    // Modal Styles
    const modalOverlayStyle = {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1000
    };
    const modalContentStyle = {
        background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px',
        width: '100%', maxWidth: '500px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
        maxHeight: '90vh', overflowY: 'auto'
    };
    const inputStyle = { width: '100%', padding: '10px', marginBottom: '15px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-body)', color: 'var(--text-main)', outline: 'none' };

    const content = (
        <div style={{ padding: isAdmin ? '0' : '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.2rem' }}>
                    <i className="fas fa-gavel" style={{ marginRight: '10px', color: 'var(--primary)' }}></i>
                    Trading Rules & Regulations
                </h2>
                {isAdmin && (
                    <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
                        <i className="fas fa-plus"></i> Add New Rule
                    </button>
                )}
            </div>

            {message && (
                <div style={{ 
                    padding: '10px', marginBottom: '1rem', borderRadius: '6px', 
                    background: message.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    color: message.includes('Error') ? 'var(--danger)' : 'var(--success)',
                    fontSize: '0.9rem', textAlign: 'center'
                }}>
                    {message}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                {rules.length === 0 ? (
                    <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No rules have been set yet.
                    </div>
                ) : (
                    rules.map((rule, index) => (
                        <div key={rule._id} className="card" style={{ position: 'relative', borderLeft: '4px solid var(--primary)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--primary)' }}>{index + 1}. {rule.title}</h3>
                                {isAdmin && (
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button className="btn" style={{ padding: '5px 10px', fontSize: '0.8rem', background: 'var(--bg-body)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }} onClick={() => handleOpenModal(rule)}>
                                            <i className="fas fa-edit"></i> Edit
                                        </button>
                                        <button className="btn" style={{ padding: '5px 10px', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }} onClick={() => handleDelete(rule._id)}>
                                            <i className="fas fa-trash"></i> Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.95rem' }}>
                                {rule.content}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {!isAdmin && (
                <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', border: '1px dashed var(--border)' }}>
                    <i className="fas fa-info-circle"></i> These rules are set by the administrator and are for your information only. Please read them carefully.
                </div>
            )}

            {/* Rule Modal */}
            {showModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>{editingRule ? 'Edit Rule' : 'Add New Rule'}</h3>
                        <form onSubmit={handleSubmit}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '5px' }}>Rule Title</label>
                            <input style={inputStyle} type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="e.g., Trading Hours" />

                            <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '5px' }}>Rule Content</label>
                            <textarea
                                value={form.content}
                                onChange={(e) => setForm({ ...form, content: e.target.value })}
                                style={{ ...inputStyle, minHeight: '150px', resize: 'vertical', fontFamily: 'inherit' }}
                                required
                                placeholder="Describe the rule detail here..."
                            />

                            <label style={{ fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '5px' }}>Display Order (Optional)</label>
                            <input style={inputStyle} type="number" value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: e.target.value })} />

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{editingRule ? 'Update' : 'Create'}</button>
                                <button type="button" className="btn" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => setShowModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );

    return shouldWrap ? <Layout title="Trading Rules">{content}</Layout> : content;
};

export default Rules;
