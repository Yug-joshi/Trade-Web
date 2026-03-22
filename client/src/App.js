// Importing react from react
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import PnL from './pages/PnL';
import Ledger from './pages/Ledger';
import Trades from './pages/Trade';
import Settings from './pages/Settings';
import Rules from './pages/Rules';

import ProtectedRoute from './components/ProtectedRoute';

function App() {
  useEffect(() => {
    const theme = localStorage.getItem('appTheme') || 'light';
    if (theme === 'dark') {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.removeAttribute('data-theme');
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* User Protected Routes */}
        <Route path="/Dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/pnl" element={<ProtectedRoute><PnL /></ProtectedRoute>} />
        <Route path="/ledger" element={<ProtectedRoute><Ledger /></ProtectedRoute>} />
        <Route path="/trades" element={<ProtectedRoute><Trades /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/rules" element={<ProtectedRoute><Rules /></ProtectedRoute>} />

        {/* Admin Protected Routes */}
        <Route path="/admin-dashboard" element={<ProtectedRoute adminOnly={true}><AdminDashboard /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;