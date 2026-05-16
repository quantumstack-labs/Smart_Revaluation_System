import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowRight, CheckCircle, Zap, Shield, 
    Bot, Clock, Brain, FileText
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

const Home = () => {
    const { isAuthenticated, user } = useAuth();

    // Determine dashboard link based on role
    const dashboardLink = user?.role ? `/${user.role}/dashboard` : '/student/dashboard';

    // Animation variants
    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-violet-500/30 transition-colors duration-200">
            <Navbar />

            <main className="pt-24">

                {/* --- HERO SECTION --- */}
                <section className="relative px-6 py-20 lg:py-32 max-w-7xl mx-auto flex flex-col items-center text-center">
                    
                    {/* Background Effects */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />

                    <motion.div
                        initial="hidden" animate="visible" variants={fadeInUp}
                        className="relative z-10"
                    >
                        <span className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold tracking-wider uppercase mb-8 shadow-xl">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Smart Exam Revaluation System
                        </span>

                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight text-slate-900 dark:text-white">
                            Transforming Exam <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400">
                                Revaluation Process
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                            Experience a seamless, transparent, and efficient way to apply for exam revaluation. 
                            Track your status in real-time and get results faster than ever with AI-assisted grading.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto">
                            {isAuthenticated ? (
                                // --- VIEW FOR LOGGED IN USERS ---
                                <>
                                    <Link
                                        to={dashboardLink}
                                        className="group flex items-center justify-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-lg transition-all hover:scale-105 shadow-lg shadow-violet-600/25"
                                    >
                                        Go to Dashboard
                                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                    <Link
                                        to="/track-status"
                                        className="flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold text-lg border border-slate-200 dark:border-slate-800 transition-all hover:scale-105 shadow-sm"
                                    >
                                        Check Status
                                    </Link>
                                </>
                            ) : (
                                // --- VIEW FOR GUEST USERS ---
                                <>
                                    <Link
                                        to="/login"
                                        className="group flex items-center justify-center gap-2 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-lg transition-all hover:scale-105 shadow-lg shadow-violet-600/25"
                                    >
                                        Student Login
                                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                    <Link
                                        to="/login" // Or specific faculty login route
                                        className="flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold text-lg border border-slate-200 dark:border-slate-800 transition-all hover:scale-105 shadow-sm"
                                    >
                                        Faculty Portal
                                    </Link>
                                </>
                            )}
                        </div>
                    </motion.div>
                </section>

                {/* --- WHY CHOOSE SECTION --- */}
                <section className="px-6 py-20 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-900">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Why Choose ReValuate?</h2>
                            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                                We combine cutting-edge technology with academic integrity to provide the best revaluation experience.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <FeatureCard 
                                icon={<Brain className="h-8 w-8 text-blue-600 dark:text-blue-400" />}
                                title="AI-Assisted Grading"
                                desc="Our advanced AI analyzes answer sheets to provide preliminary insights, ensuring fair and consistent evaluation."
                            />
                            <FeatureCard 
                                icon={<Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />}
                                title="Real-Time Tracking"
                                desc="Stay updated at every step. From application submission to final result declaration, track it all live."
                            />
                            <FeatureCard 
                                icon={<Shield className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />}
                                title="Secure & Transparent"
                                desc="Your data is encrypted and secure. The entire process is transparent, building trust between students and institutions."
                            />
                        </div>
                    </div>
                </section>

                {/* --- HOW IT WORKS SECTION --- */}
                <section className="px-6 py-20 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">
                    <div className="max-w-7xl mx-auto text-center">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">How It Works</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-16">Simple steps to get your revaluation done.</p>

                        <div className="grid md:grid-cols-4 gap-8 relative">
                            {/* Connector Line (Desktop) */}
                            <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />

                            <StepCard number="1" title="Apply" desc="Select subject and submit application." />
                            <StepCard number="2" title="Pay" desc="Securely pay the revaluation fee." />
                            <StepCard number="3" title="Processing" desc="Teachers & AI review your answer sheet." />
                            <StepCard number="4" title="Result" desc="Get your updated score and feedback." />
                        </div>
                    </div>
                </section>

            </main>

           
            <Footer />
        </div>
    );
};

// --- Sub-Components ---

const FeatureCard = ({ icon, title, desc }) => (
    <motion.div 
        whileHover={{ y: -5 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm"
    >
        <div className="h-14 w-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6 border border-slate-200 dark:border-slate-700">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h3>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">{desc}</p>
    </motion.div>
);

const StepCard = ({ number, title, desc }) => (
    <div className="relative z-10 flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-950 border-4 border-slate-200 dark:border-slate-800 flex items-center justify-center text-xl font-bold text-slate-900 dark:text-white mb-6 shadow-xl">
            {number}
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-[200px]">{desc}</p>
    </div>
);

export default Home;