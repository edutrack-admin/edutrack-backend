// attendanceController.js
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import Attendance from '../models/attendance.js';

// Configure Cloudinary (add these to your .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `edutracker/${folder}` },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    
    const readableStream = Readable.from(buffer);
    readableStream.pipe(uploadStream);
  });
};

// Create new attendance session
export const startAttendance = async (req, res) => {
  try {
    const { subject, section, classRoom, notes } = req.body;
    const professorId = req.user._id; // Assuming you have auth middleware

    if (!subject || !section) {
      return res.status(400).json({ 
        success: false, 
        message: 'Subject and section are required' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Start image is required' 
      });
    }

    // Upload start image to Cloudinary
    const startImageResult = await uploadToCloudinary(
      req.file.buffer, 
      `attendance/${professorId}`
    );

    const attendance = await Attendance.create({
      professorId,
      subject,
      section,
      classRoom,
      notes,
      startTime: new Date(),
      startImage: {
        url: startImageResult.secure_url,
        publicId: startImageResult.public_id
      },
      status: 'ongoing'
    });

    res.status(201).json({
      success: true,
      message: 'Attendance session started successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Error starting attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting attendance session',
      error: error.message
    });
  }
};

// End attendance session
export const endAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const professorId = req.user._id;

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'End image is required' 
      });
    }

    const attendance = await Attendance.findOne({
      _id: attendanceId,
      professorId,
      status: 'ongoing'
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Active attendance session not found'
      });
    }

    // Upload end image to Cloudinary
    const endImageResult = await uploadToCloudinary(
      req.file.buffer,
      `attendance/${professorId}`
    );

    const endTime = new Date();
    const duration = Math.floor((endTime - attendance.startTime) / 1000); // duration in seconds

    attendance.endTime = endTime;
    attendance.endImage = {
      url: endImageResult.secure_url,
      publicId: endImageResult.public_id
    };
    attendance.duration = duration;
    attendance.status = 'completed';

    await attendance.save();

    res.status(200).json({
      success: true,
      message: 'Attendance session ended successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Error ending attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error ending attendance session',
      error: error.message
    });
  }
};

// Get today's attendance sessions
export const getTodayAttendance = async (req, res) => {
  try {
    const professorId = req.user._id;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const sessions = await Attendance.find({
      professorId,
      startTime: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ startTime: -1 });

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance data',
      error: error.message
    });
  }
};

// Get attendance history with filters
export const getAttendanceHistory = async (req, res) => {
  try {
    const professorId = req.user._id;
    const { 
      startDate, 
      endDate, 
      subject, 
      section, 
      status,
      page = 1,
      limit = 10 
    } = req.query;

    const query = { professorId };

    // Add filters
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.startTime.$lte = end;
      }
    }

    if (subject) query.subject = subject;
    if (section) query.section = section;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      Attendance.find(query)
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Attendance.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: sessions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        recordsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance history',
      error: error.message
    });
  }
};

// Get statistics
export const getAttendanceStats = async (req, res) => {
  try {
    const professorId = req.user._id;
    
    // This week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    // This month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [total, thisWeek, thisMonth] = await Promise.all([
      Attendance.countDocuments({ professorId, status: 'completed' }),
      Attendance.countDocuments({ 
        professorId, 
        status: 'completed',
        startTime: { $gte: weekStart }
      }),
      Attendance.countDocuments({ 
        professorId, 
        status: 'completed',
        startTime: { $gte: monthStart }
      })
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalClasses: total,
        thisWeek,
        thisMonth
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

// Delete attendance session
export const deleteAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const professorId = req.user._id;

    const attendance = await Attendance.findOne({
      _id: attendanceId,
      professorId
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance session not found'
      });
    }

    // Delete images from Cloudinary
    if (attendance.startImage?.publicId) {
      await cloudinary.uploader.destroy(attendance.startImage.publicId);
    }
    if (attendance.endImage?.publicId) {
      await cloudinary.uploader.destroy(attendance.endImage.publicId);
    }

    await attendance.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Attendance session deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting attendance session',
      error: error.message
    });
  }
};

// Export multer upload middleware
export const uploadMiddleware = upload.single('image');