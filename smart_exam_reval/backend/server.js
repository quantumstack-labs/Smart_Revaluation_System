const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const nodemailer = require('nodemailer'); // 1. Import Nodemailer
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const studentProfileRoutes = require('./routes/studentProfileRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const teacherProfileRoutes = require('./routes/teacherProfileRoutes');
const adminRoutes = require('./routes/adminRoutes');
const revaluationSearchRoutes = require('./routes/revaluationSearchRoutes');
const revaluationRoutes = require('./routes/revaluationRoutes');
const teacherKeyRoutes = require('./routes/teacherKeyRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const aiController = require('./controllers/aiController');
const { protect, teacherOnly } = require('./middleware/auth');

const app = express();

// --- Security & Middleware ---
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173', 
  credentials: true
}));
app.use(express.json());
app.use(morgan('dev'));

// --- Static File Serving for Uploads ---
// Serve uploaded answer scripts
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create necessary upload directories
const uploadsDir = path.join(__dirname, 'uploads');
const tempDir = path.join(uploadsDir, 'temp');
const scriptsDir = path.join(uploadsDir, 'answer_scripts');

[uploadsDir, tempDir, scriptsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// DEBUG: Log all requests
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// --- Email Configuration (New) ---
// Uses the variables you mentioned: GMAIL_USER and GMAIL_PASS
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// --- Routes ---

// --- NEW ROUTE: Send Payment Receipt ---
// This uses the 'protect' middleware so only logged-in students can send emails
// Placed BEFORE app.use('/api/student') to prevent conflict with dynamic parameter routes (e.g. /:id)
app.post('/api/student/send-receipt', protect, async (req, res) => {
  const { email, studentName, subjectName, subjectCode, amount, transactionId } = req.body;

  const mailOptions = {
    from: '"ReValuate System" <no-reply@revaluate.com>',
    to: email, // Sends to the student's email
    subject: `Payment Receipt - ${subjectCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-w-600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #4f46e5; text-align: center;">Payment Successful</h2>
        <p>Dear <strong>${studentName}</strong>,</p>
        <p>We have received your payment for the exam revaluation request.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Transaction ID</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${transactionId}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Subject</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${subjectName} (${subjectCode})</td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount Paid</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd; color: #16a34a; font-weight: bold;">₹${amount}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleDateString()}</td>
          </tr>
        </table>

        <p style="text-align: center; color: #64748b; font-size: 12px;">
          This is an automated message. Please do not reply.
        </p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(` Receipt sent to ${email}`);
    res.json({ success: true, message: 'Receipt sent successfully' });
  } catch (error) {
    console.error("Email Error:", error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/student', studentProfileRoutes); // Profile routes for students
app.use('/api/revaluation', revaluationRoutes);
app.use('/api/upload', uploadRoutes); //  FIX: Mount upload routes
app.use('/api/teacher', teacherRoutes);
app.use('/api/teacher', teacherProfileRoutes); // Profile routes for teachers
app.use('/api/teacher', teacherKeyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/revaluation-requests', revaluationSearchRoutes);

// Direct Route for AI Grading
app.post('/api/teacher/grade', protect, teacherOnly, aiController.gradeRequest);

// Health Check
app.get('/', (req, res) => {
  res.json({ status: 'API Online', timestamp: new Date() });
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// --- Server Startup ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  try {
    await pool.query('SELECT NOW()'); // Test DB Connection
    console.log(`Server running on port ${PORT}`);
    console.log(` Database Connected`);
  } catch (err) {
    console.error(" Database Connection Failed:", err);
  }
});