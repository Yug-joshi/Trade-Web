const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getUsers, updateUser, addFunds, withdrawFunds, getProfile, updateProfile, changePassword } = require("../controllers/userController");
const { authMiddleware, isAdmin } = require("../middleware/authMiddleware");

// Define routes and connect them to controller functions
// Define routes and connect them to controller functions
router.post("/login", loginUser);
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);
router.post("/change-password", authMiddleware, changePassword);

router.post("/create", authMiddleware, isAdmin, registerUser);
router.get("/", authMiddleware, isAdmin, getUsers);
router.put("/:id", authMiddleware, isAdmin, updateUser);
router.post("/:id/add-funds", authMiddleware, isAdmin, addFunds);
router.post("/:id/withdraw-funds", authMiddleware, isAdmin, withdrawFunds);

module.exports = router;