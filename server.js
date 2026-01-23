import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();
const app = express();

// ⚠️ IMPORTANT: CORS must be configured BEFORE routes
app.use(cors({
  origin: '*', // Allow all origins (for testing)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});


// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import archiveRoutes from './routes/archive.js';
import assessmentRoutes from './routes/assessments.js';
import publicRoutes from './routes/public.js';
import attendanceRoutes from './routes/attendance.js';


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/attendance', attendanceRoutes);

// Root route - MUST work!
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'EduTracker API is running!',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'EduTracker API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - ${req.method} ${req.path}`);
  res.status(404).json({ 
    error: 'Not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});