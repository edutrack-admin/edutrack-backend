import mongoose from 'mongoose';

const attendanceSubmissionSchema = new mongoose.Schema({
  // Student who uploaded
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
  
  // Section info (snapshot for historical data)
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section'
  },
  sectionName: {
    type: String
  },
  
  // Class info
  professor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  professorName: {
    type: String,
    required: true
  },
  
  // Date of class/attendance
  attendanceDate: {
    type: Date,
    required: true
  },
  
  // Uploaded file (Cloudinary)
  file: {
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    resourceType: {
      type: String,
      default: 'raw' // PDF, DOCX, XLSX, etc. stored as 'raw' in Cloudinary
    },
    format: {
      type: String // pdf, docx, xlsx, etc.
    },
    originalFilename: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number // in bytes
    }
  },
  
  // Notes/description (optional)
  notes: {
    type: String,
    maxlength: 500
  },
  
  // Status
  reviewed: {
    type: Boolean,
    default: false
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  reviewNotes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Indexes for faster queries
attendanceSubmissionSchema.index({ student: 1, attendanceDate: -1 });
attendanceSubmissionSchema.index({ professor: 1, subject: 1 });
attendanceSubmissionSchema.index({ section: 1, attendanceDate: -1 });
attendanceSubmissionSchema.index({ attendanceDate: -1 });
attendanceSubmissionSchema.index({ createdAt: -1 });

const AttendanceSubmission = mongoose.model('AttendanceSubmission', attendanceSubmissionSchema);

export default AttendanceSubmission;