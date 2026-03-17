import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Doughnut, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const AdminDashboard = () => {
    const navigate = useNavigate();

    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('adminTheme') === 'dark');
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Live Database State
    const [users, setUsers] = useState([]);
    const [masterTrades, setMasterTrades] = useState([]);
    const [allocations, setAllocations] = useState([]);
    const [ledger, setLedger] = useState([]);
    const [currentTrades, setCurrentTrades] = useState([]);

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Filter & Search State
    const [masterSearchInput, setMasterSearchInput] = useState('');
    const [masterSearch, setMasterSearch] = useState('');
    const [masterFilterStatus, setMasterFilterStatus] = useState('ALL');
    const [allocSearchInput, setAllocSearchInput] = useState('');
    const [allocSearch, setAllocSearch] = useState('');
    const [allocFilterStatus, setAllocFilterStatus] = useState('ALL');

    // Pop-up Visibility State
    const [showUserModal, setShowUserModal] = useState(false);
    const [showEditUserModal, setShowEditUserModal] = useState(false);
    const [showFundsModal, setShowFundsModal] = useState(false);
    const [showTradeModal, setShowTradeModal] = useState(false);
    const [showUserProfileModal, setShowUserProfileModal] = useState(false);

    // Trade Details Modal
    const [showTradeDetailsModal, setShowTradeDetailsModal] = useState(false);
    const [detailsTrade, setDetailsTrade] = useState(null);
    const [tradeDetailsAllocations, setTradeDetailsAllocations] = useState([]);

    // Allocation & Close Modals
    const [showAllocateModal, setShowAllocateModal] = useState(false);
    const [selectedTrade, setSelectedTrade] = useState(null);
    const [allocationInputs, setAllocationInputs] = useState([]);

    const [showCloseModal, setShowCloseModal] = useState(false);
    const [closePrice, setClosePrice] = useState('');

    // Trigger Flag Modal
    const [showFlagModal, setShowFlagModal] = useState(false);
    const [flagType, setFlagType] = useState('');
    const [flagInputs, setFlagInputs] = useState({ day: 1, activePrice: '' });

    // Form States
    const [newUser, setNewUser] = useState({ user_name: '', mob_num: '', password: '', brokerage: 0, current_balance: 100000 });
    const [editingUser, setEditingUser] = useState(null);
    const [fundsUser, setFundsUser] = useState(null);
    const [fundsAmount, setFundsAmount] = useState('');
    const [fundsDescription, setFundsDescription] = useState('');
    const [selectedUserProfile, setSelectedUserProfile] = useState(null);
    const [newTrade, setNewTrade] = useState({ symbol: '', total_qty: '', buy_price: '' });

    // Expandable Rows State
    const [expandedRows, setExpandedRows] = useState(new Set());

    // User Search State
    const [userSearchInput, setUserSearchInput] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [userFilterStatus, setUserFilterStatus] = useState('ALL');

    // Current Table Filter State
    const [currentDateFilter, setCurrentDateFilter] = useState('');

    // Global Funds Form State
    const [showGlobalFundsModal, setShowGlobalFundsModal] = useState(false);
    const [globalFundsType, setGlobalFundsType] = useState('add');
    const [globalFundsUserId, setGlobalFundsUserId] = useState('');
    const [globalFundsAmount, setGlobalFundsAmount] = useState('');
    const [globalFundsDescription, setGlobalFundsDescription] = useState('');
    const [allocUserSearch, setAllocUserSearch] = useState('');

    useEffect(() => {
        if (darkMode) {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('adminTheme', 'dark');
        } else {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('adminTheme', 'light');
        }
    }, [darkMode]);

    const fetchDashboardData = useCallback(async () => {
        try {
            const [usersRes, tradesRes, allocRes, ledgerRes] = await Promise.all([
                api.get('/users'),
                api.get('/trades'),
                api.get('/trades/allocations'),
                api.get('/ledger')
            ]);
            setUsers(usersRes.data);
            setMasterTrades(tradesRes.data);
            setAllocations(allocRes.data);
            setLedger(ledgerRes.data);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                navigate('/login');
            }
        }
    }, [navigate]);

    const fetchCurrentTable = useCallback(async () => {
        try {
            const res = await api.get('/trades/current');
            setCurrentTrades(res.data);
        } catch (error) {
            console.error("Error fetching current table", error);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    useEffect(() => {
        if (activeTab === 'current_tbl') {
            fetchCurrentTable();
            const interval = setInterval(fetchCurrentTable, 10000); // refresh every 10s
            return () => clearInterval(interval);
        }
    }, [activeTab, fetchCurrentTable]);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (newUser.mob_num.length !== 10) {
            return alert("Mobile number must be exactly 10 digits.");
        }
        try {
            await api.post('/users/create', newUser);
            alert("User created successfully!");
            setNewUser({ user_name: '', mob_num: '', password: '', brokerage: 2, current_balance: 100000 });
            setShowUserModal(false);
            fetchDashboardData();
        } catch (error) {
            alert(error.response?.data?.message || error.response?.data?.msg || "Error creating user");
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        if (editingUser.mob_num.length !== 10) {
            return alert("Mobile number must be exactly 10 digits.");
        }
        try {
            // Ensure numbers are properly parsed before sending
            const payload = {
                ...editingUser,
                brokerage: editingUser.brokerage ? Number(editingUser.brokerage) : 2
            };

            await api.put(`/users/${editingUser._id}`, payload);
            alert("User updated successfully!");
            setShowEditUserModal(false);
            fetchDashboardData();
        } catch (error) {
            alert(error.response?.data?.error || error.response?.data?.msg || "Error updating user");
        }
    };

    const handleFundsSubmit = async (e, type) => {
        e.preventDefault();
        try {
            const endpoint = type === 'add' ? 'add-funds' : 'withdraw-funds';
            await api.post(`/users/${fundsUser._id}/${endpoint}`, { amount: fundsAmount, description: fundsDescription });
            alert(`Funds ${type === 'add' ? 'added' : 'withdrawn'} successfully!`);
            setShowFundsModal(false);
            setFundsAmount('');
            setFundsDescription('');
            fetchDashboardData();
        } catch (error) {
            alert(error.response?.data?.msg || `Error ${type === 'add' ? 'adding' : 'withdrawing'} funds`);
        }
    };

    const handleGlobalFundsSubmit = async (e) => {
        e.preventDefault();

        if (!globalFundsUserId) {
            return alert("Please select a user");
        }

        if (globalFundsAmount <= 0) {
            return alert("Amount must be greater than zero");
        }

        const selectedUser = users.find(u => u._id === globalFundsUserId);

        if (globalFundsType === 'withdraw' && globalFundsAmount > (selectedUser?.current_balance || 0)) {
            return alert("Withdrawal amount cannot exceed current balance");
        }

        try {
            const endpoint = globalFundsType === 'add' ? 'add-funds' : 'withdraw-funds';
            await api.post(`/users/${globalFundsUserId}/${endpoint}`, { amount: globalFundsAmount, description: globalFundsDescription });
            alert(`Funds ${globalFundsType === 'add' ? 'added' : 'withdrawn'} successfully!`);
            setShowGlobalFundsModal(false);
            setGlobalFundsUserId('');
            setGlobalFundsAmount('');
            setGlobalFundsDescription('');
            fetchDashboardData();
        } catch (error) {
            alert(error.response?.data?.msg || `Error ${globalFundsType === 'add' ? 'adding' : 'withdrawing'} funds`);
        }
    };

    const handleCreateTrade = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post('/trades', newTrade);
            alert("Master Trade Executed!");
            setNewTrade({ symbol: '', total_qty: '', buy_price: '' });
            setShowTradeModal(false);
            fetchDashboardData();
        } catch (error) {
            alert(error.response?.data?.message || error.response?.data?.msg || "Error creating trade");
        }
        setIsSubmitting(false);
    };

    const openTradeDetails = async (trade) => {
        setDetailsTrade(trade);
        try {
            const res = await api.get(`/trades/${trade._id}/allocations`);
            setTradeDetailsAllocations(res.data);
            setShowTradeDetailsModal(true);
        } catch (error) {
            alert(error.response?.data?.message || "Error fetching trade details.");
        }
    };

    // ----- Allocation Logic -----
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const openAllocateModal = (trade) => {
        setAllocUserSearch('');
        setSelectedTrade(trade);

        const remainingQty = trade.total_qty - (trade.allocated_qty || 0);

        // Pre-fill allocation based on user percentages
        const defaultAllocations = users
            .filter(u => u.status === 'active' && u.percentage > 0 && u.role !== 'admin')
            .map(u => ({
                mob_num: u.mob_num,
                name: u.user_name,
                allocation_qty: Math.floor(trade.total_qty * (u.percentage / 100))
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        // Scale down if defaults exceed remaining
        let currentTotal = defaultAllocations.reduce((sum, a) => sum + a.allocation_qty, 0);
        if (currentTotal > remainingQty) {
            defaultAllocations.forEach(a => a.allocation_qty = 0); // reset if it exceeds for safety
        }

        setAllocationInputs(defaultAllocations);
        setShowAllocateModal(true);
    };

    const handleAllocationQtyChange = (mob_num, qty) => {
        setAllocationInputs(prev =>
            prev.map(a => a.mob_num === mob_num ? { ...a, allocation_qty: Number(qty) } : a)
        );
    };

    const submitAllocation = async () => {
        setIsSubmitting(true);
        try {
            const totalAllocated = allocationInputs.reduce((sum, a) => sum + Number(a.allocation_qty), 0);

            // NEW: Must strictly equal the master trade quantity
            if (totalAllocated !== selectedTrade.total_qty) {
                alert(`You must allocate the exact Master Trade Quantity (${selectedTrade.total_qty}) at once!`);
                setIsSubmitting(false);
                return;
            }

            const payload = {
                allocations: allocationInputs.filter(a => a.allocation_qty > 0)
            };

            await api.post(`/trades/${selectedTrade._id}/allocate`, payload);
            alert("Allocations successful!");
            setShowAllocateModal(false);
            fetchDashboardData();
        } catch (error) {
            alert(error.response?.data?.message || error.response?.data?.msg || "Error allocating");
        }
        setIsSubmitting(false);
    };

    // ----- Close Trade Logic -----
    const openCloseModal = (trade) => {
        const liveData = currentTrades.find(ct => ct.master_trade_id === trade.master_trade_id);
        setSelectedTrade({ ...trade, live_price: liveData ? liveData.current_price : null });
        setClosePrice('');
        setShowCloseModal(true);
    };

    const submitCloseTrade = async () => {
        setIsSubmitting(true);
        try {
            await api.post(`/trades/${selectedTrade._id}/close`, { sell_price: Number(closePrice) });
            alert("Trade closed successfully! Ledger updated.");
            setShowCloseModal(false);
            fetchDashboardData();
        } catch (error) {
            alert(error.response?.data?.message || error.response?.data?.msg || "Error closing trade");
        }
        setIsSubmitting(false);
    };

    // ----- Trigger Flag Logic -----
    const openFlagModal = (trade, type) => {
        setSelectedTrade(trade);
        setFlagType(type);
        setFlagInputs({ day: 1, activePrice: '' });
        setShowFlagModal(true);
    };

    const submitFlag = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.post(`/trades/${selectedTrade._id}/trigger-flag`, {
                day: Number(flagInputs.day),
                flagType,
                activePrice: Number(flagInputs.activePrice)
            });
            alert(`${flagType === 'M to M' ? 'M to M' : flagType} executed successfully.`);
            setShowFlagModal(false);
            fetchDashboardData();
        } catch (error) {
            alert(error.response?.data?.message || error.response?.data?.msg || "Error executing action.");
        }
        setIsSubmitting(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        navigate('/login');
    };

    const downloadAdminExcel = async () => {
        try {
            const response = await api.get('/reports/admin/trades', { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `Admin_Trade_Report_${Date.now()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            console.error("Admin Download error:", error);
            alert("Failed to download Admin Excel report");
        }
    };

    const doughnutData = useMemo(() => {
        const activeUsers = users.filter(u => u.role !== 'admin' && (u.current_balance > 0 || u.percentage > 0));
        return {
            labels: activeUsers.map(u => u.user_name),
            datasets: [{
                data: activeUsers.map(u => u.current_balance || u.percentage || 0),
                backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'],
                borderWidth: 0
            }]
        };
    }, [users]);

    // ----- Sorting Logic -----
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedData = useCallback((data, defaultSortKey = null) => {
        if (!sortConfig.key && !defaultSortKey) return data;

        const key = sortConfig.key || defaultSortKey;
        const direction = sortConfig.key ? sortConfig.direction : 'desc';

        return [...data].sort((a, b) => {
            let valA = a[key] || '';
            let valB = b[key] || '';

            // Handle nested objects if necessary (e.g., master_trade_id.symbol)
            if (key.includes('.')) {
                const keys = key.split('.');
                valA = a[keys[0]]?.[keys[1]] || '';
                valB = b[keys[0]]?.[keys[1]] || '';
            }

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [sortConfig]);

    
    const sortedUsers = useMemo(() => {
        let filtered = users.filter(u => u.role !== 'admin');
        if (userSearch.trim()) {
            const lowerQuery = userSearch.toLowerCase();
            filtered = filtered.filter(u =>
                (u.user_name && u.user_name.toLowerCase().includes(lowerQuery)) ||
                (u.mob_num && String(u.mob_num).toLowerCase().includes(lowerQuery)) ||
                (u.client_id && String(u.client_id).toLowerCase().includes(lowerQuery))
            );
        }
        if (userFilterStatus !== 'ALL') {
            filtered = filtered.filter(u => u.status === userFilterStatus);
        }
        return sortedData(filtered, 'client_id');
    }, [users, userSearch, userFilterStatus, sortedData]);

    const sortedMasterTrades = useMemo(() => {
        let filtered = masterTrades.filter(t => {
            const matchesStatus = masterFilterStatus === 'ALL' || t.status === masterFilterStatus;
            const matchesSearch = masterSearch.trim() === '' ||
                (t.symbol && t.symbol.toLowerCase().includes(masterSearch.toLowerCase())) ||
                (t.master_trade_id && String(t.master_trade_id).toLowerCase().includes(masterSearch.toLowerCase()));
            return matchesStatus && matchesSearch;
        });
        return sortedData(filtered, 'buy_timestamp');
    }, [masterTrades, masterFilterStatus, masterSearch, sortedData]);

    const sortedCurrentTrades = useMemo(() => {
        let filtered = currentTrades;
        if (currentDateFilter) {
            filtered = filtered.filter(t => {
                const tradeDate = new Date(t.date).toISOString().split('T')[0];
                return tradeDate === currentDateFilter;
            });
        }
        return sortedData(filtered, 'date');
    }, [currentTrades, currentDateFilter, sortedData]);

    const sortedAllocations = useMemo(() => {
        let filtered = allocations.filter(a => {
            const matchesStatus = allocFilterStatus === 'ALL' || a.status === allocFilterStatus;
            const matchesSearch = allocSearch.trim() === '' ||
                (a.mob_num && String(a.mob_num).toLowerCase().includes(allocSearch.toLowerCase())) ||
                (a.allocation_id && String(a.allocation_id).toLowerCase().includes(allocSearch.toLowerCase())) ||
                (a.master_trade_id?.symbol && a.master_trade_id.symbol.toLowerCase().includes(allocSearch.toLowerCase()));
            return matchesStatus && matchesSearch;
        });
        return sortedData(filtered, 'buy_timestamp');
    }, [allocations, allocFilterStatus, allocSearch, sortedData]);

    const toggleRow = (id) => {
        const newExpandedRows = new Set(expandedRows);
        if (newExpandedRows.has(id)) {
            newExpandedRows.delete(id);
        } else {
            newExpandedRows.add(id);
        }
        setExpandedRows(newExpandedRows);
    };

    const sortedLedger = useMemo(() => sortedData(ledger, 'entry_date'), [ledger, sortedData]);

    const userMap = useMemo(() => {
        const map = {};
        users.forEach(u => {
            if (u.mob_num) map[String(u.mob_num).trim()] = u.user_name;
        });
        return map;
    }, [users]);

    const getUserDisplayName = (mob_num, backEndName) => {
        if (backEndName && isNaN(backEndName) && backEndName !== 'N/A') return backEndName;
        const cleanMob = String(mob_num || '').trim();
        if (userMap[cleanMob]) return userMap[cleanMob];
        return mob_num || 'N/A';
    };


    const thStyle = { padding: '12px', borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' };
    const tdStyle = { padding: '14px 12px', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' };
    const inputStyle = { width: '100%', padding: '10px', marginBottom: '15px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-body)', color: 'var(--text-main)' };

    // Modal Overlay Styles
    const modalOverlayStyle = {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 1000
    };
    const modalContentStyle = {
        background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px',
        width: '100%', maxWidth: '400px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
        maxHeight: '90vh', overflowY: 'auto'
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'user_detail':
                return (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.2rem' }}>User Details Directory</h2>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex' }}>
                                    <input
                                        type="text"
                                        placeholder="Search User, Mobile or ID..."
                                        value={userSearchInput}
                                        onChange={(e) => setUserSearchInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && setUserSearch(userSearchInput)}
                                        style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px 0 0 6px', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
                                    />
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setUserSearch(userSearchInput)}
                                        style={{ borderRadius: '0 6px 6px 0', borderLeft: 'none', padding: '8px 12px' }}
                                    >
                                        Search
                                    </button>
                                </div>
                                <select
                                    value={userFilterStatus}
                                    onChange={(e) => setUserFilterStatus(e.target.value)}
                                    style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="closed">Closed</option>
                                </select>
                                <button className="btn" style={{ background: '#10b981', color: 'white', border: 'none' }} onClick={() => { setGlobalFundsType('add'); setShowGlobalFundsModal(true); }}>
                                    <i className="fas fa-arrow-down"></i> Add Funds
                                </button>
                                <button className="btn" style={{ background: '#ef4444', color: 'white', border: 'none' }} onClick={() => { setGlobalFundsType('withdraw'); setShowGlobalFundsModal(true); }}>
                                    <i className="fas fa-arrow-up"></i> Withdraw Funds
                                </button>
                                <button className="btn btn-primary" onClick={() => setShowUserModal(true)}>
                                    <i className="fas fa-plus"></i> Create User
                                </button>
                            </div>
                        </div>

                        <div className="box-table-container">
                            <div className="box-table-header" style={{ gridTemplateColumns: 'minmax(100px, 1fr) 1.5fr 1.2fr 0.8fr 1.2fr 0.8fr 120px' }}>
                                <div onClick={() => requestSort('client_id')}>Client ID {sortConfig.key === 'client_id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('user_name')}>Name {sortConfig.key === 'user_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('mob_num')}>Mobile {sortConfig.key === 'mob_num' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('brokerage')}>Brok % {sortConfig.key === 'brokerage' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('current_balance')}>Balance {sortConfig.key === 'current_balance' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('status')}>Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div>Actions</div>
                            </div>
                            {sortedUsers.map(u => (
                                <div className="box-table-row" key={u._id} style={{ gridTemplateColumns: 'minmax(100px, 1fr) 1.5fr 1.2fr 0.8fr 1.2fr 0.8fr 120px' }}>
                                    <div className="box-table-cell font-mono" style={{ color: 'var(--primary)', textDecoration: 'underline' }} onClick={() => { setSelectedUserProfile(u); setShowUserProfileModal(true); }}>
                                        <span className="cell-label">Client ID</span>
                                        {u.client_id}
                                    </div>
                                    <div className="box-table-cell" style={{ fontWeight: 'bold' }} onClick={() => { setSelectedUserProfile(u); setShowUserProfileModal(true); }}>
                                        <span className="cell-label">Name</span>
                                        {u.user_name}
                                    </div>
                                    <div className="box-table-cell">
                                        <span className="cell-label">Mobile</span>
                                        {u.mob_num}
                                    </div>
                                    <div className="box-table-cell">
                                        <span className="cell-label">Brokerage</span>
                                        {u.brokerage !== undefined ? u.brokerage : 2}%
                                    </div>
                                    <div className="box-table-cell font-mono">
                                        <span className="cell-label">Balance</span>
                                        ₹ {(u.current_balance || 0).toLocaleString()}
                                    </div>
                                    <div className="box-table-cell">
                                        <span className="cell-label">Status</span>
                                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', background: u.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: u.status === 'active' ? 'var(--success)' : 'var(--danger)', fontWeight: '700', textTransform: 'uppercase' }}>
                                            {u.status}
                                        </span>
                                    </div>
                                    <div className="box-table-cell" style={{ display: 'flex', gap: '8px' }}>
                                        <button className="btn" style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'var(--primary)', color: 'white', border: 'none' }} onClick={() => { setEditingUser(u); setShowEditUserModal(true); }}>Edit</button>
                                        <button className="btn" style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'var(--success)', color: 'white', border: 'none' }} onClick={() => { setFundsUser(u); setShowFundsModal(true); }}>Funds</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'master_tbl':
                return (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
                            <h2 style={{ fontSize: '1.2rem' }}>Master Trade Book</h2>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex' }}>
                                    <input
                                        type="text"
                                        placeholder="Search Symbol or ID..."
                                        value={masterSearchInput}
                                        onChange={(e) => setMasterSearchInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && setMasterSearch(masterSearchInput)}
                                        style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px 0 0 6px', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
                                    />
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setMasterSearch(masterSearchInput)}
                                        style={{ borderRadius: '0 6px 6px 0', borderLeft: 'none', padding: '8px 12px' }}
                                    >
                                        Search
                                    </button>
                                </div>
                                <select
                                    value={masterFilterStatus}
                                    onChange={(e) => setMasterFilterStatus(e.target.value)}
                                    style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="OPEN">Open</option>
                                    <option value="CLOSED">Closed</option>
                                    <option value="PERMANENT_CLOSE">Permanent Close</option>
                                </select>
                                <button className="btn" style={{ background: '#10b981', color: 'white', padding: '8px 12px' }} onClick={downloadAdminExcel}>
                                    <i className="fas fa-file-excel"></i> Excel
                                </button>
                                <button className="btn btn-primary" onClick={() => setShowTradeModal(true)}>
                                    <i className="fas fa-plus"></i> Take Trade
                                </button>
                            </div>
                        </div>

                        <div className="box-table-container">
                            <div className="box-table-header" style={{ gridTemplateColumns: 'minmax(140px, 1fr) 1fr 1fr 1fr 1fr 1fr 240px' }}>
                                <div onClick={() => requestSort('buy_timestamp')}>Date {sortConfig.key === 'buy_timestamp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('symbol')}>Symbol {sortConfig.key === 'symbol' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('total_qty')}>Qty {sortConfig.key === 'total_qty' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('buy_price')}>Buy Price {sortConfig.key === 'buy_price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('status')}>Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('total_cost')}>Total Cost {sortConfig.key === 'total_cost' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div>Actions</div>
                            </div>
                            {sortedMasterTrades.map(t => (
                                <React.Fragment key={t._id}>
                                    <div className={`box-table-row ${expandedRows.has(t._id) ? 'expanded' : ''}`}
                                        onClick={() => toggleRow(t._id)}
                                        style={{
                                            gridTemplateColumns: 'minmax(140px, 1fr) 1fr 1fr 1fr 1fr 1fr 240px',
                                            borderLeft: `4px solid ${t.status === 'CLOSED' ? 'var(--danger)' : 'var(--success)'}`
                                        }}>
                                        <div className="box-table-cell">
                                            <span className="cell-label">Date</span>
                                            <i className={`fas fa-chevron-${expandedRows.has(t._id) ? 'down' : 'right'}`} style={{ marginRight: '8px', color: 'var(--primary)', width: '12px' }}></i>
                                            {new Date(t.buy_timestamp).toLocaleDateString()}
                                        </div>
                                        <div className="box-table-cell" style={{ fontWeight: 'bold' }}>
                                            <span className="cell-label">Symbol</span>
                                            {t.symbol}
                                        </div>
                                        <div className="box-table-cell">
                                            <span className="cell-label">Qty</span>
                                            {t.total_qty}
                                        </div>
                                        <div className="box-table-cell font-mono">
                                            <span className="cell-label">Buy Price</span>
                                            ₹{t.buy_price.toFixed(2)}
                                        </div>
                                        <div className="box-table-cell">
                                            <span className="cell-label">Status</span>
                                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', background: t.status === 'CLOSED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: t.status === 'CLOSED' ? 'var(--danger)' : 'var(--success)', fontWeight: '700' }}>
                                                {t.status}
                                            </span>
                                        </div>
                                        <div className="box-table-cell font-mono" style={{ fontWeight: 'bold' }}>
                                            <span className="cell-label">Total Cost</span>
                                            ₹{(t.total_cost || 0).toLocaleString()}
                                        </div>
                                        <div className="box-table-cell" onClick={(e) => e.stopPropagation()}>
                                            {t.status === 'OPEN' && (
                                                <div style={{ display: 'flex', gap: '5px' }}>
                                                    {(t.allocated_qty || 0) === 0 && (
                                                        <button className="btn btn-primary" style={{ padding: '5px 8px', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); openAllocateModal(t); }}>Allocate</button>
                                                    )}
                                                    <button className="btn" style={{ padding: '5px 8px', fontSize: '0.75rem', background: 'var(--danger)', color: 'white', border: 'none' }} onClick={(e) => { e.stopPropagation(); openCloseModal(t); }}>Close Trade</button>
                                                    <button className="btn" style={{ padding: '5px 8px', fontSize: '0.75rem', background: 'var(--warning)', color: 'white', border: 'none' }} onClick={(e) => { e.stopPropagation(); openFlagModal(t, 'TEM_CLOSE'); }}>M to M</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {expandedRows.has(t._id) && (
                                        <div style={{ padding: '1.5rem', background: 'var(--bg-body)', borderRadius: '0 0 12px 12px', marginTop: '-12px', marginBottom: '12px', border: '1px solid var(--border)', borderTop: 'none' }}>
                                            <div style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase' }}>Current Allocations</span>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                                                {allocations.filter(a => a.master_trade_id?._id === t._id).length > 0 ? (
                                                    allocations.filter(a => a.master_trade_id?._id === t._id).map(alloc => (
                                                        <div key={alloc._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{alloc.user_name || alloc.mob_num}</span>
                                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{alloc.mob_num}</span>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{alloc.allocation_qty} Qty</div>
                                                                <div style={{ fontSize: '0.7rem', color: alloc.status === 'CLOSED' ? 'var(--danger)' : 'var(--success)' }}>{alloc.status}</div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No users allocated yet.</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                );
            case 'current_tbl':
                return (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
                            <h2 style={{ fontSize: '1.2rem' }}>Current Open Positions (Live via Daily Active Price)</h2>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <input
                                    type="date"
                                    value={currentDateFilter}
                                    onChange={(e) => setCurrentDateFilter(e.target.value)}
                                    style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
                                />
                                <button className="btn" onClick={fetchCurrentTable}>
                                    <i className="fas fa-sync"></i> Refresh
                                </button>
                            </div>
                        </div>
                        <div className="box-table-container">
                            <div className="box-table-header" style={{ gridTemplateColumns: '1.2fr 1fr 1.2fr 0.8fr 1fr 1fr 1fr' }}>
                                <div onClick={() => requestSort('date')}>Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('symbol')}>Symbol {sortConfig.key === 'symbol' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('user_name')}>User {sortConfig.key === 'user_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('total_qty')}>Qty {sortConfig.key === 'total_qty' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('buy_price')}>Avg Buy {sortConfig.key === 'buy_price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('current_price')}>CMP {sortConfig.key === 'current_price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('unrealized_pnl')}>P/L {sortConfig.key === 'unrealized_pnl' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                            </div>
                            {sortedCurrentTrades.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: '12px', marginTop: '1rem' }}>No open trades or fetching data...</div>
                            ) : sortedCurrentTrades.map(t => (
                                <div className="box-table-row" key={t.allocation_id} style={{ gridTemplateColumns: '1.2fr 1fr 1.2fr 0.8fr 1fr 1fr 1fr', borderLeft: `4px solid ${t.unrealized_pnl >= 0 ? 'var(--success)' : 'var(--danger)'}` }}>
                                    <div className="box-table-cell">
                                        <span className="cell-label">Date</span>
                                        {new Date(t.date).toLocaleString()}
                                    </div>
                                    <div className="box-table-cell" style={{ fontWeight: 'bold' }}>
                                        <span className="cell-label">Symbol</span>
                                        {t.symbol}
                                    </div>
                                    <div className="box-table-cell" style={{ fontWeight: 'bold' }}>
                                        <span className="cell-label">User</span>
                                        {getUserDisplayName(t.mob_num, t.user_name)}
                                    </div>
                                    <div className="box-table-cell">
                                        <span className="cell-label">Qty</span>
                                        {t.total_qty}
                                    </div>
                                    <div className="box-table-cell font-mono">
                                        <span className="cell-label">Avg Buy</span>
                                        ₹{t.buy_price.toFixed(2)}
                                    </div>
                                    <div className="box-table-cell font-mono" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                                        <span className="cell-label">CMP</span>
                                        ₹{t.current_price.toFixed(2)}
                                    </div>
                                    <div className="box-table-cell font-mono" style={{ fontWeight: 'bold', color: t.unrealized_pnl >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                        <span className="cell-label">P/L</span>
                                        {t.unrealized_pnl >= 0 ? '+' : ''}₹{t.unrealized_pnl.toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'allocation_tbl':
                return (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
                            <h2 style={{ fontSize: '1.2rem' }}>Trade Allocations</h2>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex' }}>
                                    <input
                                        type="text"
                                        placeholder="Search Symbol, Mobile, or ID..."
                                        value={allocSearchInput}
                                        onChange={(e) => setAllocSearchInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && setAllocSearch(allocSearchInput)}
                                        style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px 0 0 6px', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
                                    />
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setAllocSearch(allocSearchInput)}
                                        style={{ borderRadius: '0 6px 6px 0', borderLeft: 'none', padding: '8px 12px' }}
                                    >
                                        Search
                                    </button>
                                </div>
                                <select
                                    value={allocFilterStatus}
                                    onChange={(e) => setAllocFilterStatus(e.target.value)}
                                    style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="OPEN">Open</option>
                                    <option value="CLOSED">Closed</option>
                                </select>
                                <button className="btn" style={{ background: '#10b981', color: 'white', padding: '8px 12px' }} onClick={downloadAdminExcel}>
                                    <i className="fas fa-file-excel"></i> Excel
                                </button>
                            </div>
                        </div>
                        <div className="box-table-container">
                            <div className="box-table-header" style={{ gridTemplateColumns: 'minmax(120px, 1.2fr) 1.2fr 1fr 0.7fr 1fr 0.8fr 1.2fr 1fr 0.8fr 1.2fr 0.8fr' }}>
                                <div onClick={() => requestSort('buy_timestamp')}>Date {sortConfig.key === 'buy_timestamp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('user_name')}>User {sortConfig.key === 'user_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('master_trade_id.symbol')}>Symbol {sortConfig.key === 'master_trade_id.symbol' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('allocation_qty')}>Qty {sortConfig.key === 'allocation_qty' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div>Buy Price</div>
                                <div>Buy Brok</div>
                                <div>Total Buy</div>
                                <div>Sell Price</div>
                                <div>Sell Brok</div>
                                <div>Total Sell</div>
                                <div onClick={() => requestSort('client_pnl')}>P&L {sortConfig.key === 'client_pnl' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                            </div>
                            {sortedAllocations.map(a => {
                                const qty = a.allocation_qty || 0;
                                const isClosed = a.status === 'CLOSED';

                                // Find user to get their current brokerage % if not locked in the record
                                const userObj = users.find(u => String(u.mob_num).replace(/^0+/, '') === String(a.mob_num).replace(/^0+/, ''));
                                const brokRate = a.user_brokerage_rate !== undefined ? a.user_brokerage_rate : (userObj ? userObj.brokerage : 2);

                                // Formulas: (Price * Rate%) * Qty
                                const rawBuyVal = a.total_value || (a.allocation_price * qty);

                                // If DB has 0 for brokerage (old records), calculate it on the fly for display
                                const buyBrokAmount = (a.buy_brokerage !== undefined && a.buy_brokerage !== 0) ? a.buy_brokerage : (rawBuyVal * (brokRate / 100));
                                const totalBuy = rawBuyVal + buyBrokAmount;

                                const rawSellPriceTotal = a.exit_value || 0;
                                const sellBrokAmount = (a.sell_brokerage !== undefined && a.sell_brokerage !== 0) ? a.sell_brokerage : (isClosed ? (rawSellPriceTotal * (brokRate / 100)) : 0);
                                const totalSell = isClosed ? (rawSellPriceTotal - sellBrokAmount) : 0;

                                return (
                                    <div className="box-table-row" key={a._id} style={{ gridTemplateColumns: 'minmax(120px, 1.2fr) 1.2fr 1fr 0.7fr 1fr 0.8fr 1.2fr 1fr 0.8fr 1.2fr 0.8fr', borderLeft: `4px solid ${isClosed ? (a.client_pnl >= 0 ? 'var(--success)' : 'var(--danger)') : 'var(--warning)'}` }}>
                                        <div className="box-table-cell">
                                            <span className="cell-label">Date</span>
                                            {new Date(a.buy_timestamp).toLocaleDateString()}
                                        </div>
                                        <div className="box-table-cell" style={{ fontWeight: 'bold' }}>
                                            <span className="cell-label">User</span>
                                            {getUserDisplayName(a.mob_num, a.user_name)}
                                        </div>
                                        <div className="box-table-cell" style={{ fontWeight: 'bold' }}>
                                            <span className="cell-label">Symbol</span>
                                            {a.master_trade_id?.symbol}
                                        </div>
                                        <div className="box-table-cell">
                                            <span className="cell-label">Qty</span>
                                            {qty}
                                        </div>
                                        <div className="box-table-cell font-mono">
                                            <span className="cell-label">Buy Price</span>
                                            ₹{rawBuyVal.toFixed(0)}
                                        </div>
                                        <div className="box-table-cell font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            <span className="cell-label">Buy Brok</span>
                                            ₹{buyBrokAmount.toFixed(0)} <span style={{ fontSize: '0.65rem' }}>({brokRate}%)</span>
                                        </div>
                                        <div className="box-table-cell font-mono" style={{ fontWeight: '600' }}>
                                            <span className="cell-label">Total Buy</span>
                                            ₹{totalBuy.toFixed(0)}
                                        </div>
                                        <div className="box-table-cell font-mono">
                                            <span className="cell-label">Sell Price</span>
                                            {isClosed ? `₹${rawSellPriceTotal.toFixed(0)}` : '-'}
                                        </div>
                                        <div className="box-table-cell font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            <span className="cell-label">Sell Brok</span>
                                            {isClosed ? <>₹{sellBrokAmount.toFixed(0)} <span style={{ fontSize: '0.65rem' }}>({brokRate}%)</span></> : '-'}
                                        </div>
                                        <div className="box-table-cell font-mono" style={{ fontWeight: '600' }}>
                                            <span className="cell-label">Total Sell</span>
                                            {isClosed ? `₹${totalSell.toFixed(0)}` : '-'}
                                        </div>
                                        <div className="box-table-cell font-mono" style={{ fontWeight: 'bold', color: isClosed ? (a.client_pnl >= 0 ? 'var(--success)' : 'var(--danger)') : 'inherit' }}>
                                            <span className="cell-label">P&L</span>
                                            {isClosed ? `${a.client_pnl >= 0 ? '+' : ''}₹${(a.client_pnl || 0).toFixed(0)}` : 'OPEN'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            case 'gl_ledger':
                return (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.2rem' }}>Global Ledger</h2>
                            <button className="btn" style={{ background: '#10b981', color: 'white', padding: '8px 12px' }} onClick={downloadAdminExcel}>
                                <i className="fas fa-file-excel"></i> Excel
                            </button>
                        </div>
                        <div className="box-table-container">
                            <div className="box-table-header" style={{ gridTemplateColumns: '1.2fr 1.2fr 1.5fr 1fr 1fr 1.2fr' }}>
                                <div onClick={() => requestSort('entry_date')}>Timestamp {sortConfig.key === 'entry_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('user_name')}>User {sortConfig.key === 'user_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('description')}>Description {sortConfig.key === 'description' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('amt_cr')}>Credit {sortConfig.key === 'amt_cr' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('amt_dr')}>Debit {sortConfig.key === 'amt_dr' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('cls_balance')}>Closing Bal {sortConfig.key === 'cls_balance' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                            </div>
                            {sortedLedger.map(l => (
                                <div className="box-table-row" key={l._id} style={{ gridTemplateColumns: '1.2fr 1.2fr 1.5fr 1fr 1fr 1.2fr' }}>
                                    <div className="box-table-cell">
                                        <span className="cell-label">Timestamp</span>
                                        {new Date(l.entry_date).toLocaleString()}
                                    </div>
                                    <div className="box-table-cell" style={{ fontWeight: 'bold' }}>
                                        <span className="cell-label">User</span>
                                        {getUserDisplayName(l.mob_num, l.user_name)}
                                    </div>
                                    <div className="box-table-cell">
                                        <span className="cell-label">Description</span>
                                        {l.description}
                                    </div>
                                    <div className="box-table-cell font-mono" style={{ color: 'var(--success)' }}>
                                        <span className="cell-label">Credit</span>
                                        {l.amt_cr > 0 ? `₹ ${l.amt_cr.toLocaleString()}` : '-'}
                                    </div>
                                    <div className="box-table-cell font-mono" style={{ color: 'var(--danger)' }}>
                                        <span className="cell-label">Debit</span>
                                        {l.amt_dr > 0 ? `₹ ${l.amt_dr.toLocaleString()}` : '-'}
                                    </div>
                                    <div className="box-table-cell font-mono" style={{ fontWeight: 'bold' }}>
                                        <span className="cell-label">Balance</span>
                                        ₹ {(l.cls_balance || 0).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default:
                const stats = {
                    totalUsers: users.filter(u => u.role !== 'admin').length,
                    activeTrades: masterTrades.filter(t => t.status === 'OPEN').length,
                    totalBalance: users.reduce((sum, u) => sum + (u.current_balance || 0), 0),
                    totalAllocated: allocations.reduce((sum, a) => sum + (a.allocation_qty || 0), 0)
                };

                return (
                    <div className="admin-grid-container">
                        <div className="card" style={{ minHeight: '350px' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Details & Data Flow</h3>
                            <div style={{ padding: '1.5rem', background: 'var(--bg-body)', borderRadius: '12px', border: '1px dashed var(--border)', flexGrow: 1 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div style={{ padding: '15px', background: 'var(--bg-card)', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Clients</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{stats.totalUsers}</div>
                                    </div>
                                    <div style={{ padding: '15px', background: 'var(--bg-card)', borderRadius: '8px', borderLeft: '3px solid var(--success)' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Open Master Trades</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{stats.activeTrades}</div>
                                    </div>
                                    <div style={{ padding: '15px', background: 'var(--bg-card)', borderRadius: '8px', borderLeft: '3px solid var(--warning)' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Global Balance</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>₹ {stats.totalBalance.toLocaleString()}</div>
                                    </div>
                                    <div style={{ padding: '15px', background: 'var(--bg-card)', borderRadius: '8px', borderLeft: '3px solid var(--danger)' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Allocated Qty</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{stats.totalAllocated}</div>
                                    </div>
                                </div>
                                <p className="text-muted" style={{ marginTop: '20px', fontSize: '0.8rem', textAlign: 'center' }}>
                                    Select a client or trade from the master table for deeper insights.
                                </p>
                            </div>
                        </div>
                        <div className="card" style={{ minHeight: '350px', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', alignSelf: 'flex-start' }}>Global By User Allocation</h3>
                            <div style={{ width: '100%', height: '280px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                {users.length > 0 ? (
                                    <Pie options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} data={doughnutData} />
                                ) : (
                                    <p className="text-muted" style={{ marginTop: '50px' }}>Add users to see chart</p>
                                )}
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="app-container">
            {/* Create User Modal */}
            {showUserModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Create New User</h3>
                        <form onSubmit={handleCreateUser}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>User Name</label>
                            <input style={inputStyle} type="text" value={newUser.user_name} onChange={e => setNewUser({ ...newUser, user_name: e.target.value })} required />

                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Mobile Number</label>
                            <input style={inputStyle} type="text" value={newUser.mob_num} onChange={e => setNewUser({ ...newUser, mob_num: e.target.value.replace(/\D/g, '').slice(0, 10) })} required />

                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Password</label>
                            <input style={inputStyle} type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />

                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Brokerage Fee (%)</label>
                            <input style={inputStyle} type="number" value={newUser.brokerage} onChange={e => setNewUser({ ...newUser, brokerage: e.target.value })} />

                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Initial Balance</label>
                            <input style={inputStyle} type="number" value={newUser.current_balance} onChange={e => setNewUser({ ...newUser, current_balance: e.target.value })} />

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create</button>
                                <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setShowUserModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditUserModal && editingUser && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Edit User</h3>
                        <form onSubmit={handleEditUser}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>User Name</label>
                            <input style={inputStyle} type="text" value={editingUser.user_name} onChange={e => setEditingUser({ ...editingUser, user_name: e.target.value })} required />

                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Mobile Number</label>
                            <input style={inputStyle} type="text" value={editingUser.mob_num} onChange={e => setEditingUser({ ...editingUser, mob_num: e.target.value.replace(/\D/g, '').slice(0, 10) })} required />

                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>New Password (leave blank to keep current)</label>
                            <input style={inputStyle} type="password" placeholder="***" onChange={e => setEditingUser({ ...editingUser, password: e.target.value })} />

                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Brokerage Fee (%)</label>
                            <input style={inputStyle} type="number" value={editingUser.brokerage !== undefined ? editingUser.brokerage : 2} onChange={e => setEditingUser({ ...editingUser, brokerage: e.target.value })} />

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                                <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setShowEditUserModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Funds Modal */}
            {showFundsModal && fundsUser && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Manage Funds: {fundsUser.user_name}</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>Current Balance: <strong>₹ {fundsUser.current_balance.toLocaleString()}</strong></p>
                        <form>
                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Amount</label>
                            <input style={inputStyle} type="number" value={fundsAmount} onChange={e => setFundsAmount(e.target.value)} required />

                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Description (optional)</label>
                            <input style={inputStyle} type="text" value={fundsDescription} onChange={e => setFundsDescription(e.target.value)} />

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="button" className="btn btn-primary" style={{ flex: 1, backgroundColor: 'var(--success)', border: 'none' }} onClick={(e) => handleFundsSubmit(e, 'add')}>Add Funds</button>
                                <button type="button" className="btn btn-primary" style={{ flex: 1, backgroundColor: 'var(--danger)', border: 'none' }} onClick={(e) => handleFundsSubmit(e, 'withdraw')}>Withdraw</button>
                            </div>
                            <button type="button" className="btn" style={{ width: '100%', marginTop: '10px' }} onClick={() => setShowFundsModal(false)}>Cancel</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Execute Master Trade Modal */}
            {showTradeModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Execute Master Trade</h3>
                        <form onSubmit={handleCreateTrade}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Symbol (e.g., NIFTY)</label>
                            <input style={inputStyle} type="text" placeholder="NIFTY" value={newTrade.symbol} onChange={e => setNewTrade({ ...newTrade, symbol: e.target.value })} required />

                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Total Quantity</label>
                            <input style={inputStyle} type="number" value={newTrade.total_qty} onChange={e => setNewTrade({ ...newTrade, total_qty: e.target.value })} required />

                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Buy Price</label>
                            <input style={inputStyle} type="number" step="0.01" value={newTrade.buy_price} onChange={e => setNewTrade({ ...newTrade, buy_price: e.target.value })} required />


                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1 }}>{isSubmitting ? 'Wait...' : 'Create Trade'}</button>
                                <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setShowTradeModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Allocate Trade Modal */}
            {/* Allocate Trade Modal */}
            {showAllocateModal && selectedTrade && (() => {
                const totalAllocated = allocationInputs.reduce((sum, a) => sum + Number(a.allocation_qty || 0), 0);
                const isFullyAllocated = totalAllocated === selectedTrade.total_qty;

                // Filter users for the searchable dropdown
                const filteredSearchUsers = users
                    .filter(u => u.role !== 'admin' && u.status === 'active')
                    .filter(u => !allocationInputs.find(a => a.mob_num === u.mob_num))
                    .filter(u =>
                        allocUserSearch === '' ||
                        u.user_name.toLowerCase().includes(allocUserSearch.toLowerCase()) ||
                        String(u.mob_num).includes(allocUserSearch)
                    )
                    .sort((a, b) => a.user_name.localeCompare(b.user_name));

                return (
                    <div style={modalOverlayStyle}>
                        <div style={{ ...modalContentStyle, maxWidth: '500px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Allocate "{selectedTrade.symbol}"</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                                Master Qty: <strong>{selectedTrade.total_qty}</strong> | Allocated: <strong style={{ color: isFullyAllocated ? 'var(--success)' : 'var(--danger)' }}>{totalAllocated}</strong>
                            </p>

                            {/* User Search Dropdown Section */}
                            {!isFullyAllocated && (
                                <div style={{ marginBottom: '20px', position: 'relative' }}>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Search & Add User</label>
                                    <input
                                        type="text"
                                        placeholder="Type name or mobile to find users..."
                                        value={allocUserSearch}
                                        onFocus={() => setIsSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                        onChange={e => setAllocUserSearch(e.target.value)}
                                        style={inputStyle}
                                    />
                                    {isSearchFocused && filteredSearchUsers.length > 0 && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e293b', border: '1px solid var(--border)', borderRadius: '8px', zIndex: 100, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)', marginTop: '5px', maxHeight: '200px', overflowY: 'auto' }}>
                                            <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(59, 130, 246, 0.1)' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary)' }}>AVAILABLE USERS</span>
                                                <button
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setAllocationInputs(prev => [...prev, ...filteredSearchUsers.map(u => ({
                                                            mob_num: u.mob_num,
                                                            name: u.user_name,
                                                            allocation_qty: 0
                                                        }))].sort((a, b) => a.name.localeCompare(b.name)));
                                                        setAllocUserSearch('');
                                                    }}
                                                    style={{ background: 'var(--primary)', border: 'none', color: 'white', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    Add All Visible
                                                </button>
                                            </div>
                                            {filteredSearchUsers.map(u => (
                                                <div
                                                    key={u._id}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setAllocationInputs(prev => [...prev, {
                                                            mob_num: u.mob_num,
                                                            name: u.user_name,
                                                            allocation_qty: 0 // Allow admin to enter qty or pre-fill remaining
                                                        }].sort((a, b) => a.name.localeCompare(b.name)));
                                                        setAllocUserSearch('');
                                                    }}
                                                    style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.9rem', hover: { background: 'var(--bg-body)' } }}
                                                >
                                                    {u.user_name} ({u.mob_num})
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '20px', padding: '5px' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'block', marginBottom: '10px', color: 'var(--text-muted)' }}>Selected Users ({allocationInputs.length})</label>
                                {allocationInputs.length === 0 ? (
                                    <p style={{ fontSize: '0.85rem', textAlign: 'center', color: 'var(--text-muted)', padding: '10px' }}>No users selected. Search above to add.</p>
                                ) : (
                                    allocationInputs.map(alloc => (
                                        <div key={alloc.mob_num} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', background: 'var(--bg-body)', padding: '10px', borderRadius: '6px' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{alloc.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{alloc.mob_num}</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <input
                                                    type="number"
                                                    value={alloc.allocation_qty}
                                                    onChange={e => handleAllocationQtyChange(alloc.mob_num, e.target.value)}
                                                    style={{ width: '80px', padding: '5px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', textAlign: 'right' }}
                                                    min="0"
                                                />
                                                <button
                                                    onClick={() => setAllocationInputs(prev => prev.filter(al => al.mob_num !== alloc.mob_num))}
                                                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '5px' }}
                                                >
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={submitAllocation}
                                    disabled={isSubmitting || !isFullyAllocated}
                                    className="btn btn-primary"
                                    style={{
                                        flex: 2,
                                        opacity: (!isFullyAllocated || isSubmitting) ? 0.5 : 1,
                                        cursor: (!isFullyAllocated || isSubmitting) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {isSubmitting ? 'Wait...' : isFullyAllocated ? 'Submit Allocation' : `Remaining: ${selectedTrade.total_qty - totalAllocated}`}
                                </button>
                                <button onClick={() => setShowAllocateModal(false)} className="btn" style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Close Trade Modal */}
            {showCloseModal && selectedTrade && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Close "{selectedTrade.symbol}"</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                            Closing this trade will automatically close all child allocations, calculate P&L, and update the Ledger entries for each user.
                        </p>
                        {selectedTrade.live_price !== null && selectedTrade.live_price !== undefined && (
                            <p style={{ fontSize: '0.9rem', marginBottom: '15px', padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                Live CMP: <strong style={{ fontFamily: 'monospace', color: '#3b82f6', fontSize: '1.1rem' }}>₹ {selectedTrade.live_price.toFixed(2)}</strong>
                            </p>
                        )}
                        <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Sell Price</label>
                        <input style={inputStyle} type="number" step="0.01" value={closePrice} onChange={e => setClosePrice(e.target.value)} required />

                        {/* Brokerage Price will be calculated automatically based on user specific % */}

                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button onClick={submitCloseTrade} disabled={!closePrice || isSubmitting} className="btn btn-primary" style={{ flex: 1, background: 'var(--danger)', border: 'none' }}>{isSubmitting ? 'Wait...' : 'Confirm Close'}</button>
                            <button onClick={() => setShowCloseModal(false)} className="btn" style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Trigger Flag Modal */}
            {showFlagModal && selectedTrade && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Trigger {flagType} - "{selectedTrade.symbol}"</h3>
                        <form onSubmit={submitFlag}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Day</label>
                            <input style={inputStyle} type="number" value={flagInputs.day} onChange={e => setFlagInputs({ ...flagInputs, day: e.target.value })} required min="1" />

                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Active Price</label>
                            <input style={inputStyle} type="number" step="0.01" value={flagInputs.activePrice} onChange={e => setFlagInputs({ ...flagInputs, activePrice: e.target.value })} required />

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1, background: flagType === 'TEM_OPEN' ? '#3b82f6' : '#f59e0b', border: 'none' }}>
                                    {isSubmitting ? 'Wait...' : 'Set Active Price'}
                                </button>
                                <button type="button" onClick={() => setShowFlagModal(false)} className="btn" style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Trade Details / Allocations Modal */}
            {showTradeDetailsModal && detailsTrade && (
                <div style={modalOverlayStyle}>
                    <div style={{ ...modalContentStyle, maxWidth: '600px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0 }}>Trade Details: {detailsTrade.symbol}</h3>
                            <button className="btn" onClick={() => setShowTradeDetailsModal(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}><i className="fas fa-times"></i></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px', background: 'var(--bg-body)', padding: '15px', borderRadius: '8px' }}>
                            <div>
                                <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>Master ID</p>
                                <p style={{ margin: 0, fontWeight: 'bold', fontFamily: 'monospace' }}>{detailsTrade.master_trade_id}</p>
                            </div>
                            <div>
                                <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>Status</p>
                                <p style={{ margin: 0, fontWeight: 'bold', color: detailsTrade.status === 'OPEN' ? 'var(--success)' : 'var(--danger)' }}>{detailsTrade.status}</p>
                            </div>
                            <div>
                                <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>Total Qty</p>
                                <p style={{ margin: 0, fontWeight: 'bold' }}>{detailsTrade.total_qty}</p>
                            </div>
                            <div>
                                <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>Buy Price</p>
                                <p style={{ margin: 0, fontWeight: 'bold', fontFamily: 'monospace' }}>₹ {(detailsTrade.buy_price || 0).toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>Buy Brokerage</p>
                                <p style={{ margin: 0, fontWeight: 'bold', fontFamily: 'monospace' }}>₹ {(detailsTrade.buy_brokerage || 0).toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-muted" style={{ margin: 0, fontSize: '0.8rem' }}>Sell Brokerage</p>
                                <p style={{ margin: 0, fontWeight: 'bold', fontFamily: 'monospace' }}>{detailsTrade.status === 'CLOSED' ? `₹ ${(detailsTrade.sell_brokerage || 0).toFixed(2)}` : '-'}</p>
                            </div>
                        </div>

                        <h4 style={{ fontSize: '0.95rem', marginBottom: '10px' }}>Allocations ({tradeDetailsAllocations.length})</h4>
                        {tradeDetailsAllocations.length === 0 ? (
                            <p className="text-muted" style={{ fontSize: '0.85rem' }}>No users have been allocated to this trade yet.</p>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead style={{ borderBottom: '1px solid var(--border)' }}>
                                        <tr>
                                            <th style={{ padding: '8px', textAlign: 'left', color: 'var(--text-muted)' }}>User Name</th>
                                            <th style={{ padding: '8px', textAlign: 'right', color: 'var(--text-muted)' }}>Qty</th>
                                            <th style={{ padding: '8px', textAlign: 'right', color: 'var(--text-muted)' }}>P&L</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tradeDetailsAllocations.map(a => (
                                            <tr key={a._id} style={{ borderBottom: '1px dashed var(--border)' }}>
                                                <td style={{ padding: '8px', fontWeight: 'bold' }}>{getUserDisplayName(a.mob_num, a.user_name)}</td>
                                                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>{a.allocation_qty}</td>
                                                <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', color: a.client_pnl >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                                    {a.status === 'CLOSED' ? `₹${a.client_pnl}` : 'OPEN'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <button className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={() => setShowTradeDetailsModal(false)}>Close</button>
                    </div>
                </div>
            )}

            {/* Global Funds Modal */}
            {showGlobalFundsModal && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>{globalFundsType === 'add' ? 'Add Funds' : 'Withdraw Funds'}</h3>
                        <form onSubmit={handleGlobalFundsSubmit}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>User</label>
                            <select
                                style={inputStyle}
                                value={globalFundsUserId}
                                onChange={(e) => setGlobalFundsUserId(e.target.value)}
                                required
                            >
                                <option value="">Select a User</option>
                                {users.filter(u => u.status === 'active' && u.role !== 'admin').map(u => (
                                    <option key={u._id} value={u._id}>{u.user_name} ({u.mob_num})</option>
                                ))}
                            </select>

                            {globalFundsUserId && (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                                    Current Balance: <strong>₹ {(users.find(u => u._id === globalFundsUserId)?.current_balance || 0).toLocaleString()}</strong>
                                </p>
                            )}

                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Amount</label>
                            <input
                                style={inputStyle}
                                type="number"
                                value={globalFundsAmount}
                                onChange={e => setGlobalFundsAmount(e.target.value)}
                                required
                                min="1"
                                max={globalFundsType === 'withdraw' && globalFundsUserId ? users.find(u => u._id === globalFundsUserId)?.current_balance : undefined}
                            />

                            <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Description (Optional)</label>
                            <input
                                style={inputStyle}
                                type="text"
                                value={globalFundsDescription}
                                onChange={e => setGlobalFundsDescription(e.target.value)}
                                placeholder={globalFundsType === 'add' ? 'e.g., Bank Transfer' : 'e.g., Client Request'}
                            />

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1, background: globalFundsType === 'add' ? '#10b981' : '#ef4444', border: 'none' }}>
                                    {isSubmitting ? 'Wait...' : globalFundsType === 'add' ? 'Confirm Addition' : 'Confirm Withdrawal'}
                                </button>
                                <button type="button" onClick={() => setShowGlobalFundsModal(false)} className="btn" style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* User Profile Details Modal (Simplified) */}
            {showUserProfileModal && selectedUserProfile && (
                <div style={modalOverlayStyle}>
                    <div style={{ ...modalContentStyle, maxWidth: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0 }}>Client Profile: {selectedUserProfile.user_name}</h3>
                            <button className="btn" onClick={() => setShowUserProfileModal(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}><i className="fas fa-times"></i></button>
                        </div>
                        <div style={{ background: 'var(--bg-body)', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                            <p><strong>Client ID:</strong> {selectedUserProfile.client_id}</p>
                            <p><strong>Mobile:</strong> {selectedUserProfile.mob_num}</p>
                            <p><strong>Current Balance:</strong> ₹ {(selectedUserProfile.current_balance || 0).toLocaleString()}</p>

                        </div>
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowUserProfileModal(false)}>Close</button>
                    </div>
                </div>
            )}

            {/* Main Navigation and Content */}
            <nav className="sidebar">
                <div className="logo" onClick={() => setActiveTab('dashboard')} style={{ cursor: 'pointer' }}>
                    <div style={{ width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '8px', display: 'grid', placeItems: 'center', color: 'white', flexShrink: 0 }}>
                        <i className="fas fa-user-shield"></i>
                    </div>
                    Admin Panel
                </div>

                <div className="nav-group">
                    <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} style={{ cursor: 'pointer' }}>
                        <i className="fas fa-home"></i> DASHBOARD
                    </div>
                    <div className={`nav-item ${activeTab === 'user_detail' ? 'active' : ''}`} onClick={() => setActiveTab('user_detail')} style={{ cursor: 'pointer' }}>
                        <i className="fas fa-user-edit"></i> USER DETAIL
                    </div>
                    <div className={`nav-item ${activeTab === 'master_tbl' ? 'active' : ''}`} onClick={() => setActiveTab('master_tbl')} style={{ cursor: 'pointer' }}>
                        <i className="fas fa-table"></i> MASTER TBL
                    </div>
                    <div className={`nav-item ${activeTab === 'allocation_tbl' ? 'active' : ''}`} onClick={() => setActiveTab('allocation_tbl')} style={{ cursor: 'pointer' }}>
                        <i className="fas fa-tasks"></i> ALLOCATION TBL
                    </div>
                    <div className={`nav-item ${activeTab === 'current_tbl' ? 'active' : ''}`} onClick={() => setActiveTab('current_tbl')} style={{ cursor: 'pointer', color: 'var(--success)' }}>
                        <i className="fas fa-chart-line"></i> CURRENT TBL (Live)
                    </div>
                    <div className={`nav-item ${activeTab === 'gl_ledger' ? 'active' : ''}`} onClick={() => setActiveTab('gl_ledger')} style={{ cursor: 'pointer' }}>
                        <i className="fas fa-book"></i> GL LEDGER
                    </div>
                    <div className="nav-item" onClick={handleLogout} style={{ marginTop: 'auto', color: 'var(--danger)', cursor: 'pointer' }}>
                        <i className="fas fa-sign-out-alt"></i> Logout
                    </div>
                </div>
            </nav>

            <main className="main-content">
                <header className="top-bar" style={{ paddingRight: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '600', letterSpacing: '1px', margin: 0, cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>ADMIN DASHBOARD</h2>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button className="btn" style={{ padding: '8px' }} onClick={() => setDarkMode(!darkMode)}>
                            <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`}></i>
                        </button>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ textAlign: 'right' }} className="d-none d-md-block">
                                    <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>Developer</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Admin</div>
                                </div>
                                <div style={{ width: '36px', height: '36px', background: 'var(--primary)', borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'white' }}>
                                    AD
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="scroll-area">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;