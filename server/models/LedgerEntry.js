const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
    mob_num: {
        type: String,
        required: true
    },
    entry_date: { type: Date, default: Date.now },
    act_type: { type: String, enum: ['TRADE', 'CREDIT', 'DEBIT'], required: true },
    amt_cr: { type: Number, default: 0 },
    amt_dr: { type: Number, default: 0 },
    cls_balance: { type: Number, default: 0 },
    description: { type: String },
    is_admin_only: { type: Boolean, default: false },
    isM2M: { type: Boolean, default: false }
}, { timestamps: true });

ledgerEntrySchema.index({ mob_num: 1 });

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);