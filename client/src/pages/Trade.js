import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';

const Trades = () => {
    const [trades, setTrades] = useState([]);
    const [filteredTrades, setFilteredTrades] = useState([]);

    // Filters State
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [startDate, setStartDate] = useState('2025-10-01'); // Default start matching your data
    const [endDate, setEndDate] = useState('2025-12-31');

    useEffect(() => {
        const fetchTrades = async () => {
            try {
                const { data } = await api.get('/trades/my-allocations/list');
                setTrades(data);
                setFilteredTrades(data);
            } catch (error) {
                console.error("Error fetching trades:", error);
            }
        };
        fetchTrades();
    }, []);

    // Filter Logic
    const handleFilter = () => {
        let temp = trades;

        if (search) {
            temp = temp.filter(t => t.master_trade_id?.symbol.toLowerCase().includes(search.toLowerCase()));
        }

        if (typeFilter !== 'ALL') {
            // no longer supported filtering by type since everything from AllocationTrade is BUY
        }

        if (startDate) {
            temp = temp.filter(t => new Date(t.buy_timestamp) >= new Date(startDate));
        }
        if (endDate) {
            temp = temp.filter(t => new Date(t.buy_timestamp) <= new Date(endDate));
        }

        setFilteredTrades(temp);
    };

    const exportToExcel = () => {
        alert("Exporting to Excel... (Feature coming soon)");
    };

    return (
        <Layout title="Trade History">
            <div className="card">
                {/* Filter Bar */}
                <div style={{
                    display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center',
                    background: 'var(--bg-body)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--border)'
                }}>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', outline: 'none' }} />

                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', outline: 'none' }} />

                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                        style={{ padding: '9px', borderRadius: '6px', border: '1px solid var(--border)', outline: 'none' }}>
                        <option value="ALL">All Types</option>
                        <option value="BUY">Buy</option>
                        <option value="SELL">Sell</option>
                    </select>

                    <input type="text" placeholder="Search Script..." value={search} onChange={(e) => setSearch(e.target.value)}
                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', outline: 'none', minWidth: '150px' }} />

                    <button className="btn btn-primary" onClick={handleFilter}>
                        <i className="fas fa-search"></i> Filter
                    </button>
                    <button className="btn" onClick={exportToExcel}>
                        <i className="fas fa-file-excel"></i> Excel
                    </button>
                </div>

                {/* Table */}
                <div className="box-table-container">
                    <div className="box-table-header" style={{ gridTemplateColumns: 'minmax(120px, 1fr) 1.5fr 1fr 0.8fr 1fr 1.2fr 1fr' }}>
                        <div>Date</div>
                        <div>Script</div>
                        <div>Type</div>
                        <div>Qty</div>
                        <div>Price</div>
                        <div>Total</div>
                        <div>Status</div>
                    </div>
                    {filteredTrades.map(t => (
                        <div className="box-table-row" key={t._id} style={{ gridTemplateColumns: 'minmax(120px, 1fr) 1.5fr 1fr 0.8fr 1fr 1.2fr 1fr' }}>
                            <div className="box-table-cell">
                                <span className="cell-label">Date</span>
                                {new Date(t.buy_timestamp).toLocaleDateString()}
                            </div>
                            <div className="box-table-cell" style={{ fontWeight: '700' }}>
                                <span className="cell-label">Script</span>
                                {t.master_trade_id?.symbol}
                            </div>
                            <div className="box-table-cell">
                                <span className="cell-label">Type</span>
                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', textTransform: 'uppercase' }}>
                                    BUY
                                </span>
                            </div>
                            <div className="box-table-cell">
                                <span className="cell-label">Qty</span>
                                {t.allocation_qty}
                            </div>
                            <div className="box-table-cell font-mono">
                                <span className="cell-label">Price</span>
                                ₹{t.allocation_price}
                            </div>
                            <div className="box-table-cell font-mono" style={{ fontWeight: '700' }}>
                                <span className="cell-label">Total</span>
                                ₹{(t.total_value || 0).toLocaleString()}
                            </div>
                            <div className="box-table-cell">
                                <span className="cell-label">Status</span>
                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700', background: t.status === 'CLOSED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: t.status === 'CLOSED' ? 'var(--danger)' : 'var(--success)', textTransform: 'uppercase' }}>
                                    {t.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
};

export default Trades;