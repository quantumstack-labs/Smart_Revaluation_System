const { createClient } = require('@supabase/supabase-js');
const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const { getAdminRevaluationList } = require('../services/revaluationRequestListService');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
});

// 1. Check if the key exists
if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error("❌ FATAL ERROR: SUPABASE_SERVICE_KEY is missing in .env file.");
}

// 2. Initialize Admin Client
const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY, 
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

exports.createTeacher = async (req, res) => {
    const { email, password, full_name, department } = req.body;

    if (!email || !password || !full_name || !department) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        console.log(`Creating teacher account for: ${email}`);

        // --- Step 1: Create Auth User ---
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: full_name,
                role: 'teacher',
                department: department
            }
        });

        if (authError) {
            console.error("Supabase Auth Error:", authError);
            throw authError; 
        }

        const userId = authData.user.id;

        // --- Step 2: Insert into public.users table ---
        const { error: dbError } = await supabaseAdmin
            .from('users')
            .upsert({
                id: userId,
                email: email,
                full_name: full_name,
                department: department,
                role: 'teacher'
            });

        if (dbError) {
            console.error("Database Insert Error:", dbError);
            throw dbError;
        }

        // --- Step 3: Add to Whitelist ---
        const { error: whitelistError } = await supabaseAdmin
            .from('allowed_teachers')
            .insert([{ email: email }])
            .select();

        if (whitelistError && whitelistError.code !== '23505') {
            console.warn("Whitelist insertion warning:", whitelistError.message);
        }

        // --- SUCCESS RESPONSE ---
        res.status(201).json({ 
            message: "Teacher account created successfully!", 
            user: authData.user 
        });

    } catch (error) {
        console.error("Create Teacher Error:", error.message);
        
        // Handle "User already exists" specifically
        if (error.code === 'email_exists' || (error.message && error.message.includes("already been registered"))) {
            return res.status(422).json({ error: "A user with this email address already exists." });
        }

        res.status(500).json({ error: error.message || "Internal Server Error" });
    }
};

// @desc    List all revaluation requests (admin) with search/filter query params
// @route   GET /api/admin/revaluation-requests
// @query   search, department, payment, status, dateFrom, dateTo, page, limit
exports.getRevaluationRequests = async (req, res) => {
    try {
        const data = await getAdminRevaluationList(req.query);

        if (process.env.NODE_ENV === 'development') {
            console.log(
                `[admin] ${data.revaluation_requests.length} requests (page ${data.pagination.page}, total ${data.pagination.total}).`
            );
        }

        res.json({
            total: data.pagination.total,
            ...data,
        });
    } catch (err) {
        console.error('Error in getRevaluationRequests:', err);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
};

// @desc    Bulk upload semester results (CSV / Excel)
// @route   POST /api/admin/upload-semester-results
exports.uploadSemesterResults = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const ext = path.extname(req.file.originalname).toLowerCase();
        const allowed = ['.csv', '.xlsx', '.xls'];
        if (!allowed.includes(ext)) {
            return res.status(400).json({
                message: 'Unsupported file type. Use .csv, .xlsx, or .xls',
            });
        }

        let rowsDetected = 0;
        if (ext === '.csv') {
            const text = req.file.buffer.toString('utf8');
            const lines = text.split(/\r?\n/).filter((line) => line.trim());
            rowsDetected = Math.max(0, lines.length - 1);
        }

        res.status(202).json({
            success: true,
            message: `Received "${req.file.originalname}". ${rowsDetected > 0 ? `${rowsDetected} data row(s) detected.` : 'File stored for processing.'} Connect your marks import job to persist rows.`,
            filename: req.file.originalname,
            rows_detected: rowsDetected,
        });
    } catch (err) {
        console.error('uploadSemesterResults:', err);
        res.status(500).json({ message: 'Upload failed', error: err.message });
    }
};

exports.uploadSemesterResultsMiddleware = upload.single('file');