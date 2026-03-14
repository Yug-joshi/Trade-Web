import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import PnL from './pages/PnL';
import Ledger from './pages/Ledger';
import Trades from './pages/Trade';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/pnl" element={<PnL />} />
        <Route path="/ledger" element={<Ledger />} />
        <Route path="/trades" element={<Trades />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}

export default App;