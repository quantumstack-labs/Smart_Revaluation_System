import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { GraduationCap } from 'lucide-react';
import Navbar from '../components/Navbar';

// Password strength constants
const PASSWORD_STRENGTH = {
    WEAK: { level: 'Weak', color: 'bg-red-500', textColor: 'text-red-400', width: '33%' },
    FAIR: { level: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-400', width: '66%' },
    STRONG: { level: 'Strong', color: 'bg-green-500', textColor: 'text-green-400', width: '100%' }
};

const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_STRONG_LENGTH = 8;

// ✅ FIXED: declared only once outside component
const regNoPattern = /^[A-Z0-9]{6,15}$/;

const Signup = () => {
    const { role, isAuthenticated, signupWithEmail } = useAuth();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(false);
    const [showPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(PASSWORD_STRENGTH.WEAK);

    const [formData, setFormData] = useState({
        fullName: '',
        department: '',
        registerNumber: '',
        email: '',
        password: ''
    });

    useEffect(() => {
        if (isAuthenticated && role) {
            if (role === 'student') navigate('/student/dashboard');
            else if (role === 'teacher') navigate('/teacher/dashboard');
            else if (role === 'admin') navigate('/admin/dashboard');
            else navigate('/');
        }
    }, [isAuthenticated, role, navigate]);

    const calculatePasswordStrength = (password) => {
        if (password.length < PASSWORD_MIN_LENGTH) return PASSWORD_STRENGTH.WEAK;

        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /[0-9]/.test(password);
        const hasSymbols = /[^A-Za-z0-9]/.test(password);

        if (
            password.length >= PASSWORD_STRONG_LENGTH &&
            hasUpperCase &&
            hasLowerCase &&
            hasNumbers &&
            hasSymbols
        ) {
            return PASSWORD_STRENGTH.STRONG;
        }

        return PASSWORD_STRENGTH.FAIR;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        if (name === 'password') {
            setPasswordStrength(calculatePasswordStrength(value));
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Basic validation
            if (!formData.fullName || !formData.email || !formData.password || !formData.registerNumber) {
                toast.error("Please fill all required fields");
                setIsLoading(false);
                return;
            }

            // ✅ Register number validation (ONLY ONCE)
            if (!regNoPattern.test(formData.registerNumber)) {
                toast.error("Invalid Register Number (Use CAPITAL letters & numbers only, 6–15 characters)");
                setIsLoading(false);
                return;
            }

            const result = await signupWithEmail(
                formData.email,
                formData.password,
                {
                    full_name: formData.fullName,
                    department: formData.department,
                    role: 'student',
                    register_number: formData.registerNumber,
                    reg_no: formData.registerNumber
                }
            );

            if (!result.success) {
                toast.error(result.error || "Signup failed");
                setIsLoading(false);
                return;
            }

            if (result.confirmationRequired) {
                toast.success("Check email to verify account");
                setTimeout(() => navigate('/login'), 2000);
            } else {
                toast.success("Account created successfully");
                setTimeout(() => {
                    window.location.href = '/student/dashboard';
                }, 2000);
            }

        } catch (error) {
            toast.error("Signup failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            <Navbar />

            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="w-full max-w-md p-8 rounded-3xl border">

                    <div className="text-center mb-6">
                        <GraduationCap className="w-10 h-10 mx-auto text-violet-500" />
                        <h2 className="text-2xl font-bold mt-2">Create Account</h2>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-4">

                        <input
                            name="fullName"
                            placeholder="Full Name"
                            value={formData.fullName}
                            onChange={handleChange}
                            className="w-full p-3 border rounded-xl"
                            required
                        />

                        <input
                            name="department"
                            placeholder="Department"
                            value={formData.department}
                            onChange={handleChange}
                            className="w-full p-3 border rounded-xl"
                            required
                        />

                        <input
                            name="registerNumber"
                            placeholder="Register Number"
                            value={formData.registerNumber}
                            onChange={handleChange}
                            className="w-full p-3 border rounded-xl"
                            required
                        />

                        <input
                            name="email"
                            placeholder="Email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full p-3 border rounded-xl"
                            required
                        />

                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full p-3 border rounded-xl"
                            required
                        />

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-violet-600 text-white p-3 rounded-xl"
                        >
                            {isLoading ? "Creating..." : "Create Account"}
                        </button>
                    </form>

                </div>
            </div>
        </div>
    );
};

export default Signup;