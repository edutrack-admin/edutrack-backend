import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
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
  className: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  timeInPhoto: {
    type: String, // URL or base64
    required: true
  },
  timeOutPhoto: {
    type: String, // URL or base64
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    default: 'present'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

// Index for faster queries
attendanceSchema.index({ professor: 1, date: -1 });
attendanceSchema.index({ date: -1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;