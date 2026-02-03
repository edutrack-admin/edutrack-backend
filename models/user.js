import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  userType: {
    type: String,
    enum: ['admin', 'professor', 'student'],
    required: true
  },
  // Professor-specific fields - NOW ARRAYS for multiple assignments
  departments: {
    type: [String],
    enum: ['DIT', 'DOMT', 'DOMT-LOM', ''],
    default: undefined,
    validate: {
      validator: function(v) {
        // Only required for professors
        if (this.userType === 'professor') {
          return v && v.length > 0;
        }
        return true;
      },
      message: 'At least one department is required for professors'
    }
  },
  subjects: {
    type: [String],
    default: undefined,
    validate: {
      validator: function(v) {
        // Only required for professors
        if (this.userType === 'professor') {
          return v && v.length > 0;
        }
        return true;
      },
      message: 'At least one subject is required for professors'
    }
  },
  // Professor-specific fields
  department: {
    type: String,
    enum: ['DIT', 'DOMT', 'DOMT-LOM', ''],
    default: undefined,
    validate: {
      validator: function(v) {
        // Only required for professors
        if (this.userType === 'professor') {
          return v && v.length > 0;
        }
        return true; // not required for others
      },
      message: 'Department is required for professors'
    }
  },
  subject: {
    type: String,
    trim: true,
    default: undefined,
    validate: {
      validator: function(v) {
        // Only required for professors
        if (this.userType === 'professor') {
          return v && v.length > 0;
        }
        return true; // not required for others
      },
      message: 'Subject is required for professors'
    }
  },
  // Student-specific field
  role: {
    type: String,
    enum: ['president', 'vp', 'secretary'],
    default: undefined,
    validate: {
      validator: function(v) {
        // Only required for students
        if (this.userType === 'student') {
          return v && v.length > 0;
        }
        return true; // not required for others
      },
      message: 'Role is required for students'
    }
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isTemporaryPassword: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
