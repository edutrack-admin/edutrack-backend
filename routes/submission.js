import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import AttendanceSubmission from '../models/submission.js';
import User from '../models/user.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for memory storage (files stored in memory before uploading to Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept documents only
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word, Excel, and CSV files are allowed.'));
    }
  }
});

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, originalname) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'attendance-submissions',
        resource_type: 'raw', // For non-image files
        public_id: `attendance_${Date.now()}_${originalname.replace(/\.[^/.]+$/, '')}`,
        // Don't set format - let Cloudinary detect it
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// @route   POST /api/attendance-submissions/upload
// @desc    Student uploads attendance file
// @access  Student only
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    // Only students can upload
    if (req.user.userType !== 'student') {
      return res.status(403).json({ 
        message: 'Only students can upload attendance files' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { professorId, professorName, subject, attendanceDate, notes } = req.body;

    if (!professorId || !professorName || !subject || !attendanceDate) {
      return res.status(400).json({ 
        message: 'Missing required fields: professorId, professorName, subject, attendanceDate' 
      });
    }

    // Upload file to Cloudinary
    console.log('Uploading file to Cloudinary:', req.file.originalname);
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, req.file.originalname);
    console.log('File uploaded:', cloudinaryResult.public_id);

    // Get student's section (populated from user)
    const student = await User.findById(req.user._id).populate('section', 'name');

    // Create submission record
    const submission = await AttendanceSubmission.create({
      student: req.user._id,
      studentName: req.user.fullName,
      studentEmail: req.user.email,
      section: student.section?._id,
      sectionName: student.section?.name,
      professor: professorId,
      professorName,
      subject,
      attendanceDate: new Date(attendanceDate),
      file: {
        url: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
        resourceType: cloudinaryResult.resource_type,
        format: cloudinaryResult.format,
        originalFilename: req.file.originalname,
        fileSize: req.file.size
      },
      notes: notes || ''
    });

    res.status(201).json({
      success: true,
      message: 'Attendance file uploaded successfully',
      data: submission
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // If Cloudinary upload succeeded but DB save failed, try to delete the file
    if (error.cloudinaryResult?.public_id) {
      try {
        await cloudinary.uploader.destroy(error.cloudinaryResult.public_id, { resource_type: 'raw' });
      } catch (deleteError) {
        console.error('Error deleting orphaned file:', deleteError);
      }
    }
    
    res.status(500).json({ 
      message: error.message || 'Error uploading file' 
    });
  }
});

// @route   GET /api/attendance-submissions/my-submissions
// @desc    Get student's own submissions
// @access  Student only
router.get('/my-submissions', protect, async (req, res) => {
  try {
    if (req.user.userType !== 'student') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const submissions = await AttendanceSubmission.find({ student: req.user._id })
      .populate('professor', 'fullName')
      .sort({ attendanceDate: -1, createdAt: -1 });

    res.json(submissions);
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/attendance-submissions
// @desc    Get all submissions (with filters)
// @access  Professor/Admin only
router.get('/', protect, async (req, res) => {
  try {
    if (req.user.userType === 'student') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { section, subject, professorId, startDate, endDate, reviewed } = req.query;

    const query = {};

    // Filter by section
    if (section) {
      query.section = section;
    }

    // Filter by subject
    if (subject) {
      query.subject = subject;
    }

    // Filter by professor
    if (professorId) {
      query.professor = professorId;
    } else if (req.user.userType === 'professor') {
      // Professors only see their own submissions
      query.professor = req.user._id;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.attendanceDate = {};
      if (startDate) query.attendanceDate.$gte = new Date(startDate);
      if (endDate) query.attendanceDate.$lte = new Date(endDate);
    }

    // Filter by reviewed status
    if (reviewed !== undefined) {
      query.reviewed = reviewed === 'true';
    }

    const submissions = await AttendanceSubmission.find(query)
      .populate('student', 'fullName email')
      .populate('professor', 'fullName')
      .populate('section', 'name')
      .sort({ attendanceDate: -1, createdAt: -1 });

    res.json(submissions);
  } catch (error) {
    console.error('Get all submissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/attendance-submissions/:id/review
// @desc    Mark submission as reviewed
// @access  Professor/Admin only
router.put('/:id/review', protect, async (req, res) => {
  try {
    if (req.user.userType === 'student') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { reviewNotes } = req.body;

    const submission = await AttendanceSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Professors can only review their own submissions
    if (req.user.userType === 'professor' && submission.professor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only review your own submissions' });
    }

    submission.reviewed = true;
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();
    submission.reviewNotes = reviewNotes || '';

    await submission.save();

    res.json({
      success: true,
      message: 'Submission marked as reviewed',
      data: submission
    });
  } catch (error) {
    console.error('Review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/attendance-submissions/:id
// @desc    Delete submission
// @access  Student (own), Admin
router.delete('/:id', protect, async (req, res) => {
  try {
    const submission = await AttendanceSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Students can only delete their own submissions
    if (req.user.userType === 'student' && submission.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own submissions' });
    }

    // Professors can't delete submissions
    if (req.user.userType === 'professor') {
      return res.status(403).json({ message: 'Professors cannot delete submissions' });
    }

    // Delete file from Cloudinary
    try {
      await cloudinary.uploader.destroy(submission.file.publicId, { resource_type: 'raw' });
      console.log('Deleted file from Cloudinary:', submission.file.publicId);
    } catch (cloudinaryError) {
      console.error('Error deleting file from Cloudinary:', cloudinaryError);
      // Continue with deletion even if Cloudinary fails
    }

    await submission.deleteOne();

    res.json({
      success: true,
      message: 'Submission deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/attendance-submissions/stats
// @desc    Get submission statistics
// @access  Professor/Admin
router.get('/stats/summary', protect, async (req, res) => {
  try {
    if (req.user.userType === 'student') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const query = req.user.userType === 'professor' 
      ? { professor: req.user._id }
      : {};

    const total = await AttendanceSubmission.countDocuments(query);
    const reviewed = await AttendanceSubmission.countDocuments({ ...query, reviewed: true });
    const pending = total - reviewed;

    // This month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const thisMonth = await AttendanceSubmission.countDocuments({
      ...query,
      createdAt: { $gte: startOfMonth }
    });

    res.json({
      total,
      reviewed,
      pending,
      thisMonth
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;