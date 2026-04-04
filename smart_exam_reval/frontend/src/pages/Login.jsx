import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight, Loader } from 'lucide-react'; // Added Loader
import Navbar from '../components/Navbar';
import { motion } from 'framer-motion'; // Ensure you have framer-motion installed

const Login = () => {
    const { loginWithGoogle, loginWithEmail, role, isAuthenticated } = useAuth(); // Destructure loginWithEmail
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Redirect based on role if already logged in
    useEffect(() => {
        if (isAuthenticated && role) {
            if (role === 'teacher') navigate('/teacher/dashboard');
            else if (role === 'admin') navigate('/admin/dashboard');
            else navigate('/student/dashboard');
        }
    }, [isAuthenticated, role, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Use the Context function instead of direct Supabase call
            const { success } = await loginWithEmail(email, password);

            if (!success) {
                // If loginWithEmail returns success: false, it means an error was already handled internally
                // and a toast might have been shown. We just need to stop loading.
                // If loginWithEmail throws an error, it will be caught below.
            }
            // If success, the useEffect above will handle redirect
        } catch (error) {
            console.error('Login error:', error);

            // Handle different error types with user-friendly messages
            if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
                toast.error('Network connection failed. Please check your internet.');
            } else if (error.code === 'ETIMEDOUT') {
                toast.error('Request timed out. Please try again.');
            } else if (error.response) {
                // Server responded with error
                const message = error.response.data?.message || error.response.data?.error;
                toast.error(message || 'Login failed. Please check your credentials.');
            } else {
                // Unknown error
                toast.error('An unexpected error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-violet-500/30 transition-colors duration-200">
            <Navbar />
            <div className="pt-24 min-h-[calc(100vh-80px)] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">

                        {/* Header */}
                        <div className="text-center mb-8 relative z-10">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-700">
                                <GraduationCap className="w-8 h-8 text-violet-600 dark:text-violet-500" />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome Back</h2>
                            <p className="text-slate-500 dark:text-slate-400">Sign in to access your account</p>
                        </div>

                        {/* Google Login Button */}
                        <button
                            onClick={loginWithGoogle}
                            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 dark:border-transparent hover:bg-slate-50 text-slate-900 py-3.5 rounded-xl transition-all mb-6 font-bold shadow-lg"
                        >
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
                            Sign in with University ID
                        </button>

                        <div className="relative flex py-2 items-center mb-6">
                            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                            <span className="flex-shrink-0 mx-4 text-slate-500 dark:text-slate-500 text-xs uppercase tracking-widest font-bold">Or continue with email</span>
                            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                        </div>

                        {/* Email Form */}
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 pl-12 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                                        placeholder="name@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3.5 pl-12 pr-12 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                                <div className="text-right">
                                    {/* ✅ FIXED LINK HERE */}
                                    <Link to="/forgot-password" className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 font-medium transition-colors">
                                        Forgot password?
                                    </Link>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-violet-600 hover:bg-violet-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-violet-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <Loader className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        Sign In <ArrowRight className="h-5 w-5" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-sm text-slate-500">
                                Don't have an account? <Link to="/signup" className="text-violet-600 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 font-bold transition-colors">Sign up</Link>
                            </p>
                        </div>

                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
