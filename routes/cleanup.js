// routes/cleanupRoutes.js
import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  executeMonthlyCleanup,
  markArchiveComplete,
  getCleanupSummary,
  clearAllDataKeepAccounts
} from '../utils/cleanup.js';

const router = express.Router();

// All routes require admin authentication
router.use(protect);
router.use(adminOnly);

// Get cleanup summary and status
router.get('/summary', async (req, res) => {
  try {
    const summary = await getCleanupSummary();
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching cleanup summary',
      error: error.message
    });
  }
});

// Admin marks archive as complete (prerequisite for cleanup)
router.post('/mark-complete', async (req, res) => {
  try {
    const result = await markArchiveComplete(
      req.user._id,
      req.user.fullName || req.user.email
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking archive complete',
      error: error.message
    });
  }
});

// Execute monthly cleanup (only works after admin marks archive complete)
router.post('/execute', async (req, res) => {
  try {
    const result = await executeMonthlyCleanup();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error executing cleanup',
      error: error.message
    });
  }
});

// NEW: Clear ALL data but keep user accounts
router.post('/clear-all', async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'DELETE_ALL_DATA') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation text does not match. Please type "DELETE_ALL_DATA" to confirm.'
      });
    }
    
    const result = await clearAllDataKeepAccounts(
      req.user._id,
      req.user.fullName || req.user.email
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error clearing data',
      error: error.message
    });
  }
});

export default router;