import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  getCleanupSummary,
  markArchiveComplete,
  executeMonthlyCleanup,
  clearAllDataKeepAccounts
} from '../utils/cleanup.js';
import {
  exportAttendance,
  exportAssessmentsToExcel,
} from '../utils/export.js';


const router = express.Router();

// All routes protected and admin-only
router.use(protect);
router.use(adminOnly);

// @route   GET /api/archive/summary
// @desc    Get cleanup summary status
// @access  Admin only
router.get('/summary', async (req, res) => {
  try {
    const summary = await getCleanupSummary();
    res.json(summary);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/archive/mark-complete
// @desc    Mark archive as complete
// @access  Admin only
router.post('/mark-complete', async (req, res) => {
  try {
    const result = await markArchiveComplete(
      req.user._id,
      req.user.fullName
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/archive/cleanup
// @desc    Execute monthly cleanup
// @access  Admin only
router.post('/cleanup', async (req, res) => {
  try {
    const result = await executeMonthlyCleanup();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// NEW: Clear all data (keeps user accounts)
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

// @route   GET /api/archive/export/attendance
// @desc    Export attendance to Excel
// @access  Admin only
router.get('/export/attendance', async (req, res) => {
  try {
    const { professorId, startDate, endDate } = req.query;
    
    const result = await exportAttendance(professorId, startDate, endDate);
    
    if (result.success) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
      res.send(result.buffer);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/archive/export/assessments
// @desc    Export assessments to Excel
// @access  Admin only
router.get('/export/assessments', async (req, res) => {
  try {
    const { professorId } = req.query;
    
    const result = await exportAssessmentsToExcel(professorId);
    
    if (result.success) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
      res.send(result.buffer);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;