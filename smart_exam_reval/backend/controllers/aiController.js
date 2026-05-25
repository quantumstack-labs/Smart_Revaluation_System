const { generateGrading } = require("../utils/aiService");
const pool = require("../config/db");
const fs = require('fs');
const path = require('path');
const logger = require("../config/logger");

// Controller for handling AI Grading Logic with Vision
exports.gradeRequest = async (req, res, next) => {
    try {
        const { requestId } = req.body;

        if (!requestId) {
            return res.status(400).json({ message: "Request ID is required" });
        }

        // 1. Fetch Request & Subject Data
        const reqRes = await pool.query(
            `SELECT r.*, m.subject_code, m.subject_name, r.answer_script_urls
             FROM revaluation_requests r 
             JOIN marks m ON r.subject_id = m.id 
             WHERE r.id = $1`,
            [requestId]
        );
        const request = reqRes.rows[0];

        if (!request) return res.status(404).json({ message: "Request not found" });

        logger.debug(`Request subject_code: "${request.subject_code}", subject_name: "${request.subject_name}"`);
        logger.debug(`Comparing subject_code (JSON): ${JSON.stringify(request.subject_code)}`);

        // 2. Check if answer sheet images are uploaded
        if (!request.answer_script_urls || request.answer_script_urls.length === 0) {
            return res.status(400).json({
                message: "No answer sheet uploaded. Please upload student's answer sheet first."
            });
        }

        // 3. Fetch Official Answer Key with DEEP DEBUG
        logger.debug("🔍 ========== DEEP DEBUG: ANSWER KEY LOOKUP ==========");
        logger.debug(`Request ID: ${requestId}`);
        logger.debug(`Looking for subject_code: "${request.subject_code}" (JSON: ${JSON.stringify(request.subject_code)})`);
        logger.debug(`Teacher ID from auth: ${req.user?.id}`);

        // First, check ALL answer keys in the database
        const allKeys = await pool.query(
            `SELECT id, subject_code, teacher_id, status, 
                    LENGTH(extracted_text) as text_length, 
                    created_at 
             FROM answer_keys 
             ORDER BY created_at DESC LIMIT 10`
        );
        logger.debug("All Answer Keys in Database (last 10):");
        allKeys.rows.forEach(k => {
            logger.debug(`   • ID:${k.id} | Code:"${k.subject_code}" | Teacher:${k.teacher_id} | Status:${k.status} | Text:${k.text_length} chars | Date:${k.created_at}`);
        });

        //  Use ILIKE for robust case-insensitive matching
        const keyRes = await pool.query(
            `SELECT id, extracted_text, subject_code, teacher_id, status, 
                    LENGTH(extracted_text) as text_length
             FROM answer_keys 
             WHERE subject_code ILIKE $1 AND status = 'completed'
             ORDER BY created_at DESC LIMIT 1`,
            [request.subject_code.trim()]
        );
        const answerKey = keyRes.rows[0];



        if (!answerKey) {
            return res.status(400).json({
                message: `No Answer Key found for ${request.subject_code}. Please upload answer key first.`
            });
        }

        if (!answerKey.extracted_text) {
            return res.status(400).json({
                message: `Answer Key for ${request.subject_code} exists but has no text content. Please delete and re-upload it.`
            });
        }

        // Additional safety check for empty text
        if (answerKey.extracted_text.trim().length === 0) {
            return res.status(400).json({
                message: "Answer Key appears to be empty. Please upload a valid answer key with content."
            });
        }

        // 4. Read answer sheet images as base64
        const imageFiles = Array.isArray(request.answer_script_urls)
            ? request.answer_script_urls
            : JSON.parse(request.answer_script_urls || '[]');

        const images = [];
        for (const imageUrl of imageFiles) {
            try {
                // Convert URL to file path (assuming uploads are in /uploads/)
                const filePath = path.join(__dirname, '..', imageUrl.replace('/uploads/', 'uploads/'));

                if (fs.existsSync(filePath)) {
                    const imageBuffer = fs.readFileSync(filePath);
                    const base64Image = imageBuffer.toString('base64');
                    const mimeType = path.extname(filePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';

                    images.push({
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType
                        }
                    });
                }
            } catch (err) {
                // Silent failure for individual images to allow partial processing if needed
            }
        }

        if (images.length === 0) {
            return res.status(400).json({
                message: "Could not load answer sheet images. Please re-upload."
            });
        }

        // 5. Call AI Service with Vision
        const aiResult = await generateGrading(
            answerKey.extracted_text,
            request.subject_name,
            images
        );

        // 6. Update DB with Result
        const updateQuery = `
            UPDATE revaluation_requests 
            SET ai_feedback = $1, status = 'PUBLISHED', updated_at = NOW() 
            WHERE id = $2 
            RETURNING *;
        `;
        const { rows } = await pool.query(updateQuery, [aiResult, requestId]);

        res.json({
            message: "AI Grading Complete",
            result: aiResult,
            updatedRequest: rows[0]
        });

    } catch (error) {
        logger.error("AI Controller Error", error);
        next(error);
    }
};
