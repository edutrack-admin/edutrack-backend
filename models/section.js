import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    trim: true,
    unique: true
    // Auto-generated format: "DIT 3-1", "DOMT 2-2", etc.
  },
  department: {
    type: String,
    enum: ['DIT', 'DOMT', 'DOMT-LOM'],
    required: true
  },
  yearLevel: {
    type: Number,
    min: 1,
    max: 3,
    required: true
  },
  sectionNumber: {
    type: Number,
    required: true,
    min: 1
    // Section number: 1, 2, 3, etc.
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster queries and enforce uniqueness
sectionSchema.index({ department: 1, yearLevel: 1, sectionNumber: 1 }, { unique: true });

// Pre-save hook to auto-generate name
sectionSchema.pre('save', function() {
  this.name = `${this.department} ${this.yearLevel}-${this.sectionNumber}`;
});

const Section = mongoose.model('Section', sectionSchema);

export default Section;