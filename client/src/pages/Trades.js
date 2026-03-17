import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';

const Trades = () => {
    const [trades, setTrades] = useState([]);
    const [filteredTrades, setFilteredTrades] = useState([]);

    // Filters State
    const [search, setSearch] = useState('');
    const [typeFilter] = useState('ALL');
    const [startDate] = useState('2025-10-01');
    const [endDate] = useState('2025-12-31');

    useEffect(() => {
        const fetchTrades = async () => {
            try {
                // Ensure this URL matches your backend
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
        if (startDate) {
            temp = temp.filter(t => new Date(t.buy_timestamp) >= new Date(startDate));
        }
        if (endDate) {
            temp = temp.filter(t => new Date(t.buy_timestamp) <= new Date(endDate));
        }
        setFilteredTrades(temp);
    };

    return (
        <Layout title="Trade History">
            <div className="card">
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ padding: '8px' }} />
                    <button className="btn btn-primary" onClick={handleFilter}>Filter</button>
                </div>
                <div className="box-table-container">
                    <div className="box-table-header" style={{ gridTemplateColumns: 'minmax(120px, 1fr) 1.5fr 1fr 1fr' }}>
                        <div>Date</div>
                        <div>Script</div>
                        <div>Type</div>
                        <div>Total</div>
                    </div>
                    {filteredTrades.map(t => (
                        <div className="box-table-row" key={t._id} style={{ gridTemplateColumns: 'minmax(120px, 1fr) 1.5fr 1fr 1fr' }}>
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
                            <div className="box-table-cell font-mono" style={{ fontWeight: '700' }}>
                                <span className="cell-label">Total</span>
                                ₹ {(t.total_value || 0).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
};

export default Trades;