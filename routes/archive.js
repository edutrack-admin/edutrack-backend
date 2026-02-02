//routes/archive.js
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
    console.log('📊 Summary endpoint hit');
    const summary = await getCleanupSummary();
    
    // Check if summary has an error
    if (summary.error) {
      console.error('❌ Summary error:', summary.error);
      return res.status(500).json({ 
        success: false,
        message: 'Error loading summary', 
        error: summary.error 
      });
    }
    
    console.log('✅ Summary loaded successfully');
    res.json(summary);
  } catch (error) {
    console.error('❌ Summary route error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
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
    console.error('Clear all error:', error);
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

    console.log('📥 Export attendance request:', { 
      professorId: professorId || 'all', 
      startDate, 
      endDate 
    });
    
    const result = await exportAttendance(professorId, startDate, endDate);
    
    if (result.success && result.buffer) {
      const contentType = result.filename.endsWith('.zip')
        ? 'application/zip'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Length', result.buffer.length);
      res.setHeader('Cache-Control', 'no-cache'); // ← Added
      
      console.log('✅ Sending file:', result.filename, `(${result.buffer.length} bytes)`, contentType);
      res.send(result.buffer);
    } else {
      // This should rarely happen now, but just in case
      console.error('❌ Export failed:', result);
      res.status(500).json({
        success: false,
        message: 'Export failed',
        error: result.error || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('❌ Export attendance route error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during export', 
      error: error.message 
    });
  }
});

// @route   GET /api/archive/export/assessments
// @desc    Export assessments to Excel
// @access  Admin only
router.get('/export/assessments', async (req, res) => {
  try {
    const { professorId, startDate, endDate } = req.query;
    
    console.log('📥 Export assessments request:', { 
      professorId: professorId || 'all',
      startDate,
      endDate 
    });
    
    const result = await exportAssessmentsToExcel(professorId, startDate, endDate);
    
    // ✅ Always treat as success now
    if (result.success && result.buffer) {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Length', result.buffer.length);
      
      console.log('✅ Sending file:', result.filename, `(${result.buffer.length} bytes)`);
      res.send(result.buffer);
    } else {
      console.error('❌ Export failed:', result);
      res.status(500).json({
        success: false,
        message: 'Export failed',
        error: result.error || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('❌ Export assessments route error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during export', 
      error: error.message 
    });
  }
});

export default router;