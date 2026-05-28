const supabase = require("../config/supabaseClient");
const pool = require("../config/db");

exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // --- DEBUG LOG ---

    // Strict null/undefined/empty checks
    if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
        console.error(" [Auth] Rejected: Null, undefined, or empty token");
        return res.status(401).json({ message: "No valid token provided. Please login again." });
    }

    try {
        // 1. Verify Token with Supabase (Retry Logic)
        let user, error;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                const result = await supabase.auth.getUser(token);
                user = result.data.user;
                error = result.error;
                break; // Success
            } catch (netErr) {
                attempts++;
                console.warn(`[Auth] Supabase connection failed (Attempt ${attempts}/${maxAttempts}):`, netErr.message);
                if (attempts === maxAttempts) throw netErr;
                await new Promise(r => setTimeout(r, 1000)); // Wait 1s
            }
        }

        if (error || !user) {
            console.error("Supabase Auth Error:", error?.message);
            return res.status(401).json({ message: "Invalid or expired token" });
        }

        // 2. Fetch Role from DB
        const query = `SELECT role, id, email, full_name FROM users WHERE id = $1`;
        const { rows } = await pool.query(query, [user.id]);

        if (rows.length === 0) {
            return res.status(401).json({ message: "User not found in system records" });
        }

        // Merge auth user and db user (role)
        req.user = { ...user, ...rows[0] };
        next();

    } catch (err) {
        console.error("Auth Middleware Error:", err);
        res.status(500).json({ message: "Server Error during authentication" });
    }
};

exports.studentOnly = (req, res, next) => {
    if (req.user.role !== "student")
        return res.status(403).json({ message: "Access denied. Students only." });
    next();
};

exports.teacherOnly = (req, res, next) => {
    if (req.user.role !== "teacher")
        return res.status(403).json({ message: "Access denied. Teachers only." });
    next();
};

exports.adminOnly = (req, res, next) => {
    if (req.user.role !== "admin")
        return res.status(403).json({ message: "Access denied. Admins only." });
    next();
};

exports.teacherOrAdmin = (req, res, next) => {
    if (req.user.role === "teacher" || req.user.role === "admin") {
        return next();
    }
    return res.status(403).json({
        message: "Access denied. Teachers and admins only.",
    });
};
