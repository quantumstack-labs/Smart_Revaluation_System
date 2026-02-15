const express = require("express");
const router = express.Router();
const upload = require("../utils/fileUpload");
const pool = require("../config/db");
const { ocrQueue } = require("../utils/queues");
const path = require("path");

// POST /api/upload/answer-sheet
router.post("/answer-sheet", upload.array("files", 5), async (req, res) => {
    try {
        const { requestId } = req.body;
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).json({ error: "No files uploaded" });
        }

        if (!requestId) {
            return res.status(400).json({ error: "Request ID is required" });
        }

        // 1. Construct File URLs - Store as array for JSONB/TEXT[] column
        const fileUrls = files.map(file => `/uploads/${file.filename}`);

        // 2. Update Database with answer_script_urls array
        const query = `
            UPDATE revaluation_requests 
            SET answer_script_urls = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING *;
        `;
        const { rows } = await pool.query(query, [fileUrls, requestId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "Revaluation Request not found" });
        }

        // 3. Dispatch Background Job (OCR) with timeout protection
        try {
            const queuePromise = ocrQueue.add("process-ocr", {
                requestId: requestId,
                fileUrls: fileUrls
            });
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Queue timeout')), 3000)
            );
            
            await Promise.race([queuePromise, timeoutPromise]);
            console.log(` OCR job queued for Request ${requestId}`);
        } catch (queueError) {
            console.warn(` Queue failed, but upload succeeded:`, queueError.message);
            // Continue anyway - files are uploaded, OCR can be done manually
        }


        res.json({
            success: true,
            message: "Files uploaded successfully.",
            file_urls: fileUrls,
            request: rows[0]
        });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: "File upload failed" });
    }
});

module.exports = router;
