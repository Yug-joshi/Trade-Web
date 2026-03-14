const mongoose = require("mongoose");

const allocationSchema = new mongoose.Schema({
    allocation_id: { type: String },
    master_trade_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Trade",
        required: true
    },
    mob_num: {
        type: String,
        required: true
    },
    allocation_qty: { type: Number, required: true },
    allocation_price: { type: Number, required: true },
    total_value: { type: Number, required: true },
    buy_brokerage: { type: Number, default: 0 },
    sell_brokerage: { type: Number, default: 0 },
    buy_timestamp: { type: Date, default: Date.now },
    exit_price: { type: Number },
    exit_value: { type: Number },
    client_pnl: { type: Number, default: 0 },
    status: {
        type: String,
        default: "OPEN",
        enum: ["OPEN", "CLOSED"]
    },
    sell_timestamp: { type: Date }
}, { timestamps: true });

allocationSchema.index({ mob_num: 1 });

module.exports = mongoose.model("AllocationTrade", allocationSchema);
