// models/Attendance.js
import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  professorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Professor ID is required'],
    index: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    index: true
  },
  section: {
    type: String,
    required: [true, 'Section is required'],
    trim: true,
    index: true
  },
  classRoom: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required'],
    index: true
  },
  endTime: {
    type: Date,
    validate: {
      validator: function(value) {
        // endTime should be after startTime
        return !value || value > this.startTime;
      },
      message: 'End time must be after start time'
    }
  },
  duration: {
    type: Number, // Duration in seconds
    min: 0
  },
  startImage: {
    url: {
      type: String,
      required: [true, 'Start image URL is required']
    },
    publicId: {
      type: String,
      required: [true, 'Start image public ID is required']
    }
  },
  endImage: {
    url: String,
    publicId: String
  },
  status: {
    type: String,
    enum: ['ongoing', 'completed', 'cancelled'],
    default: 'ongoing',
    index: true
  },
  // Optional: Add student attendance records
  students: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      default: 'present'
    },
    remarks: String
  }],
  // Metadata
  metadata: {
    deviceInfo: String,
    ipAddress: String,
    location: {
      latitude: Number,
      longitude: Number
    }
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for better query performance
attendanceSchema.index({ professorId: 1, startTime: -1 });
attendanceSchema.index({ professorId: 1, subject: 1, section: 1 });
attendanceSchema.index({ status: 1, startTime: -1 });

// Virtual for formatted duration
attendanceSchema.virtual('formattedDuration').get(function() {
  if (!this.duration) return null;
  
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
});

// Method to calculate duration if not set
attendanceSchema.methods.calculateDuration = function() {
  if (this.startTime && this.endTime) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  }
  return this.duration;
};

// Static method to get professor's stats
attendanceSchema.statics.getProfessorStats = async function(professorId, startDate, endDate) {
  const matchStage = {
    professorId: new mongoose.Types.ObjectId(professorId),
    status: 'completed'
  };

  if (startDate || endDate) {
    matchStage.startTime = {};
    if (startDate) matchStage.startTime.$gte = new Date(startDate);
    if (endDate) matchStage.startTime.$lte = new Date(endDate);
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalClasses: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        averageDuration: { $avg: '$duration' },
        subjects: { $addToSet: '$subject' },
        sections: { $addToSet: '$section' }
      }
    }
  ]);

  return stats[0] || {
    totalClasses: 0,
    totalDuration: 0,
    averageDuration: 0,
    subjects: [],
    sections: []
  };
};

// Static method to get attendance by subject
attendanceSchema.statics.getBySubject = async function(professorId, startDate, endDate) {
  const matchStage = {
    professorId: new mongoose.Types.ObjectId(professorId),
    status: 'completed'
  };

  if (startDate || endDate) {
    matchStage.startTime = {};
    if (startDate) matchStage.startTime.$gte = new Date(startDate);
    if (endDate) matchStage.startTime.$lte = new Date(endDate);
  }

  return await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$subject',
        count: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        averageDuration: { $avg: '$duration' },
        sections: { $addToSet: '$section' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Pre-save hook to ensure duration is calculated
attendanceSchema.pre('save', function() {
  if (this.startTime && this.endTime && !this.duration) {
    this.calculateDuration();
  }
});

// Ensure virtuals are included in JSON
attendanceSchema.set('toJSON', { virtuals: true });
attendanceSchema.set('toObject', { virtuals: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;