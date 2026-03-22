import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SidebarLogo from './SidebarLogo';
import SidebarName from './SidebarName';

const Sidebar = ({ isOpen, onClose }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = React.useState(false);

    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const isAdmin = userInfo?.user?.role === 'admin';

    // Helper to check if link is active
    const isActive = (path, tab = null) => {
        const searchParams = new URLSearchParams(location.search);
        const currentTab = searchParams.get('tab') || (path === '/admin-dashboard' ? 'dashboard' : '');
        
        if (tab) {
            return location.pathname === path && currentTab === tab ? 'active' : '';
        }
        return location.pathname === path && !searchParams.get('tab') ? 'active' : '';
    };

    // Logout Function
    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        navigate('/login'); // Redirects back to login page
    };

    return (
        <nav 
            className={`sidebar ${isOpen ? 'open' : ''} ${isHovered ? 'expanded' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="logo">
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <SidebarLogo />
                    <SidebarName />
                </div>
            </div>

            <div className="nav-group" style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 'min-content', paddingBottom: '1rem'}}>
                {isAdmin ? (
                    <>
                        <Link to="/admin-dashboard?tab=dashboard" className={`nav-item ${isActive('/admin-dashboard', 'dashboard')}`} onClick={onClose}>
                            <i className="fas fa-home"></i> <span>Dashboard</span>
                        </Link>
                        <div className="nav-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', margin: '1rem 0 0.3rem 1rem' }}>MANAGEMENT</div>
                        <Link to="/admin-dashboard?tab=user_detail" className={`nav-item ${isActive('/admin-dashboard', 'user_detail')}`} onClick={onClose}>
                            <i className="fas fa-users"></i> <span>User Detail</span>
                        </Link>
                         <Link to="/admin-dashboard?tab=master_tbl" className={`nav-item ${isActive('/admin-dashboard', 'master_tbl')}`} onClick={onClose}>
                            <i className="fas fa-table"></i> <span>Master TBL</span>
                        </Link>
                         <Link to="/admin-dashboard?tab=allocation_tbl" className={`nav-item ${isActive('/admin-dashboard', 'allocation_tbl')}`} onClick={onClose}>
                            <i className="fas fa-tasks"></i> <span>Allocation TBL</span>
                        </Link>
                        <Link to="/admin-dashboard?tab=current_tbl" className={`nav-item ${isActive('/admin-dashboard', 'current_tbl')}`} onClick={onClose} style={{color: 'var(--success)'}}>
                            <i className="fas fa-chart-line"></i> <span>Current TBL (Live)</span>
                        </Link>
                        <Link to="/admin-dashboard?tab=gl_ledger" className={`nav-item ${isActive('/admin-dashboard', 'gl_ledger')}`} onClick={onClose}>
                            <i className="fas fa-file-invoice"></i> <span>GL Ledger</span>
                        </Link>
                    </>
                ) : (
                    <>
                        <Link to="/Dashboard" className={`nav-item ${isActive('/Dashboard')}`} onClick={onClose}>
                            <i className="fas fa-home"></i> <span>Dashboard</span>
                        </Link>

                        <div className="nav-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', margin: '1rem 0 0.3rem 1rem' }}>REPORTS</div>

                        <Link to="/pnl" className={`nav-item ${isActive('/pnl')}`} onClick={onClose}>
                            <i className="fas fa-chart-pie"></i> <span>P/L Analysis</span>
                        </Link>
                        <Link to="/ledger" className={`nav-item ${isActive('/ledger')}`} onClick={onClose}>
                            <i className="fas fa-file-invoice"></i> <span>Ledger Book</span>
                        </Link>
                        {/*
                        <Link to="/trades" className={`nav-item ${isActive('/trades')}`} onClick={onClose}>
                            <i className="fas fa-list-ul"></i> <span>Trade History</span>
                        </Link>*/}
                    </>
                )}

                <div className="nav-label" style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', margin: '1rem 0 0.3rem 1rem' }}>SYSTEM</div>

                <Link to="/settings" className={`nav-item ${isActive('/settings')}`} onClick={onClose}>
                    <i className="fas fa-cog"></i> <span>Settings</span>
                </Link>
                <Link to="/rules" className={`nav-item ${isActive('/rules')}`} onClick={onClose}>
                    <i className="fas fa-gavel"></i> <span>Rules</span>
                </Link>

                {/* Fixed Logout Button */}
                <div className="nav-item" onClick={handleLogout} style={{ marginTop: 'auto', color: 'var(--danger)', cursor: 'pointer' }}>
                    <i className="fas fa-sign-out-alt"></i> <span>Logout</span>
                </div>
            </div>
        </nav>
    );
};

export default Sidebar;