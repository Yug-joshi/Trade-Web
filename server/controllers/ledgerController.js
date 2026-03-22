const LedgerEntry = require('../models/LedgerEntry');
const AllocationTrade = require('../models/AllocationTrade');
const DailyPriceFlag = require('../models/DailyPriceFlag');

// @desc    Get ledger entries - ADMIN sees all, USER sees only their own non-admin entries
// @route   GET /api/ledger
const getLedgerEntries = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        let match = {};

        if (req.user.role !== 'admin') {
            // USER SIDE — filter strictly by their mob_num
            match.mob_num = String(req.user.mob_num);
        } else {
            // ADMIN SIDE - filter by desired categories
            match.entryCategory = { $in: ['FUNDS', 'USER_PNL', 'BROKERAGE'] };
        }

        const entries = await LedgerEntry.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: 'users',
                    localField: 'mob_num',
                    foreignField: 'mob_num',
                    as: 'user_info'
                }
            },
            {
                $lookup: {
                    from: 'admins',
                    localField: 'mob_num',
                    foreignField: 'mob_num',
                    as: 'admin_info'
                }
            },
            {
                $project: {
                    _id: 1,
                    mob_num: 1,
                    is_admin_only: 1,
                    user_name: {
                        $cond: {
                            if: { $gt: [{ $size: '$admin_info' }, 0] },
                            then: 'Admin',
                            else: {
                                $let: {
                                    vars: { u: { $arrayElemAt: ['$user_info', 0] } },
                                    in: { $ifNull: ['$$u.user_name', '$mob_num'] }
                                }
                            }
                        }
                    },
                    act_type: 1,
                    amt_cr: 1,
                    amt_dr: 1,
                    cls_balance: 1,
                    description: 1,
                    entry_date: 1
                }
            }
        ]).sort({ entry_date: -1 });

        res.status(200).json(entries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @route   GET /api/ledger/summary
const getLedgerSummary = async (req, res) => {
    try {
        const mob_num = String(req.user.mob_num);
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