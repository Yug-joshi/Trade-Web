import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Helper to check if link is active
    const isActive = (path) => location.pathname === path ? 'active' : '';

    // Logout Function
    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        navigate('/login'); // Redirects back to login page
    };

    return (
        <nav className="sidebar">
            <div className="logo">
                <div style={{ width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '8px', display: 'grid', placeItems: 'center', color: 'white' }}>
                    <i className="fas fa-layer-group"></i>
                </div>
                BrokerConnect
            </div>

            <div className="nav-group">
                <Link to="/Dashboard" className={`nav-item ${isActive('/Dashboard')}`}>
                    <i className="fas fa-home"></i> Dashboard
                </Link>

                <div className="nav-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', margin: '1.5rem 0 0.5rem 1rem' }}>REPORTS</div>

                <Link to="/pnl" className={`nav-item ${isActive('/pnl')}`}>
                    <i className="fas fa-chart-pie"></i> P/L Analysis
                </Link>
                <Link to="/ledger" className={`nav-item ${isActive('/ledger')}`}>
                    <i className="fas fa-file-invoice"></i> Ledger Book
                </Link>
                <Link to="/trades" className={`nav-item ${isActive('/trades')}`}>
                    <i className="fas fa-list-ul"></i> Trade History
                </Link>

                <div className="nav-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', margin: '1.5rem 0 0.5rem 1rem' }}>SYSTEM</div>

                <Link to="/settings" className={`nav-item ${isActive('/settings')}`}>
                    <i className="fas fa-cog"></i> Settings
                </Link>

                {/* Fixed Logout Button */}
                <div className="nav-item" onClick={handleLogout} style={{ marginTop: 'auto', color: 'var(--danger)', cursor: 'pointer' }}>
                    <i className="fas fa-sign-out-alt"></i> Logout
                </div>
            </div>
        </nav>
    );
};

export default Sidebar;