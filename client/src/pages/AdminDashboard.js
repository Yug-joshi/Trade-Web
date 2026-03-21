import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { Doughnut, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import Rules from './Rules';
import Layout from '../components/Layout';

ChartJS.register(ArcElement, Tooltip, Legend);

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [darkMode, setDarkMode] = useState(() => localStorage.getItem('adminTheme') === 'dark');
    const activeTab = searchParams.get('tab') || 'dashboard';
    const setActiveTab = (tab) => setSearchParams({ tab });
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
    const [ledgerSearchInput, setLedgerSearchInput] = useState('');
    const [ledgerSearch, setLedgerSearch] = useState('');

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

    const [showPartialModal, setShowPartialModal] = useState(false);
    const [selectedAllocation, setSelectedAllocation] = useState(null);
    const [partialSellQty, setPartialSellQty] = useState('');
    const [partialSellPrice, setPartialSellPrice] = useState('');

    // Trigger Flag Modal
    const [showFlagModal, setShowFlagModal] = useState(false);
    const [showTradeConfirmModal, setShowTradeConfirmModal] = useState(false);
    const [showAllocConfirmModal, setShowAllocConfirmModal] = useState(false);
    const [showPartialConfirmModal, setShowPartialConfirmModal] = useState(false);
    const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
    const [showFlagConfirmModal, setShowFlagConfirmModal] = useState(false);
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

    const handleCreateTrade = (e) => {
        e.preventDefault();
        setShowTradeConfirmModal(true);
    };

    const handleFinalTradeConfirm = async () => {
        setIsSubmitting(true);
        try {
            await api.post('/trades', newTrade);
            setNewTrade({ symbol: '', total_qty: '', buy_price: '' });
            setShowTradeConfirmModal(false);
            setShowTradeModal(false);
            fetchDashboardData();
            alert("Master Trade Executed!");
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

    const submitAllocation = () => {
        const totalAllocated = allocationInputs.reduce((sum, a) => sum + Number(a.allocation_qty), 0);
        if (totalAllocated !== selectedTrade.total_qty) {
            alert(`You must allocate the exact Master Trade Quantity (${selectedTrade.total_qty}) at once!`);
            return;
        }
        setShowAllocConfirmModal(true);
    };

    const handleFinalAllocConfirm = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                allocations: allocationInputs.filter(a => a.allocation_qty > 0)
            };
            await api.post(`/trades/${selectedTrade._id}/allocate`, payload);
            alert("Allocations successful!");
            setShowAllocConfirmModal(false);
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

    const submitCloseTrade = () => {
        if (!closePrice) return alert("Please enter a closing price");
        setShowCloseConfirmModal(true);
    };

    const handleFinalCloseTrade = async () => {
        setIsSubmitting(true);
        try {
            await api.post(`/trades/${selectedTrade._id}/close`, { sell_price: Number(closePrice) });
            alert("Trade closed successfully! Ledger updated.");
            setShowCloseConfirmModal(false);
            setShowCloseModal(false);
            fetchDashboardData();
        } catch (error) {
            alert(error.response?.data?.message || error.response?.data?.msg || "Error closing trade");
        }
        setIsSubmitting(false);
    };

    // ----- Partial Sell Logic -----
    const openPartialModal = (alloc, trade) => {
        setSelectedAllocation(alloc); // Can be null if opened from master level
        setSelectedTrade(trade);
        setPartialSellQty('');
        setPartialSellPrice('');
        setShowPartialModal(true);
    };

    const submitPartialSell = () => {
        if (!partialSellQty || !partialSellPrice) return alert("Please enter quantity and price");
        if (Number(partialSellQty) >= selectedAllocation.allocation_qty) {
            return alert("Quantity must be less than total allocation. Use regular close for full sell.");
        }
        setShowPartialConfirmModal(true);
    };

    const handleFinalPartialSell = async () => {
        setIsSubmitting(true);
        try {
            await api.post(`/trades/allocations/${selectedAllocation._id}/partial-sell`, {
                sell_qty: Number(partialSellQty),
                sell_price: Number(partialSellPrice)
            });
            alert("Pre close successful!");
            setShowPartialConfirmModal(false);
            setShowPartialModal(false);
            fetchDashboardData();
        } catch (error) {
            alert(error.response?.data?.message || error.response?.data?.msg || "Error executing pre close");
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

    const submitFlag = (e) => {
        e.preventDefault();
        if (!flagInputs.activePrice) return alert("Please enter price");
        setShowFlagConfirmModal(true);
    };

    const handleFinalFlag = async () => {
        setIsSubmitting(true);
        try {
            await api.post(`/trades/${selectedTrade._id}/trigger-flag`, {
                day: Number(flagInputs.day),
                flagType,
                activePrice: Number(flagInputs.activePrice)
            });
            alert(`${flagType === 'M to M' ? 'M to M' : flagType} executed successfully.`);
            setShowFlagConfirmModal(false);
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

    const sortedLedger = useMemo(() => {
        let filtered = ledger;
        if (ledgerSearch.trim()) {
            const lowerQuery = ledgerSearch.toLowerCase();
            filtered = filtered.filter(l => 
                (l.description && l.description.toLowerCase().includes(lowerQuery)) ||
                (l.user_name && l.user_name.toLowerCase().includes(lowerQuery)) ||
                (l.mob_num && String(l.mob_num).includes(lowerQuery))
            );
        }
        return sortedData(filtered, 'entry_date');
    }, [ledger, ledgerSearch, sortedData]);

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
    const confirmOverlayStyle = { ...modalOverlayStyle, zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.6)' };

    const renderContent = () => {
        const formatDate = (date) => {
            if (!date) return '-';
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = String(d.getFullYear()).slice(-2);
            return `${day}/${month}/${year}`;
        };

        const formatDateTime = (date) => {
            if (!date) return '-';
            const d = new Date(date);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = String(d.getFullYear()).slice(-2);
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        };

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
                            <div className="box-table-header" style={{ gridTemplateColumns: 'minmax(100px, 1fr) 1.5fr 1.2fr 0.8fr 1.2fr 0.8fr 40px 120px' }}>
                                <div onClick={() => requestSort('client_id')}>Client ID {sortConfig.key === 'client_id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('user_name')}>Name {sortConfig.key === 'user_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('mob_num')}>Mobile {sortConfig.key === 'mob_num' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('brokerage')}>Brok % {sortConfig.key === 'brokerage' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('current_balance')}>Balance {sortConfig.key === 'current_balance' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div onClick={() => requestSort('status')}>Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div>GL</div>
                                <div>Actions</div>
                            </div>
                            {sortedUsers.map(u => (
                                <div className="box-table-row" key={u._id} style={{ gridTemplateColumns: 'minmax(100px, 1fr) 1.5fr 1.2fr 0.8fr 1.2fr 0.8fr 40px 120px' }}>
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
                                    <div className="box-table-cell" style={{ display: 'flex', justifyContent: 'center' }}>
                                        <span className="cell-label">GL</span>
                                        <button 
                                            className="btn" 
                                            style={{ padding: '6px', fontSize: '0.8rem', background: 'var(--warning)', color: 'white', border: 'none', borderRadius: '4px' }}
                                            onClick={() => {
                                                setLedgerSearchInput(u.mob_num);
                                                setLedgerSearch(u.mob_num);
                                                setActiveTab('gl_ledger');
                                            }}
                                            title="View Ledger"
                                        >
                                            <i className="fas fa-file-invoice"></i>
                                        </button>
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
                            <h2 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Master Trade Book</h2>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex' }}>
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={masterSearchInput}
                                        onChange={(e) => setMasterSearchInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && setMasterSearch(masterSearchInput)}
                                        style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px 0 0 6px', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none', width: '120px' }}
                                    />
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setMasterSearch(masterSearchInput)}
                                        style={{ borderRadius: '0 6px 6px 0', borderLeft: 'none', padding: '8px 12px' }}
                                    >
                                        <i className="fas fa-search"></i>
                                    </button>
                                </div>
                                <select
                                    value={masterFilterStatus}
                                    onChange={(e) => setMasterFilterStatus(e.target.value)}
                                    style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none', fontSize: '0.85rem' }}
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="OPEN">Open</option>
                                    <option value="CLOSED">Closed</option>
                                    <option value="PERMANENT_CLOSE">Permanent Close</option>
                                </select>
                                <button className="btn" style={{ background: '#10b981', color: 'white', padding: '8px 12px', border: 'none' }} onClick={downloadAdminExcel}>
                                    <i className="fas fa-file-excel"></i> <span className="hide-mobile">Excel</span>
                                </button>
                                <button className="btn btn-primary" onClick={() => setShowTradeModal(true)} style={{ padding: '8px 12px' }}>
                                    <i className="fas fa-plus"></i> <span className="hide-mobile">Take Trade</span>
                                </button>
                            </div>
                        </div>

                        <div className="box-table-container" style={{ overflowX: 'auto', paddingBottom: '1rem', fontSize: '0.8rem' }}>
                            <div className="box-table-header" style={{ gridTemplateColumns: '50px 1.4fr 1.2fr 0.8fr 1.1fr 1.2fr 1.4fr 0.8fr 1.1fr 1.2fr 220px 0.9fr', minWidth: '1350px', gap: '0', borderBottom: '2px solid var(--primary)' }}>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Allocated Users">ALLOC</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Date of Buy Trade" onClick={() => requestSort('buy_timestamp')}>DATE {sortConfig.key === 'buy_timestamp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Trading Symbol" onClick={() => requestSort('symbol')}>SYMBOL {sortConfig.key === 'symbol' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Total Quantity Purchased" onClick={() => requestSort('total_qty')}>BUY_QTY {sortConfig.key === 'total_qty' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Average Buy Price" onClick={() => requestSort('buy_price')}>B_RATE</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Total Buy Value (Qty * Buy Price)" onClick={() => requestSort('total_cost')}>TOT_BUY</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Closing Date and Time">TIME</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Total Sold Quantity" onClick={() => requestSort('allocated_qty')}>SELL_QTY</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Exit/Sell Price">S_RATE</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Total Exit Value (Qty * Sell Price)" onClick={() => requestSort('total_exit_value')}>TOT_SELL</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Trade Actions">ACTIONS</div>
                                <div style={{ textAlign: 'center', padding: '10px 5px' }} title="Current Status" onClick={() => requestSort('status')}>STATUS</div>
                            </div>
                            {sortedMasterTrades.map(t => {
                                const isClosed = t.status === 'CLOSED';
                                const totalBuy = t.total_cost || (t.total_qty * t.buy_price);
                                const totalSell = t.total_exit_value || (isClosed ? (t.total_qty * t.sell_price) : 0);

                                return (
                                    <React.Fragment key={t._id}>
                                        <div className={`box-table-row ${expandedRows.has(t._id) ? 'expanded' : ''}`}
                                            onClick={() => toggleRow(t._id)}
                                            style={{
                                                gridTemplateColumns: '50px 1.4fr 1.2fr 0.8fr 1.1fr 1.2fr 1.4fr 0.8fr 1.1fr 1.2fr 220px 0.9fr',
                                                minWidth: '1350px',
                                                gap: '0',
                                                borderLeft: `4px solid ${isClosed ? 'var(--danger)' : 'var(--success)'}`,
                                                background: 'var(--bg-card)',
                                                marginBottom: '4px'
                                            }}>
                                            <div className="box-table-cell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                                <i className={`fas fa-chevron-${expandedRows.has(t._id) ? 'down' : 'right'}`} style={{ color: 'var(--primary)', cursor: 'pointer' }}></i>
                                            </div>
                                            <div className="box-table-cell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                                <span className="cell-label">Date</span>
                                                {formatDateTime(t.buy_timestamp || t.createdAt)}
                                            </div>
                                            <div className="box-table-cell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px', fontWeight: 'bold' }}>
                                                <span className="cell-label">Symbol</span>
                                                {t.symbol}
                                            </div>
                                            <div className="box-table-cell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                                <span className="cell-label">Buy_QTY</span>
                                                {t.total_qty}
                                            </div>
                                            <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                                <span className="cell-label">B_Rate</span>
                                                ₹{t.buy_price.toFixed(2)}
                                            </div>
                                            <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                                <span className="cell-label">Tot_Buy</span>
                                                ₹{totalBuy.toFixed(2)}
                                            </div>
                                            <div className="box-table-cell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px', fontSize: '0.7rem' }}>
                                                <span className="cell-label">Time</span>
                                                {isClosed ? formatDateTime(t.sell_timestamp) : '-'}
                                            </div>
                                            <div className="box-table-cell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                                <span className="cell-label">Sell_QTY</span>
                                                {isClosed ? t.total_qty : '-'}
                                            </div>
                                            <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                                <span className="cell-label">S_Rate</span>
                                                {isClosed ? `₹${(t.sell_price || 0).toFixed(2)}` : '-'}
                                            </div>
                                            <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                                <span className="cell-label">Tot_Sell</span>
                                                {isClosed ? `₹${(totalSell || 0).toFixed(2)}` : '-'}
                                            </div>
                                            <div className="box-table-cell" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                                <span className="cell-label">Actions</span>
                                                {t.status === 'OPEN' && (
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        {(t.allocated_qty || 0) === 0 && (
                                                            <button className="btn btn-primary" style={{ padding: '3px 6px', fontSize: '0.65rem' }} onClick={(e) => { e.stopPropagation(); openAllocateModal(t); }}>Alloc</button>
                                                        )}
                                                        <button className="btn" style={{ padding: '3px 6px', fontSize: '0.65rem', background: 'var(--primary)', color: 'white', border: 'none' }} onClick={(e) => { e.stopPropagation(); openPartialModal(null, t); }}>Pre Close</button>
                                                        <button className="btn" style={{ padding: '3px 6px', fontSize: '0.65rem', background: 'var(--danger)', color: 'white', border: 'none' }} onClick={(e) => { e.stopPropagation(); openCloseModal(t); }}>Close</button>
                                                        <button className="btn" style={{ padding: '3px 6px', fontSize: '0.65rem', background: 'var(--warning)', color: 'white', border: 'none' }} onClick={(e) => { e.stopPropagation(); openFlagModal(t, 'M to M'); }}>M2M</button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="box-table-cell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px 5px' }}>
                                                <span className="cell-label">Status</span>
                                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', background: isClosed ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: isClosed ? 'var(--danger)' : 'var(--success)', fontWeight: '700' }}>
                                                    {t.status}
                                                </span>
                                            </div>
                                        </div>
                                        {expandedRows.has(t._id) && (
                                            <div style={{ padding: '1.5rem', background: 'var(--bg-body)', borderRadius: '0 0 12px 12px', marginTop: '-12px', marginBottom: '12px', border: '1px solid var(--border)', borderTop: 'none' }}>
                                                
                                                <div style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase' }}>Current Allocations</span>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                                                    {allocations.filter(a => String(a.master_trade_id?._id || a.master_trade_id) === String(t._id)).length > 0 ? (
                                                        allocations.filter(a => String(a.master_trade_id?._id || a.master_trade_id) === String(t._id)).map(alloc => (
                                                            <div key={alloc._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{alloc.user_name || alloc.mob_num}</span>
                                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{alloc.mob_num}</span>
                                                                </div>
                                                                <div style={{ textAlign: 'right' }}>
                                                                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{alloc.allocation_qty} Qty</div>
                                                                    <div style={{ fontSize: '0.7rem', color: alloc.status === 'CLOSED' ? 'var(--danger)' : 'var(--success)' }}>{alloc.status}</div>
                                                                    {alloc.status === 'OPEN' && (
                                                                        <button
                                                                            className="btn"
                                                                            style={{ padding: '2px 6px', fontSize: '0.65rem', marginTop: '4px', background: 'var(--primary)', color: 'white', border: 'none' }}
                                                                            onClick={(e) => { e.stopPropagation(); openPartialModal(alloc, t); }}
                                                                        >
                                                                            Pre Close
                                                                        </button>
                                                                    )}
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
                                );
                            })}
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
                                        {formatDateTime(t.date)}
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
                        <div className="box-table-container" style={{ overflowX: 'auto', paddingBottom: '1rem', fontSize: '0.8rem' }}>
                            <div className="box-table-header" style={{ gridTemplateColumns: '1.4fr 1.2fr 1fr 0.7fr 0.8fr 1fr 0.8fr 1fr 1.4fr 0.7fr 0.8fr 1fr 0.8fr 1fr 1.1fr 0.8fr', minWidth: '1550px' }}>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Date of Buy Trade" onClick={() => requestSort('buy_timestamp')}>DATE {sortConfig.key === 'buy_timestamp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Username (Hover for full name)" onClick={() => requestSort('user_name')}>NAME {sortConfig.key === 'user_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Trading Symbol (e.g. NIFTY, BANKNIFTY)" onClick={() => requestSort('master_trade_id.symbol')}>SYMBOL {sortConfig.key === 'master_trade_id.symbol' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Buy Quantity of the allocation" onClick={() => requestSort('allocation_qty')}>BUY_QTY {sortConfig.key === 'allocation_qty' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Buy Rate (Price per unit)">B_RATE</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Total Buy Value (Qty * Rate)">TOT_BUY</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Buy Brokerage Charged">B_BROK</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Net Buy Value (Total Buy + Buy Brokerage)">NBV</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Closing Date and Time of the trade">SOLD DATE</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Sell Quantity (Actual sold qty)">SELL_QTY</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Sell Rate (Exit Price)">S_RATE</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Total Sell Value (Qty * Exit Price)">TOT_SELL</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Sell Brokerage Charged">S_BROK</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Net Sell Value (Total Sell - Sell Brokerage)" onClick={() => requestSort('client_pnl')}>NSV {sortConfig.key === 'client_pnl' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }} title="Profit or Loss (Net Sell Value - Net Buy Value)">P&L</div>
                                <div style={{ textAlign: 'center', padding: '10px 5px' }} title="Total Brokerage (Buy Brok + Sell Brok)">TOT_BROK</div>
                            </div>
                            {sortedAllocations.map(a => {
                                const qty = a.allocation_qty || 0;
                                const isClosed = a.status === 'CLOSED';

                                // Find user to get their current brokerage % if not locked in the record
                                const brokRate = (a.user_brokerage !== undefined) ? a.user_brokerage : 2;
                                const rawBuyVal = a.total_value || (a.allocation_price * qty);
                                const buyBrokAmount = (a.buy_brokerage !== undefined && a.buy_brokerage !== 0) ? a.buy_brokerage : (rawBuyVal * (brokRate / 100));
                                const totalBuy = rawBuyVal + buyBrokAmount;
                                
                                const rawSellPriceTotal = a.exit_value || 0;
                                const sellBrokAmount = (a.sell_brokerage !== undefined && a.sell_brokerage !== 0) ? a.sell_brokerage : (isClosed ? (rawSellPriceTotal * (brokRate / 100)) : 0);
                                const totalSell = isClosed ? (rawSellPriceTotal - sellBrokAmount) : 0;

                                return (
                                    <div className="box-table-row" key={a._id} style={{ gridTemplateColumns: '1.4fr 1.2fr 1fr 0.7fr 0.8fr 1fr 0.8fr 1fr 1.4fr 0.7fr 0.8fr 1fr 0.8fr 1fr 1.1fr 0.8fr', minWidth: '1550px', borderLeft: `4px solid ${isClosed ? (a.client_pnl >= 0 ? 'var(--success)' : 'var(--danger)') : 'var(--warning)'}`, marginBottom: '4px' }}>
                                        <div className="box-table-cell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                            <span className="cell-label">Date</span>
                                            {formatDateTime(a.buy_timestamp || a.createdAt)}
                                        </div>
                                        <div className="box-table-cell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px', fontWeight: 'bold' }}>
                                            <span className="cell-label">Name</span>
                                            {getUserDisplayName(a.mob_num, a.user_name)}
                                        </div>
                                        <div className="box-table-cell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px', fontWeight: 'bold' }}>
                                            <span className="cell-label">Symbol</span>
                                            {a.master_trade_id?.symbol}
                                        </div>
                                        <div className="box-table-cell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                            <span className="cell-label">Buy_QTY</span>
                                            {qty}
                                        </div>
                                        <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                            <span className="cell-label">B_Rate</span>
                                            ₹{a.allocation_price.toFixed(2)}
                                        </div>
                                        <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                            <span className="cell-label">Tot_Buy</span>
                                            ₹{rawBuyVal.toFixed(2)}
                                        </div>
                                        <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            <span className="cell-label">B_Brok</span>
                                            ₹{buyBrokAmount.toFixed(2)}
                                        </div>
                                        <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px', fontWeight: '600' }}>
                                            <span className="cell-label">NBV</span>
                                            ₹{totalBuy.toFixed(2)}
                                        </div>
                                        <div className="box-table-cell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px', fontSize: '0.7rem' }}>
                                            <span className="cell-label">Sold Date</span>
                                            {isClosed ? formatDateTime(a.sell_timestamp || a.updatedAt) : '-'}
                                        </div>
                                        <div className="box-table-cell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                            <span className="cell-label">Sell_QTY</span>
                                            {isClosed ? qty : '-'}
                                        </div>
                                        <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                            <span className="cell-label">S_Rate</span>
                                            {isClosed ? `₹${(a.exit_price || 0).toFixed(2)}` : '-'}
                                        </div>
                                        <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                            <span className="cell-label">Tot_Sell</span>
                                            {isClosed ? `₹${rawSellPriceTotal.toFixed(2)}` : '-'}
                                        </div>
                                        <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            <span className="cell-label">S_Brok</span>
                                            {isClosed ? `₹${sellBrokAmount.toFixed(2)}` : '-'}
                                        </div>
                                        <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px', fontWeight: 'bold' }}>
                                            <span className="cell-label">NSV</span>
                                            {isClosed ? `₹${totalSell.toFixed(2)}` : 'OPEN'}
                                        </div>
                                        <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px', fontWeight: 'bold', color: isClosed ? (a.client_pnl >= 0 ? 'var(--success)' : 'var(--danger)') : 'inherit' }}>
                                            <span className="cell-label">P&L</span>
                                            {isClosed ? `${a.client_pnl >= 0 ? '+' : ''}₹${a.client_pnl.toFixed(2)}` : '-'}
                                        </div>
                                        <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px 5px', fontSize: '0.8rem', fontWeight: '600', color: 'var(--primary)' }}>
                                            <span className="cell-label">Tot_Brok</span>
                                            ₹{(buyBrokAmount + sellBrokAmount).toFixed(2)}
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {/* Summary Footer Row */}
                            {sortedAllocations.length > 0 && (
                                <div className="box-table-row summary-row" style={{ 
                                    gridTemplateColumns: '1.4fr 1.2fr 1fr 0.7fr 0.8fr 1fr 0.8fr 1fr 1.4fr 0.7fr 0.8fr 1fr 0.8fr 1fr 1.1fr 0.8fr', 
                                    minWidth: '1550px', 
                                    backgroundColor: 'rgba(255,255,255,0.05)', 
                                    borderTop: '2px solid var(--primary)',
                                    fontWeight: 'bold',
                                    marginTop: '10px'
                                }}>
                                    <div className="box-table-cell" style={{ gridColumn: 'span 5', textAlign: 'right', paddingRight: '20px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderRight: '1px solid var(--border)' }}>TOTALS:</div>
                                    <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>₹{sortedAllocations.reduce((acc, a) => acc + (a.total_value || ((a.allocation_qty || 0) * a.allocation_price)), 0).toFixed(2)}</div>
                                    <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>₹{sortedAllocations.reduce((acc, a) => {
                                        const qty = a.allocation_qty || 0;
                                        const brokRate = (a.user_brokerage !== undefined) ? a.user_brokerage : 2;
                                        const rawBuyVal = a.total_value || (a.allocation_price * qty);
                                        return acc + ((a.buy_brokerage !== undefined && a.buy_brokerage !== 0) ? a.buy_brokerage : (rawBuyVal * (brokRate/100)));
                                    }, 0).toFixed(2)}</div>
                                    <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>₹{sortedAllocations.reduce((acc, a) => {
                                        const qty = a.allocation_qty || 0;
                                        const brokRate = (a.user_brokerage !== undefined) ? a.user_brokerage : 2;
                                        const rawBuyVal = a.total_value || (a.allocation_price * qty);
                                        const bBrok = (a.buy_brokerage !== undefined && a.buy_brokerage !== 0) ? a.buy_brokerage : (rawBuyVal * (brokRate/100));
                                        return acc + (rawBuyVal + bBrok);
                                    }, 0).toFixed(2)}</div>
                                    <div className="box-table-cell" style={{ borderRight: '1px solid var(--border)' }}></div> {/* Time span */}
                                    <div className="box-table-cell" style={{ borderRight: '1px solid var(--border)' }}></div> {/* Sell_QTY span */}
                                    <div className="box-table-cell" style={{ borderRight: '1px solid var(--border)' }}></div> {/* S_Rate span */}
                                    <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>₹{sortedAllocations.reduce((acc, a) => acc + (a.exit_value || 0), 0).toFixed(2)}</div>
                                    <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>₹{sortedAllocations.reduce((acc, a) => {
                                        if (a.status !== 'CLOSED') return acc;
                                        const rawSellVal = a.exit_value || 0;
                                        const brokRate = (a.user_brokerage !== undefined) ? a.user_brokerage : 2;
                                        return acc + ((a.sell_brokerage !== undefined && a.sell_brokerage !== 0) ? a.sell_brokerage : (rawSellVal * (brokRate/100)));
                                    }, 0).toFixed(2)}</div>
                                    <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>₹{sortedAllocations.reduce((acc, a) => {
                                        if (a.status !== 'CLOSED') return acc;
                                        const rawSellVal = a.exit_value || 0;
                                        const brokRate = (a.user_brokerage !== undefined) ? a.user_brokerage : 2;
                                        const sBrok = (a.sell_brokerage !== undefined && a.sell_brokerage !== 0) ? a.sell_brokerage : (rawSellVal * (brokRate/100));
                                        return acc + (rawSellVal - sBrok);
                                    }, 0).toFixed(2)}</div>
                                    <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px', color: sortedAllocations.reduce((acc, a) => acc + (a.client_pnl || 0), 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                        ₹{sortedAllocations.reduce((acc, a) => acc + (a.client_pnl || 0), 0).toFixed(2)}
                                    </div>
                                    <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px 5px', color: 'var(--primary)' }}>
                                        ₹{sortedAllocations.reduce((acc, a) => {
                                            const qty = a.allocation_qty || 0;
                                            const brokRate = (a.user_brokerage !== undefined) ? a.user_brokerage : 2;
                                            const rawBuyVal = a.total_value || (a.allocation_price * qty);
                                            const bBrok = (a.buy_brokerage !== undefined && a.buy_brokerage !== 0) ? a.buy_brokerage : (rawBuyVal * (brokRate/100));
                                            
                                            const isClosed = a.status === 'CLOSED';
                                            const rawSellVal = a.exit_value || 0;
                                            const sBrok = (a.sell_brokerage !== undefined && a.sell_brokerage !== 0) ? a.sell_brokerage : (isClosed ? (rawSellVal * (brokRate/100)) : 0);
                                            
                                            return acc + (bBrok + sBrok);
                                        }, 0).toFixed(2)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'gl_ledger':
                return (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
                            <h2 style={{ fontSize: '1.2rem' }}>Global Ledger</h2>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <div style={{ display: 'flex' }}>
                                    <input
                                        type="text"
                                        placeholder="Search User, Mobile, Desc..."
                                        value={ledgerSearchInput}
                                        onChange={(e) => setLedgerSearchInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && setLedgerSearch(ledgerSearchInput)}
                                        style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px 0 0 6px', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }}
                                    />
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setLedgerSearch(ledgerSearchInput)}
                                        style={{ borderRadius: '0 6px 6px 0', borderLeft: 'none', padding: '8px 12px' }}
                                    >
                                        Search
                                    </button>
                                </div>
                                <button className="btn" style={{ background: '#10b981', color: 'white', padding: '8px 12px' }} onClick={downloadAdminExcel}>
                                    <i className="fas fa-file-excel"></i> Excel
                                </button>
                            </div>
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
                                        {formatDateTime(l.entry_date)}
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
            case 'rules':
                return <Rules standalone={true} />;
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
        <Layout title="Admin Dashboard">
            <div className={`admin-dashboard-layout ${darkMode ? 'dark' : ''}`}>
                
                {/* Modals */}
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
                                    <button onClick={e => handleFundsSubmit(e, 'add')} disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1, background: 'var(--success)', border: 'none' }}>
                                        {isSubmitting ? 'Wait...' : 'Add Funds'}
                                    </button>
                                    <button onClick={e => handleFundsSubmit(e, 'withdraw')} disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1, background: 'var(--danger)', border: 'none' }}>
                                        {isSubmitting ? 'Wait...' : 'Withdraw'}
                                    </button>
                                    <button type="button" onClick={() => setShowFundsModal(false)} className="btn" style={{ flex: 1 }}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showUserProfileModal && selectedUserProfile && (
                    <div style={modalOverlayStyle}>
                        <div style={{ ...modalContentStyle, maxWidth: '600px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>User Details: {selectedUserProfile.user_name}</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                                <div>
                                    <p style={{ margin: '5px 0', fontSize: '0.85rem' }}><strong>Mobile:</strong> {selectedUserProfile.mob_num}</p>
                                    <p style={{ margin: '5px 0', fontSize: '0.85rem' }}><strong>Email:</strong> {selectedUserProfile.email || 'N/A'}</p>
                                </div>
                                <div>
                                    <p style={{ margin: '5px 0', fontSize: '0.85rem' }}><strong>Current Balance:</strong> ₹ {selectedUserProfile.current_balance.toLocaleString()}</p>
                                    <p style={{ margin: '5px 0', fontSize: '0.85rem' }}><strong>Status:</strong> <span style={{ color: selectedUserProfile.status === 'active' ? 'var(--success)' : 'var(--danger)' }}>{selectedUserProfile.status.toUpperCase()}</span></p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button className="btn" style={{ flex: 1 }} onClick={() => setShowUserProfileModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                )}

                {showTradeModal && (
                    <div style={modalOverlayStyle}>
                        <div style={modalContentStyle}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Execute Master Trade</h3>
                            <form onSubmit={handleCreateTrade}>
                                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Symbol</label>
                                <input style={inputStyle} type="text" placeholder="e.g., RELIANCE" value={newTrade.symbol} onChange={e => setNewTrade({ ...newTrade, symbol: e.target.value.toUpperCase() })} required />

                                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Total Quantity</label>
                                <input style={inputStyle} type="number" value={newTrade.total_qty} onChange={e => setNewTrade({ ...newTrade, total_qty: e.target.value })} required />

                                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Buy Price</label>
                                <input style={inputStyle} type="number" step="0.05" value={newTrade.buy_price} onChange={e => setNewTrade({ ...newTrade, buy_price: e.target.value })} required />

                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1 }}>{isSubmitting ? 'Wait...' : 'Confirm Trade'}</button>
                                    <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setShowTradeModal(false)}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showAllocateModal && selectedTrade && (
                    <div style={modalOverlayStyle}>
                        <div style={{ ...modalContentStyle, maxWidth: '500px' }}>
                            <h3 style={{ marginTop: 0 }}>Allocate Trade: {selectedTrade.symbol}</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                                Total Trade Qty: <strong>{selectedTrade.total_qty}</strong> | 
                                Still Remaining: <strong>{selectedTrade.total_qty - (allocationInputs.reduce((sum, a) => sum + Number(a.allocation_qty), 0))}</strong>
                            </p>
                            
                            <div style={{position: 'relative', marginBottom: '15px'}}>
                                <input 
                                    type="text" 
                                    placeholder="Add more users to allocation list..." 
                                    style={inputStyle}
                                    value={allocUserSearch}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onChange={(e) => setAllocUserSearch(e.target.value)}
                                />
                                {isSearchFocused && (
                                    <div style={{position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: 'var(--shadow-lg)'}}>
                                        {users
                                            .filter(u => u.role !== 'admin' && u.status === 'active')
                                            .filter(u => u.user_name.toLowerCase().includes(allocUserSearch.toLowerCase()) || u.mob_num.includes(allocUserSearch))
                                            .filter(u => !allocationInputs.find(a => a.mob_num === u.mob_num))
                                            .map(u => (
                                                <div 
                                                    key={u._id} 
                                                    style={{padding: '10px', cursor: 'pointer', borderBottom: '1px solid var(--border)'}}
                                                    onClick={() => {
                                                        setAllocationInputs([...allocationInputs, { mob_num: u.mob_num, name: u.user_name, allocation_qty: 0 }]);
                                                        setAllocUserSearch('');
                                                        setIsSearchFocused(false);
                                                    }}
                                                >
                                                    {u.user_name} ({u.mob_num})
                                                </div>
                                            ))
                                        }
                                        <div style={{padding: '10px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer'}} onClick={() => setIsSearchFocused(false)}>Close Search</div>
                                    </div>
                                )}
                            </div>

                            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px' }}>
                                {allocationInputs.map((a, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px dashed var(--border)' }}>
                                        <div style={{fontSize: '0.85rem'}}>
                                            <strong>{a.name}</strong><br/>
                                            <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{a.mob_num}</span>
                                        </div>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                            <input
                                                type="number"
                                                style={{ ...inputStyle, width: '80px', marginBottom: 0, padding: '5px' }}
                                                value={a.allocation_qty}
                                                onFocus={(e) => e.target.select()}
                                                onChange={e => handleAllocationQtyChange(a.mob_num, e.target.value)}
                                            />
                                            <button className="btn" style={{padding: '4px 8px', color: 'var(--danger)'}} onClick={() => setAllocationInputs(allocationInputs.filter(item => item.mob_num !== a.mob_num))}>
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {allocationInputs.length === 0 && <p style={{textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem'}}>No users in list.</p>}
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={submitAllocation} disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1 }}>{isSubmitting ? 'Allocating...' : 'Confirm All Allocations'}</button>
                                <button onClick={() => setShowAllocateModal(false)} className="btn" style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
                {showCloseModal && selectedTrade && (
                    <div style={modalOverlayStyle}>
                        <div style={modalContentStyle}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Close Master Trade: {selectedTrade.symbol}</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>
                                Buy Price: ₹{selectedTrade.buy_price.toFixed(2)} | Live: <strong>₹{selectedTrade.live_price || 'N/A'}</strong>
                            </p>
                            <form onSubmit={(e) => { e.preventDefault(); submitCloseTrade(); }}>
                                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Market Selling Price</label>
                                <input style={inputStyle} type="number" step="0.05" value={closePrice} onChange={e => setClosePrice(e.target.value)} required autoFocus />

                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1, background: 'var(--danger)', border: 'none' }}>{isSubmitting ? 'Closing...' : 'Close Position'}</button>
                                    <button type="button" onClick={() => setShowCloseModal(false)} className="btn" style={{ flex: 1 }}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showFlagModal && selectedTrade && (
                    <div style={modalOverlayStyle}>
                        <div style={modalContentStyle}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>{flagType}: {selectedTrade.symbol}</h3>
                            <form onSubmit={submitFlag}>
                                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Settlement Day Count</label>
                                <input style={inputStyle} type="number" value={flagInputs.day} onChange={e => setFlagInputs({ ...flagInputs, day: e.target.value })} required min="1" />

                                <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Daily Active Price (Settlement Price)</label>
                                <input style={inputStyle} type="number" step="0.05" value={flagInputs.activePrice} onChange={e => setFlagInputs({ ...flagInputs, activePrice: e.target.value })} required />

                                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1 }}>{isSubmitting ? 'Wait...' : 'Confirm Action'}</button>
                                    <button type="button" onClick={() => setShowFlagModal(false)} className="btn" style={{ flex: 1 }}>Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showTradeDetailsModal && detailsTrade && (
                    <div style={modalOverlayStyle}>
                        <div style={{ ...modalContentStyle, maxWidth: '600px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 style={{ margin: 0 }}>Allocation Detail: {detailsTrade.symbol}</h3>
                                <button className="btn" onClick={() => setShowTradeDetailsModal(false)} style={{ background: 'transparent', color: 'var(--text-muted)' }}><i className="fas fa-times"></i></button>
                            </div>

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

                {/* Partial Sell Modal */}
                {showPartialModal && selectedTrade && (
                    <div style={modalOverlayStyle}>
                        <div style={modalContentStyle}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Partial Sell Allocation</h3>

                            {!selectedAllocation ? (
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Select User Allocation</label>
                                    <select
                                        style={inputStyle}
                                        onChange={(e) => {
                                            const allocId = e.target.value;
                                            const alloc = allocations.find(a => a._id === allocId);
                                            setSelectedAllocation(alloc);
                                        }}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Select User...</option>
                                        {allocations
                                            .filter(a => a.master_trade_id?._id === selectedTrade._id && a.status === 'OPEN')
                                            .map(a => (
                                                <option key={a._id} value={a._id}>
                                                    {getUserDisplayName(a.mob_num, a.user_name)} ({a.allocation_qty} Qty)
                                                </option>
                                            ))
                                        }
                                    </select>
                                </div>
                            ) : (
                                <div style={{ marginBottom: '15px', padding: '10px', background: 'var(--bg-body)', borderRadius: '6px', fontSize: '0.85rem' }}>
                                    <p><strong>User:</strong> {getUserDisplayName(selectedAllocation.mob_num, selectedAllocation.user_name)}</p>
                                    <p><strong>Total Qty:</strong> {selectedAllocation.allocation_qty}</p>
                                    <p><strong>Avg Buy:</strong> ₹{selectedAllocation.allocation_price.toFixed(2)}</p>
                                    <button className="btn" style={{ fontSize: '0.7rem', marginTop: '5px', padding: '2px 8px' }} onClick={() => setSelectedAllocation(null)}>Change User</button>
                                </div>
                            )}

                            {selectedAllocation && (
                                <form onSubmit={(e) => { e.preventDefault(); submitPartialSell(); }}>
                                    <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Sell Quantity</label>
                                    <input
                                        style={inputStyle}
                                        type="number"
                                        placeholder={`Max: ${selectedAllocation.allocation_qty - 1}`}
                                        value={partialSellQty}
                                        onChange={e => setPartialSellQty(e.target.value)}
                                        required
                                        min="1"
                                        max={selectedAllocation.allocation_qty - 1}
                                    />

                                    <label style={{ fontSize: '0.85rem', fontWeight: '600' }}>Sell Price</label>
                                    <input
                                        style={inputStyle}
                                        type="number"
                                        step="0.01"
                                        value={partialSellPrice}
                                        onChange={e => setPartialSellPrice(e.target.value)}
                                        required
                                        min="0.01"
                                    />

                                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                        <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ flex: 1 }}>
                                            {isSubmitting ? 'Confirming...' : 'Execute Sell'}
                                        </button>
                                        <button type="button" onClick={() => setShowPartialModal(false)} className="btn" style={{ flex: 1 }}>Cancel</button>
                                    </div>
                                </form>
                            )}
                            {!selectedAllocation && (
                                <button type="button" onClick={() => setShowPartialModal(false)} className="btn" style={{ width: '100%', marginTop: '10px' }}>Cancel</button>
                            )}
                        </div>
                    </div>
                )}



                {/* specialized safety confirmation modals */}
                {showTradeConfirmModal && (
                    <div style={confirmOverlayStyle}>
                        <div style={modalContentStyle}>
                            <h3 style={{ color: 'var(--primary)' }}>Confirm Trade Execution</h3>
                            <p style={{ fontSize: '0.9rem', marginBottom: '15px' }}>
                                Admin showing you buyed this trade in this much QTY on this Price which admin added here
                            </p>
                            <div style={{ background: 'var(--bg-body)', padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem' }}>
                                <p style={{ margin: '5px 0' }}><strong>Symbol:</strong> {newTrade.symbol}</p>
                                <p style={{ margin: '5px 0' }}><strong>Qty:</strong> {newTrade.total_qty}</p>
                                <p style={{ margin: '5px 0' }}><strong>Price:</strong> ₹{newTrade.buy_price}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleFinalTradeConfirm} disabled={isSubmitting}>
                                    {isSubmitting ? 'Processing...' : 'Confirm'}
                                </button>
                                <button className="btn" style={{ flex: 1 }} onClick={() => setShowTradeConfirmModal(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                {showAllocConfirmModal && selectedTrade && (
                    <div style={confirmOverlayStyle}>
                        <div style={{ ...modalContentStyle, maxWidth: '500px' }}>
                            <h3 style={{ color: 'var(--primary)' }}>Confirm Trade Allocation</h3>
                            <p style={{ fontSize: '0.85rem', marginBottom: '15px' }}>
                                Review the user allocations for <strong>{selectedTrade.symbol}</strong>.
                            </p>
                            <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'var(--bg-body)', padding: '10px', borderRadius: '8px', marginBottom: '20px' }}>
                                {allocationInputs.filter(a => a.allocation_qty > 0).map((a, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--border)' }}>
                                        <span style={{ fontSize: '0.85rem' }}>{a.name} ({a.mob_num})</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{a.allocation_qty} Qty</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleFinalAllocConfirm} disabled={isSubmitting}>
                                    {isSubmitting ? 'Allocating...' : 'Confirm'}
                                </button>
                                <button className="btn" style={{ flex: 1 }} onClick={() => setShowAllocConfirmModal(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                {showCloseConfirmModal && selectedTrade && (
                    <div style={confirmOverlayStyle}>
                        <div style={modalContentStyle}>
                            <h3 style={{ color: 'var(--danger)' }}>Confirm Close Trade</h3>
                            <p style={{ fontSize: '0.85rem', marginBottom: '15px' }}>
                                Are you sure you want to close this position for <strong>{selectedTrade.symbol}</strong> at <strong>₹{closePrice}</strong>?
                            </p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn btn-primary" style={{ flex: 1, background: 'var(--danger)', border: 'none' }} onClick={handleFinalCloseTrade} disabled={isSubmitting}>
                                    {isSubmitting ? 'Closing...' : 'Confirm'}
                                </button>
                                <button className="btn" style={{ flex: 1 }} onClick={() => setShowCloseConfirmModal(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                {showPartialConfirmModal && (selectedAllocation || selectedTrade) && (
                    <div style={confirmOverlayStyle}>
                        <div style={modalContentStyle}>
                            <h3 style={{ color: 'var(--primary)' }}>Confirm Pre Close</h3>
                            <p style={{ fontSize: '0.85rem', marginBottom: '15px' }}>
                                Partially selling <strong>{partialSellQty} Qty</strong> {selectedAllocation ? `for user ${getUserDisplayName(selectedAllocation.mob_num, selectedAllocation.user_name)}` : `of ${selectedTrade.symbol}`} at <strong>₹{partialSellPrice}</strong>.
                            </p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleFinalPartialSell} disabled={isSubmitting}>
                                    {isSubmitting ? 'Processing...' : 'Confirm'}
                                </button>
                                <button className="btn" style={{ flex: 1 }} onClick={() => setShowPartialConfirmModal(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                {showFlagConfirmModal && selectedTrade && (
                    <div style={confirmOverlayStyle}>
                        <div style={modalContentStyle}>
                            <h3 style={{ color: 'var(--warning)' }}>Confirm {flagType}</h3>
                            <p style={{ fontSize: '0.85rem', marginBottom: '15px' }}>
                                Apply <strong>{flagType}</strong> for <strong>{selectedTrade.symbol}</strong> with settlement price <strong>₹{flagInputs.activePrice}</strong> for <strong>{flagInputs.day} Days</strong>?
                            </p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn btn-primary" style={{ flex: 1, background: 'var(--warning)', border: 'none' }} onClick={handleFinalFlag} disabled={isSubmitting}>
                                    {isSubmitting ? 'Wait...' : 'Confirm'}
                                </button>
                                <button className="btn" style={{ flex: 1 }} onClick={() => setShowFlagConfirmModal(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Render Active Tab Content */}

                <div className="admin-tab-content">
                   {renderContent()}
                </div>
            </div>
        </Layout>
    );
};
export default AdminDashboard;