const mongoose = require('mongoose');
const AllocationTrade = require('./models/AllocationTrade');
const LedgerEntry = require('./models/LedgerEntry');
require('dotenv').config();

const backfillLedgers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trade_app_db');
        console.log('Connected to DB');

        const allocations = await AllocationTrade.find().populate('master_trade_id');
        console.log(`Found ${allocations.length} total allocations.`);
        
        let createdCount = 0;

        for (const alloc of allocations) {
             if (!alloc.master_trade_id || !alloc.master_trade_id.symbol) continue;

             const description = `Allocated ${alloc.allocation_qty} qty of ${alloc.master_trade_id.symbol} at ₹${alloc.master_trade_id.buy_price.toFixed(2)}`;

             const existingEntry = await LedgerEntry.findOne({
                  mob_num: alloc.mob_num,
                  act_type: 'TRADE',
                  description: description
             });

             if (!existingEntry) {
                  await LedgerEntry.create({
                       mob_num: alloc.mob_num,
                       act_type: 'TRADE',
                       amt_cr: 0,
                       amt_dr: 0,
                       cls_balance: 0, // Cannot easily retroactively compute this without full rebuild, leaving 0 is safe for backfill
                       description: description,
                       entry_date: alloc.buy_timestamp
                  });
                  createdCount++;
             }
        }

        console.log(`Backfill complete. Created ${createdCount} new LedgerEntry records.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

backfillLedgers();
