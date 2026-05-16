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

                    <p>You can view the complete results by logging into your student dashboard.</p>
                    
                    <br>
                    <p>Best regards,<br>Academic Office</p>
                `
                    });


                } catch (emailErr) {
                    console.error("Failed to send publish email (background):", emailErr);
                }
            })();
        }

        res.json({
            message: "Status updated and request assigned successfully",
            request: result.rows[0]
        });

    } catch (err) {
        console.error("Error in updateStatus:", err);
        res.status(500).json({ message: "Update Failed", error: err.message });
    }
};

// DEBUGGING ONLY: Call this to inspect why a request isn't matching
exports.debugRequest = async (req, res) => {
    try {
        const { id } = req.params; // The Request ID (e.g., 26)

        const query = `
            SELECT 
                r.id, r.status, r.teacher_id, r.created_at,
                m.subject_code, m.subject_name
            FROM revaluation_requests r
            LEFT JOIN marks m ON r.subject_id = m.id
            WHERE r.id = $1
        `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            return res.json({ message: "Request ID not found in DB" });
        }

        const row = result.rows[0];



        res.json(row);
    } catch (error) {
        console.error("Debug Error:", error);
        res.status(500).json(error);
    }
};

// DATA INTEGRITY CHECKER: Scan for orphaned records
exports.checkDataIntegrity = async (req, res) => {
    try {
        const orphanedRequests = await pool.query(`
            SELECT 
                r.id AS request_id,
                r.student_id,
                r.subject_id,
                r.status,
                CASE WHEN u.id IS NULL THEN 'MISSING' ELSE 'OK' END AS student_status,
                CASE WHEN m.id IS NULL THEN 'MISSING' ELSE 'OK' END AS subject_status
            FROM revaluation_requests r
            LEFT JOIN users u ON r.student_id = u.id
            LEFT JOIN marks m ON r.subject_id = m.id
            WHERE u.id IS NULL OR m.id IS NULL
            ORDER BY r.id DESC
        `);

        const orphanedMarks = await pool.query(`
            SELECT 
                m.id AS mark_id,
                m.student_id,
                CASE WHEN u.id IS NULL THEN 'MISSING' ELSE 'OK' END AS student_status
            FROM marks m
            LEFT JOIN users u ON m.student_id = u.id
            WHERE u.id IS NULL
        `);



        res.json({
            orphaned_requests: orphanedRequests.rows,
            orphaned_marks: orphanedMarks.rows,
            summary: {
                total_orphaned_requests: orphanedRequests.rows.length,
                total_orphaned_marks: orphanedMarks.rows.length
            }
        });
    } catch (error) {
        console.error("Data Integrity Check Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// @desc    Upload Answer Script (Multi-file support)
// @route   POST /api/teacher/upload-script
// @access  Private (Teacher only)
exports.uploadAnswerScript = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const requestId = req.body.requestId;

        if (!requestId) {
            return res.status(400).json({
                success: false,
                error: "Request ID is required"
            });
        }

        // Verify request exists and teacher has access
        const checkQuery = `
            SELECT r.id, r.student_id, m.subject_code, u.subject_specialization
            FROM revaluation_requests r
            LEFT JOIN marks m ON r.subject_id = m.id
            LEFT JOIN users u ON u.id = $1
            WHERE r.id = $2
            AND (
                r.teacher_id = $1 
                OR r.teacher_id IS NULL
            )
        `;

        const checkResult = await pool.query(checkQuery, [teacherId, requestId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Request not found or access denied"
            });
        }

        // Process uploaded files
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: "No files uploaded"
            });
        }

        // Create answer_scripts directory if it doesn't exist
        const uploadsDir = path.join(__dirname, '../uploads/answer_scripts');
        await fs.mkdir(uploadsDir, { recursive: true });

        // Generate unique filenames and move files
        const fileUrls = [];
        for (const file of req.files) {
            const timestamp = Date.now();
            const randomStr = Math.random().toString(36).substring(7);
            const ext = path.extname(file.originalname);
            const newFilename = `req_${requestId}_${timestamp}_${randomStr}${ext}`;
            const filePath = path.join(uploadsDir, newFilename);

            // Move file from temp location to permanent storage
            await fs.rename(file.path, filePath);

            // Store relative URL
            const fileUrl = `/uploads/answer_scripts/${newFilename}`;
            fileUrls.push(fileUrl);
        }

        // Update database with file URLs
        const updateQuery = `
            UPDATE revaluation_requests
            SET 
                answer_script_urls = $1,
                status = CASE 
                    WHEN status = 'SUBMITTED' THEN 'PROCESSING' 
                    ELSE status 
                END,
                teacher_id = COALESCE(teacher_id, $2),
                updated_at = NOW()
            WHERE id = $3
            RETURNING id, answer_script_urls, status
        `;

        const updateResult = await pool.query(updateQuery, [
            fileUrls,
            teacherId,
            requestId
        ]);

        console.log(` Uploaded ${fileUrls.length} files for request #${requestId}`);

        // TODO: Trigger AI analysis queue here
        // await triggerAIAnalysis(requestId, fileUrls);

        res.json({
            success: true,
            message: `Uploaded ${fileUrls.length} file(s) successfully`,
            urls: fileUrls,
            request: updateResult.rows[0]
        });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// @desc    Reject Revaluation Request
// @route   PUT /api/teacher/request/reject/:id
// @access  Private (Teacher only)
exports.rejectRequest = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const requestId = req.params.id;
        const { reason } = req.body;

        if (!reason || reason.trim() === '') {
            return res.status(400).json({
                success: false,
                error: "Rejection reason is required"
            });
        }

        // Verify request exists and teacher has access
        const checkQuery = `
            SELECT r.id, r.student_id, u.email, u.full_name, m.subject_code, m.subject_name
            FROM revaluation_requests r
            LEFT JOIN users u ON r.student_id = u.id
            LEFT JOIN marks m ON r.subject_id = m.id
            WHERE r.id = $1
            AND (r.teacher_id = $2 OR r.teacher_id IS NULL)
        `;

        const checkResult = await pool.query(checkQuery, [requestId, teacherId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Request not found or access denied"
            });
        }

        const requestData = checkResult.rows[0];

        // Update request status to REJECTED (or delete it)
        // Option 1: Soft delete by changing status
        const updateQuery = `
            UPDATE revaluation_requests
            SET 
                status = 'REJECTED',
                teacher_id = $1,
                teacher_notes = $2,
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
        `;

        await pool.query(updateQuery, [teacherId, reason.trim(), requestId]);

        // Send rejection email to student
        try {
            await sendEmail({
                to: requestData.email,
                subject: `Revaluation Request Rejected - ${requestData.subject_code}`,
                html: `
                    <h2>Revaluation Request Rejected</h2>
                    <p>Dear ${requestData.full_name},</p>
                    <p>Your revaluation request for <strong>${requestData.subject_name} (${requestData.subject_code})</strong> has been rejected.</p>
                    <p><strong>Reason:</strong></p>
                    <p>${reason.trim()}</p>
                    <p>If you have questions, please contact your department.</p>
                    <br>
                    <p>Best regards,<br>Academic Office</p>
                `
            });
        } catch (emailErr) {
            console.error("Failed to send rejection email:", emailErr);
            // Don't fail the request even if email fails
        }

        console.log(` Request #${requestId} rejected by teacher #${teacherId}`);

        res.json({
            success: true,
            message: "Request rejected successfully"
        });

    } catch (error) {
        console.error("Reject Error:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};



// ✅ ADD THIS FUNCTION
// @desc    Upload Teacher Answer Key
// @route   POST /api/teacher/keys/upload
exports.uploadAnswerKey = async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { subjectCode } = req.body; // Frontend sends 'subjectCode'

        // 1. Validation
        if (!req.file) {
            return res.status(400).json({ error: "No PDF file uploaded" });
        }
        if (!subjectCode) {
            return res.status(400).json({ error: "Subject Code is required" });
        }

        // 2. Move file from temp to permanent storage
        const uploadsDir = path.join(__dirname, '../uploads/answer_keys');
        await fs.mkdir(uploadsDir, { recursive: true });

        const newFilename = `KEY_${subjectCode}_${Date.now()}.pdf`;
        const destPath = path.join(uploadsDir, newFilename);
        await fs.rename(req.file.path, destPath);

        const fileUrl = `/uploads/answer_keys/${newFilename}`;

        // 3. Extract Text from PDF (CRITICAL FIX)
        let extractedText = '';
        try {
            const dataBuffer = await fs.readFile(destPath);
            const pdfData = await pdf(dataBuffer);
            extractedText = pdfData.text;

        } catch (pdfError) {
            console.warn('PDF text extraction failed:', pdfError.message);
            extractedText = 'Text extraction failed.';
        }

        // 4. Insert into Database with Extracted Text
        const query = `
            INSERT INTO answer_keys (teacher_id, subject_code, file_url, extracted_text, status)
            VALUES ($1, $2, $3, $4, 'completed')
            RETURNING id, subject_code, status, created_at
        `;

        const result = await pool.query(query, [teacherId, subjectCode, fileUrl, extractedText]);

        res.json({
            success: true,
            keyId: result.rows[0].id,
            message: "Answer Key Uploaded & Processed Successfully",
            data: result.rows[0]
        });

    } catch (err) {
        console.error("Upload Key Error:", err);
        res.status(500).json({ error: "Upload failed: " + err.message });
    }
};

//  ADD THIS FUNCTION
exports.getAnswerKeys = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM answer_keys WHERE teacher_id = $1 ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

//  ADD THIS FUNCTION
exports.deleteAnswerKey = async (req, res) => {
    try {
        await pool.query('DELETE FROM answer_keys WHERE id = $1 AND teacher_id = $2', [req.params.id, req.user.id]);
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ✅ ADD THIS FUNCTION
exports.getAnswerKeyFile = async (req, res) => {
    try {
        const result = await pool.query('SELECT file_url FROM answer_keys WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: "File not found" });

        const filePath = path.join(__dirname, '..', result.rows[0].file_url);
        res.download(filePath);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
