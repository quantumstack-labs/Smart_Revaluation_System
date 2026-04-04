const bcrypt = require("bcryptjs");
const jwt = require("../utils/jwt");
const sendEmail = require("../utils/email");
const { registerSchema, loginSchema } = require("../validation/authValidation");
const userModel = require("../models/userModel");
const studentModel = require("../models/studentModel");
const teacherModel = require("../models/teacherModel");
const { welcomeEmail } = require("../utils/emailTemplates");
const pool = require("../config/db");
const supabase = require("../config/supabaseClient");

exports.validateRole = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({
        success: false,
        message: "No token provided"
        });

        const token = authHeader.split(' ')[1];

        // 1. Verify Token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
            });
        }

        // 2. Fetch Public User Details & Role
        const query = `SELECT * FROM public.users WHERE id = $1`;
        const { rows } = await pool.query(query, [user.id]);

        if (rows.length === 0) {
            return res.status(404).json({
            success: false,
            message: "User profile not found in public records."
});
        }

        const publicUser = rows[0];

        res.json({
            success:true,
            message: "Role verified",
            user: {
                id: publicUser.id,
                email: publicUser.email,
                role: publicUser.role,
                full_name: publicUser.full_name,
                avatar_url: publicUser.avatar_url
            }
        });

    } catch (err) {
        console.error("Role Validation Error:", err);
       res.status(500).json({
  success: false,
  message: "Internal Server Error"
});
    }
};

exports.register = async (req, res, next) => {
    try {
        const { error } = registerSchema.validate(req.body);
        if (error) return res.status(400).json({
  success: false,
  message: error.details[0].message
});

        // Get all possible fields from frontend
        const { name, email, password, role, reg_no, subject, department } = req.body;

        const existingUser = await userModel.findByEmail(email);
        if (existingUser)
            return res.status(409).json({
  success: false,
  message: "Email already registered"
});

        const pepper = process.env.PEPPER || "";
        const hashedPassword = await bcrypt.hash(password + pepper, 12);

        // FIX 1: Pass an OBJECT to createUser (maps 'name' to 'full_name')
        // SECURITY: Force role to 'student' for public registration
        const safeRole = 'student';

        const newUser = await userModel.createUser({
            full_name: name,
            email,
            password: hashedPassword,
            role: safeRole
        });

        // FIX 2: Handle specific roles using the new UPDATE logic
        if (safeRole === "student") {
            // Updates the user row with reg_no and department
            await studentModel.createStudent(newUser.id, reg_no, department);
        } else if (role === "teacher") {
            // Updates the user row with department.
            // We use 'subject' if provided (as legacy support), otherwise 'department'
            await teacherModel.createTeacher(newUser.id, subject || department);
        }

        // Email logic (Wrapped in try/catch so registration doesn't fail if email fails)
        try {
            await sendEmail(email, "Welcome to Smart Exam", welcomeEmail(name, role));
        } catch (emailErr) {
            console.error("Warning: Registration email failed.", emailErr.message);
        }

        res.status(201).json({
            success:true,
            message: "Registration successful",
            user: {
                id: newUser.id,
                name: newUser.name, // The model aliases full_name as name
                role: newUser.role
            }
        });

    } catch (err) {
        // Handle Postgres Unique Violation (e.g., Duplicate Reg No)
        if (err.code === '23505') {
            return res.status(409).json({
  success: false,
  message: "Email or Register Number already exists."
});
        }
        next(err);
    }
};

exports.login = async (req, res, next) => {
    try {
        const { error } = loginSchema.validate(req.body);
        if (error) return res.status(400).json({
  success: false,
  message: error.details[0].message
});

        const { email, password } = req.body;

        const user = await userModel.findByEmail(email);
        if (!user) return res.status(401).json({
  success: false,
  message: "Invalid credentials"
});

        const pepper = process.env.PEPPER || "";
        const isMatch = await bcrypt.compare(password + pepper, user.password);

        if (!isMatch)
            return res.status(401).json({
  success: false,
  message: "Invalid credentials"
});

        const token = jwt.generateToken({
            id: user.id,
            role: user.role
        });

        // FIX 3: Return department in login response (useful for frontend)
        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                role: user.role,
                department: user.department
            }
        });

    } catch (err) {
        next(err);
    }
};
