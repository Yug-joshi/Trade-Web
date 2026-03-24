import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Layout from '../components/Layout';
import Loader from '../components/Loader';
import { formatDateTime } from '../utils/dateFormatter';

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [trades, setTrades] = useState([]);
    const [ledgerEntries, setLedgerEntries] = useState([]);
    const [ledgerSummary, setLedgerSummary] = useState(null);
    const [metrics, setMetrics] = useState({
        netAssetValue: 0,
        realizedPnL: 0,
        unrealizedPnL: 0,
        holdingValue: 0,
        completedTrades: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [tradesRes, ledgerEntriesRes, statsRes] = await Promise.all([
                    api.get('/trades/my-allocations/list'),
                    api.get('/user-ledger/entries'),
                    api.get('/user-ledger/summary')
                ]);

                // Filter out fund entries
                const validTrades = tradesRes.data.filter(t => 
                    t.master_trade_id && 
                    t.master_trade_id.symbol && 
                    !t.master_trade_id.symbol.includes('FUND')
                );
                
                setTrades(validTrades.sort((a, b) => new Date(b.buy_timestamp) - new Date(a.buy_timestamp)));
                setLedgerSummary(statsRes.data);

                // Process ledger entries for running balance
                const sortedEntries = [...ledgerEntriesRes.data].reverse();
                let currentBal = 0;
                const withBalance = sortedEntries.map(entry => {
                    const investedValue = (entry.total_value || (entry.allocation_price * entry.allocation_qty)) + (entry.buy_brokerage || 0);
                    currentBal += (entry.amt_cr || 0) - (entry.amt_dr || 0);
                    return { ...entry, runningBalance: currentBal };
                });
                setLedgerEntries(withBalance.reverse().slice(0, 2));

                calculateMetrics(validTrades, statsRes.data);
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const calculateMetrics = (data, ledger) => {
        let completed = 0;
        let investedAmount = 0;
        let realizedPnL = 0;
        let unrealizedPnL = 0;

        data.forEach(trade => {
            if (trade.status === 'CLOSED') {
                completed++;
                realizedPnL += (trade.client_pnl || 0);
            }
            if (trade.status === 'OPEN') {
                const baseValue = (trade.total_value || (trade.allocation_price * trade.allocation_qty));
                const inclusiveValue = baseValue + (trade.buy_brokerage || 0);
                investedAmount += inclusiveValue;
                const currentVal = trade.current_value || baseValue;
                unrealizedPnL += (currentVal - inclusiveValue);
            }
        });

        const netAssetValue = (ledger.baseDeposit || 0) + realizedPnL + unrealizedPnL;

        setMetrics({
            netAssetValue,
            realizedPnL,
            unrealizedPnL,
            holdingValue: investedAmount,
            completedTrades: completed
        });
    };


    const extractBrokerage = (desc) => {
        if (!desc) return 0;
        const match = desc.match(/Brok Paid: ([\d.]+)/);
        return match ? parseFloat(match[1]) : 0;
    };

    return (
        <Layout title="Dashboard">
            {loading && <Loader />}
            {/* Top Stats Grid - 4 Boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
                <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                    <div className="metric-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Net Asset Value</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)' }}>₹ {metrics.netAssetValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>
                    
                </div>

                <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
                    <div className="metric-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Realized P&L</div>
                    <div className={metrics.realizedPnL >= 0 ? "text-up" : "text-down"} style={{ fontSize: '1.6rem', fontWeight: '800' }}>
                        {metrics.realizedPnL >= 0 ? '+' : ''} ₹ {metrics.realizedPnL?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </div>
                    
                </div>

                <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
                    <div className="metric-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unrealized P&L</div>
                    <div className={metrics.unrealizedPnL >= 0 ? "text-up" : "text-down"} style={{ fontSize: '1.6rem', fontWeight: '800' }}>
                        {metrics.unrealizedPnL >= 0 ? '+' : ''} ₹ {metrics.unrealizedPnL?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                    </div>
                    
                </div>

                <div className="card" style={{ borderLeft: '4px solid var(--primary-dark)' }}>
                    <div className="metric-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Holding Value</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)' }}>₹ {metrics.holdingValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>
                    
                </div>
            </div>

            {/* Open Trades Table */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Open Trades</h3>
                    <Link to="/pnl" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem', textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>View All</Link>
                </div>
                <div className="box-table-container" style={{ overflowX: 'auto' }}>
                    <div className="box-table-header" style={{ gridTemplateColumns: 'minmax(140px, 1.2fr) minmax(100px, 1fr) 0.8fr 1fr 1.2fr 1fr 1.2fr', minWidth: '800px', textAlign: 'center' }}>
                        <div style={{ borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>Date</div>
                        <div style={{ borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>Symbol</div>
                        <div style={{ borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>Buy_QTY</div>
                        <div style={{ borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>Buy Price</div>
                        <div style={{ borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>Total Value</div>
                        <div style={{ borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>CMP</div>
                        <div style={{ padding: '10px 5px' }}>P&L</div>
                    </div>
                    {trades.filter(t => t.status === 'OPEN').slice(0, 2).map(trade => {
                        const baseValue = trade.total_value || (trade.allocation_price * trade.allocation_qty);
                        const inclusiveValue = baseValue + (trade.buy_brokerage || 0);
                        const qty = trade.allocation_qty || 0;
                        const cmp = qty > 0 ? (trade.current_value / qty) : 0;
                        const unrealizedPnL = (trade.current_value || 0) - inclusiveValue;

                        return (
                            <div className="box-table-row" key={trade._id} style={{ gridTemplateColumns: 'minmax(140px, 1.2fr) minmax(100px, 1fr) 0.8fr 1fr 1.2fr 1fr 1.2fr', minWidth: '800px', textAlign: 'center', borderLeft: `4px solid ${unrealizedPnL >= 0 ? 'var(--success)' : 'var(--danger)'}`, marginBottom: '4px' }}>
                                <div className="box-table-cell" style={{ borderRight: '1px solid var(--border)', justifyContent: 'center', fontSize: '0.8rem' }}>
                                    <span className="cell-label">Date</span>
                                    {formatDateTime(trade.buy_timestamp)}
                                </div>
                                <div className="box-table-cell" style={{ borderRight: '1px solid var(--border)', fontWeight: '700', color: 'var(--text-main)', justifyContent: 'center' }}>
                                    <span className="cell-label">Symbol</span>
                                    {trade.master_trade_id?.symbol}
                                </div>
                                <div className="box-table-cell" style={{ borderRight: '1px solid var(--border)', justifyContent: 'center' }}>
                                    <span className="cell-label">Buy_QTY</span>
                                    {qty}
                                </div>
                                <div className="box-table-cell font-mono" style={{ borderRight: '1px solid var(--border)', justifyContent: 'center' }}>
                                    <span className="cell-label">Buy Price</span>
                                    ₹{Number(trade.allocation_price || 0).toFixed(2)}
                                </div>
                                <div className="box-table-cell font-mono" style={{ borderRight: '1px solid var(--border)', justifyContent: 'center', fontWeight: 'bold' }}>
                                    <span className="cell-label">Total Price</span>
                                    ₹{Number(inclusiveValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                                <div className="box-table-cell font-mono" style={{ borderRight: '1px solid var(--border)', justifyContent: 'center', fontWeight: 'bold', color: 'var(--primary)' }}>
                                    <span className="cell-label">CMP</span>
                                    ₹{Number(cmp || 0).toFixed(2)}
                                </div>
                                <div className="box-table-cell font-mono" style={{ justifyContent: 'center', fontWeight: '800', color: unrealizedPnL >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                    <span className="cell-label">P&L</span>
                                    {unrealizedPnL >= 0 ? '+' : ''}{Number(unrealizedPnL || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                            </div>
                        );
                    })}
                    {trades.filter(t => t.status === 'OPEN').length === 0 && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No open trades found.</div>
                    )}
                </div>
            </div>

            {/* Ledger Breakdown Table */}
            <div className="card" style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Ledger Summary</h3>
                    <Link to="/ledger" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem', textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>View All</Link>
                </div>
                {ledgerEntries.length > 0 ? (
                    <div className="box-table-container" style={{ overflowX: 'auto' }}>
                        <div className="box-table-header" style={{ gridTemplateColumns: '1.2fr 2fr 1fr 1fr 1fr 1.2fr', minWidth: '800px', textAlign: 'center' }}>
                            <div style={{ borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>Date</div>
                            <div style={{ borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>Particulars</div>
                            <div style={{ borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>Brokerage</div>
                            <div style={{ borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>Debit</div>
                            <div style={{ borderRight: '1px solid rgba(255,255,255,0.1)', padding: '10px 5px' }}>Credit</div>
                            <div style={{ padding: '10px 5px' }}>Running Bal</div>
                        </div>
                        {ledgerEntries.map((entry) => {
                            const brok = extractBrokerage(entry.description);
                            return (
                                <div className="box-table-row" key={entry._id} style={{ gridTemplateColumns: '1.2fr 2fr 1fr 1fr 1fr 1.2fr', minWidth: '800px', textAlign: 'center', borderLeft: `4px solid ${entry.amt_cr > 0 ? 'var(--success)' : 'var(--danger)'}`, marginBottom: '4px' }}>
                                    <div className="box-table-cell" style={{ borderRight: '1px solid var(--border)', justifyContent: 'center' }}>
                                        <span className="cell-label">Date</span>
                                        {formatDateTime(entry.entry_date)}
                                    </div>
                                    <div className="box-table-cell" style={{ borderRight: '1px solid var(--border)', justifyContent: 'center', fontSize: '0.85rem' }}>
                                        <span className="cell-label">Particulars</span>
                                        {entry.description}
                                    </div>
                                    <div className="box-table-cell font-mono" style={{ borderRight: '1px solid var(--border)', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                        <span className="cell-label">Brokerage</span>
                                        {brok > 0 ? `₹${brok.toFixed(2)}` : '-'}
                                    </div>
                                    <div className="box-table-cell font-mono" style={{ borderRight: '1px solid var(--border)', justifyContent: 'center', color: 'var(--danger)' }}>
                                        <span className="cell-label">Debit</span>
                                        {entry.amt_dr > 0 ? `₹${entry.amt_dr.toLocaleString()}` : '-'}
                                    </div>
                                    <div className="box-table-cell font-mono" style={{ borderRight: '1px solid var(--border)', justifyContent: 'center', color: 'var(--success)' }}>
                                        <span className="cell-label">Credit</span>
                                        {entry.amt_cr > 0 ? `₹${entry.amt_cr.toLocaleString()}` : '-'}
                                    </div>
                                    <div className="box-table-cell font-mono" style={{ justifyContent: 'center', fontWeight: 'bold' }}>
                                        <span className="cell-label">Balance</span>
                                        ₹{entry.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ padding: '20px', textAlign: 'center' }}>
                        <div className="text-muted">No ledger entries found.</div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Dashboard;