const pool = require("../config/db");
const { nanoid } = require('nanoid'); 

// FIX: Use subjectId (Int) instead of subject_name (String)
exports.createRequest = async (studentId, subjectId, teacherId) => {
  // Generate secure alphanumeric tracking ID e.g. REV-9A3B2F
  const applicationCode = 'REV-' + nanoid(6).toUpperCase();

  const query = `
    INSERT INTO revaluation_requests 
    (student_id, subject_id, teacher_id, status, payment_status, application_code)
    VALUES ($1, $2, $3, 'pending', 'unpaid', $4)
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [studentId, subjectId, teacherId, applicationCode]);
  return rows[0];
};

/**
 * @param {string} requestId - Alphanumeric tracking ID (e.g., "REV-9A3B2F"), not an integer
 */
exports.updateStatus = async (requestId, status) => {
  const query = `
    UPDATE revaluation_requests
    SET status=$1, updated_at=NOW()
    WHERE id=$2
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [status, requestId]);
  return rows[0];
};

/**
 * @param {string} requestId - Alphanumeric tracking ID (e.g., "REV-9A3B2F"), not an integer
 */
exports.publishResult = async (requestId, status, teacherNotes) => {
  const query = `
      UPDATE revaluation_requests
      SET status=$1, teacher_notes=$2, updated_at=NOW()
      WHERE id=$3
      RETURNING *;
    `;
  const { rows } = await pool.query(query, [status, teacherNotes, requestId]);
  return rows[0];
};

/**
 * @param {string} requestId - Alphanumeric tracking ID (e.g., "REV-9A3B2F"), not an integer
 */
exports.updatePayment = async (requestId, paymentStatus) => {
  const query = `
    UPDATE revaluation_requests
    SET payment_status=$1, updated_at=NOW()
    WHERE id=$2
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [paymentStatus, requestId]);
  return rows[0];
};

// FIX: This function was causing the Dashboard 500 Error
exports.getRequestsByStudent = async (studentId) => {
  const query = `
    SELECT 
      r.id,
      r.application_code, 
      r.status, 
      r.payment_status, 
      r.created_at,
      r.ocr_data,       -- <--- Added
      r.ai_feedback,    -- <--- Added
      m.subject_name,    -- <--- We get the name from the 'marks' table
      m.subject_code,
      m.score AS original_score
    FROM revaluation_requests r
    JOIN marks m ON r.subject_id = m.id   -- <--- The Critical Join
    WHERE r.student_id=$1
    ORDER BY r.created_at DESC;
  `;
  const { rows } = await pool.query(query, [studentId]);
  return rows;
};

// Added Helper: Check if request exists to prevent duplicates
exports.checkExistingRequest = async (studentId, subjectId) => {
  const query = `
    SELECT * FROM revaluation_requests 
    WHERE student_id = $1 AND subject_id = $2
  `;
  const { rows } = await pool.query(query, [studentId, subjectId]);
  return rows[0];
};
/**
 * @param {string} requestId - Alphanumeric tracking ID (e.g., "REV-9A3B2F"), not an integer
 */
exports.addAppeal = async (requestId, reason) => {
  const query = `
      UPDATE revaluation_requests 
      SET status = 'appealed', appeal_reason = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;
  const { rows } = await pool.query(query, [reason, requestId]);
  return rows[0];
};