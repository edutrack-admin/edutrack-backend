// routes/assessments.js
import express from 'express';
import Assessment from '../models/assessment.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET /api/assessments/student
// Get all assessments submitted by logged-in student
router.get('/student', protect, async (req, res) => {
  try {
    const assessments = await Assessment.find({ student: req.user._id })
      .sort({ createdAt: -1 });
    res.json(assessments);
  } catch (error) {
    console.error('Error fetching student assessments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/student/:id', protect, async (req, res) => {
  try {
    const studentId = req.params.id;

    // Only allow students to view their own assessments
    if (req.user.userType !== 'student' || req.user._id.toString() !== studentId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const assessments = await Assessment.find({ student: studentId })
      .sort({ createdAt: -1 });

    res.json(assessments);
  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
