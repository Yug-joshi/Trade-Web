const express = require('express');
const router = express.Router();
const { downloadPnLReport, downloadAdminReport } = require('../controllers/excelController');
const { authMiddleware, isAdmin } = require('../middleware/authMiddleware');

// Get User P&L Analysis Report
router.get('/pnl', authMiddleware, downloadPnLReport);

// Get Admin Reports
router.get('/admin/trades', authMiddleware, isAdmin, downloadAdminReport);

module.exports = router;
