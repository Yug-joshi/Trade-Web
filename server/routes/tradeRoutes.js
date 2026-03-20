const express = require('express');
const router = express.Router();
const {
    createTrade,
    allocateTrade,
    closeTrade,
    getTrades,
    getClientAllocations,
    getTradeAllocations,
    getCurrentTable,
    getAllAllocations,
    triggerFlag,
    partialSellAllocation
} = require('../controllers/tradeController');
const { authMiddleware, isAdmin } = require('../middleware/authMiddleware');

router.post('/', authMiddleware, isAdmin, createTrade);
router.get('/', authMiddleware, isAdmin, getTrades);
router.get('/current', authMiddleware, isAdmin, getCurrentTable);
router.get('/allocations', authMiddleware, isAdmin, getAllAllocations);

router.post('/:id/allocate', authMiddleware, isAdmin, allocateTrade);
router.post('/:id/close', authMiddleware, isAdmin, closeTrade);
router.post('/:id/trigger-flag', authMiddleware, isAdmin, triggerFlag);

router.get('/:id/allocations', authMiddleware, isAdmin, getTradeAllocations);
router.post('/allocations/:id/partial-sell', authMiddleware, isAdmin, partialSellAllocation);

router.get('/my-allocations/list', authMiddleware, getClientAllocations);

module.exports = router;
