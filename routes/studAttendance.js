// routes/studentAttendance.js
import express from 'express';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Simple attendance submission schema
const attendanceSubmissions = new Map(); // In production, use MongoDB

// @route   POST /api/student-attendance/upload
// @desc    Student uploads attendance Google Docs link
// @access  Student only
router.post('/upload', protect, async (req, res) => {
  try {
    const { professorId, subject, section, date, googleDocsUrl } = req.body;

    if (req.user.userType !== 'student') {
      return res.status(403).json({ 
        message: 'Only students can upload attendance' 
      });
    }

    if (!googleDocsUrl || !googleDocsUrl.includes('docs.google.com')) {
      return res.status(400).json({ 
        message: 'Please provide a valid Google Docs link' 
      });
    }

    // Store submission (in production, save to MongoDB)
    const submission = {
      studentId: req.user._id,
      studentName: req.user.fullName,
      studentEmail: req.user.email,
      professorId,
      subject,
      section,
      date,
      googleDocsUrl,
      submittedAt: new Date()
    };

    // For now, using in-memory storage
    // In production, create AttendanceSubmission model
    const key = `${req.user._id}-${date}-${subject}`;
    attendanceSubmissions.set(key, submission);

    res.status(201).json({
      success: true,
      message: 'Attendance link uploaded successfully',
      data: submission
    });
  } catch (error) {
    console.error('Upload attendance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/student-attendance/my-submissions
// @desc    Get student's attendance submissions
// @access  Student only
router.get('/my-submissions', protect, async (req, res) => {
  try {
    if (req.user.userType !== 'student') {
      return res.status(403).json({ 
        message: 'Only students can view their submissions' 
      });
    }

    // Filter submissions by student ID
    const submissions = Array.from(attendanceSubmissions.values())
      .filter(sub => sub.studentId.toString() === req.user._id.toString())
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    res.json(submissions);
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/student-attendance/all
// @desc    Get all attendance submissions (admin/professor)
// @access  Admin/Professor
router.get('/all', protect, async (req, res) => {
  try {
    if (req.user.userType === 'student') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { section, subject, startDate, endDate } = req.query;

    let submissions = Array.from(attendanceSubmissions.values());

    // Filter by section
    if (section) {
      submissions = submissions.filter(sub => sub.section === section);
    }

    // Filter by subject
    if (subject) {
      submissions = submissions.filter(sub => sub.subject === subject);
    }

    // Filter by date range
    if (startDate && endDate) {
      submissions = submissions.filter(sub => {
        const subDate = new Date(sub.date);
        return subDate >= new Date(startDate) && subDate <= new Date(endDate);
      });
    }

    submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    res.json(submissions);
  } catch (error) {
    console.error('Get all submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;