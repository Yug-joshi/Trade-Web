const express = require("express");
const router = express.Router();
const { getRules, createRule, updateRule, deleteRule } = require("../controllers/ruleController");
const { authMiddleware, isAdmin } = require("../middleware/authMiddleware");

router.get("/", authMiddleware, getRules);
router.post("/", authMiddleware, isAdmin, createRule);
router.put("/:id", authMiddleware, isAdmin, updateRule);
router.delete("/:id", authMiddleware, isAdmin, deleteRule);

module.exports = router;
