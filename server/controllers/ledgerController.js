const LedgerEntry = require('../models/LedgerEntry');
const AllocationTrade = require('../models/AllocationTrade');
const DailyPriceFlag = require('../models/DailyPriceFlag');

// @desc    Get ledger entries
// @route   GET /api/ledger
const getLedgerEntries = async (req, res) => {
    try {
        let query = {};
        // If the user is not an admin, restrict query to their own mobile number
        if (req.user.role !== 'admin') {
            query.mob_num = req.user.mob_num;
        }

        const entries = await LedgerEntry.find(query).sort({ entry_date: -1 });
        res.status(200).json(entries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user ledger summary (Breakdown)
// @route   GET /api/ledger/summary
const getLedgerSummary = async (req, res) => {
    try {
        const mob_num = req.user.mob_num;
        const entries = await LedgerEntry.find({ mob_num });

        let baseDeposit = 0;
        let previousProfit = 0;

        entries.forEach(e => {
            if (e.act_type === 'CREDIT') baseDeposit += e.amt_cr;
            if (e.act_type === 'DEBIT') baseDeposit -= e.amt_dr;
            if (e.act_type === 'TRADE') previousProfit += (e.amt_cr - e.amt_dr);
        });

        let currentPL = 0;
        const openAllocations = await AllocationTrade.find({ mob_num, status: 'OPEN' });

        for (let alloc of openAllocations) {
            const latestFlag = await DailyPriceFlag.findOne({ tradeId: alloc.master_trade_id }).sort({ timestamp: -1 });
            if (latestFlag) {
                const current_value = alloc.allocation_qty * latestFlag.activePrice;
                currentPL += (current_value - alloc.total_value);
            }
        }

        const totalBalance = baseDeposit + previousProfit + currentPL;

        res.status(200).json({
            baseDeposit,
            previousProfit,
            currentPL,
            totalBalance
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getLedgerEntries,
    getLedgerSummary
};
