import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children, title }) => {
    // Initialize state from localStorage to persist theme across page changes
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('appTheme') === 'dark';
    });

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            try {
                const parsed = JSON.parse(userInfo);
                if (parsed && parsed.user) {
                    setUser(parsed.user);
                }
            } catch (err) {
                console.error("Layout User Parse Error:", err);
            }
        }
    }, []);

    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return parts[0][0].toUpperCase();
    };

    const displayName = user?.user_name || user?.mob_num || 'User';

    // Toggle Theme Logic
    const toggleTheme = () => {
        setDarkMode(!darkMode);
    };

    // Apply theme to body and save preference to localStorage
    useEffect(() => {
        if (darkMode) {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('appTheme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('appTheme', 'light');
        }
    }, [darkMode]);

    useEffect(() => {
        document.title = title ? `Smart SIP | ${title}` : "Smart SIP";
    }, [title]);

    return (
        <div className="app-container">
            <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)}></div>
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            
            <main className="main-content">
                {/* Top Bar Header */}
                <header className="top-bar">
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                        <button className="burger-menu" onClick={() => setSidebarOpen(true)}>
                            <i className="fas fa-bars"></i>
                        </button>
                        <h2 style={{fontSize: '1.1rem', fontWeight: '600'}}>
                            {title === 'Dashboard' ? `Welcome, ${displayName}` : title}
                        </h2>
                    </div>
                    
                    <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                        <button className="btn" style={{padding:'8px', borderRadius: '50%', width: '40px', height: '40px', display: 'grid', placeItems: 'center'}} onClick={toggleTheme}>
                            <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
                        </button>
                        
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}} className="user-profile-nav">
                            <div style={{textAlign: 'right'}} className="hide-mobile">
                                <div style={{fontSize: '0.85rem', fontWeight: '600'}}>{displayName}</div>
                                <div style={{fontSize: '0.75rem', color: 'var(--success)'}}>Online</div>
                            </div>
                            <div style={{width: '36px', height: '36px', background: 'var(--primary)', borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'white', fontWeight: '700'}}>
                                {getInitials(user?.user_name)}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="scroll-area">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;