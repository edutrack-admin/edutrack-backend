import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// User schema (duplicate for script)
const userSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  password: String,
  userType: String,
  emailVerified: Boolean
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@school.com' });
    
    if (existingAdmin) {
      console.log('❌ Admin user already exists!');
      console.log('Email: admin@school.com');
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('3duTr4ck3r266!', salt);

    // Create admin user
    const admin = await User.create({
      fullName: 'EduTracker Admin',
      email: 'edutrack.adm@gmail.com',
      password: hashedPassword,
      userType: 'admin',
      emailVerified: true
    });

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('Email: edutrack.adm@gmail.com');
    console.log('Password: 3duTr4ck3r266!');
    console.log('');
    console.log('⚠️  IMPORTANT: Change this password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();