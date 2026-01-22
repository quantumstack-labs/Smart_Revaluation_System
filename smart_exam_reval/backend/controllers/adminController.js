const { createClient } = require('@supabase/supabase-js');
// const pool = require('../config/db'); // Keep if you use direct DB access

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