// Import Files
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';

const PnL = () => {
    const [trades, setTrades] = useState([]);
    const [allTrades, setAllTrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterType, setFilterType] = useState('All Types');
    const [searchTerm, setSearchTerm] = useState('');
    const [summary, setSummary] = useState({
        totalRealized: 0,
        totalUnrealized: 0,
        avgProfit: 0,
        totalTrades: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get('/trades/my-allocations/list');
                processPnL(response.data);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
    }, []);

    const processPnL = (data) => {
        // Strictly filter to show ONLY real trades (must have a master trade and not be a fund entry)
        const pureTrades = data.filter(t => 
            t.master_trade_id && 
            t.master_trade_id.symbol && 
            !t.master_trade_id.symbol.includes('FUND')
        );

        // Filter only Completed trades for Realized
        const completed = pureTrades.filter(t => t.status === 'CLOSED');
        // Filter Open trades for Unrealized
        const openTrades = pureTrades.filter(t => t.status === 'OPEN');

        const combinedTableData = pureTrades.map(t => {
            const qty = t.allocation_qty || 0;
            const cmp = t.status === 'OPEN' ? (qty > 0 ? (t.current_value / qty) : 0) : '-';
            
            return {
                id: t._id,
                buy_date: new Date(t.buy_timestamp || t.createdAt),
                script: t.master_trade_id?.symbol,
                type: 'TRADE',
                status: t.status,
                buy_qty: qty,
                buy_rate: t.allocation_price,
                net_buy: (t.total_value || (t.allocation_price * qty)) + (t.buy_brokerage || 0),
                sell_date: t.status === 'CLOSED' ? new Date(t.sell_timestamp || t.updatedAt) : null,
                sell_qty: t.status === 'CLOSED' ? qty : '-',
                sell_rate: t.status === 'CLOSED' ? (t.exit_price || 0) : '-',
                net_sell: t.status === 'CLOSED' ? ((t.exit_value || 0) - (t.sell_brokerage || 0)) : '-',
                cmp: cmp,
                pnl: t.client_pnl || 0
            };
        }).sort((a, b) => b.buy_date - a.buy_date);

        let totalRealized = 0;
        let totalUnrealized = 0;

        completed.forEach(t => {
            totalRealized += (t.client_pnl || 0);
        });

        openTrades.forEach(t => {
            totalUnrealized += (t.client_pnl || 0);
        });

        setTrades(combinedTableData);
        setAllTrades(combinedTableData);
        setSummary({
            totalRealized,
            totalUnrealized,
            totalTrades: completed.length,
            avgProfit: completed.length > 0 ? (totalRealized / completed.length).toFixed(0) : 0
        });
    };

    const applyFilters = () => {
        let filtered = [...allTrades];

        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            filtered = filtered.filter(t => new Date(t.buy_date) >= start);
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(t => new Date(t.buy_date) <= end);
        }

        if (filterType !== 'All Types') {
            filtered = filtered.filter(t => t.type === filterType);
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(t => 
                t.script?.toLowerCase().includes(term)
            );
        }

        setTrades(filtered);
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

    const downloadReport = async () => {
        try {
            const params = {
                startDate,
                endDate,
                searchTerm
            };
            const response = await api.get('/reports/pnl', { 
                params,
                responseType: 'blob' 
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `PnL_Report_${Date.now()}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            console.error("Download error:", error);
            alert("Failed to download Excel report");
        }
    };

    return (
        <Layout title="P/L Analysis">
            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card">
                    <div className="metric-label">Total Realized P&L</div>
                    <div className={summary.totalRealized >= 0 ? "text-up" : "text-down"} style={{ fontSize: '1.8rem', fontWeight: '700' }}>
                        {summary.totalRealized >= 0 ? '+' : ''} ₹ {Number(summary.totalRealized).toLocaleString()}
                    </div>
                </div>
                <div className="card">
                    <div className="metric-label">Total Unrealized P&L</div>
                    <div className={summary.totalUnrealized >= 0 ? "text-up" : "text-down"} style={{ fontSize: '1.8rem', fontWeight: '700' }}>
                        {summary.totalUnrealized >= 0 ? '+' : ''} ₹ {Number(summary.totalUnrealized).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="card" style={{ padding: '20px' }}>
                <div style={{ marginBottom: '30px' }}>
                    <h2 style={{ margin: 0, marginBottom: '20px', fontSize: '1.4rem' }}>Detailed Trade Book</h2>
                    
                    <div style={{ 
                        background: 'rgba(255, 255, 255, 0.03)', 
                        padding: '12px 15px', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        gap: '10px', 
                        alignItems: 'center',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        flexWrap: 'nowrap',
                        overflowX: 'auto'
                    }}>
                        <input 
                            type="date" 
                            className="filter-input" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{ background: '#fff', color: '#000', borderRadius: '6px', border: 'none', padding: '8px 10px', fontSize: '0.85rem', flex: '0 0 130px' }} 
                        />
                        <input 
                            type="date" 
                            className="filter-input" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{ background: '#fff', color: '#000', borderRadius: '6px', border: 'none', padding: '8px 10px', fontSize: '0.85rem', flex: '0 0 130px' }} 
                        />
                        <select 
                            className="filter-input"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            style={{ background: '#fff', color: '#000', borderRadius: '6px', border: 'none', padding: '8px 10px', fontSize: '0.85rem', flex: '0 0 100px' }}
                        >
                            <option>All Types</option>
                            <option>TRADE</option>
                        </select>
                        <input 
                            type="text" 
                            placeholder="Search Script..." 
                            className="filter-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: '#fff', color: '#000', borderRadius: '6px', border: 'none', padding: '8px 12px', fontSize: '0.9rem', flex: '1 1 200px', minWidth: '150px' }} 
                        />
                        <button 
                            className="btn-primary" 
                            onClick={applyFilters}
                            style={{ padding: '8px 15px', background: '#7c8aff', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', flex: '0 0 auto' }}
                        >
                            <span style={{ marginRight: '6px' }}>🔍</span> Filter
                        </button>
                        <button 
                            className="btn-secondary" 
                            onClick={downloadReport} 
                            style={{ padding: '8px 15px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', flex: '0 0 auto' }}
                        >
                            <span style={{ marginRight: '6px' }}>📄</span> Excel
                        </button>
                    </div>
                </div>

                <div className="box-table-container" style={{ overflowX: 'auto' }}>
                    <div className="box-table-header" style={{ gridTemplateColumns: '1.4fr 1.1fr 0.8fr 0.9fr 1.1fr 1.4fr 0.8fr 0.9fr 1.1fr 1fr 1fr 1fr', minWidth: '1200px' }}>
                        <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>Buy_Date</div>
                        <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>Script</div>
                        <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>Buy_QTY</div>
                        <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>Buy_Rate</div>
                        <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>Net Buy</div>
                        <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>Sell Date</div>
                        <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>Sell_QTY</div>
                        <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>Sell_Rate</div>
                        <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>Net Sell</div>
                        <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>CMP</div>
                        <div style={{ textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>P&L</div>
                        <div style={{ textAlign: 'center', padding: '10px 5px' }}>Status</div>
                    </div>
                    {trades.map(trade => (
                        <div className="box-table-row" key={trade.id} style={{ gridTemplateColumns: '1.4fr 1.1fr 0.8fr 0.9fr 1.1fr 1.4fr 0.8fr 0.9fr 1.1fr 1fr 1fr 1fr', minWidth: '1200px', borderLeft: `4px solid ${trade.status === 'CLOSED' ? (trade.pnl >= 0 ? 'var(--success)' : 'var(--danger)') : 'var(--warning)'}`, marginBottom: '4px' }}>
                            <div className="box-table-cell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px', fontSize: '0.8rem' }}>
                                <span className="cell-label">Buy_Date</span>
                                {formatDateTime(trade.buy_date)}
                            </div>
                            <div className="box-table-cell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px', fontWeight: 'bold' }}>
                                <span className="cell-label">Script</span>
                                {trade.script}
                            </div>
                            <div className="box-table-cell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                <span className="cell-label">Buy_QTY</span>
                                {trade.buy_qty}
                            </div>
                            <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                <span className="cell-label">Buy_Rate</span>
                                {trade.type === 'TRADE' ? `₹${Number(trade.buy_rate).toFixed(2)}` : '-'}
                            </div>
                            <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                <span className="cell-label">Net Buy</span>
                                ₹{Number(trade.net_buy).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className="box-table-cell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px', fontSize: '0.8rem' }}>
                                <span className="cell-label">Sell Date</span>
                                {formatDateTime(trade.sell_date)}
                            </div>
                            <div className="box-table-cell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                <span className="cell-label">Sell_QTY</span>
                                {trade.sell_qty}
                            </div>
                            <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                <span className="cell-label">Sell_Rate</span>
                                {trade.type === 'TRADE' && trade.status === 'CLOSED' ? `₹${Number(trade.sell_rate).toFixed(2)}` : '-'}
                            </div>
                            <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px' }}>
                                <span className="cell-label">Net Sell</span>
                                {trade.type === 'TRADE' && trade.status === 'CLOSED' ? `₹${Number(trade.net_sell).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                            </div>
                            <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px', fontWeight: 'bold', color: 'var(--primary)' }}>
                                <span className="cell-label">CMP</span>
                                {trade.cmp !== '-' ? `₹${Number(trade.cmp).toFixed(2)}` : '-'}
                            </div>
                            <div className="box-table-cell font-mono" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid var(--border)', padding: '10px 5px', fontWeight: '800', color: trade.status === 'CLOSED' ? (trade.pnl >= 0 ? 'var(--success)' : 'var(--danger)') : 'var(--warning)' }}>
                                <span className="cell-label">P&L</span>
                                {trade.pnl > 0 ? '+' : ''}{Number(trade.pnl).toLocaleString()}
                            </div>
                            <div className="box-table-cell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '10px 5px' }}>
                                <span className="cell-label">Status</span>
                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700', background: 'var(--bg-body)', textTransform: 'uppercase' }}>
                                    {trade.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
};

export default PnL;