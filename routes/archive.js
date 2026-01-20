import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import {
  getCleanupSummary,
  markArchiveComplete,
  executeMonthlyCleanup
} from '../utils/cleanup.js';
import {
  exportAttendanceToExcel,
  exportAssessmentsToExcel,
  exportWeeklySummary,
  generateMonthlyReport
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

// @route   GET /api/archive/export/attendance
// @desc    Export attendance to Excel
// @access  Admin only
router.get('/export/attendance', async (req, res) => {
  try {
    const { professorId, startDate, endDate } = req.query;
    
    const result = await exportAttendanceToExcel(professorId, startDate, endDate);
    
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

// @route   GET /api/archive/export/weekly
// @desc    Export weekly summary
// @access  Admin only
router.get('/export/weekly', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date required' });
    }
    
    const result = await exportWeeklySummary(startDate, endDate);
    
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

// @route   GET /api/archive/export/monthly
// @desc    Generate monthly report
// @access  Admin only
router.get('/export/monthly', async (req, res) => {
  try {
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ message: 'Year and month required' });
    }
    
    const result = await generateMonthlyReport(parseInt(year), parseInt(month));
    
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