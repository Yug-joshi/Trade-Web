const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
    user_name: {
        type: String,
        required: true
    },
    mob_num: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        default: "admin"
    },
    current_balance: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model("Admin", adminSchema, "admins");
