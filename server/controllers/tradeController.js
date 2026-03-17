const Trade = require('../models/Trade');
const User = require('../models/User');
const AllocationTrade = require('../models/AllocationTrade');
const LedgerEntry = require('../models/LedgerEntry');
const DailyPriceFlag = require('../models/DailyPriceFlag');

// @desc    Create a new Master Trade
// @route   POST /api/trades
const createTrade = async (req, res) => {
    try {
        const { symbol, total_qty, buy_price } = req.body;
        const total_cost = total_qty * buy_price;

        const master_trade_id = "MT-" + Date.now() + Math.floor(Math.random() * 1000);

        const trade = await Trade.create({
            master_trade_id,
            symbol,
            total_qty,
            buy_price,
            buy_brokerage: 0,
            total_cost,
            allocation_tab: false,
            status: "OPEN"
        });

        await LedgerEntry.create({
            mob_num: req.user.mob_num,
            act_type: 'TRADE',
            amt_cr: 0,
            amt_dr: total_cost,
            cls_balance: 0,
            trade_id: trade._id,
            description: `Master Trade Executed: ${symbol} (${total_qty} qty)`,
            is_admin_only: true
        });

        res.status(201).json(trade);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Allocate master trade to users
// @route   POST /api/trades/:id/allocate
const allocateTrade = async (req, res) => {
    try {
        const { id } = req.params;
        const { allocations } = req.body; // Array of { mob_num, allocation_qty }

        const trade = await Trade.findById(id);
        if (!trade) return res.status(404).json({ message: "Trade not found" });
        if (trade.status === 'CLOSED') return res.status(400).json({ message: "Cannot allocate a closed trade" });
        if (trade.allocated_qty > 0) return res.status(400).json({ message: "Trade has already been allocated and cannot be modified." });

        const allocatedSoFar = trade.allocated_qty || 0;
        const totalAllocated = allocations.reduce((sum, alloc) => sum + Number(alloc.allocation_qty), 0);
        if (allocatedSoFar + totalAllocated > trade.total_qty) {
            return res.status(400).json({ message: "Total allocation exceeds remaining master trade quantity" });
        }

        const allocationDocs = [];

        for (const alloc of allocations) {
            const user = await User.findOne({ mob_num: alloc.mob_num });
            if (!user) return res.status(404).json({ message: `User ${alloc.mob_num} not found` });

            const allocation_id = "AL-" + Date.now() + Math.floor(Math.random() * 1000);
            const total_value = alloc.allocation_qty * trade.buy_price;

            const user_brokerage_rate = user.brokerage !== undefined ? user.brokerage : 2;
            const buy_brokerage = total_value * (user_brokerage_rate / 100);

            // Deduct total value + buy brokerage from user balance immediately
            const total_deduction = total_value + buy_brokerage;
            user.current_balance -= total_deduction;
            await user.save();

            allocationDocs.push({
                allocation_id,
                master_trade_id: trade._id,
                mob_num: alloc.mob_num,
                allocation_qty: alloc.allocation_qty,
                allocation_price: trade.buy_price,
                total_value,
                user_brokerage_rate,
                buy_brokerage,
                status: "OPEN"
            });

            // Create Ledger Entry for the allocation
            await LedgerEntry.create({
                mob_num: alloc.mob_num,
                act_type: 'TRADE',
                amt_cr: 0,
                amt_dr: total_deduction,
                cls_balance: user.current_balance,
                trade_id: trade._id,
                description: `Allocated ${alloc.allocation_qty} of ${trade.symbol} | Price: ₹${trade.buy_price.toFixed(2)} | Value: ₹${total_value.toFixed(2)} | Brokerage: ${user_brokerage_rate}% (₹${buy_brokerage.toFixed(2)}) | Net Total: ₹${total_deduction.toFixed(2)}`
            });
        }

        if (allocationDocs.length > 0) {
            await AllocationTrade.insertMany(allocationDocs);
            trade.allocated_qty = allocatedSoFar + totalAllocated;
            if (trade.allocated_qty >= trade.total_qty) {
                trade.allocation_tab = true;
            }
            await trade.save();
        }

        res.status(200).json({ message: "Allocations successful" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Close a Master Trade
// @route   POST /api/trades/:id/close
const closeTrade = async (req, res) => {
    try {
        const { id } = req.params;
        const { sell_price } = req.body;

        const trade = await Trade.findById(id);
        if (!trade) return res.status(404).json({ message: "Trade not found" });
        if (trade.status === 'CLOSED') return res.status(400).json({ message: "Trade already closed" });

        // Calculate Master P&L
        trade.sell_price = sell_price;
        trade.sell_brokerage = 0;
        trade.sell_timestamp = new Date();
        trade.total_exit_value = trade.total_qty * sell_price;
        trade.master_pnl = trade.total_exit_value - trade.total_cost;
        trade.status = 'CLOSED';

        // Find & Close all allocations for this trade
        const allocations = await AllocationTrade.find({ master_trade_id: trade._id, status: 'OPEN' });

        const userAllocations = {};
        for (const alloc of allocations) {
            if (!userAllocations[alloc.mob_num]) userAllocations[alloc.mob_num] = [];
            userAllocations[alloc.mob_num].push(alloc);
        }

        for (const mob_num of Object.keys(userAllocations)) {
            const userAllocs = userAllocations[mob_num];
            const user = await User.findOne({ mob_num });

            let total_raw_client_pnl = 0;
            let total_exit_value = 0;
            let total_sell_brokerage = 0;
            let total_return_amount = 0;
            let total_qty = 0;

            for (const alloc of userAllocs) {
                alloc.exit_price = sell_price;
                alloc.sell_timestamp = new Date();
                alloc.exit_value = alloc.allocation_qty * sell_price;

                const raw_client_pnl = alloc.exit_value - alloc.total_value;

                let user_brokerage_rate = (alloc.user_brokerage_rate !== undefined) ? alloc.user_brokerage_rate : (user && user.brokerage !== undefined ? user.brokerage : 2);
                const sell_brokerage = alloc.exit_value * (user_brokerage_rate / 100);

                const total_brokerage = (alloc.buy_brokerage || 0) + sell_brokerage;
                const final_client_pnl = raw_client_pnl - total_brokerage;

                alloc.sell_brokerage = sell_brokerage;
                alloc.client_pnl = final_client_pnl;
                alloc.status = 'CLOSED';
                await alloc.save();

                total_raw_client_pnl += raw_client_pnl;
                total_exit_value += alloc.exit_value;
                total_sell_brokerage += sell_brokerage;
                total_return_amount += (alloc.exit_value - sell_brokerage);
                total_qty += alloc.allocation_qty;
            }

            if (user) {
                const cls_balance = user.current_balance + total_return_amount;

                let desc = `Trade Closed (${trade.symbol}) | Exit Price: ₹${sell_price.toFixed(2)} | Qty: ${total_qty} | Exit Value: ₹${total_exit_value.toFixed(2)} | P&L: ₹${total_raw_client_pnl.toFixed(2)} | Sell Brokerage: ₹${total_sell_brokerage.toFixed(2)} | Net Credit: ₹${total_return_amount.toFixed(2)}`;

                await LedgerEntry.create({
                    mob_num: user.mob_num,
                    act_type: 'TRADE',
                    amt_cr: total_return_amount,
                    amt_dr: 0,
                    cls_balance,
                    trade_id: trade._id,
                    description: desc
                });

                user.current_balance = cls_balance;
                await user.save();
            }
        }

        await LedgerEntry.create({
            mob_num: req.user.mob_num, // admin
            act_type: 'TRADE',
            amt_cr: trade.total_exit_value,
            amt_dr: 0,
            cls_balance: 0,
            trade_id: trade._id,
            description: `Master Trade Closed: ${trade.symbol}. Gross P&L: ₹${trade.master_pnl.toFixed(2)}`,
            is_admin_only: true
        });

        // Delete all temporary M2M ledger entries for this trade
        await LedgerEntry.deleteMany({ trade_id: trade._id, isM2M: true });

        await trade.save();
        res.status(200).json({ message: "Trade closed successfully", trade });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Trigger a daily price flag (TEM_OPEN or TEM_CLOSE)
// @route   POST /api/trades/:id/trigger-flag
const triggerFlag = async (req, res) => {
    try {
        const { id } = req.params;
        const { day, flagType, activePrice } = req.body;
        console.log("Triggering flag script with type:", flagType);

        if (!flagType || activePrice === undefined) {
            return res.status(400).json({ message: "Flag type and active price are required" });
        }

        const trade = await Trade.findById(id);
        if (!trade) return res.status(404).json({ message: "Trade not found" });

        const flag = await DailyPriceFlag.create({
            tradeId: trade._id,
            day: Number(day) || 1,
            flagType,
            activePrice: Number(activePrice)
        });

        // Add informational ledger entry for each allocated user (Grouped by User)
        const allocations = await AllocationTrade.find({ master_trade_id: trade._id, status: 'OPEN' });

        const userAllocations = {};
        for (const alloc of allocations) {
            if (!userAllocations[alloc.mob_num]) userAllocations[alloc.mob_num] = [];
            userAllocations[alloc.mob_num].push(alloc);
        }

        let totalAdminM2MPnl = 0;

        for (const mob_num of Object.keys(userAllocations)) {
            const userAllocs = userAllocations[mob_num];
            const user = await User.findOne({ mob_num });

            if (user) {
                let actionName = 'Temporary Update';
                if (flagType === 'TEM_OPEN') actionName = 'Temporary Open';
                else if (flagType === 'TEM_CLOSE') actionName = 'Temporary Close';
                else if (flagType === 'M to M') actionName = 'M to M';

                if (flagType === 'M to M') {
                    // M to M specific ledger logic aggregated
                    let totalUserPnl = 0;
                    let totalQty = 0;
                    for (const a of userAllocs) {
                        totalUserPnl += (Number(activePrice) - a.allocation_price) * a.allocation_qty;
                        totalQty += a.allocation_qty;
                    }
                    totalAdminM2MPnl += totalUserPnl;

                    const desc = `M to M Update | Symbol: ${trade.symbol} | CMP: ₹${Number(activePrice).toFixed(2)} | Qty: ${totalQty} | P&L: ₹${totalUserPnl.toFixed(2)}`;

                    let existingM2M = await LedgerEntry.findOne({
                        mob_num: user.mob_num,
                        trade_id: trade._id,
                        isM2M: true
                    });

                    let amt_cr = totalUserPnl > 0 ? totalUserPnl : 0;
                    let amt_dr = totalUserPnl < 0 ? Math.abs(totalUserPnl) : 0;

                    if (existingM2M) {
                        existingM2M.amt_cr = amt_cr;
                        existingM2M.amt_dr = amt_dr;
                        existingM2M.description = desc;
                        existingM2M.act_type = 'TRADE';
                        await existingM2M.save();
                    } else {
                        await LedgerEntry.create({
                            mob_num: user.mob_num,
                            act_type: 'TRADE',
                            amt_cr: amt_cr,
                            amt_dr: amt_dr,
                            cls_balance: user.current_balance || 0,
                            trade_id: trade._id,
                            isM2M: true,
                            description: desc
                        });
                    }
                } else {
                    const desc = `Trade Alert: ${actionName} for ${trade.symbol} at ₹${Number(activePrice).toFixed(2)} (Day ${day})`;
                    const regexPrefix = `Trade Alert: ${actionName} for ${trade.symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`;

                    let existingTemp = await LedgerEntry.findOne({
                        mob_num: user.mob_num,
                        trade_id: trade._id,
                        description: new RegExp(`^${regexPrefix}`)
                    });

                    if (existingTemp) {
                        existingTemp.description = desc;
                        existingTemp.act_type = 'TRADE';
                        await existingTemp.save();
                    } else {
                        await LedgerEntry.create({
                            mob_num: user.mob_num,
                            act_type: 'TRADE',
                            amt_cr: 0,
                            amt_dr: 0,
                            cls_balance: user.current_balance || 0,
                            trade_id: trade._id,
                            description: desc
                        });
                    }
                }
            }
        }

        if (flagType === 'M to M' && req.user) {
            const adminDesc = `M to M Master Update | Symbol: ${trade.symbol} | Gross P&L: ₹${totalAdminM2MPnl.toFixed(2)}`;
            let amt_cr = totalAdminM2MPnl > 0 ? totalAdminM2MPnl : 0;
            let amt_dr = totalAdminM2MPnl < 0 ? Math.abs(totalAdminM2MPnl) : 0;

            let existingAdminM2M = await LedgerEntry.findOne({
                mob_num: req.user.mob_num,
                trade_id: trade._id,
                isM2M: true
            });

            if (existingAdminM2M) {
                existingAdminM2M.amt_cr = amt_cr;
                existingAdminM2M.amt_dr = amt_dr;
                existingAdminM2M.description = adminDesc;
                existingAdminM2M.is_admin_only = true;
                await existingAdminM2M.save()
            } else {
                await LedgerEntry.create({
                    mob_num: req.user.mob_num,
                    act_type: 'TRADE',
                    amt_cr: amt_cr,
                    amt_dr: amt_dr,
                    cls_balance: 0,
                    trade_id: trade._id,
                    isM2M: true,
                    description: adminDesc,
                    is_admin_only: true
                });
            }
        }

        res.status(201).json({ message: "Flag triggered successfully", flag });
    } catch (error) {
        console.error("Trigger Flag Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all Master Trades (Admin)
// @route   GET /api/trades
const getTrades = async (req, res) => {
    try {
        const trades = await Trade.find().sort({ createdAt: -1 });
        res.status(200).json(trades);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get trades allocated to a specific user (Client view)
// @route   GET /api/trades/my-allocations
const getClientAllocations = async (req, res) => {
    try {
        const allocations = await AllocationTrade.find({ mob_num: req.user.mob_num })
            .populate('master_trade_id', 'symbol')
            .sort({ createdAt: -1 })
            .lean();

        // Dynamically compute current value based on latest DailyPriceFlag
        for (let alloc of allocations) {
            if (alloc.status === 'OPEN') {
                const latestFlag = await DailyPriceFlag.findOne({ tradeId: alloc.master_trade_id._id }).sort({ timestamp: -1 });
                if (latestFlag) {
                    alloc.current_value = alloc.allocation_qty * latestFlag.activePrice;
                    alloc.active_price = latestFlag.activePrice;
                    alloc.client_pnl = (alloc.current_value - alloc.total_value) - (alloc.buy_brokerage || 0); // Dynamic PnL including buy brokerage
                } else {
                    alloc.current_value = alloc.total_value;
                    alloc.active_price = alloc.allocation_price;
                }
            } else {
                alloc.current_value = alloc.exit_value;
            }
        }

        res.status(200).json(allocations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get allocations for a master trade (Admin view)
// @route   GET /api/trades/:id/allocations
const getTradeAllocations = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const allocations = await AllocationTrade.aggregate([
            { $match: { master_trade_id: new mongoose.Types.ObjectId(req.params.id) } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'mob_num',
                    foreignField: 'mob_num',
                    as: 'user_details'
                }
            },
            {
                $unwind: {
                    path: '$user_details',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    allocation_id: 1,
                    master_trade_id: 1,
                    mob_num: 1,
                    allocation_qty: 1,
                    allocation_price: 1,
                    total_value: 1,
                    buy_timestamp: 1,
                    exit_price: 1,
                    exit_value: 1,
                    client_pnl: 1,
                    status: 1,
                    user_name: { $ifNull: ['$user_details.user_name', '$mob_num'] }
                }
            }
        ]);
        res.status(200).json(allocations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Current Table with Unrealized PNL (Admin)
// @route   GET /api/trades/current
const getCurrentTable = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const openAllocations = await AllocationTrade.aggregate([
            { $match: { status: 'OPEN' } },
            {
                $lookup: {
                    from: 'trades',
                    localField: 'master_trade_id',
                    foreignField: '_id',
                    as: 'master_trade'
                }
            },
            {
                $unwind: {
                    path: '$master_trade',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'mob_num',
                    foreignField: 'mob_num',
                    as: 'user_details'
                }
            },
            {
                $unwind: {
                    path: '$user_details',
                    preserveNullAndEmptyArrays: true
                }
            }
        ]);

        const currentData = [];

        for (const alloc of openAllocations) {
            // Use the master_trade from aggregation instead of the raw master_trade_id ObjectId
            const masterTrade = alloc.master_trade || {};

            // Find the latest active price flag for this master trade
            const latestFlag = await DailyPriceFlag.findOne({ tradeId: alloc.master_trade_id }).sort({ timestamp: -1 });

            const current_price = latestFlag ? latestFlag.activePrice : alloc.allocation_price;
            const unrealized_pnl = (current_price - alloc.allocation_price) * alloc.allocation_qty;

            currentData.push({
                master_trade_id: masterTrade.master_trade_id || 'N/A', // Custom MT ID
                allocation_id: alloc.allocation_id,
                symbol: masterTrade.symbol || 'N/A',
                total_qty: alloc.allocation_qty,
                buy_price: alloc.allocation_price,
                current_price,
                unrealized_pnl,
                date: alloc.buy_timestamp,
                mob_num: alloc.mob_num,
                user_name: alloc.user_details?.user_name || alloc.mob_num
            });
        }

        res.status(200).json(currentData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all allocations (Admin view)
// @route   GET /api/trades/allocations
const getAllAllocations = async (req, res) => {
    try {
        const allocations = await AllocationTrade.aggregate([
            {
                $lookup: {
                    from: 'trades',
                    localField: 'master_trade_id',
                    foreignField: '_id',
                    as: 'master_trade'
                }
            },
            {
                $unwind: {
                    path: '$master_trade',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'mob_num',
                    foreignField: 'mob_num',
                    as: 'user_details'
                }
            },
            {
                $unwind: {
                    path: '$user_details',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    allocation_id: 1,
                    master_trade_id: {
                        _id: '$master_trade._id',
                        symbol: '$master_trade.symbol',
                        buy_price: '$master_trade.buy_price',
                        buy_brokerage: '$master_trade.buy_brokerage',
                        sell_brokerage: '$master_trade.sell_brokerage'
                    },
                    mob_num: 1,
                    allocation_qty: 1,
                    allocation_price: 1,
                    total_value: 1,
                    buy_timestamp: 1,
                    exit_price: 1,
                    exit_value: 1,
                    client_pnl: 1,
                    status: 1,
                    user_name: { $ifNull: ['$user_details.user_name', '$mob_num'] },
                    user_brokerage: { $ifNull: ['$user_details.brokerage', 2] },
                    createdAt: 1
                }
            }
        ]).sort({ createdAt: -1 });

        res.status(200).json(allocations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createTrade,
    allocateTrade,
    closeTrade,
    getTrades,
    getClientAllocations,
    getTradeAllocations,
    getCurrentTable,
    getAllAllocations,
    triggerFlag
};