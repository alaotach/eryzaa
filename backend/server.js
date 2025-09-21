const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const errorHandler = require('./middleware/error');

// Route files
const auth = require('./routes/auth');
const blockchainJobsDisplay = require('./routes/blockchain_jobs_display');
const jobRental = require('./routes/job_rental');

// Connect to database
connectDB();

const app = express();

// Security middleware
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// Mount routers
app.use('/api/auth', auth);
app.use('/api/jobs-display', blockchainJobsDisplay);
app.use('/api/rental', jobRental);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Eryzaa Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

module.exports = app;
