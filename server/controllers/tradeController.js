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
            description: `Master Trade Executed: ${symbol} (${total_qty} qty)`
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
                buy_brokerage,
                status: "OPEN"
            });
            
            await LedgerEntry.create({
                mob_num: alloc.mob_num,
                act_type: 'TRADE',
                amt_cr: 0,
                amt_dr: total_deduction,
                cls_balance: user.current_balance,
                description: `Allocated ${alloc.allocation_qty} qty of ${trade.symbol} at ₹${trade.buy_price.toFixed(2)} (Trade Value: ₹${total_value.toLocaleString()}, Buy Brokerage: ₹${buy_brokerage.toFixed(2)})`
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

        for (const alloc of allocations) {
            const user = await User.findOne({ mob_num: alloc.mob_num });

            alloc.exit_price = sell_price;
            alloc.sell_timestamp = new Date();
            alloc.exit_value = alloc.allocation_qty * sell_price;

            // Core P&L difference
            const raw_client_pnl = alloc.exit_value - alloc.total_value;

            // Apply unique brokerage 
            let user_brokerage_rate = user && user.brokerage !== undefined ? user.brokerage : 2; // Default 2%
            const sell_brokerage = alloc.exit_value * (user_brokerage_rate / 100);
            
            const total_brokerage = (alloc.buy_brokerage || 0) + sell_brokerage;
            const final_client_pnl = raw_client_pnl - total_brokerage;

            alloc.sell_brokerage = sell_brokerage;
            alloc.client_pnl = final_client_pnl;
            alloc.status = 'CLOSED';
            await alloc.save();

            // Create Ledger Entry and update User balance
            if (user) {
                // Since we deducted the entire trade value & buy brokerage at allocation, 
                // we now credit the total exit value minus sell brokerage back to the balance.
                const return_amount = alloc.exit_value - sell_brokerage;
                const cls_balance = user.current_balance + return_amount;

                let desc = `Trade Closed: ${trade.symbol} at ₹${sell_price.toFixed(2)}. Net P&L: ₹${final_client_pnl.toFixed(2)} (Return Value: ₹${return_amount.toLocaleString()}, Sell Brokerage: ₹${sell_brokerage.toFixed(2)})`;

                await LedgerEntry.create({
                    mob_num: user.mob_num,
                    act_type: 'TRADE',
                    amt_cr: return_amount,
                    amt_dr: 0,
                    cls_balance,
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
            description: `Master Trade Closed: ${trade.symbol}. Gross P&L: ₹${trade.master_pnl.toFixed(2)}`
        });

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

        const trade = await Trade.findById(id);
        if (!trade) return res.status(404).json({ message: "Trade not found" });

        const currentHour = new Date().getHours();

        // Time controls removed by user request

        const flag = await DailyPriceFlag.create({
            tradeId: trade._id,
            day,
            flagType,
            activePrice
        });

        // Add informational ledger entry for each allocated user
        const allocations = await AllocationTrade.find({ master_trade_id: trade._id, status: 'OPEN' });

        for (const alloc of allocations) {
            const user = await User.findOne({ mob_num: alloc.mob_num });
            if (user) {
                const actionName = flagType === 'TEM_OPEN' ? 'Temporary Open' : 'Temporary Close';
                const desc = `Trade Alert: ${actionName} for ${trade.symbol} at ₹${activePrice} (Day ${day})`;
                
                await LedgerEntry.create({
                    mob_num: user.mob_num,
                    act_type: 'TRADE',
                    amt_cr: 0,
                    amt_dr: 0,
                    cls_balance: user.current_balance,
                    description: desc
                });
            }
        }

        res.status(201).json({ message: "Flag triggered successfully", flag });
    } catch (error) {
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
                    alloc.client_pnl = alloc.current_value - alloc.total_value; // Dynamic PnL
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
        const allocations = await AllocationTrade.find({ master_trade_id: req.params.id });
        res.status(200).json(allocations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Current Table with Unrealized PNL (Admin)
// @route   GET /api/trades/current
const getCurrentTable = async (req, res) => {
    try {
        const openAllocations = await AllocationTrade.find({ status: 'OPEN' }).populate('master_trade_id').lean();
        const currentData = [];

        for (const alloc of openAllocations) {
            if (!alloc.master_trade_id) continue;
            
            const trade = alloc.master_trade_id;
            const latestFlag = await DailyPriceFlag.findOne({ tradeId: trade._id }).sort({ timestamp: -1 });

            const current_price = latestFlag ? latestFlag.activePrice : trade.buy_price;
            const total_value = alloc.allocation_qty * trade.buy_price;
            const current_value = alloc.allocation_qty * current_price;
            
            const unrealized_pnl = current_value - total_value;
            
            const user = await User.findOne({ mob_num: alloc.mob_num });

            currentData.push({
                allocation_id: alloc.allocation_id,
                master_trade_id: trade.master_trade_id,
                symbol: trade.symbol,
                mob_num: alloc.mob_num,
                user_name: user ? user.user_name : alloc.mob_num,
                total_qty: alloc.allocation_qty,
                buy_price: trade.buy_price,
                current_price,
                unrealized_pnl,
                date: alloc.buy_timestamp
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
        const allocations = await AllocationTrade.find()
            .populate('master_trade_id', 'symbol')
            .sort({ createdAt: -1 });
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