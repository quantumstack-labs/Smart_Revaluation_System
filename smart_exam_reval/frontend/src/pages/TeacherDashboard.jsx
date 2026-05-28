import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, CheckCircle, FileText, AlertCircle, X, ChevronRight,
    RefreshCw, Send, Save, Eye, Layers, Upload, Loader2, Bot, LayoutDashboard, Trash2, Camera, Check, XCircle, Key
} from 'lucide-react';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import UploadModal from '../components/UploadModal';
import AIEvaluationModal from '../components/AIEvaluationModal';
import { API_BASE_URL, API_URL } from '../config';
import { mapTeacherDashboardRequests } from '../utils/mapRevaluationRequests';
import RevaluationRequestFilters from '../components/RevaluationRequestFilters';
import HighlightText from '../components/HighlightText';
import {
    DEFAULT_PAGE_SIZE,
    STATUS_LABELS,
    buildSubjectOptionsFromRows,
    buildFilterParamsFromState,
} from '../constants/revaluationFilters';

const TeacherDashboard = () => {
    const { user } = useAuth();
    const [allRequests, setAllRequests] = useState([]);
    const [answerKeys, setAnswerKeys] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All'); // 'All', 'Pending', 'Processing', 'Completed', 'My Subjects', 'Answer Keys'
    const [teacherProfile, setTeacherProfile] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('All');
    const [selectedPayment, setSelectedPayment] = useState('All');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [selectedSubject, setSelectedSubject] = useState('All');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: DEFAULT_PAGE_SIZE,
        total: 0,
        totalPages: 1,
    });

    // Grading Modal State
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isGradeModalOpen, setGradeModalOpen] = useState(false);

    // Upload Modal State
    const [isUploadModalOpen, setUploadModalOpen] = useState(false);

    // AI Evaluation Modal State
    const [isAIModalOpen, setAIModalOpen] = useState(false);

    // Upload State
    const [uploadSubject, setUploadSubject] = useState('');
    const [uploadFile, setUploadFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchAnswerKeys();
        }
    }, [user]);

    useEffect(() => {
        if (!user) return;

        const delay = searchQuery.trim() ? 300 : 0;
        const timer = setTimeout(() => fetchRequests(), delay);
        return () => clearTimeout(timer);
    }, [user, searchQuery, selectedDepartment, selectedPayment, selectedStatus, selectedSubject, dateFrom, dateTo, page]);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, selectedDepartment, selectedPayment, selectedStatus, selectedSubject, dateFrom, dateTo]);

    const subjectOptions = useMemo(
        () => buildSubjectOptionsFromRows(allRequests),
        [allRequests]
    );

    const filterState = useMemo(
        () => ({
            search: searchQuery,
            department: selectedDepartment,
            payment: selectedPayment,
            status: selectedStatus,
            subject: selectedSubject,
            dateFrom,
            dateTo,
            page,
            limit: DEFAULT_PAGE_SIZE,
        }),
        [searchQuery, selectedDepartment, selectedPayment, selectedStatus, selectedSubject, dateFrom, dateTo, page]
    );

    /** Tab-filtered list (before search) — same source for mock and API data */
    const requests = useMemo(() => {
        let list = allRequests;

        if (activeTab === 'Pending') {
            list = list.filter((r) => ['SUBMITTED'].includes(r.status));
        } else if (activeTab === 'Processing') {
            list = list.filter((r) => ['PROCESSING', 'TEACHER_REVIEW'].includes(r.status));
        } else if (activeTab === 'Completed') {
            list = list.filter((r) => r.status === 'PUBLISHED');
        } else if (activeTab === 'My Subjects') {
            const spec = teacherProfile?.specialization?.toLowerCase();
            if (spec) {
                list = list.filter(
                    (r) => r.subject_code && r.subject_code.toLowerCase() === spec
                );
            }
        }

        return list;
    }, [allRequests, activeTab, teacherProfile]);

    const setRequests = (updater) => {
        setAllRequests((prev) => (typeof updater === 'function' ? updater(prev) : updater));
    };

    const getAuthHeader = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return { Authorization: `Bearer ${session?.access_token}` };
    };

    const fetchAnswerKeys = async () => {
        try {
            const headers = await getAuthHeader();
            const response = await api.get('/teacher/keys', { headers });
            setAnswerKeys(response.data);
        } catch (err) {
            console.error("Fetch Keys Error:", err);
        }
    };

    const handleViewFile = async (keyId) => {
        try {
            const toastId = toast.loading("Opening PDF...");
            const headers = await getAuthHeader();

            const response = await api.get(`/api/teacher/keys/${keyId}/file`, {
                headers,
                responseType: 'blob'
            });

            const file = new Blob([response.data], { type: 'application/pdf' });
            const fileURL = URL.createObjectURL(file);
            window.open(fileURL, '_blank');
            toast.dismiss(toastId);
        } catch (err) {
            console.error("View File Error:", err);
            toast.error("Failed to open file");
        }
    };

    const handleDeleteKey = async (id) => {
        if (!window.confirm("Are you sure you want to delete this answer key?")) return;

        try {
            const headers = await getAuthHeader();
            await api.delete(`/api/teacher/keys/${id}`, { headers });
            setAnswerKeys(prev => prev.filter(k => k.id !== id));
            toast.success("Answer Key Deleted");
        } catch (err) {
            toast.error("Failed to delete key");
        }
    };

    const buildDashboardApiParams = () => buildFilterParamsFromState(filterState);

    const fetchRequests = async () => {
        try {
            setIsLoading(true);

            const headers = await getAuthHeader();
            const response = await api.get('/api/teacher/dashboard', {
                headers,
                params: buildDashboardApiParams(),
            });

            let rawRequests = [];
            let teacherInfo = null;

            if (response.data?.revaluation_requests) {
                rawRequests = response.data.revaluation_requests;
                setPagination(
                    response.data?.pagination ?? {
                        page: 1,
                        limit: DEFAULT_PAGE_SIZE,
                        total: rawRequests.length,
                        totalPages: 1,
                    }
                );
                teacherInfo = response.data.teacher_info;
            } else if (Array.isArray(response.data)) {
                rawRequests = response.data;
            }

            if (teacherInfo) {
                setTeacherProfile(teacherInfo);
            }

            setAllRequests(mapTeacherDashboardRequests(rawRequests));
        } catch (err) {
            console.error("Fetch error:", err);
            toast.error("Failed to load requests");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!uploadFile || !uploadSubject) return toast.error("Please select a file and subject.");

        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('subjectCode', uploadSubject);

        setUploading(true);
        const toastId = toast.loading("Uploading Key...");

        try {
            // Fix: Do not manually inject auth headers (Interceptor handles it).
            // Fix: Explicitly unset Content-Type so the browser sets result boundary for FormData.
            const response = await api.post('/teacher/keys/upload', formData, {
                headers: {
                    'Content-Type': undefined
                }
            });

            if (response.data.success) {
                toast.success("Answer Key Uploaded & Processing Started!", { id: toastId });
                setAnswerKeys(prev => [
                    {
                        id: response.data.keyId,
                        subject_code: uploadSubject,
                        created_at: new Date().toISOString(),
                        status: 'Pending'
                    },
                    ...prev
                ]);
                setUploadSubject('');
                setUploadFile(null);
            }
        } catch (error) {
            console.error("Upload Error:", error);
            const msg = error.response?.data?.error || "Upload Failed";
            toast.error(msg, { id: toastId });
        } finally {
            setUploading(false); // ✅ CRITICAL FIX: Stops the spinner even if error occurs
        }
    };

    const openGradingWorkspace = (req) => {
        setSelectedRequest(req);
        setGradeModalOpen(true);
    };

    const openUploadModal = (req) => {
        setSelectedRequest(req);
        setUploadModalOpen(true);
    };

    const openAIEvaluation = (req) => {
        setSelectedRequest(req);
        setAIModalOpen(true);
    };

    const handleUploadComplete = (urls) => {
        // Update the request with uploaded script URLs
        const updatedRequest = { ...selectedRequest, answer_script_urls: urls };

        setRequests(prev => prev.map(r =>
            r.id === selectedRequest.id
                ? updatedRequest
                : r
        ));

        // Update the selected request for the modal
        setSelectedRequest(updatedRequest);

        setUploadModalOpen(false);
        // Automatically open grading workspace after upload
        setGradeModalOpen(true);
    };

    const handleQuickApprove = async (req) => {
        if (!window.confirm(`Approve request #${req.id.toString().slice(0, 4)} without modifications?\n\nThis will publish the current AI score.`)) {
            return;
        }

        try {
            const headers = await getAuthHeader();
            await api.put('/teacher/request/status', {
                requestId: req.id,
                status: 'PUBLISHED',
                teacherNotes: req.ai_feedback?.feedback || 'Approved'
            }, { headers });

            setRequests(prev => prev.map(r =>
                r.id === req.id ? { ...r, status: 'PUBLISHED' } : r
            ));
            toast.success("Request Approved & Published!");
        } catch (err) {
            console.error("Approve failed:", err);
            toast.error("Failed to approve request");
        }
    };

    const handleQuickReject = async (req) => {
        const reason = window.prompt(`Reject request #${req.id.toString().slice(0, 4)}?\n\nPlease provide a reason:`);
        if (!reason || reason.trim() === '') {
            toast.error("Rejection reason is required");
            return;
        }

        try {
            const headers = await getAuthHeader();
            await api.put(`/teacher/request/reject/${req.id}`, {
                reason: reason.trim()
            }, { headers });

            setRequests(prev => prev.filter(r => r.id !== req.id));
            toast.success("Request Rejected");
        } catch (err) {
            console.error("Reject failed:", err);
            toast.error("Failed to reject request");
        }
    };

    // --- PUBLISH ACTION ---
    // Calculate My Subjects statistics
    const mySubjectRequests = teacherProfile?.specialization
        ? allRequests.filter(r =>
            r.subject_code &&
            r.subject_code.toLowerCase() === teacherProfile.specialization.toLowerCase()
        )
        : [];

    const myStats = {
        total: mySubjectRequests.length,
        completed: mySubjectRequests.filter(r => r.status === 'PUBLISHED').length,
        answerKeys: teacherProfile?.specialization
            ? answerKeys.filter(k =>
                k.subject_code &&
                k.subject_code.toLowerCase() === teacherProfile.specialization.toLowerCase()
            ).length
            : 0
    };

    const handlePublish = async (updatedData) => {
        const { score, feedback } = updatedData;

        try {
            const headers = await getAuthHeader();

            // Call the consolidated status update endpoint
            await api.put('/teacher/request/status', {
                requestId: selectedRequest.id,
                status: 'PUBLISHED',
                teacherNotes: feedback
            }, { headers });

            // Optimistic UI Update
            setRequests(prev => prev.map(req =>
                req.id === selectedRequest.id
                    ? { ...req, status: 'PUBLISHED', ai_feedback: { ...req.ai_feedback, teacher_comments: feedback, score: score } }
                    : req
            ));

            toast.success("Result Published Successfully!");

        } catch (err) {
            console.error("Publish failed:", err);
            toast.error("Failed to publish result.");
        } finally {
            setGradeModalOpen(false);
        }
    };

    const filteredRequests = requests;

    const hasActiveFilters =
        searchQuery.trim() !== '' ||
        selectedDepartment !== 'All' ||
        selectedPayment !== 'All' ||
        selectedStatus !== 'All' ||
        selectedSubject !== 'All' ||
        dateFrom !== '' ||
        dateTo !== '';

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedDepartment('All');
        setSelectedPayment('All');
        setSelectedStatus('All');
        setSelectedSubject('All');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    };

    const totalCount = pagination.total ?? filteredRequests.length;
    const resultLabel =
        totalCount === 1 ? '1 record found' : `${totalCount} records found`;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-violet-500/30 transition-colors duration-200 pb-32">


            <div className="space-y-8">

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Teacher Portal</h1>
                        <div className="flex items-center gap-3 mt-2 text-slate-500 dark:text-slate-400 text-sm">
                            <span className="flex items-center gap-1"><LayoutDashboard className="w-4 h-4" /> Professor</span>
                            <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
                            <span>Department: {teacherProfile?.department || 'Computer Science'}</span>
                        </div>
                    </div>
                </div>

                {/* --- STATISTICS CARDS --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatsCard
                        title="Total Requests"
                        value={allRequests.filter(r => r.status !== 'PUBLISHED').length}
                        icon={<FileText className="w-5 h-5" />}
                        color="blue"
                    />
                    <StatsCard
                        title="Pending"
                        value={allRequests.filter(r => r.status === 'SUBMITTED').length}
                        icon={<Clock className="w-5 h-5" />}
                        color="amber"
                    />
                    <StatsCard
                        title="Processing"
                        value={allRequests.filter(r => ['PROCESSING', 'TEACHER_REVIEW'].includes(r.status)).length}
                        icon={<Loader2 className="w-5 h-5" />}
                        color="purple"
                    />
                    <StatsCard
                        title="Completed"
                        value={allRequests.filter(r => r.status === 'PUBLISHED').length}
                        icon={<CheckCircle className="w-5 h-5" />}
                        color="green"
                    />
                </div>

                {/* --- TABS --- */}
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 flex flex-wrap gap-2 shadow-sm dark:shadow-none">
                    {['All', 'Pending', 'Processing', 'Completed', 'My Subjects', 'Answer Keys'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* --- CONTENT AREA --- */}
                {activeTab === 'Answer Keys' ? (
                    <div className="space-y-6 animate-fade-in">
                        {/* Upload Card */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-none">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <Upload className="w-5 h-5 text-blue-500 dark:text-blue-400" /> Upload New Answer Key
                            </h2>
                            <form onSubmit={handleFileUpload} className="grid md:grid-cols-2 gap-6 items-end">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Subject Code</label>
                                    <input
                                        value={uploadSubject}
                                        onChange={(e) => setUploadSubject(e.target.value)}
                                        placeholder="e.g. CS101"
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-blue-500 outline-none transition-colors"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Answer Key PDF</label>
                                    <div className="flex gap-4">
                                        <label className="flex-1 cursor-pointer bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            {uploadFile ? uploadFile.name : 'Choose File'}
                                            <input type="file" accept=".pdf" className="hidden" onChange={(e) => setUploadFile(e.target.files[0])} />
                                        </label>
                                        <button
                                            type="submit"
                                            disabled={uploading}
                                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                        >
                                            {uploading ? 'Uploading...' : <><Upload className="w-4 h-4" /> Upload</>}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* List of Keys */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                                <h3 className="font-bold text-slate-900 dark:text-white">Uploaded Keys</h3>
                            </div>
                            {answerKeys.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 italic">No answer keys uploaded yet.</div>
                            ) : (
                                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {answerKeys.map((key) => (
                                        <div key={key.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 bg-red-500/10 rounded-lg text-red-500 dark:text-red-400"><FileText className="w-5 h-5" /></div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">{key.subject_code} Answer Key</p>
                                                    <p className="text-xs text-slate-500">Uploaded on {new Date(key.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {key.status === 'completed' ? (
                                                    <span className="px-2 py-1 rounded text-xs font-bold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" /> Ready
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                                        <Bot className="w-3 h-3" /> Processing
                                                    </span>
                                                )}

                                                {key.status === 'completed' && (
                                                    <button
                                                        onClick={() => handleViewFile(key.id)}
                                                        className="p-2 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                        title="View PDF"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleDeleteKey(key.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete Key"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* --- MY SUBJECTS STATS --- */}
                        {activeTab === 'My Subjects' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in">
                                {/* Card 1: Total Requests */}
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-slate-200 dark:border-gray-700 shadow-lg flex items-center">
                                    <div className="p-3 bg-blue-500/20 rounded-lg mr-4">
                                        <FileText className="w-8 h-8 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-slate-500 dark:text-gray-400 text-sm font-medium">My Subject Requests</h3>
                                        <p className="text-3xl font-bold text-slate-900 dark:text-white">{myStats.total}</p>
                                    </div>
                                </div>

                                {/* Card 2: Completed Grading */}
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-slate-200 dark:border-gray-700 shadow-lg flex items-center">
                                    <div className="p-3 bg-green-500/20 rounded-lg mr-4">
                                        <CheckCircle className="w-8 h-8 text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-slate-500 dark:text-gray-400 text-sm font-medium">Graded & Published</h3>
                                        <p className="text-3xl font-bold text-slate-900 dark:text-white">{myStats.completed}</p>
                                    </div>
                                </div>

                                {/* Card 3: Answer Keys */}
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-slate-200 dark:border-gray-700 shadow-lg flex items-center">
                                    <div className="p-3 bg-purple-500/20 rounded-lg mr-4">
                                        <Key className="w-8 h-8 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-slate-500 dark:text-gray-400 text-sm font-medium">Answer Keys Uploaded</h3>
                                        <p className="text-3xl font-bold text-slate-900 dark:text-white">{myStats.answerKeys}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 mb-4 shadow-sm dark:shadow-none">
                            <RevaluationRequestFilters
                                role="teacher"
                                showDateRange
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                                selectedDepartment={selectedDepartment}
                                onDepartmentChange={setSelectedDepartment}
                                selectedPayment={selectedPayment}
                                onPaymentChange={setSelectedPayment}
                                selectedStatus={selectedStatus}
                                onStatusChange={setSelectedStatus}
                                selectedSubject={selectedSubject}
                                onSubjectChange={setSelectedSubject}
                                subjectOptions={subjectOptions}
                                dateFrom={dateFrom}
                                onDateFromChange={setDateFrom}
                                dateTo={dateTo}
                                onDateToChange={setDateTo}
                                onClear={hasActiveFilters ? clearFilters : undefined}
                                resultLabel={resultLabel}
                                page={pagination.page}
                                totalPages={pagination.totalPages}
                                onPageChange={setPage}
                            />
                        </div>

                        {/* --- REQUESTS TABLE --- */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl animate-fade-in overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">
                                    <tr>
                                        <th className="p-5">Request ID</th>
                                        <th className="p-5">Student</th>
                                        <th className="p-5">Details</th>
                                        <th className="p-5">Payment</th>
                                        <th className="p-5">AI Grading</th>
                                        <th className="p-5">Status</th>
                                        <th className="p-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                                    {isLoading ? (
                                        <tr><td colSpan="7" className="p-12 text-center text-slate-500">Loading requests...</td></tr>
                                    ) : filteredRequests.length === 0 ? (
                                        <tr><td colSpan="7" className="p-12 text-center text-slate-500">No requests found.</td></tr>
                                    ) : (
                                        filteredRequests.map((req) => (
                                            <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                                <td className="p-5 font-mono text-slate-500">
                                                    <HighlightText
                                                        text={`#${req.id.toString().slice(0, 4)}`}
                                                        query={searchQuery}
                                                    />
                                                </td>
                                                <td className="p-5">
                                                    <div className="font-bold text-slate-900 dark:text-white">
                                                        <HighlightText
                                                            text={req.users?.full_name || 'Student Name'}
                                                            query={searchQuery}
                                                        />
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        <HighlightText
                                                            text={req.users?.reg_no || 'REG2023'}
                                                            query={searchQuery}
                                                        />
                                                    </div>
                                                    {req.users?.email && (
                                                        <div className="text-xs text-slate-400 mt-0.5">
                                                            <HighlightText text={req.users.email} query={searchQuery} />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-5">
                                                    <div className="text-slate-600 dark:text-slate-300">
                                                        <HighlightText
                                                            text={req.subject_name || 'Subject Name'}
                                                            query={searchQuery}
                                                        />
                                                    </div>
                                                    <div className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded inline-block mt-1">
                                                        <HighlightText text={req.subject_code} query={searchQuery} />
                                                    </div>
                                                </td>
                                                <td className="p-5">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${(req.payment_status || 'Paid').toLowerCase() === 'paid'
                                                        ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
                                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                                        }`}>
                                                        {(req.payment_status || 'Paid').toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-slate-500 dark:text-slate-400 italic">
                                                    {req.ai_feedback ? (
                                                        <button
                                                            onClick={() => openAIEvaluation(req)}
                                                            className="text-violet-400 hover:text-violet-300 font-bold flex items-center gap-1 transition-colors cursor-pointer hover:underline"
                                                            title="View AI Evaluation Report"
                                                        >
                                                            <Bot className="w-3 h-3" /> {req.ai_feedback.score}/100
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-500 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> Pending
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-5"><StatusBadge status={req.status} /></td>
                                                <td className="p-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        {/* Camera Button - Always visible for non-REJECTED */}
                                                        {req.status !== 'REJECTED' && (
                                                            <button
                                                                onClick={() => req.answer_script_urls?.length ? openGradingWorkspace(req) : openUploadModal(req)}
                                                                className="p-2 bg-violet-600/20 hover:bg-violet-600 text-violet-600 hover:text-white rounded-lg transition-all border border-violet-600/30"
                                                                title={req.answer_script_urls?.length ? "Review & Grade" : "Upload Answer Script"}
                                                            >
                                                                <Camera className="w-4 h-4" />
                                                            </button>
                                                        )}

                                                        {/* Approve/Reject only if not terminal state */}
                                                        {req.status !== 'PUBLISHED' && req.status !== 'REJECTED' && (
                                                            <>
                                                                {/* Quick Approve Button - Green */}
                                                                <button
                                                                    onClick={() => handleQuickApprove(req)}
                                                                    className="p-2 bg-green-600/20 hover:bg-green-600 text-green-600 hover:text-white rounded-lg transition-all border border-green-600/30"
                                                                    title="Quick Approve (Publish AI Score)"
                                                                    disabled={!req.ai_feedback}
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                </button>

                                                                {/* Reject Button - Red */}
                                                                <button
                                                                    onClick={() => handleQuickReject(req)}
                                                                    className="p-2 bg-red-600/20 hover:bg-red-600 text-red-600 hover:text-white rounded-lg transition-all border border-red-600/30"
                                                                    title="Reject Request"
                                                                >
                                                                    <XCircle className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                        {/* If REJECTED, show text */}
                                                        {req.status === 'REJECTED' && (
                                                            <span className="px-2 py-1 rounded text-xs font-bold bg-red-500/10 text-red-600 border border-red-500/20">Rejected</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Upload Modal */}
            <AnimatePresence>
                {isUploadModalOpen && selectedRequest && (
                    <UploadModal
                        request={selectedRequest}
                        onClose={() => setUploadModalOpen(false)}
                        onComplete={handleUploadComplete}
                    />
                )}
            </AnimatePresence>

            {/* AI Evaluation Modal */}
            <AnimatePresence>
                {isAIModalOpen && selectedRequest && (
                    <AIEvaluationModal
                        isOpen={isAIModalOpen}
                        onClose={() => setAIModalOpen(false)}
                        request={selectedRequest}
                        isTeacher={true}
                    />
                )}
            </AnimatePresence>

            {/* Grading Modal */}
            <AnimatePresence>
                {isGradeModalOpen && selectedRequest && (
                    <GradingWorkspace
                        request={selectedRequest}
                        onClose={() => setGradeModalOpen(false)}
                        onPublish={handlePublish}
                        onAIUpdate={(requestId, grading) => {
                            setRequests(prev => prev.map(r =>
                                r.id === requestId ? { ...r, ai_feedback: grading } : r
                            ));
                        }}
                        getAuthHeader={getAuthHeader}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Sub-Components ---

const GradingWorkspace = ({ request, onClose, onPublish, onAIUpdate, getAuthHeader }) => {
    const aiData = request.ai_feedback || { score: 0, feedback: "No AI analysis yet.", gap_analysis: {} };
    const [feedback, setFeedback] = useState(request.teacher_notes || aiData.feedback || "");
    const [score, setScore] = useState(request.new_marks || aiData.score || 0);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);

    const answerScripts = request.answer_script_urls || [];
    const hasScripts = answerScripts.length > 0;

    const handleRegenerateAI = async () => {
        setIsRegenerating(true);
        try {
            const headers = await getAuthHeader();
            const response = await api.post('/teacher/grade', {
                requestId: request.id
            }, { headers });

            const grading = response.data.result;
            setScore(grading.score || 0);
            setFeedback(grading.feedback || '');
            toast.success("AI Grading Complete!");

            // Update request in parent state with full AI feedback data
            if (onAIUpdate) {
                onAIUpdate(request.id, grading);
            }

            // Also update local request object to refresh the UI
            request.ai_feedback = grading;
        } catch (err) {
            console.error('AI Grading failed:', err);
            const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'AI grading failed';
            toast.error(errorMsg);
        } finally {
            setIsRegenerating(false);
        }
    };

    const handlePublishClick = async () => {
        setIsPublishing(true);
        try {
            // Call the parent's handler and wait for it
            await onPublish({ score, feedback });
        } catch (err) {
            console.error('Publish error:', err);
            toast.error('Failed to publish result');
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-950 border border-slate-800 rounded-3xl w-[95%] lg:w-[90%] h-[85vh] flex flex-col lg:flex-row overflow-hidden shadow-2xl">
                {/* Answer Script Viewer */}
                <div className="w-full lg:w-1/2 h-1/2 lg:h-full bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-slate-400 font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Answer Script Viewer
                        </h3>
                        {hasScripts && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                                    disabled={currentPage === 0}
                                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-4 h-4 rotate-180" />
                                </button>
                                <span className="text-xs font-mono text-slate-500">
                                    {currentPage + 1} / {answerScripts.length}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(Math.min(answerScripts.length - 1, currentPage + 1))}
                                    disabled={currentPage === answerScripts.length - 1}
                                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
                        {hasScripts ? (
                            <img
                                src={`${API_BASE_URL}${answerScripts[currentPage]}`}
                                alt={`Answer Script Page ${currentPage + 1}`}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    console.error('Image load error:', answerScripts[currentPage]);
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23666"%3EImage not found%3C/text%3E%3C/svg%3E';
                                }}
                            />
                        ) : request.ocr_data ? (
                            <div className="w-full h-full overflow-y-auto text-xs text-slate-400 font-mono whitespace-pre-wrap p-8">
                                {request.ocr_data}
                            </div>
                        ) : (
                            <div className="text-center">
                                <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">No Answer Script Uploaded</p>
                                <p className="text-xs text-slate-600 mt-2">Use the Upload button to add answer sheets</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Scorecard */}
                <div className="w-full lg:w-1/2 h-1/2 lg:h-full p-4 lg:p-8 flex flex-col bg-slate-950 relative overflow-y-auto">
                    <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
                    <h2 className="text-2xl font-bold text-white mb-8">Grading Analysis</h2>

                    <div className="flex items-start gap-8 mb-8">
                        <div className="relative w-32 h-32 flex-shrink-0">
                            <svg className="w-full h-full -rotate-90">
                                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-violet-500 transition-all duration-1000 ease-out" strokeDasharray="365" strokeDashoffset={365 - (365 * score) / 100} strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-bold text-white">{score}</span>
                                <span className="text-[10px] uppercase text-slate-500 font-bold">Score</span>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-900/50 p-4 rounded-xl border border-slate-800 overflow-y-auto max-h-32">
                            <h4 className="text-xs font-bold text-green-400 uppercase mb-2">Strong Points</h4>
                            <ul className="space-y-1">
                                {(aiData.gap_analysis?.strong_points || ["Good structure", "Clear handwriting"]).map((p, i) => (
                                    <li key={i} className="text-xs text-slate-400 flex gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> {p}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 flex flex-col mb-6">
                        <label className="text-sm font-bold text-slate-300 mb-2">Professor's Comments</label>
                        <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-300 focus:border-violet-500 outline-none resize-none text-sm leading-relaxed" placeholder="Add your remarks here..." />
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-slate-800">
                        <button onClick={handleRegenerateAI} disabled={isRegenerating} className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-800">
                            {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Regenerate AI
                        </button>
                        <button onClick={handlePublishClick} disabled={isPublishing} className="flex-[2] py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">
                            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Publish Result
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const styles = {
        SUBMITTED: 'text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-500/10',
        PROCESSING: 'text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/10',
        TEACHER_REVIEW: 'text-indigo-600 dark:text-indigo-400 border-indigo-500/20 bg-indigo-500/10',
        PUBLISHED: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
    };
    const label = STATUS_LABELS[status] || status;
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.SUBMITTED}`}>
            {label}
        </span>
    );
};

const StatsCard = ({ title, value, icon, color }) => {
    const colors = {
        blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        green: 'bg-green-500/10 text-green-500 border-green-500/20',
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-lg border ${colors[color]}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;