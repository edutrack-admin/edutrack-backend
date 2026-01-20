import mongoose from 'mongoose';

const archiveSchema = new mongoose.Schema({
  month: {
    type: String,
    required: true,
    unique: true // e.g., "2026-01"
  },
  archiveCompleted: {
    type: Boolean,
    default: false
  },
  exportedToSheets: {
    type: Boolean,
    default: false
  },
  printedReports: {
    type: Boolean,
    default: false
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedByName: {
    type: String
  },
  completedAt: {
    type: Date
  },
  cleanupExecuted: {
    type: Boolean,
    default: false
  },
  cleanupAt: {
    type: Date
  }
}, { timestamps: true });

const Archive = mongoose.model('Archive', archiveSchema);

export default Archive;
