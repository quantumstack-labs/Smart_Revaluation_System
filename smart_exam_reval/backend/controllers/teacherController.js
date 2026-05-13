const pool = require('../config/db'); // Ensure this path matches your project structure
const sendEmail = require("../utils/email"); // Ensure you have this utility or remove if unused
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pdf = require('pdf-parse');

// @desc    Get all requests relevant to this teacher (Assigned + Matching Unassigned)
// @route   GET /api/teacher/dashboard
exports.getTeacherRequests = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // 1. Fetch Teacher Details
        const teacherQuery = `
      SELECT id, full_name, department, subject_specialization 
      FROM users 
      WHERE id = $1 AND role = 'teacher'
    `;
        const teacherResult = await pool.query(teacherQuery, [userId]);
        const teacher = teacherResult.rows[0];

        if (!teacher) {
            return res.status(404).json({ message: "Teacher profile not found" });
        }

        const { subject_specialization } = teacher; // We ignore 'department' for matching now
        const trimmedSpec = subject_specialization ? subject_specialization.trim() : "";

        // 2. Fetch Requests
        // Action: Rewrite the WHERE clause to be ultra-robust
        const requestsQuery = `
      SELECT 
        r.id AS request_id,
        u.full_name AS student_name,
        u.reg_no,
        u.department AS student_department,
        COALESCE(m.subject_name, 'Unknown Subject') AS subject_name,
        COALESCE(m.subject_code, 'N/A') AS subject_code,
        m.score AS original_score,
        r.status,
        r.payment_status,
        r.amount_paid,
        r.ai_feedback,
        r.ocr_data,
        r.created_at,
        r.teacher_id
      FROM revaluation_requests r
      LEFT JOIN users u ON r.student_id = u.id
      LEFT JOIN marks m ON r.subject_id = m.id
      WHERE 
        -- Exclude only DRAFT requests (include PUBLISHED for Completed tab)
        UPPER(r.status::text) NOT IN ('DRAFT')
        AND (
          -- ONLY show requests that match teacher's specialization OR are directly assigned
          (
            -- A. Directly Assigned to this teacher AND specialization matches
            r.teacher_id = $1
            AND (
              $2::text IS NULL 
              OR TRIM($2) = ''
              OR UPPER(COALESCE(m.subject_code, '')) LIKE '%' || UPPER(TRIM($2)) || '%' 
              OR UPPER(COALESCE(m.subject_name, '')) LIKE '%' || UPPER(TRIM($2)) || '%'
            )
          )
          OR (
            -- B. Smart Match: Unassigned requests that match specialization
            r.teacher_id IS NULL 
            AND $2::text IS NOT NULL
            AND TRIM($2) != ''
            AND (
                 -- Match subject_code OR subject_name with teacher's specialization
                 UPPER(COALESCE(m.subject_code, '')) LIKE '%' || UPPER(TRIM($2)) || '%' 
                 OR 
                 UPPER(COALESCE(m.subject_name, '')) LIKE '%' || UPPER(TRIM($2)) || '%'
            )
          )
        )
      ORDER BY r.created_at DESC;
    `;

        const requestsResult = await pool.query(requestsQuery, [
            userId,
            trimmedSpec || null
        ]);

        if (process.env.NODE_ENV === 'development') {
            console.log(`Found ${requestsResult.rows.length} requests.`);
        }

        res.json({
            teacher_info: teacher,
            revaluation_requests: requestsResult.rows
        });

    } catch (err) {
        console.error("Error in getTeacherRequests:", err);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};
// @desc    Update Status & Assign Request to Teacher
// @route   PUT /api/teacher/request/status
exports.updateStatus = async (req, res, next) => {
    try {
        const { requestId, status, teacherNotes } = req.body;
        const teacherId = req.user.id;

        if (!requestId || !status) {
            return res.status(400).json({ message: "Request ID and Status are required" });
        }

        // Fetch request data for email notification
        const requestDataQuery = `
        SELECT 
            r.id, 
            r.student_id,
            u.email as student_email, 
            u.full_name as student_name,
            m.subject_code, 
            m.subject_name,
            r.ai_feedback
        FROM revaluation_requests r
        LEFT JOIN users u ON r.student_id = u.id
        LEFT JOIN marks m ON r.subject_id = m.id
        WHERE r.id = $1
    `;

        const requestDataResult = await pool.query(requestDataQuery, [requestId]);

        if (requestDataResult.rows.length === 0) {
            return res.status(404).json({ message: "Request not found" });
        }

        const requestData = requestDataResult.rows[0];

        // Update Query:
        // 1. Update Status
        // 2. Assign teacher_id to CURRENT teacher (Claim the request)
        // 3. Update teacher comments if provided
        const updateQuery = `
        UPDATE revaluation_requests 
        SET 
            status = $1, 
            teacher_id = $2,
            updated_at = NOW(),
            teacher_notes = COALESCE($3, teacher_notes)
        WHERE id = $4
        RETURNING *;
    `;

        const result = await pool.query(updateQuery, [
            status,
            teacherId,
            teacherNotes || null,
            requestId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Request not found" });
        }

        // Send email notification if status is PUBLISHED (Non-blocking / Fire-and-forget)
        if (status === 'PUBLISHED') {
            (async () => {
                try {
                    const aiScore = requestData.ai_feedback?.score || 'N/A';
                    const comments = teacherNotes || requestData.ai_feedback?.feedback || 'No comments provided';

                    await sendEmail({
                        to: requestData.student_email,
                        subject: `Revaluation Results Published - ${requestData.subject_code}`,
                        html: `
                    <h2>Revaluation Results Published</h2>
                    <p>Dear ${requestData.student_name},</p>
                    <p>Your revaluation request for <strong>${requestData.subject_name} (${requestData.subject_code})</strong> has been completed and published.</p>
                    
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Results Summary</h3>
                        <p><strong>AI Analysis Score:</strong> ${aiScore}/100</p>
                        <p><strong>Professor's Comments:</strong></p>
                        <p>${comments}</p>
                    </div>

                    <p>You can view the complete results by logging into your stu
