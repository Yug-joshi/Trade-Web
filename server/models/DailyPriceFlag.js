const mongoose = require("mongoose");

const dailyPriceFlagSchema = new mongoose.Schema({
    tradeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Trade",
        required: true
    },
    day: {
        type: Number,
        default: 1
    },
    flagType: {
        type: String,
        enum: ['TEM_OPEN', 'TEM_CLOSE', 'M to M'],
        required: true
    },
    activePrice: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

dailyPriceFlagSchema.index({ tradeId: 1, timestamp: -1 });

module.exports = mongoose.model("DailyPriceFlag", dailyPriceFlagSchema);
