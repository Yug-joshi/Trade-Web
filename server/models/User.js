const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  user_name: {
    type: String,
    required: true
  },
  mob_num: {
    type: String,
    required: true,
    unique: true
  },
  client_id: {
    type: String,
    unique: true,
    sparse: true
  },
  password: {
    type: String,
    required: true
  },
  percentage: {
    type: Number,
    default: 0
  },
  brokerage: {
    type: Number,
    default: 2 // default to 2%
  },
  current_balance: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    default: "active"
  },
  role: {
    type: String,
    default: "user",
    enum: ["user", "client", "admin"] // Ensures only these roles exist
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);