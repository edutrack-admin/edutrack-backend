import express from 'express';
import User from '../models/user.js';
import { protect, adminOnly, studentOnly } from '../middleware/auth.js';
import { sendEmail, accountCreatedEmail } from '../utils/email.js';

const router = express.Router();

// All routes are protected and admin-only
router.use(protect);
router.use(adminOnly);

// @route   POST /api/users/professor
// @desc    Create professor account
// @access  Admin only
router.post('/professor', async (req, res) => {
  try {
    const { fullName, email, subject, temporaryPassword } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const professor = await User.create({
      fullName,
      email,
      password: temporaryPassword,
      userType: 'professor',
      subject,
      createdBy: req.user._id,
      isTemporaryPassword: true,
    });

    // 📧 Send email (non-blocking)
    try {
      await sendEmail({
        to: email,
        subject: 'Your EduTracker Professor Account',
        html: accountCreatedEmail({
          fullName,
          email,
          tempPassword: temporaryPassword,
          userType: 'Professor',
        }),
      });
    } catch (emailError) {
      console.error('Professor email failed:', emailError);
    }

    res.status(201).json({
      _id: professor._id,
      fullName: professor.fullName,
      email: professor.email,
      subject: professor.subject,
      message: 'Professor created successfully',
    });
  } catch (error) {
    console.error('Create professor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// @route   POST /api/users/student
// @desc    Create student account
// @access  Admin only
router.post('/student', async (req, res) => {
  try {
    const { fullName, email, role, temporaryPassword } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const student = await User.create({
      fullName,
      email,
      password: temporaryPassword,
      userType: 'student',
      role,
      createdBy: req.user._id,
      isTemporaryPassword: true,
      emailVerified: true,
    });

    // 📧 Send email (non-blocking)
    try {
      await sendEmail({
        to: email,
        subject: 'Your EduTracker Student Account',
        html: accountCreatedEmail({
          fullName,
          email,
          tempPassword: temporaryPassword,
          userType: 'Student',
        }),
      });
    } catch (emailError) {
      console.error('Student email failed:', emailError);
    }

    res.status(201).json({
      _id: student._id,
      fullName: student.fullName,
      email: student.email,
      role: student.role,
      message: 'Student created successfully',
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/professors
// @desc    Get all professors
// @access  Admin only
router.get('/professors', async (req, res) => {
  try {
    const professors = await User.find({ userType: 'professor' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(professors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/students
// @desc    Get all students
// @access  Admin only
router.get('/students', async (req, res) => {
  try {
    const students = await User.find({ userType: 'student' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (professor or student)
// @access  Admin only
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting admins
    if (user.userType === 'admin') {
      return res.status(403).json({ message: 'Cannot delete admin users' });
    }

    await user.deleteOne();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/professors-public
router.get('/professors-public', studentOnly, async (req, res) => {
  const professors = await User.find({ role: 'professor' }).select('fullName subject email').lean();
  res.json(professors);
});

export default router;