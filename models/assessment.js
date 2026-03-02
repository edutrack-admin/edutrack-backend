// models/Assessment.js - Phase 3 Updated
import mongoose from 'mongoose';

const assessmentSchema = new mongoose.Schema({
  // NEW: Link to attendance session (Phase 3)
  attendanceSession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance'
    // NOTE: Not required to maintain backward compatibility with existing assessments
  },
  
  professor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  professorName: {
    type: String,
    required: true
  },
  professorEmail: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  classDateTime: {
    type: Date,
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: {
    type: String,
    required: true
  },
  studentEmail: {
    type: String,
    required: true
  },
  studentRole: {
    type: String,
    enum: ['president', 'vp', 'secretary'],
    required: true
  },
  ratings: {
    type: Map,
    of: Number,
    required: true
  },
  totalScore: {
    type: Number,
    required: true
  },
  averageRating: {
    type: Number,
    required: true
  },
  comments: {
    type: String
  },
  academicYear: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
assessmentSchema.index({ professor: 1, createdAt: -1 });
assessmentSchema.index({ student: 1 });
// NEW: Index for session-based queries
assessmentSchema.index({ attendanceSession: 1, student: 1 });
assessmentSchema.index({ attendanceSession: 1 });

const Assessment = mongoose.model('Assessment', assessmentSchema);

export default Assessment;