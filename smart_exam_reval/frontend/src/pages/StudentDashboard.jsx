import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText, CheckCircle, Clock, PlusCircle,
    Search, AlertCircle, X, CreditCard, Loader, BookOpen, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import AIEvaluationModal from '../components/AIEvaluationModal';

const StudentDashboard = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0 });

    // Data States
    const [applications, setApplications] = useState([]); // History
    const [subjects, setSubjects] = useState([]); // Academic Records

    // Modals
    const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
    const [isAIModalOpen, setAIModalOpen] = useState(false);

    // Selection State
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);

    useEffect(() => {
        // CRITICAL FIX: Don't fetch until user is loaded and defined
        if (!authLoading && user) {
            
            fetchData();
        } else if (!authLoading && !user) {
            console.warn(" No user found after auth loaded, redirecting to login");
            navigate('/login');
        }
    }, [user, authLoading, navigate, location]); // location triggers refresh on navigation back

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Explicitly get the session token from Supabase
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError || !session?.access_token) {
                console.error(" No active session found.", sessionError);
                toast.error("Session expired. Please login again.");
                setLoading(false);
                navigate('/login');
                return;
            }

            const token = session.access_token;
           
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch all data from our backend dashboard endpoint
            const { data } = await api.get('/api/student/dashboard', { headers });

        

            setApplications(data.revaluation_requests || []);
            updateStats(data.revaluation_requests || []);

            // Map backend 'marks' to frontend 'subjects'
            // Backend returns: { id, subject_name, subject_code, score, grade, status }
            const mappedSubjects = (data.marks || []).map(m => ({
                id: m.id,
                code: m.subject_code,
                name: m.subject_name,
                marks: m.score,
                grade: m.grade,
                status: m.status
            }));

            setSubjects(mappedSubjects);

        } catch (err) {
            console.error("Error fetching dashboard data:", err);

            if (err.response?.status === 401) {
                toast.error("Session expired. Please login again.");
                navigate('/login');
            } else {
                toast.error("Failed to load dashboard data");
            }
        } finally {
            setLoading(false);
        }
    };

    const updateStats = (data) => {
        setStats({
            total: data.length,
            pending: data.filter(r => ['SUBMITTED', 'PROCESSING', 'TEACHER_REVIEW'].includes(r.status)).length,
            completed: data.filter(r => ['PUBLISHED'].includes(r.status)).length
        });
    };

    // --- HANDLERS ---

    const handleAddSubject = async (newSubject) => {
        try {
            // Map frontend field names to backend expectations
            const payload = {
                subject_name: newSubject.name,
                subject_code: newSubject.code,
                marks_obtained: parseInt(newSubject.marks),
                total_marks: parseInt(newSubject.total_marks || 100)
            };


            // Use the api instance which auto-injects token
            const { data } = await api.post('/api/student/add-subject', payload);

          

            // Update local state with the new subject from backend
            const addedSubject = {
                id: data.subject.id,
                code: data.subject.subject_code,
                name: data.subject.subject_name,
                marks: data.subject.score,
                grade: data.subject.grade,
                status: data.subject.status,
                total_score: data.subject.total_score,
                percentage: data.subject.percentage
            };

            setSubjects([addedSubject, ...subjects]);
            setIsAddSubjectOpen(false);
            toast.success("Subject Added Successfully!");
        } catch (err) {
            console.error(" Error adding subject:", err);

            // Handle specific error cases
            if (err.response?.status === 401) {
                toast.error("Session expired. Please log in again.");
                return;
            }

            // Display specific backend error message
            const errorMessage = err.response?.data?.error || err.response?.data?.message || "Failed to add subject";
            toast.error(errorMessage);
        }
    };

    const initiateReval = (subject) => {
        // Check if already applied
        const alreadyApplied = applications.some(app => app.subject_code === subject.code);
        if (alreadyApplied) {
            toast.error("You have already applied for this subject.");
            return;
        }
        setSelectedSubject(subject);
        navigate('/student/revaluation/payment', { state: { subject } });
    };

    return (
        <div className="space-y-10">
            <div className="space-y-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400">
                            Student Portal
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Welcome back, {user?.name || 'Student'}</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full md:w-auto">
                        <StatsBox label="Total" value={stats.total} icon={FileText} color="text-violet-600 dark:text-violet-400" />
                        <StatsBox label="Pending" value={stats.pending} icon={Clock} color="text-amber-600 dark:text-amber-400" />
                        <StatsBox label="Published" value={stats.completed} icon={CheckCircle} color="text-emerald-600 dark:text-emerald-400" />
                    </div>
                </div>

                {/* --- ACADEMIC PERFORMANCE (Failures) --- */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-violet-600 dark:text-violet-500" /> Academic Performance
                        </h2>
                        <button
                            onClick={() => setIsAddSubjectOpen(true)}
                            className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-violet-500/20"
                        >
                            <PlusCircle className="w-4 h-4" /> Add Missing Subject
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-4">Subject Code</th>
                                    <th className="p-4">Subject Name</th>
                                    <th className="p-4">Score</th>
                                    <th className="p-4">Grade</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                                {subjects.map((sub, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 font-mono text-slate-600 dark:text-slate-300">{sub.code}</td>
                                        <td className="p-4 font-bold text-slate-900 dark:text-white">{sub.name}</td>
                                        <td className="p-4 text-slate-900 dark:text-white">{sub.marks}</td>
                                        <td className="p-4">
                                            <span className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-2 py-1 rounded text-xs font-bold">
                                                {sub.grade}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {(() => {
                                                // Robust matching: convert both to strings and compare
                                                const activeRequest = applications.find(app =>
                                                    String(app.subject_code).toUpperCase() === String(sub.code).toUpperCase() &&
                                                    app.status?.toUpperCase() !== 'REJECTED'
                                                );

                                            
                                                if (activeRequest) {
                                                    return (
                                                        <span className="text-green-600 dark:text-green-400 font-bold text-xs">
                                                            Applied ({activeRequest.status.toUpperCase()})
                                                        </span>
                                                    );
                                                }

                                                return (
                                                    <button
                                                        onClick={() => initiateReval(sub)}
                                                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                                                    >
                                                        Apply Reval
                                                    </button>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                                {subjects.length === 0 && (
                                    <tr><td colSpan="5" className="p-8 text-center text-slate-500">No Academic Records. Click "Add Missing Subject" to test.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- MY APPLICATIONS HISTORY --- */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-500" /> Application History
                    </h2>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold">
                                <tr>
                                    <th className="p-4">Request ID</th>
                                    <th className="p-4">Subject</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Payment</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                                {applications.map((app) => (
                                    <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="p-4 font-mono text-slate-600 dark:text-slate-500">#{app.id.toString().slice(0, 4)}</td>
                                        <td className="p-4 text-slate-900 dark:text-white">{app.subject_code}</td>
                                        <td className="p-4"><StatusBadge status={app.status} /></td>
                                        <td className="p-4 text-green-600 dark:text-green-400 font-bold uppercase text-xs">Paid</td>
                                        <td className="p-4 text-slate-500 dark:text-slate-400">{new Date(app.created_at).toLocaleDateString()}</td>
                                        <td className="p-4 text-right">
                                            {app.status?.toUpperCase() === 'PUBLISHED' && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedRequest(app);
                                                        setAIModalOpen(true);
                                                    }}
                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 ml-auto transition-all"
                                                >
                                                    <Eye className="w-3 h-3" /> View Report
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {applications.length === 0 && (
                                    <tr><td colSpan="6" className="p-8 text-center text-slate-500">No history available.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* --- MODAL 1: ADD MISSING SUBJECT --- */}
            <AnimatePresence>
                {isAddSubjectOpen && (
                    <AddSubjectModal
                        onClose={() => setIsAddSubjectOpen(false)}
                        onAdd={handleAddSubject}
                    />
                )}
            </AnimatePresence>

            {/* --- MODAL 2: AI EVALUATION REPORT --- */}
            <AnimatePresence>
                {isAIModalOpen && selectedRequest && (
                    <AIEvaluationModal
                        isOpen={isAIModalOpen}
                        onClose={() => setAIModalOpen(false)}
                        request={selectedRequest}
                        isTeacher={false}
                        onAppeal={(requestId, appealText) => {
                            
                            toast.success("Appeal submitted successfully!");
                        }}
                    />
                )}
            </AnimatePresence>

        </div>
    );
};

// --- Sub-Components ---

const StatsBox = ({ label, value, icon: Icon, color }) => (
    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-4 min-w-[140px]">
        <div className={`p-3 rounded-xl bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
            <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-400 font-bold uppercase">{label}</p>
        </div>
    </div>
);

const AddSubjectModal = ({ onClose, onAdd }) => {
    const [newSubject, setNewSubject] = useState({
        name: '',
        code: '',
        marks: '',
        totalMarks: '100' // Default total marks
    });
    const [error, setError] = useState('');

    // --- Helper: Calculate Grade & Status ---
    const calculateGrade = (obtained, total) => {
        const percentage = (parseInt(obtained) / parseInt(total)) * 100;

        if (percentage >= 90) return { grade: 'S', status: 'Pass' };
        if (percentage >= 80) return { grade: 'A', status: 'Pass' };
        if (percentage >= 70) return { grade: 'B', status: 'Pass' };
        if (percentage >= 60) return { grade: 'C', status: 'Pass' };
        if (percentage >= 50) return { grade: 'D', status: 'Pass' };
        return { grade: 'F', status: 'Fail' }; // Below 50% is Fail
    };

    // --- Updated Submit Handler ---
    const handleSubmitSubject = async (e) => {
        e.preventDefault();
        setError('');

        // 1. Validation
        if (!newSubject.name || !newSubject.code || !newSubject.marks || !newSubject.totalMarks) {
            setError("All fields are required.");
            return;
        }

        const marks = parseInt(newSubject.marks);
        const total = parseInt(newSubject.totalMarks);

        if (marks > total) {
            setError("Marks obtained cannot be greater than total marks.");
            return;
        }

        if (marks < 0 || total <= 0) {
            setError("Invalid marks entered.");
            return;
        }

        // 2. Auto-Calculate Result
        const result = calculateGrade(marks, total);

        // 3. Prepare Payload with correct field names
        const payload = {
            name: newSubject.name,
            code: newSubject.code,
            marks: marks,
            total_marks: total
        };

        // Call your existing add function here
        onAdd(payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl relative">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold text-white mb-6">Add Missing Subject</h2>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl mb-4 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmitSubject} className="space-y-4">

                    {/* Subject Name */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Subject Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Data Structures"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none"
                            value={newSubject.name}
                            onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                        />
                    </div>

                    {/* Subject Code */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Subject Code</label>
                        <input
                            type="text"
                            placeholder="e.g. CS202"
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none"
                            value={newSubject.code}
                            onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value.toUpperCase() })}
                        />
                    </div>

                    {/* Marks Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Marks Obtained</label>
                            <input
                                type="number"
                                placeholder="e.g. 24"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none"
                                value={newSubject.marks}
                                onChange={(e) => setNewSubject({ ...newSubject, marks: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Total Marks</label>
                            <input
                                type="number"
                                placeholder="100"
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-violet-500 outline-none"
                                value={newSubject.totalMarks}
                                onChange={(e) => setNewSubject({ ...newSubject, totalMarks: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Live Preview (Optional UX Bonus) */}
                    {newSubject.marks && newSubject.totalMarks && (
                        <div className="text-center py-2">
                            <span className="text-slate-400 text-sm">Calculated Grade: </span>
                            <span className={`font-bold ${calculateGrade(newSubject.marks, newSubject.totalMarks).status === 'Pass'
                                ? 'text-green-400'
                                : 'text-red-400'
                                }`}>
                                {calculateGrade(newSubject.marks, newSubject.totalMarks).grade}
                                ({calculateGrade(newSubject.marks, newSubject.totalMarks).status})
                            </span>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-violet-600/20 transition-all mt-2"
                    >
                        Add Subject
                    </button>

                </form>
            </motion.div>
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const colors = {
        'SUBMITTED': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        'PROCESSING': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        'PUBLISHED': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    };
    return (
        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${colors[status?.toUpperCase()] || colors.SUBMITTED}`}>
            {status}
        </span>
    );
};

export default StudentDashboard;