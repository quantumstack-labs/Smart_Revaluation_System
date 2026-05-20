const studentModel = require("../models/studentModel");
const revaluationModel = require("../models/revaluationModel");
const pool = require("../config/db");
const sendEmail = require("../utils/email");
const { requestReceived } = require("../utils/emailTemplates");
const { ocrQueue } = require("../utils/queues");

exports.create = async (req, res, next) => {
  try {
    const { subject_name } = req.body;
    const userId = req.user.id; // This is the student's User ID

    // 1. Get Student Details (to know the department)
    const student = await studentModel.getStudentByUserId(userId);
    if (!student) return res.status(404).json({ message: "Student record not found" });

    // 2. FIX: Find the Subject ID from the Marks table using the Name
    // (Because your DB needs an ID, but frontend sends a Name)
    const subjectResult = await pool.query(
      "SELECT id, subject_code FROM marks WHERE student_id=$1 AND subject_name=$2",
      [userId, subject_name]
    );

    if (subjectResult.rows.length === 0) {
      return res.status(404).json({ message: "Subject not found in your marks list." });
    }
    const subjectId = subjectResult.rows[0].id;

    // 3. FIX: Check for Duplicates (Prevent double applying)
    const existing = await revaluationModel.checkExistingRequest(userId, subjectId);
    if (existing) {
      return res.status(400).json({ message: "Request already exists for this subject." });
    }

    // 4. FIX: Find a Teacher using subject_specialization (smart matching)
    // First, get the subject_code from marks table
    const subjectCode = subjectResult.rows[0].subject_code || '';
    
    const teacherResult = await pool.query(
      `SELECT id FROM users 
       WHERE role='teacher' 
       AND (subject_specialization ILIKE $1 OR department = $2)
       ORDER BY CASE WHEN subject_specialization ILIKE $1 THEN 1 ELSE 2 END
       LIMIT 1`,
      [`%${subjectCode}%`, student.department]
    );

    // If no teacher is found, default to NULL (admin can assign later)
    const teacherId = teacherResult.rows.length > 0 ? teacherResult.rows[0].id : null;

    // 5. Create Request
    const request = await revaluationModel.createRequest(userId, subjectId, teacherId);

    res.status(201).json({ message: "Revaluation request submitted", request });
  } catch (err) {
    next(err);
  }
};
exports.getStudentRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;
    // This gets all requests for the logged-in student
    const requests = await revaluationModel.getRequestsByStudent(userId);
    res.json(requests);
  } catch (err) {
    next(err);
  }
};
/**
 * @desc    Process payment for revaluation request
 * @param   {string} req.body.requestId - The alphanumeric tracking ID (e.g., "REV-9A3B2F"), not an integer
 */

exports.payment = async (req, res, next) => {
  try {
    const { requestId, studentEmail } = req.body;
    const userId = req.user.id; // Get authenticated user ID

    // Verify ownership: Student can only pay for their own requests
    const ownershipCheck = await pool.query(
      "SELECT student_id, subject_id FROM revaluation_requests WHERE id=$1",
      [requestId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (ownershipCheck.rows[0].student_id !== userId) {
      return res.status(403).json({ message: "Unauthorized: You can only pay for your own requests" });
    }

    // Get subject details for email template
    const subjectId = ownershipCheck.rows[0].subject_id;
    const subjectInfo = await pool.query(
      "SELECT subject_name FROM marks WHERE id=$1",
      [subjectId]
    );
    const subjectName = subjectInfo.rows[0]?.subject_name || "Subject";

    // Update payment status
    const updated = await revaluationModel.updatePayment(requestId, "Paid");

    if (!updated) {
      return res.status(404).json({ message: "Request not found" });
    }

    // Send Confirmation Email
    try {
      const studentName = req.user.full_name || req.user.email;
      await sendEmail(studentEmail, "Revaluation Payment Confirmed", requestReceived(studentName, subjectName));
      console.log(` Payment confirmation email sent to ${studentEmail}`);
    } catch (emailErr) {
      console.error(" Payment email failed:", emailErr.message);
      // Email failure shouldn't block payment success
    }

    res.json({ message: "Payment updated", updated });
  } catch (err) {
    next(err);
  }
};

exports.appeal = async (req, res, next) => {
  try {
    const { requestId, reason } = req.body;
    if (!requestId || !reason) {
      return res.status(400).json({ message: "Request ID and Reason are required" });
    }
    const updated = await revaluationModel.addAppeal(requestId, reason);
    if (!updated) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.json({ message: "Appeal submitted successfully", updated });
  } catch (err) {
    next(err);
  }
};

exports.triggerAI = async (req, res, next) => {
  try {
    const { requestId, fileUrl } = req.body;
    
    if (!requestId || !fileUrl) {
        return res.status(400).json({ message: "Request ID and File URL are required" });
    }

    // Add to OCR Queue
    await ocrQueue.add("process-ocr", {
        requestId,
        files: [{ path: fileUrl }] 
    });

    res.json({ message: "AI Processing Triggered" });
  } catch (err) {
    next(err);
  }
};