// attendanceRoutes.js
import express from 'express';
import { 
  startAttendance, 
  endAttendance, 
  getTodayAttendance,
  getAttendanceHistory,
  getAttendanceStats,
  deleteAttendance,
  uploadMiddleware
} from '../controllers/attendance.js';
import { protect } from '../middleware/auth.js'; // Your auth middleware

const router = express.Router();

// All routes require authentication
router.use(protect);

router.post('/start', uploadMiddleware, startAttendance);
router.post('/end/:attendanceId', uploadMiddleware, endAttendance);
router.get('/today', getTodayAttendance);
router.get('/history', getAttendanceHistory);
router.get('/stats', getAttendanceStats);
router.delete('/:attendanceId', deleteAttendance);

export default router;