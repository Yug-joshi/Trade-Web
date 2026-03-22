import React from 'react';

const Loader = ({ type = 'full', message = 'Fetching data...' }) => {
    if (type === 'table') {
        return (
            <div className="table-loader-container">
                <div className="loader-spinner"></div>
            </div>
        );
    }

    return (
        <div className="loader-overlay">
            <div className="loader-container">
                <img 
                    src={require('../assets/logo.png')} 
                    alt="Smart SIP Logo" 
                    className="loader-logo"
                />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div className="loader-spinner"></div>
                    <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        {message}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default Loader;
