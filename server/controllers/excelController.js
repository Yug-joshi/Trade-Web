const ExcelJS = require('exceljs');
const AllocationTrade = require('../models/AllocationTrade');
const LedgerEntry = require('../models/LedgerEntry');
const Trade = require('../models/Trade');
const User = require('../models/User');
const DailyPriceFlag = require('../models/DailyPriceFlag');

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

// @desc    Download User P&L Analysis Report (Excel)
// @route   GET /api/reports/pnl
const downloadPnLReport = async (req, res) => {
    try {
        const mob_num = req.user.mob_num;
        const { startDate, endDate, searchTerm } = req.query;

        // Fetch allocations only (strictly trade-only now)
        const allocations = await AllocationTrade.find({ mob_num }).populate('master_trade_id', 'symbol').lean();

        // 1. Strict Filter: Remove any non-trade or fund entries
        let filtered = allocations.filter(t => 
            t.master_trade_id && 
            t.master_trade_id.symbol && 
            !t.master_trade_id.symbol.includes('FUND')
        );

        // 2. Date Filtering
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            filtered = filtered.filter(t => new Date(t.buy_timestamp || t.createdAt) >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(t => new Date(t.buy_timestamp || t.createdAt) <= end);
        }

        // 3. Search Term Filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(t => 
                t.master_trade_id.symbol.toLowerCase().includes(term)
            );
        }

        // Process final data list
        const processedData = [];
        for (const t of filtered) {
            const isClosed = t.status === 'CLOSED';
            const qty = t.allocation_qty || 0;
            const netBuy = (t.total_value || (t.allocation_price * qty)) + (t.buy_brokerage || 0);
            const netSell = isClosed ? ((t.exit_value || 0) - (t.sell_brokerage || 0)) : '-';
            
            let cmp = '-';
            if (!isClosed) {
                const latestFlag = await DailyPriceFlag.findOne({ tradeId: t.master_trade_id._id }).sort({ timestamp: -1 });
                cmp = latestFlag ? latestFlag.activePrice : t.allocation_price;
            }

            processedData.push({
                buy_date: t.buy_timestamp || t.createdAt,
                script: t.master_trade_id?.symbol || 'N/A',
                buy_qty: qty,
                buy_rate: t.allocation_price,
                net_buy: netBuy,
                sell_date: isClosed ? (t.sell_timestamp || t.updatedAt) : '-',
                sell_qty: isClosed ? qty : '-',
                sell_rate: isClosed ? t.exit_price : '-',
                net_sell: netSell,
                cmp: cmp,
                pnl: t.client_pnl || 0,
                status: t.status
            });
        }
        processedData.sort((a, b) => new Date(b.buy_date) - new Date(a.buy_date));

        // Create Workbook
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('P&L Analysis');

        // Define Columns (Matching frontend PnL.js 11 columns)
        sheet.columns = [
            { header: 'Buy_Date', key: 'buy_date', width: 22 },
            { header: 'Script', key: 'script', width: 15 },
            { header: 'Buy_QTY', key: 'buy_qty', width: 10 },
            { header: 'Buy_Rate', key: 'buy_rate', width: 12 },
            { header: 'Net Buy', key: 'net_buy', width: 15 },
            { header: 'Sell Date', key: 'sell_date', width: 22 },
            { header: 'Sell_QTY', key: 'sell_qty', width: 10 },
            { header: 'Sell_Rate', key: 'sell_rate', width: 12 },
            { header: 'Net Sell', key: 'net_sell', width: 15 },
            { header: 'CMP', key: 'cmp', width: 12 },
            { header: 'P&L', key: 'pnl', width: 12 },
            { header: 'Status', key: 'status', width: 12 }
        ];

        // Style Header
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add Data
        processedData.forEach(item => {
            const row = sheet.addRow({
                buy_date: item.buy_date !== '-' ? new Date(item.buy_date).toLocaleString() : '-',
                script: item.script,
                buy_qty: item.buy_qty,
                buy_rate: item.buy_rate,
                net_buy: item.net_buy,
                sell_date: item.sell_date !== '-' ? new Date(item.sell_date).toLocaleString() : '-',
                sell_qty: item.sell_qty,
                sell_rate: item.sell_rate,
                net_sell: item.net_sell,
                cmp: item.cmp,
                pnl: item.pnl,
                status: item.status
            });

            // Colorize P&L
            const pnlCell = row.getCell('pnl');
            if (item.pnl > 0) {
                pnlCell.font = { color: { argb: 'FF00B050' }, bold: true }; // Green
            } else if (item.pnl < 0) {
                pnlCell.font = { color: { argb: 'FFFF0000' }, bold: true }; // Red
            }
        });

        // Set Headers and Send File
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=PnL_Report_${mob_num}_${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("PnL Excel Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Download Admin Report (Excel)
// @route   GET /api/reports/admin/trades
const downloadAdminReport = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Not authorized" });
        }

        const [trades, allocations, ledger, users] = await Promise.all([
            Trade.find().sort({ createdAt: -1 }).lean(),
            AllocationTrade.find().populate('master_trade_id', 'symbol').sort({ createdAt: -1 }).lean(),
            LedgerEntry.find().sort({ entry_date: -1 }).lean(),
            User.find().lean()
        ]);

        const userMap = {};
        users.forEach(u => userMap[u.mob_num] = u.user_name);

        const workbook = new ExcelJS.Workbook();

        // Sheet 1: Master Trades
        const masterSheet = workbook.addWorksheet('Master Trades');
        masterSheet.columns = [
            { header: 'Date', key: 'date', width: 22 },
            { header: 'Symbol', key: 'symbol', width: 15 },
            { header: 'Buy Quantity', key: 'buy_qty', width: 15 },
            { header: 'Buy Rate', key: 'buy_rate', width: 12 },
            { header: 'Total Buy', key: 'tot_buy', width: 15 },
            { header: 'Time Stamp', key: 'time_stamp', width: 22 },
            { header: 'Sell Quantity', key: 'sell_qty', width: 15 },
            { header: 'Sell Rate', key: 'sell_rate', width: 12 },
            { header: 'Total Sell', key: 'tot_sell', width: 15 },
            { header: 'Status', key: 'status', width: 10 },
            { header: 'Master P&L', key: 'master_pnl', width: 15 }
        ];

        trades.forEach(t => {
            const isClosed = t.status === 'CLOSED';
            const buyQty = t.total_qty || 0;
            const buyRate = t.buy_price || 0;
            const totBuy = t.total_cost || (buyQty * buyRate);
            const sellRate = t.sell_price || 0;
            const totSell = t.total_exit_value || (isClosed ? (buyQty * sellRate) : 0);

            masterSheet.addRow({
                date: formatDateTime(t.buy_timestamp || t.createdAt),
                symbol: t.symbol,
                buy_qty: buyQty,
                buy_rate: buyRate.toFixed(2),
                tot_buy: totBuy.toFixed(2),
                time_stamp: isClosed ? formatDateTime(t.sell_timestamp) : '-',
                sell_qty: isClosed ? buyQty : '-',
                sell_rate: isClosed ? sellRate.toFixed(2) : '-',
                tot_sell: isClosed ? totSell.toFixed(2) : '-',
                status: t.status,
                master_pnl: (t.master_pnl || 0).toFixed(2)
            });

            // Colorize Master P&L
            const row = masterSheet.lastRow;
            const pnlCell = row.getCell('master_pnl');
            if (t.master_pnl >= 0) {
                pnlCell.font = { color: { argb: 'FF00B050' }, bold: true }; // Green
            } else if (t.master_pnl < 0) {
                pnlCell.font = { color: { argb: 'FFFF0000' }, bold: true }; // Red
            }
        });

        // Sheet 2: Allocations
        const allocSheet = workbook.addWorksheet('Allocations');
        allocSheet.columns = [
            { header: 'Date', key: 'date', width: 22 },
            { header: 'Username', key: 'user_name', width: 20 },
            { header: 'Symbol', key: 'symbol', width: 15 },
            { header: 'Buy Quantity', key: 'buy_qty', width: 15 },
            { header: 'Buy Rate', key: 'buy_rate', width: 12 },
            { header: 'Total Buy', key: 'tot_buy', width: 15 },
            { header: 'Buy Brokerage', key: 'buy_brok', width: 15 },
            { header: 'Net Buy Value', key: 'nbv', width: 15 },
            { header: 'Time Stamp', key: 'time_stamp', width: 22 },
            { header: 'Sell Quantity', key: 'sell_qty', width: 15 },
            { header: 'Sell Rate', key: 'sell_rate', width: 12 },
            { header: 'Total Sell', key: 'tot_sell', width: 15 },
            { header: 'Sell Brokerage', key: 'sell_brok', width: 15 },
            { header: 'Net Sell Value', key: 'nsv', width: 15 },
            { header: 'P&L', key: 'pnl', width: 15 },
            { header: 'Total Brokerage', key: 'tot_brok', width: 15 }
        ];

        allocations.forEach(a => {
            const isClosed = a.status === 'CLOSED';
            const qty = a.allocation_qty || 0;
            const brokRate = (userMap[a.mob_num]?.brokerage !== undefined) ? userMap[a.mob_num].brokerage : 2;
            const rawBuyVal = a.total_value || (a.allocation_price * qty);
            const buyBrokAmount = (a.buy_brokerage !== undefined && a.buy_brokerage !== 0) ? a.buy_brokerage : (rawBuyVal * (brokRate / 100));
            const totalBuy = rawBuyVal + buyBrokAmount;

            const rawSellPriceTotal = a.exit_value || 0;
            const sellBrokAmount = (a.sell_brokerage !== undefined && a.sell_brokerage !== 0) ? a.sell_brokerage : (isClosed ? (rawSellPriceTotal * (brokRate / 100)) : 0);
            const totalSell = isClosed ? (rawSellPriceTotal - sellBrokAmount) : 0;

            const pnlValue = isClosed ? (totalSell - totalBuy) : 0;

            allocSheet.addRow({
                date: formatDateTime(a.buy_timestamp),
                user_name: userMap[a.mob_num] || a.mob_num,
                symbol: a.master_trade_id?.symbol || 'N/A',
                buy_qty: qty,
                buy_rate: a.allocation_price.toFixed(2),
                tot_buy: rawBuyVal.toFixed(2),
                buy_brok: buyBrokAmount.toFixed(2),
                nbv: totalBuy.toFixed(2),
                time_stamp: isClosed ? formatDateTime(a.sell_timestamp) : '-',
                sell_qty: isClosed ? qty : '-',
                sell_rate: isClosed ? a.exit_price.toFixed(2) : '-',
                tot_sell: isClosed ? rawSellPriceTotal.toFixed(2) : '-',
                sell_brok: isClosed ? sellBrokAmount.toFixed(2) : '-',
                nsv: isClosed ? totalSell.toFixed(2) : 'OPEN',
                pnl: isClosed ? pnlValue.toFixed(2) : '-',
                tot_brok: (buyBrokAmount + sellBrokAmount).toFixed(2)
            });

            // Colorize P&L cell for the last row added
            if (isClosed) {
                const row = allocSheet.lastRow;
                const pnlCell = row.getCell('pnl');
                if (pnlValue >= 0) {
                    pnlCell.font = { color: { argb: 'FF00B050' }, bold: true }; // Green
                } else {
                    pnlCell.font = { color: { argb: 'FFFF0000' }, bold: true }; // Red
                }
            }
        });

        // Sheet 3: Global Ledger
        const ledgerSheet = workbook.addWorksheet('Global Ledger');
        ledgerSheet.columns = [
            { header: 'Timestamp', key: 'timestamp', width: 22 },
            { header: 'User Mobile', key: 'mob_num', width: 15 },
            { header: 'Description', key: 'desc', width: 50 },
            { header: 'Credit (₹)', key: 'cr', width: 12 },
            { header: 'Debit (₹)', key: 'dr', width: 12 },
            { header: 'Closing Bal', key: 'bal', width: 15 }
        ];
        ledger.forEach(l => {
            ledgerSheet.addRow({
                timestamp: new Date(l.entry_date).toLocaleString(),
                mob_num: l.mob_num,
                desc: l.description,
                cr: l.amt_cr || 0,
                dr: l.amt_dr || 0,
                bal: l.cls_balance || 0
            });
        });

        // Set Headers and Send File
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Admin_Trade_Report_${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Admin Excel Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { downloadPnLReport, downloadAdminReport };
