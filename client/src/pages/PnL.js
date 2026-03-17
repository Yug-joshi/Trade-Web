// Import Files
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';

const PnL = () => {
    const [trades, setTrades] = useState([]);
    const [stats, setStats] = useState({
        totalRealized: 0,
        totalUnrealized: 0,
        avgProfit: 0,
        totalTrades: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [allocsRes, ledgerRes] = await Promise.all([
                    api.get('/trades/my-allocations/list'),
                    api.get('/ledger')
                ]);
                processPnL(allocsRes.data, ledgerRes.data);
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchData();
    }, []);

    const processPnL = (data, ledgerData) => {
        // Filter only Completed trades for Realized
        const completed = data.filter(t => t.status === 'CLOSED');
        // Filter Open trades for Unrealized
        const openTrades = data.filter(t => t.status === 'OPEN');

        // Extract "Funds Added" from ledger, filter out Trade Alerts (M to M)
        const filteredLedger = ledgerData.filter(l =>
            !l.description.includes('Trade Alert') && !l.description.includes('M to M')
        );

        const fundsAdded = filteredLedger.filter(l =>
            l.act_type === 'CREDIT' &&
            (l.description.includes('Fund Added') || l.description.includes('Funds Added') || l.description.includes('Balance Added'))
        );

        const combinedTableData = [
            ...completed.map(t => ({
                id: t._id,
                date: new Date(t.sell_timestamp || t.buy_timestamp),
                script: t.master_trade_id?.symbol,
                type: 'TRADE',
                status: t.status,
                qty: t.allocation_qty,
                price: t.exit_price || '-',
                net_pnl: t.client_pnl || 0
            })),
            ...fundsAdded.map(l => ({
                id: l._id,
                date: new Date(l.entry_date),
                script: 'FUND ADDED',
                type: 'FUND',
                status: 'COMPLETED',
                qty: '-',
                price: '-',
                net_pnl: l.amt_cr
            }))
        ].sort((a, b) => b.date - a.date);

        let totalRealized = 0;
        let totalUnrealized = 0;

        completed.forEach(t => {
            totalRealized += (t.client_pnl || 0);
        });

        openTrades.forEach(t => {
            totalUnrealized += (t.client_pnl || 0);
        });

        setTrades(combinedTableData);
        setStats({
            totalRealized,
            totalUnrealized,
            totalTrades: completed.length,
            avgProfit: completed.length > 0 ? (totalRealized / completed.length).toFixed(0) : 0
        });
    };

    const downloadReport = () => {
        alert("Downloading PDF Report... (Feature coming soon)");
    };

    return (
        <Layout title="P/L Analysis">
            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card">
                    <div className="metric-label">Total Realized P&L</div>
                    <div className={stats.totalRealized >= 0 ? "text-up" : "text-down"} style={{ fontSize: '1.8rem', fontWeight: '700' }}>
                        {stats.totalRealized >= 0 ? '+' : ''} ₹ {stats.totalRealized.toLocaleString()}
                    </div>
                </div>
                <div className="card">
                    <div className="metric-label">Total Unrealized P&L</div>
                    <div className={stats.totalUnrealized >= 0 ? "text-up" : "text-down"} style={{ fontSize: '1.8rem', fontWeight: '700' }}>
                        {stats.totalUnrealized >= 0 ? '+' : ''} ₹ {stats.totalUnrealized.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1rem' }}>Detailed Trade Book</h3>
                    <button className="btn btn-primary" onClick={downloadReport}>
                        <i className="fas fa-file-pdf"></i> Download Report
                    </button>
                </div>

                <div className="box-table-container">
                    <div className="box-table-header" style={{ gridTemplateColumns: 'minmax(120px, 1fr) 1.5fr 1fr 0.8fr 1fr 1fr' }}>
                        <div>Date</div>
                        <div>Script</div>
                        <div>Status</div>
                        <div style={{ textAlign: 'right' }}>Qty</div>
                        <div style={{ textAlign: 'right' }}>Price</div>
                        <div style={{ textAlign: 'right' }}>Net P&L</div>
                    </div>
                    {trades.map(trade => (
                        <div className="box-table-row" key={trade.id} style={{ gridTemplateColumns: 'minmax(120px, 1fr) 1.5fr 1fr 0.8fr 1fr 1fr', borderLeft: `4px solid ${trade.type === 'FUND' ? 'var(--primary)' : (trade.net_pnl >= 0 ? 'var(--success)' : 'var(--danger)')}` }}>
                            <div className="box-table-cell">
                                <span className="cell-label">Date</span>
                                {trade.date.toLocaleDateString()}
                            </div>
                            <div className="box-table-cell">
                                <span className="cell-label">Script</span>
                                <div style={{ fontWeight: '700' }}>{trade.script}</div>
                                {trade.type === 'TRADE' && <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>SELL</div>}
                            </div>
                            <div className="box-table-cell">
                                <span className="cell-label">Status</span>
                                <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700', background: 'var(--bg-body)', textTransform: 'uppercase' }}>
                                    {trade.status}
                                </span>
                            </div>
                            <div className="box-table-cell font-mono" style={{ textAlign: 'right' }}>
                                <span className="cell-label">Qty</span>
                                {trade.qty}
                            </div>
                            <div className="box-table-cell font-mono" style={{ textAlign: 'right' }}>
                                <span className="cell-label">Price</span>
                                {trade.price}
                            </div>
                            <div className="box-table-cell font-mono" style={{ textAlign: 'right', fontWeight: '800', fontSize: '1.1rem', color: trade.type === 'FUND' ? 'var(--primary)' : (trade.net_pnl >= 0 ? 'var(--success)' : 'var(--danger)') }}>
                                <span className="cell-label">Net P&L</span>
                                {trade.net_pnl > 0 ? '+' : ''}{trade.net_pnl.toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    );
};

export default PnL;