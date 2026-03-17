const ExcelJS = require('exceljs');
const AllocationTrade = require('../models/AllocationTrade');
const LedgerEntry = require('../models/LedgerEntry');
const Trade = require('../models/Trade');
const User = require('../models/User');
const DailyPriceFlag = require('../models/DailyPriceFlag');

// @desc    Download User P&L Analysis Report (Excel)
// @route   GET /api/reports/pnl
const downloadPnLReport = async (req, res) => {
    try {
        const mob_num = req.user.mob_num;

        // Fetch data (similar to PnL.js logic)
        const [allocations, ledgerEntries] = await Promise.all([
            AllocationTrade.find({ mob_num }).populate('master_trade_id', 'symbol').lean(),
            LedgerEntry.find({ mob_num }).lean()
        ]);

        // Process P&L Data
        const completed = allocations.filter(t => t.status === 'CLOSED');
        const openTrades = allocations.filter(t => t.status === 'OPEN');
        
        const filteredLedger = ledgerEntries.filter(l =>
            !l.description.includes('Trade Alert') && !l.description.includes('M to M')
        );

        const fundsAdded = filteredLedger.filter(l =>
            l.act_type === 'CREDIT' &&
            (l.description.includes('Fund Added') || l.description.includes('Funds Added') || l.description.includes('Balance Added'))
        );

        // Fetch current prices for open trades to calculate unrealized P&L
        for (let t of openTrades) {
            const latestFlag = await DailyPriceFlag.findOne({ tradeId: t.master_trade_id._id }).sort({ timestamp: -1 });
            if (latestFlag) {
                t.current_price = latestFlag.activePrice;
                t.unrealized_pnl = (t.allocation_qty * (latestFlag.activePrice - t.allocation_price)) - (t.buy_brokerage || 0);
            } else {
                t.current_price = t.allocation_price;
                t.unrealized_pnl = -(t.buy_brokerage || 0);
            }
        }

        const combinedData = [
            ...completed.map(t => ({
                date: t.sell_timestamp || t.buy_timestamp,
                script: t.master_trade_id?.symbol || 'N/A',
                type: 'TRADE',
                status: 'CLOSED',
                qty: t.allocation_qty,
                buy_price: t.allocation_price,
                exit_price: t.exit_price,
                net_pnl: t.client_pnl || 0
            })),
            ...openTrades.map(t => ({
                date: t.buy_timestamp,
                script: t.master_trade_id?.symbol || 'N/A',
                type: 'TRADE',
                status: 'OPEN',
                qty: t.allocation_qty,
                buy_price: t.allocation_price,
                exit_price: t.current_price,
                net_pnl: t.unrealized_pnl || 0
            })),
            ...fundsAdded.map(l => ({
                date: l.entry_date,
                script: 'FUND ADDED',
                type: 'FUND',
                status: 'COMPLETED',
                qty: '-',
                buy_price: '-',
                exit_price: '-',
                net_pnl: l.amt_cr
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        // Create Workbook
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('P&L Analysis');

        // Define Columns
        sheet.columns = [
            { header: 'Date', key: 'date', width: 20 },
            { header: 'Script', key: 'script', width: 25 },
            { header: 'Type', key: 'type', width: 10 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Qty', key: 'qty', width: 10 },
            { header: 'Buy/Entry Price', key: 'buy_price', width: 15 },
            { header: 'Exit/CMP', key: 'exit_price', width: 15 },
            { header: 'Net P&L (₹)', key: 'net_pnl', width: 15 }
        ];

        // Style Header
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add Data
        combinedData.forEach(item => {
            const row = sheet.addRow({
                date: new Date(item.date).toLocaleString(),
                script: item.script,
                type: item.type,
                status: item.status,
                qty: item.qty,
                buy_price: item.buy_price,
                exit_price: item.exit_price,
                net_pnl: item.net_pnl
            });

            // Colorize P&L
            const pnlCell = row.getCell('net_pnl');
            if (item.type === 'TRADE') {
                if (item.net_pnl >= 0) {
                    pnlCell.font = { color: { argb: 'FF008000' } }; // Green
                } else {
                    pnlCell.font = { color: { argb: 'FFFF0000' } }; // Red
                }
            } else if (item.type === 'FUND') {
                pnlCell.font = { color: { argb: 'FF0000FF' } }; // Blue
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

        const [trades, allocations, ledger] = await Promise.all([
            Trade.find().sort({ createdAt: -1 }).lean(),
            AllocationTrade.find().populate('master_trade_id', 'symbol').sort({ createdAt: -1 }).lean(),
            LedgerEntry.find().sort({ entry_date: -1 }).lean()
        ]);

        const workbook = new ExcelJS.Workbook();

        // Sheet 1: Master Trades
        const masterSheet = workbook.addWorksheet('Master Trades');
        masterSheet.columns = [
            { header: 'Date', key: 'date', width: 20 },
            { header: 'Symbol', key: 'symbol', width: 15 },
            { header: 'Total Qty', key: 'total_qty', width: 12 },
            { header: 'Buy Price', key: 'buy_price', width: 12 },
            { header: 'Total Cost', key: 'total_cost', width: 15 },
            { header: 'Status', key: 'status', width: 10 },
            { header: 'Sell Price', key: 'sell_price', width: 12 },
            { header: 'Master P&L', key: 'master_pnl', width: 15 }
        ];
        trades.forEach(t => {
            masterSheet.addRow({
                date: new Date(t.createdAt).toLocaleString(),
                symbol: t.symbol,
                total_qty: t.total_qty,
                buy_price: t.buy_price,
                total_cost: t.total_cost,
                status: t.status,
                sell_price: t.sell_price || '-',
                master_pnl: t.master_pnl || 0
            });
        });

        // Sheet 2: Allocations
        const allocSheet = workbook.addWorksheet('Allocations');
        allocSheet.columns = [
            { header: 'Date', key: 'date', width: 20 },
            { header: 'User Mobile', key: 'mob_num', width: 15 },
            { header: 'Symbol', key: 'symbol', width: 15 },
            { header: 'Qty', key: 'qty', width: 10 },
            { header: 'Buy Price', key: 'buy_price', width: 12 },
            { header: 'Buy Brok', key: 'buy_brok', width: 12 },
            { header: 'Status', key: 'status', width: 10 },
            { header: 'Exit Price', key: 'exit_price', width: 12 },
            { header: 'Client P&L', key: 'client_pnl', width: 15 }
        ];
        allocations.forEach(a => {
            allocSheet.addRow({
                date: new Date(a.buy_timestamp).toLocaleString(),
                mob_num: a.mob_num,
                symbol: a.master_trade_id?.symbol || 'N/A',
                qty: a.allocation_qty,
                buy_price: a.allocation_price,
                buy_brok: a.buy_brokerage,
                status: a.status,
                exit_price: a.exit_price || '-',
                client_pnl: a.client_pnl || 0
            });
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
