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

    const mob_num_str = String(mob_num);
    const existingUser = await User.findOne({ mob_num: mob_num_str });
    const existingAdmin = await Admin.findOne({ mob_num: mob_num_str });

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
    if (!req.body) {
      return res.status(400).json({ msg: "Missing request body. Ensure Content-Type is application/json" });
    }
    const { mob_num, password } = req.body;

    console.log(`[LOGIN ATTEMPT] Mob: ${mob_num}`);

    if (!process.env.JWT_SECRET) {
      console.error("[CRITICAL] JWT_SECRET is missing from environment variables");
      return res.status(500).json({ msg: "Server configuration error: JWT_SECRET missing" });
    }


    const mob_num_str = String(mob_num);


    // Search both collections for the mobile number
    let account = await Admin.findOne({ mob_num: mob_num_str }).lean();
    if (!account) {
      account = await User.findOne({ mob_num: mob_num_str }).lean();
    }

    if (!account) {
      return res.status(400).json({ msg: "Account not found for this mobile number" });
    }

    // Role is taken directly from the database record
    const role = account.role || (account.client_id ? 'user' : 'admin');

    const isMatch = await bcrypt.compare(password, account.password);
    console.log(`[LOGIN DEBUG] Password match: ${isMatch}`);

    if (!isMatch) return res.status(400).json({ msg: "Invalid password" });

    console.log("[LOGIN DEBUG] Attempting to sign JWT...");
    const token = jwt.sign(
      { id: account._id, mob_num: account.mob_num, role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const responseUser = {
      id: account._id,
      user_name: account.user_name,
      mob_num: account.mob_num,
      role
    };

    if (role === 'user' || role === 'client') {
      responseUser.client_id = account.client_id;
      responseUser.status = account.status;
    }

    res.json({
      token,
      user: responseUser
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({
      msg: "Internal server error during login",
      error: err.message,
      stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
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
    if (mob_num && String(mob_num) !== user.mob_num) {
      const mob_num_str = String(mob_num);
      if (mob_num_str === ADMIN_MOBILE) {
        return res.status(400).json({ msg: "This mobile number is reserved for Admin" });
      }
      const existingUser = await User.findOne({ mob_num: mob_num_str });
      const existingAdmin = await Admin.findOne({ mob_num: mob_num_str });
      if (existingUser || existingAdmin) {
        return res.status(400).json({ msg: "Mobile number already in use" });
      }
    }

    const oldMobNum = user.mob_num;
    const sanitizedMobNum = mob_num ? mob_num.trim() : oldMobNum;
    const isMobNumChanging = sanitizedMobNum !== oldMobNum;

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

// @desc    Get current user profile
// @route   GET /api/users/profile
const getProfile = async (req, res) => {
  try {
    let user;
    if (req.user.role === 'admin') {
      user = await Admin.findById(req.user.id).select("-password").lean();
      if (user) {
        const allUsers = await User.find({ role: { $ne: 'admin' } });
        user.current_balance = allUsers.reduce((sum, u) => sum + (u.current_balance || 0), 0);
      }
    } else {
      user = await User.findById(req.user.id).select("-password").lean();
    }

    // Fallback search if role mismatch occurs
    if (!user) {
      user = await Admin.findById(req.user.id).select("-password").lean() ||
        await User.findById(req.user.id).select("-password").lean();
      if (user && user.role === 'admin') {
        const allUsers = await User.find({ role: { $ne: 'admin' } });
        user.current_balance = allUsers.reduce((sum, u) => sum + (u.current_balance || 0), 0);
      }
    }

    if (!user) return res.status(404).json({ msg: "Profile not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Update current user profile (self)
// @route   PUT /api/users/profile
const updateProfile = async (req, res) => {
  try {
    const { user_name } = req.body;
    let user;

    if (req.user.role === 'admin') {
      user = await Admin.findById(req.user.id);
    } else {
      user = await User.findById(req.user.id);
    }

    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user_name) user.user_name = user_name;

    await user.save();
    res.json({ msg: "Profile updated successfully", user: { user_name: user.user_name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Change current user password
// @route   POST /api/users/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role ? req.user.role.toLowerCase() : 'user';

    console.log(`[PASSWORD CHANGE ATTEMPT] UserID: ${userId}, Role: ${userRole}`);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ msg: "Both current and new passwords are required" });
    }

    let user;
    // Try finding in both collections if needed, but start with the one suggested by role
    if (userRole === 'admin') {
      user = await Admin.findById(userId);
    } 
    
    if (!user) {
      user = await User.findById(userId);
    }

    if (!user) {
      console.error(`[PASSWORD CHANGE ERROR] User not found for ID: ${userId}`);
      return res.status(404).json({ msg: "User account not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    console.log(`[PASSWORD CHANGE DEBUG] Current password match: ${isMatch}`);
    
    if (!isMatch) {
      return res.status(400).json({ msg: "Incorrect current password" });
    }

    // New password should be different
    const isSameAsOld = await bcrypt.compare(newPassword, user.password);
    if (isSameAsOld) {
      return res.status(400).json({ msg: "New password cannot be the same as current password" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    console.log(`[PASSWORD CHANGE SUCCESS] Password updated for ID: ${userId}`);
    res.json({ msg: "Password updated successfully" });
  } catch (err) {
    console.error("[PASSWORD CHANGE CATCH ERR]:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { registerUser, loginUser, getUsers, updateUser, addFunds, withdrawFunds, getProfile, updateProfile, changePassword };
