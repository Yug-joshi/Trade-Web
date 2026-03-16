const User = require("../models/User");
const Admin = require("../models/Admin");
const LedgerEntry = require("../models/LedgerEntry");
const AllocationTrade = require("../models/AllocationTrade");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
// @desc    Register a new user (Admin only)
// @route   POST /api/users/create
const registerUser = async (req, res) => {
  try {
    const { user_name, mob_num, password, brokerage } = req.body;

    const ADMIN_MOBILE = "1234567890";
    if (mob_num === ADMIN_MOBILE) {
      return res.status(400).json({ msg: "This mobile number is reserved for Admin" });
    }

    const existingUser = await User.findOne({ mob_num });
    const existingAdmin = await Admin.findOne({ mob_num });
    
    if (existingUser || existingAdmin) {
      return res.status(400).json({ msg: "Mobile number already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const client_id = "CID" + Math.floor(100000 + Math.random() * 900000);

    const user = await User.create({
      client_id,
      user_name,
      mob_num,
      password: hashedPassword,
      brokerage: brokerage !== undefined ? Number(brokerage) : 2,
      initial_balance: Number(req.body.current_balance) || 0,
      added_funds: 0,
      current_balance: Number(req.body.current_balance) || 0,
      role: "user",
      status: "active"
    });

    if (Number(req.body.current_balance) > 0) {
      await LedgerEntry.create({
        mob_num,
        act_type: 'CREDIT',
        amt_cr: Number(req.body.current_balance),
        amt_dr: 0,
        cls_balance: Number(req.body.current_balance),
        description: "Initial Balance Added"
      });
    }

    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
const loginUser = async (req, res) => {
  try {
    const { mob_num, password, isAdminMode } = req.body;

    let user;
    let role;

    if (isAdminMode) {
      user = await Admin.findOne({ mob_num });
      role = "admin";
      if (!user) return res.status(400).json({ msg: "Admin account not found for this mobile number" });
    } else {
      user = await User.findOne({ mob_num });
      role = user ? user.role : null;
      if (!user) return res.status(400).json({ msg: "User account not found for this mobile number" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid password" });

    const token = jwt.sign(
      { id: user._id, mob_num: user.mob_num, role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        user_name: user.user_name,
        mob_num: user.mob_num,
        role,
        ...(role === 'user' && { client_id: user.client_id, status: user.status })
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Get all users
// @route   GET /api/users
const getUsers = async (req, res) => {
  try {
    // Fetch all users and admins sorted by newest first, exclude password
    const users = await User.find().select("-password").sort({ createdAt: -1 }).lean();
    const admins = await Admin.find().select("-password").lean();
    
    // Add role "admin" to admins explicitly and merge lists
    const mergedUsers = [
      ...admins.map(a => ({ ...a, user_name: 'Admin', role: 'admin' })),
      ...users
    ];
    
    res.status(200).json(mergedUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Update user details
// @route   PUT /api/users/:id
const updateUser = async (req, res) => {
  try {
    const { user_name, mob_num, password, brokerage, status } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ msg: "User not found" });

    const ADMIN_MOBILE = "1234567890";
    if (mob_num && mob_num !== user.mob_num) {
      if (mob_num === ADMIN_MOBILE) {
        return res.status(400).json({ msg: "This mobile number is reserved for Admin" });
      }
      const existingUser = await User.findOne({ mob_num });
      const existingAdmin = await Admin.findOne({ mob_num });
      if (existingUser || existingAdmin) {
        return res.status(400).json({ msg: "Mobile number already in use" });
      }
    }

    const oldMobNum = user.mob_num;
    const isMobNumChanging = mob_num && mob_num !== oldMobNum;

    user.user_name = user_name || user.user_name;
    user.mob_num = mob_num || user.mob_num;
    user.brokerage = brokerage !== undefined ? brokerage : user.brokerage;
    user.status = status || user.status;

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    // Propagate mobile number change to related collections
    if (isMobNumChanging) {
      await LedgerEntry.updateMany({ mob_num: oldMobNum }, { $set: { mob_num: user.mob_num } });
      await AllocationTrade.updateMany({ mob_num: oldMobNum }, { $set: { mob_num: user.mob_num } });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Add funds to user
// @route   POST /api/users/:id/add-funds
const addFunds = async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ msg: "Valid amount required" });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.current_balance += Number(amount);
    user.added_funds = (user.added_funds || 0) + Number(amount);

    await LedgerEntry.create({
      mob_num: user.mob_num,
      act_type: 'CREDIT',
      amt_cr: Number(amount),
      amt_dr: 0,
      cls_balance: user.current_balance,
      description: description || "Funds Added"
    });

    await user.save();
    res.json({ msg: "Funds added successfully", current_balance: user.current_balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Withdraw funds from user
// @route   POST /api/users/:id/withdraw-funds
const withdrawFunds = async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ msg: "Valid amount required" });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.current_balance < amount) {
      return res.status(400).json({ msg: "Insufficient funds" });
    }

    user.current_balance -= Number(amount);

    await LedgerEntry.create({
      mob_num: user.mob_num,
      act_type: 'DEBIT',
      amt_cr: 0,
      amt_dr: Number(amount),
      cls_balance: user.current_balance,
      description: description || "Funds Withdrawn"
    });

    await user.save();
    res.json({ msg: "Funds withdrawn successfully", current_balance: user.current_balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { registerUser, loginUser, getUsers, updateUser, addFunds, withdrawFunds };