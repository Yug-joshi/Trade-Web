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

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                <th style={{ padding: '12px', borderBottom: '2px solid var(--border)' }}>Date</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid var(--border)' }}>Script</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid var(--border)' }}>Status</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid var(--border)', textAlign: 'right' }}>Qty</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid var(--border)', textAlign: 'right' }}>Price</th>
                                <th style={{ padding: '12px', borderBottom: '2px solid var(--border)', textAlign: 'right' }}>Net P&L</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trades.map(trade => (
                                <tr key={trade.id}>
                                    <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)' }}>{trade.date.toLocaleDateString()}</td>
                                    <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ fontWeight: '600' }}>{trade.script}</div>
                                        {trade.type === 'TRADE' && <div style={{ fontSize: '0.75rem' }} className="text-muted">SELL</div>}
                                    </td>
                                    <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)' }}>
                                        <span style={{ background: 'var(--bg-body)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600' }}>{trade.status}</span>
                                    </td>
                                    <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'monospace' }}>{trade.qty}</td>
                                    <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontFamily: 'monospace' }}>{trade.price}</td>
                                    <td style={{ padding: '14px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: '700' }} className={trade.type === 'FUND' ? "text-up" : (trade.net_pnl >= 0 ? "text-up" : "text-down")}>
                                        {trade.net_pnl > 0 ? '+' : ''}{trade.net_pnl.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
};

export default PnL;