// routes/assessments.js
import express from 'express';
import Assessment from '../models/assessment.js';
import { protect } from '../middleware/auth.js';
import { studentOnly } from '../middleware/studentOnly.js';

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

// POST /api/assessments
// Student submits an assessment
router.post('/', protect, studentOnly, async (req, res) => {
  try {
    const {
      professorId,
      professorName,
      professorEmail,
      subject,
      classHeldDateTime, // from frontend
      ratings,
      totalScore,
      averageRating,
      comments,
      academicYear,
      studentRole
    } = req.body;

    if (!professorId || !classHeldDateTime || !ratings || !studentRole) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const newAssessment = await Assessment.create({
      professor: professorId,
      professorName,
      professorEmail,
      subject,
      classDateTime: classHeldDateTime, // rename here to match schema
      student: req.user._id,
      studentName: req.user.fullName,
      studentEmail: req.user.email,
      studentRole, // must be 'president', 'vp', or 'secretary'
      ratings,
      totalScore,
      averageRating,
      comments,
      academicYear
    });

    res.status(201).json(newAssessment);
  } catch (error) {
    console.error('Error creating assessment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



export default router;
