import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Layout from '../components/Layout';
import Loader from '../components/Loader';

const Ledger = () => {
    const [loading, setLoading] = useState(true);
    const [ledger, setLedger] = useState([]);
    const [runningBalance, setRunningBalance] = useState(0);
    const [userProfile, setUserProfile] = useState({ name: 'User', clientId: 'N/A' });
    const [searchQueryInput, setSearchQueryInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        // Load actual User details from local storage
        const storedUser = localStorage.getItem('userInfo');
        if (storedUser) {
            const parsedInfo = JSON.parse(storedUser);
            const userData = parsedInfo.user || {};
            setUserProfile({
                name: userData.user_name || 'User',
                clientId: userData.client_id || 'N/A'
            });
        }

        const fetchLedger = async () => {
            try {
                setLoading(true);
                const { data } = await api.get('/user-ledger/entries');
                console.log("RAW LEDGER DATA:", data);
                if (!Array.isArray(data)) {
                    console.error("Ledger data is not an array:", data);
                    setLedger([]);
                    return;
                }
                // Calculate Running Balance on the Frontend for display accuracy
                // Backend sends data sorted { entry_date: -1 } (newest first).
                let currentBal = 0;
                // Reverse to compute balance chronologically (oldest first)
                const chronologicalData = [...data].reverse().map(entry => {
                    if (entry.amt_cr > 0) currentBal += entry.amt_cr;
                    if (entry.amt_dr > 0) currentBal -= entry.amt_dr;
                    return { ...entry, balance: currentBal };
                });

                // Revert back to newest-first for the UI table
                const calculatedData = chronologicalData.reverse();

                setLedger(calculatedData);
                setRunningBalance(currentBal);
            } catch (error) {
                console.error("Error fetching ledger:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLedger();
    }, []);

    // Filter logic
    const filteredLedger = ledger.filter(row => {
        const desc = (row.description || '').toLowerCase();
        const search = searchQuery.toLowerCase();
        return desc.includes(search) ||
            (row.amt_cr > 0 && row.amt_cr.toString().includes(searchQuery)) ||
            (row.amt_dr > 0 && row.amt_dr.toString().includes(searchQuery));
    });

    // Helper to extract brokerage
    const extractBrokerage = (desc) => {
        if (!desc) return 0;
        const match = desc.match(/deducted [\d.]+%\s*brokerage:\s*₹([\d.]+)/i);
        return match ? parseFloat(match[1]) : 0;
    };

    return (
        <Layout title="Ledger Book">
            {loading && <Loader />}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.2rem' }}>Client Ledger</h2>
                        <p className="text-muted" style={{ fontSize: '0.9rem' }}>Account: {userProfile.clientId} ({userProfile.name})</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Closing Balance</div>
                        <div className="text-up" style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                            ₹ {runningBalance.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', maxWidth: '400px' }}>
                        <input
                            type="text"
                            placeholder="Search particulars, amounts..."
                            value={searchQueryInput}
                            onChange={(e) => setSearchQueryInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && setSearchQuery(searchQueryInput)}
                            style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px 0 0 6px', background: 'var(--bg-card)', color: 'var(--text-main)', width: '100%', outline: 'none' }}
                        />
                        <button
                            className="btn btn-primary"
                            onClick={() => setSearchQuery(searchQueryInput)}
                            style={{ borderRadius: '0 6px 6px 0', borderLeft: 'none', padding: '8px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                        >
                            Search
                        </button>
                    </div>
                </div>

                <div className="box-table-container">
                    <div className="box-table-header" style={{ gridTemplateColumns: 'minmax(120px, 1fr) 2fr 0.8fr 1fr 1fr 1.2fr' }}>
                        <div>Date</div>
                        <div>Particulars</div>
                        <div style={{ textAlign: 'right' }}>Brokerage</div>
                        <div style={{ textAlign: 'right' }}>Debit</div>
                        <div style={{ textAlign: 'right' }}>Credit</div>
                        <div style={{ textAlign: 'right' }}>Running Bal</div>
                    </div>
                    {filteredLedger.map(row => {
                        const brokerage = extractBrokerage(row.description);
                        const isCredit = row.amt_cr > 0;
                        const isDebit = row.amt_dr > 0;
                        return (
                            <div className="box-table-row" key={row._id} style={{ gridTemplateColumns: 'minmax(120px, 1fr) 2fr 0.8fr 1fr 1fr 1.2fr', borderLeft: `4px solid ${isCredit ? 'var(--success)' : (isDebit ? 'var(--danger)' : 'var(--border)')}` }}>
                                <div className="box-table-cell">
                                    <span className="cell-label">Date</span>
                                    {new Date(row.entry_date).toLocaleDateString()}
                                </div>
                                <div className="box-table-cell">
                                    <span className="cell-label">Particulars</span>
                                    {row.description}
                                </div>
                                <div className="box-table-cell font-mono" style={{ textAlign: 'right', color: 'var(--danger)' }}>
                                    <span className="cell-label">Brokerage</span>
                                    {brokerage > 0 ? `₹${brokerage.toFixed(2)}` : '-'}
                                </div>
                                <div className="box-table-cell font-mono" style={{ textAlign: 'right', color: 'var(--danger)' }}>
                                    <span className="cell-label">Debit</span>
                                    {row.amt_dr > 0 ? `₹${row.amt_dr.toLocaleString()}` : '-'}
                                </div>
                                <div className="box-table-cell font-mono" style={{ textAlign: 'right', color: 'var(--success)' }}>
                                    <span className="cell-label">Credit</span>
                                    {row.amt_cr > 0 ? `₹${row.amt_cr.toLocaleString()}` : '-'}
                                </div>
                                <div className="box-table-cell font-mono" style={{ textAlign: 'right', fontWeight: '800', fontSize: '1.1rem' }}>
                                    <span className="cell-label">Balance</span>
                                    ₹ {row.balance.toLocaleString()}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </Layout>
    );
};

export default Ledger;