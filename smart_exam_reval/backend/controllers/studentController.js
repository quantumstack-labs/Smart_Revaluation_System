const studentModel = require("../models/studentModel");
const revaluationModel = require("../models/revaluationModel");
const userModel = require("../models/userModel");
const pool = require("../config/db"); // Move import to top level

exports.dashboard = async (req, res, next) => {
  try {
    const userId = req.user.id; // Extracted from JWT Token

    // 1. Get Student Specific Details (Department, Reg No)
    const student = await studentModel.getStudentByUserId(userId);

    // Safety Check: If user exists but has no student data (reg_no)
    if (!student) {
      return res.status(404).json({ message: "Student profile not found. Please contact admin." });
    }

    // 2. Get General User Profile (Name, Email)
    const userProfile = await userModel.findById(userId);

    // 3. Get Marks
    const marks = await studentModel.getStudentMarks(userId);

    // 4. Get Stats
    const failedCount = await studentModel.countFailures(userId);

    // 5. Get Revaluation Requests
    const revaluationRequests = await revaluationModel.getRequestsByStudent(userId);

    res.json({
      profile: userProfile,
      student_info: student,
      marks,
      failed_subjects: failedCount,
      revaluation_requests: revaluationRequests
    });
  } catch (err) {
    next(err);
  }
};

exports.addSubject = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { subject_name, subject_code, marks_obtained, total_marks } = req.body;

    // 1. Validation
    if (!subject_code || marks_obtained === undefined) {
      return res.status(400).json({ error: "Missing required fields (subject_code and marks_obtained required)" });
    }

    // Sanitize and validate as numbers
    const parsedMarks = parseInt(marks_obtained, 10);
    const parsedTotal = parseInt(total_marks, 10) || 100; // Default to 100 if not provided

    if (isNaN(parsedMarks) || parsedMarks < 0) {
      return res.status(400).json({ error: "Invalid marks value" });
    }

    // 2. Calculations
    const percentageCalc = (parsedMarks / parsedTotal) * 100;
    const grade = percentageCalc < 50 ? 'F' : 'P';
    const status = percentageCalc < 50 ? 'Fail' : 'Pass';

    // 3. Get reg_no
    // Note: We use the studentModel instead of raw SQL to ensure we get the correct Reg No linked to the student profile
    const studentProfile = await studentModel.getStudentByUserId(userId);
    const reg_no = studentProfile?.reg_no || 'N/A';

    // 4. Insert into DB
    // FIX: Removed 'percentage' from INSERT as it caused conflicts with DB schema
    const query = `
      INSERT INTO marks (
        student_id, 
        subject_code, 
        subject_name, 
        score, 
        total_score, 
        grade,
        status,
        reg_no
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      userId,
      subject_code.trim(),
      subject_name?.trim() || subject_code,
      parsedMarks,
      parsedTotal,
      grade,
      status,
      reg_no
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      message: "Subject added successfully!",
      subject: result.rows[0]
    });

  } catch (err) {
    console.error("❌ Add Subject Error:", err.message);

    // Check for unique constraint violation
    if (err.code === '23505') {
      return res.status(400).json({ error: "Subject already exists." });
    }

    res.status(500).json({ error: "Database insertion failed: " + err.message });
  }
};