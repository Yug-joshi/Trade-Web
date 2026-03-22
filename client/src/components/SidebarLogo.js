import React from 'react';

const SidebarLogo = () => {
    return (
        <img 
            src={require('../assets/logo.png')} 
            alt="Smart SIP Logo" 
            style={{ width: '55px', height: '55px', objectFit: 'contain', display: 'block' }}
        />
    );
};

export default SidebarLogo;
