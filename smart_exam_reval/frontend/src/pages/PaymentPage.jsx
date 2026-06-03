import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, AlertCircle, CheckCircle, Shield, Lock, ArrowLeft, Mail } from 'lucide-react';
import Navbar from '../components/Navbar';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { supabase } from '../supabase';
import api from '../api/axios';
import toast from 'react-hot-toast';

const PaymentPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const subject = location.state?.subject; // Expects { subject: "Name", code: "CS101", marks: 45 }

    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [email, setEmail] = useState(user?.email || '');
    const [transactionId, setTransactionId] = useState(null);
    const [hasFailedSubjects, setHasFailedSubjects] = useState(true); // Default true to prevent flash
    const [loading, setLoading] = useState(true);

    // Check if student has any failed subjects
    useEffect(() => {
        const checkFailedSubjects = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.access_token) {
                    navigate('/login');
                    return;
                }

                const token = session.access_token;
                const headers = { Authorization: `Bearer ${token}` };

                const { data } = await api.get('/api/student/dashboard', { headers });

                // Check if student has any failed subjects
                const failedCount = data.marks?.filter(m => m.status === 'Fail' || m.grade === 'F').length || 0;
                setHasFailedSubjects(failedCount > 0);
                setLoading(false);
            } catch (err) {
                console.error('Error checking failed subjects:', err);
                setHasFailedSubjects(false);
                setLoading(false);
            }
        };

        checkFailedSubjects();
    }, [navigate]);

    // Show loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <Loader />
            </div>
        );
    }

    // Redirect if no failed subjects (prevent unauthorized access)
    if (!hasFailedSubjects) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-200">
                <Navbar />
                <div className="pt-24 pb-12 px-4 flex items-center justify-center min-h-screen">
                    <div className="text-center max-w-md">
                        <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-4">No Failed Subjects</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            You don't have any failed subjects. Revaluation is only available for failed subjects.
                        </p>
                        <button
                            onClick={() => navigate('/student/dashboard')}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Redirect if no subject selected (direct access protection)
    if (!subject) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-900 dark:text-white transition-colors duration-200">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">No Subject Selected</h2>
                    <button onClick={() => navigate('/student/dashboard')} className="text-blue-600 dark:text-blue-400 hover:underline">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const handlePayment = async () => {
        if (!email) {
            toast.error("Please enter an email for the receipt.");
            return;
        }

        setIsProcessing(true);
        const transactionId = `TXN-${Math.floor(Math.random() * 1000000)}`;
        setTransactionId(transactionId);

        try {
            // Get fresh session token
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                toast.error("Please log in again.");
                navigate('/login');
                return;
            }
            const token = session.access_token;
            const headers = { Authorization: `Bearer ${token}` };

            // 1. Simulate Payment Gateway Delay
            await new Promise(r => setTimeout(r, 2000));

            // 2. Create Revaluation Request (Backend handles teacher assignment)
            const { data: createResponse } = await api.post(
                '/api/revaluation/create',
                { subject_name: subject.name },
                { headers }
            );

            const requestId = createResponse.request.id;
            console.log(" Request created:", requestId);

            // 3. Mark Payment as Paid
            await api.post(
                '/api/revaluation/payment',
                {
                    requestId: requestId,
                    studentEmail: email
                },
                { headers }
            );

            console.log(" Payment marked as paid");

            // 4. TRIGGER EMAIL RECEIPT (Backend Call)
            try {
                await api.post('/student/send-receipt', {
                    email: email,
                    studentName: user.name || "Student",
                    subjectName: subject.name || subject.subject,
                    subjectCode: subject.code,
                    amount: 500,
                    transactionId: transactionId
                });
                console.log(" Receipt sent");
            } catch (emailErr) {
                console.warn(" Email sending failed:", emailErr);
            }

            setIsSuccess(true);
            toast.success("Payment Successful!");

        } catch (error) {
            console.error(" Payment Error:", error);
            const errorMsg = error.response?.data?.message || "Payment failed. Please try again.";
            toast.error(errorMsg);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-violet-500/30 transition-colors duration-200">
            <Navbar />

            <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">

                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN: Order Summary */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-green-600 dark:text-green-400" /> Order Summary
                            </h3>

                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Subject</p>
                                    <p className="text-slate-900 dark:text-white font-medium">{subject.subject}</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm">{subject.code}</p>
                                </div>

                                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 text-sm">
                                    <span>Revaluation Fee</span>
                                    <span>₹500.00</span>
                                </div>
                                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 text-sm">
                                    <span>Processing Fee</span>
                                    <span>₹0.00</span>
                                </div>
                                <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>
                                <div className="flex justify-between items-center text-slate-900 dark:text-white font-bold text-lg">
                                    <span>Total</span>
                                    <span>₹500.00</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                                This is a <span className="font-bold text-slate-900 dark:text-white">Mock Payment</span>. No real money will be deducted from your account.
                            </p>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Payment Form */}
                    <div className="lg:col-span-2">
                        {isSuccess ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-2xl"
                            >
                                <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 dark:text-green-400">
                                    <CheckCircle className="w-10 h-10" />
                                </div>
                                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Payment Successful!</h2>
                                <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                                    Your application for <span className="text-slate-900 dark:text-white font-bold">{subject.subject}</span> has been submitted successfully.
                                    <br />
                                    <span className="text-sm mt-2 block">Transaction ID: <span className="font-mono font-bold text-violet-600 dark:text-violet-400">{transactionId}</span></span>
                                </p>
                                <div className="flex justify-center gap-4">
                                    <button
                                        onClick={() => navigate('/track-status')}
                                        className="px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold transition-all"
                                    >
                                        Track Status
                                    </button>
                                    <button
                                        onClick={() => navigate('/student/dashboard')}
                                        className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-lg shadow-violet-500/20 transition-all"
                                    >
                                        Go to Dashboard
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl">
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Payment Method</h2>
                                    <div className="flex gap-2">
                                        <div className="h-8 w-12 bg-slate-100 dark:bg-white/10 rounded flex items-center justify-center">
                                            <div className="w-6 h-6 bg-orange-500/80 rounded-full -mr-3"></div>
                                            <div className="w-6 h-6 bg-red-500/80 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email for Receipt</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="student@example.com"
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Card Number</label>
                                        <div className="relative">
                                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                                            <input
                                                type="text"
                                                value="4242 4242 4242 4242"
                                                disabled
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-12 pr-4 text-slate-900 dark:text-white font-mono tracking-wide focus:outline-none focus:border-violet-500 transition-colors cursor-not-allowed opacity-70"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expiry Date</label>
                                            <input
                                                type="text"
                                                placeholder="MM / YY"
                                                disabled
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white text-center focus:outline-none cursor-not-allowed opacity-70"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">CVC</label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                                                <input
                                                    type="password"
                                                    placeholder="•••"
                                                    disabled
                                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-900 dark:text-white focus:outline-none cursor-not-allowed opacity-70"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cardholder Name</label>
                                        <input
                                            type="text"
                                            value={user?.name || "STUDENT NAME"}
                                            disabled
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white focus:outline-none cursor-not-allowed opacity-70 uppercase"
                                        />
                                    </div>

                                    <button
                                        onClick={handlePayment}
                                        disabled={isProcessing}
                                        className="w-full mt-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-violet-500/20 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader size="small" className="text-white" /> Processing...
                                            </>
                                        ) : (
                                            <>Pay ₹500.00 <Lock className="w-4 h-4 opacity-70" /></>
                                        )}
                                    </button>

                                    <p className="text-center text-xs text-slate-500 flex items-center justify-center gap-1">
                                        <Lock className="w-3 h-3" /> Payments are secure and encrypted
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;