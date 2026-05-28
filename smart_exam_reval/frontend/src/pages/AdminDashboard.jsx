import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../supabase';
import api from '../api/axios';
import { mapRevaluationRequests } from '../utils/mapRevaluationRequests';
import RevaluationRequestFilters from '../components/RevaluationRequestFilters';
import HighlightText from '../components/HighlightText';
import RequestStatusBadge from '../components/RequestStatusBadge';
import {
    DEPARTMENT_CODES,
    DEFAULT_PAGE_SIZE,
    buildSubjectOptionsFromRows,
    buildFilterParamsFromState,
} from '../constants/revaluationFilters';
import {
    BookOpen, Plus, Trash2, Search, Shield, Building, Upload, FileText,
    LayoutDashboard, Users, X, Clock,
} from 'lucide-react';

import toast from 'react-hot-toast';

const AdminDashboard = () => {
    const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' or 'faculty'
    const [subView, setSubView] = useState('faculty'); // 'faculty' or 'subjects'
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const fileInputRef = useRef(null);  
    const [selectedFile, setSelectedFile] = useState(null);

    // Data States
    const [faculty, setFaculty] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [facultySearchQuery, setFacultySearchQuery] = useState('');
    const [facultyDepartmentFilter, setFacultyDepartmentFilter] = useState('All');

    // Revaluation request list (admin dashboard)
    const [allRequests, setAllRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [requestSearchQuery, setRequestSearchQuery] = useState('');
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
    const [bulkUploading, setBulkUploading] = useState(false);

    // Form States
    const [newFaculty, setNewFaculty] = useState({ email: '', full_name: '', department: 'CS', password: '' });
    const [newSubject, setNewSubject] = useState({ code: '', name: '', department: 'CS' });

    useEffect(() => {
        if (activeView === 'faculty') {
            fetchData();
        }
    }, [activeView, subView]);

    useEffect(() => {
        if (activeView !== 'dashboard') return;

        const delay = requestSearchQuery.trim() ? 300 : 0;
        const timer = setTimeout(() => fetchRevaluationRequests(), delay);
        return () => clearTimeout(timer);
    }, [activeView, requestSearchQuery, selectedDepartment, selectedPayment, selectedStatus, selectedSubject, dateFrom, dateTo, page]);

    useEffect(() => {
        setPage(1);
    }, [requestSearchQuery, selectedDepartment, selectedPayment, selectedStatus, selectedSubject, dateFrom, dateTo]);

    const subjectOptions = useMemo(
        () => buildSubjectOptionsFromRows(allRequests),
        [allRequests]
    );

    const filterState = useMemo(
        () => ({
            search: requestSearchQuery,
            department: selectedDepartment,
            payment: selectedPayment,
            status: selectedStatus,
            subject: selectedSubject,
            dateFrom,
            dateTo,
            page,
            limit: DEFAULT_PAGE_SIZE,
        }),
        [
            requestSearchQuery,
            selectedDepartment,
            selectedPayment,
            selectedStatus,
            selectedSubject,
            dateFrom,
            dateTo,
            page,
        ]
    );

    const buildRevaluationApiParams = () => buildFilterParamsFromState(filterState);

    const fetchRevaluationRequests = async () => {
        setRequestsLoading(true);
        try {
            const response = await api.get('/api/admin/revaluation-requests', {
                params: buildRevaluationApiParams(),
            });
            const raw = response.data?.revaluation_requests ?? [];
            setAllRequests(mapRevaluationRequests(raw));
            setPagination(
                response.data?.pagination ?? {
                    page: 1,
                    limit: DEFAULT_PAGE_SIZE,
                    total: response.data?.total ?? raw.length,
                    totalPages: 1,
                }
            );
        } catch (err) {
            console.error('Admin requests fetch error:', err);
            toast.error('Failed to load revaluation requests');
        } finally {
            setRequestsLoading(false);
        }
    };

    const handleBulkUpload = async () => {
        if (!selectedFile) {
            toast.error('Choose a CSV or Excel file first');
            return;
        }
        setBulkUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            const response = await api.post('/api/admin/upload-semester-results', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success(response.data?.message || 'Upload received');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            toast.error(err.response?.data?.message || 'Upload failed');
        } finally {
            setBulkUploading(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch actual users with role 'teacher'
            const { data: facultyData, error: facultyError } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'teacher')
                .order('created_at', { ascending: false });
            if (facultyError) throw facultyError;
            setFaculty(facultyData);

            const { data: subjectData, error: subjectError } = await supabase.from('subjects').select('*').order('code', { ascending: true });
            if (subjectError) throw subjectError;
            setSubjects(subjectData);

        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };
 const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) setSelectedFile(file);
    };
    const handleAddFaculty = async (e) => {
        e.preventDefault();
        try {
            // Use centralized api client - token is injected automatically by interceptor
            const response = await api.post('/api/admin/create-teacher', newFaculty);

            toast.success("Faculty account created successfully!");
            setNewFaculty({ email: '', full_name: '', department: 'CS', password: '' });
            setShowModal(false);
            fetchData();
        } catch (error) {
            // Axios puts backend error in error.response.data
            const errMsg = error.response?.data?.error || error.message || "Failed to create teacher";
            console.error("Creation Error:", error);
            toast.error(errMsg);
        }
    };

    const handleAddSubject = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('subjects').insert([{
                code: newSubject.code,
                name: newSubject.name,
                department: newSubject.department
            }]);
            if (error) throw error;
            toast.success("Subject added successfully!");
            setNewSubject({ code: '', name: '', department: 'CS' });
            setShowModal(false);
            fetchData();
        } catch (error) {
            toast.error("Failed to add subject");
        }
    };

    const handleDelete = async (id, table) => {
        if (!confirm("Are you sure? This action is permanent.")) return;
        try {
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) throw error;
            toast.success("Record deleted");
            fetchData();
        } catch (error) {
            toast.error("Delete failed");
        }
    };

    const filteredFaculty = faculty.filter(item => {
        const matchesSearch = item.full_name?.toLowerCase().includes(facultySearchQuery.toLowerCase()) ||
            item.email?.toLowerCase().includes(facultySearchQuery.toLowerCase());
        const matchesDept = facultyDepartmentFilter === 'All' || item.department === facultyDepartmentFilter;
        return matchesSearch && matchesDept;
    });

    const filteredSubjects = subjects.filter(item => {
        const matchesSearch = item.name?.toLowerCase().includes(facultySearchQuery.toLowerCase()) ||
            item.code?.toLowerCase().includes(facultySearchQuery.toLowerCase());
        const matchesDept = facultyDepartmentFilter === 'All' || item.department === facultyDepartmentFilter;
        return matchesSearch && matchesDept;
    });

    const filteredRequests = allRequests;

    const hasActiveRequestFilters =
        requestSearchQuery.trim() !== '' ||
        selectedDepartment !== 'All' ||
        selectedPayment !== 'All' ||
        selectedStatus !== 'All' ||
        selectedSubject !== 'All' ||
        dateFrom !== '' ||
        dateTo !== '';

    const clearRequestFilters = () => {
        setRequestSearchQuery('');
        setSelectedDepartment('All');
        setSelectedPayment('All');
        setSelectedStatus('All');
        setSelectedSubject('All');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    };

    const totalCount = pagination.total ?? filteredRequests.length;
    const requestResultLabel =
        totalCount === 1 ? '1 record found' : `${totalCount} records found`;

    const formatRequestDate = (value) => {
        if (!value) return '—';
        try {
            return new Date(value).toLocaleDateString();
        } catch {
            return '—';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">


            {/* Sub-Navbar for Admin Navigation */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 pt-20 pb-0 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto flex gap-8">
                    <button
                        onClick={() => setActiveView('dashboard')}
                        className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeView === 'dashboard'
                            ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                    >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                    </button>
                    <button
                        onClick={() => setActiveView('faculty')}
                        className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeView === 'faculty'
                            ? 'border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                    >
                        <Users className="h-4 w-4" />
                        Faculty & Subjects
                    </button>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {activeView === 'dashboard' ? (
                    <div className="space-y-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Shield className="h-6 w-6 text-red-600 dark:text-red-500" />
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Portal (COE)</h1>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400">
                                Search and filter revaluation requests across the university. Upload semester results below.
                            </p>
                        </div>

                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm dark:shadow-none">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Revaluation Requests</h2>
                            <RevaluationRequestFilters
                                role="admin"
                                showDateRange
                                searchQuery={requestSearchQuery}
                                onSearchChange={setRequestSearchQuery}
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
                                onClear={hasActiveRequestFilters ? clearRequestFilters : undefined}
                                resultLabel={requestResultLabel}
                                page={pagination.page}
                                totalPages={pagination.totalPages}
                                onPageChange={setPage}
                            />

                            <div className="mt-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-wider">
                                        <tr>
                                            <th className="p-4">Request ID</th>
                                            <th className="p-4">Student</th>
                                            <th className="p-4">Subject</th>
                                            <th className="p-4">Department</th>
                                            <th className="p-4">Payment</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Submitted</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                                        {requestsLoading ? (
                                            <tr>
                                                <td colSpan="7" className="p-12 text-center text-slate-500">
                                                    Loading requests...
                                                </td>
                                            </tr>
                                        ) : filteredRequests.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="p-12 text-center text-slate-500">
                                                    No requests found.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredRequests.map((req) => (
                                                <tr
                                                    key={req.id}
                                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                                                >
                                                    <td className="p-4 font-mono text-slate-500">
                                                        <HighlightText
                                                            text={`#${String(req.id).slice(0, 6)}`}
                                                            query={requestSearchQuery}
                                                        />
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-medium text-slate-900 dark:text-white">
                                                            <HighlightText
                                                                text={req.users?.full_name || req.student_name}
                                                                query={requestSearchQuery}
                                                            />
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            <HighlightText
                                                                text={req.users?.reg_no}
                                                                query={requestSearchQuery}
                                                            />
                                                        </div>
                                                        {req.users?.email && (
                                                            <div className="text-xs text-slate-400 mt-0.5">
                                                                <HighlightText
                                                                    text={req.users.email}
                                                                    query={requestSearchQuery}
                                                                />
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="text-slate-700 dark:text-slate-300">
                                                            <HighlightText
                                                                text={req.subject_name}
                                                                query={requestSearchQuery}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded inline-block mt-1">
                                                            <HighlightText
                                                                text={req.subject_code}
                                                                query={requestSearchQuery}
                                                            />
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-slate-600 dark:text-slate-300">
                                                        {req.users?.department ?? req.student_department ?? '—'}
                                                    </td>
                                                    <td className="p-4">
                                                        <span
                                                            className={`px-2 py-1 rounded-full text-xs font-bold border ${
                                                                (req.payment_status || 'Paid').toLowerCase() === 'paid'
                                                                    ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
                                                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                                            }`}
                                                        >
                                                            {(req.payment_status || 'Paid').toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <RequestStatusBadge status={req.status} />
                                                    </td>
                                                    <td className="p-4 text-slate-500 whitespace-nowrap">
                                                        {formatRequestDate(req.created_at)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Bulk Upload Card */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm dark:shadow-none">
                            <div className="flex items-center gap-3 mb-6">
                                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Bulk Upload Semester Results</h2>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl p-4 mb-6">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    <span className="font-bold text-blue-900 dark:text-blue-400">Instructions:</span> Upload the consolidated result sheet (Excel/CSV). The system will automatically create student accounts if they don't exist and update marks for existing students.
                                </p>
                            </div>

                            <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">Select Result File</div>

                            {/* HIDDEN INPUT FIELD */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".csv, .xlsx, .xls"
                            />

                            {/* CLICKABLE BOX */}
                            <div
                                onClick={() => fileInputRef.current.click()}
                                className="border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded-xl p-8 flex flex-col items-center justify-center gap-4 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors cursor-pointer group"
                            >
                                <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg group-hover:bg-slate-100 dark:group-hover:bg-slate-700 transition-colors shadow-sm dark:shadow-none border border-slate-200 dark:border-transparent">
                                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">Choose File</span>
                                    <span className="text-slate-500 dark:text-slate-400 text-sm">
                                        {selectedFile ? selectedFile.name : "No file chosen"}
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 mb-6">Supported formats: .xlsx, .xls, .csv</p>

                            <button
                                type="button"
                                onClick={handleBulkUpload}
                                disabled={bulkUploading || !selectedFile}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20"
                            >
                                <Upload className="h-5 w-5" />
                                {bulkUploading ? 'Uploading...' : 'Upload & Process Results'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        {/* Faculty & Subjects View */}
                        <div className="mb-8 flex justify-between items-end">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Faculty & Subjects</h1>
                                <p className="text-slate-500 dark:text-slate-400">Manage evaluators and assign subject specializations.</p>
                            </div>
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                                Add New {subView === 'faculty' ? 'Faculty' : 'Subject'}
                            </button>
                        </div>

                        {/* Sub-Tabs */}
                        <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-800">
                            <button
                                onClick={() => setSubView('faculty')}
                                className={`pb-2 text-sm font-medium transition-colors ${subView === 'faculty' ? 'text-slate-900 dark:text-white border-b-2 border-indigo-600 dark:border-indigo-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Faculty List
                            </button>
                            <button
                                onClick={() => setSubView('subjects')}
                                className={`pb-2 text-sm font-medium transition-colors ${subView === 'subjects' ? 'text-slate-900 dark:text-white border-b-2 border-indigo-600 dark:border-indigo-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                Subject List
                            </button>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm dark:shadow-none">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                                <input
                                    type="text"
                                    placeholder={`Search ${subView}...`}
                                    value={facultySearchQuery}
                                    onChange={(e) => setFacultySearchQuery(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                />
                            </div>

                            <div className="flex gap-2 bg-slate-50 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                                {DEPARTMENT_CODES.map(dept => (
                                    <button
                                        key={dept}
                                        onClick={() => setFacultyDepartmentFilter(dept)}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${facultyDepartmentFilter === dept
                                            ? 'bg-indigo-600 text-white shadow-lg'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        {dept}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* List Table */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                                            {subView === 'faculty' ? (
                                                <>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name & Contact</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Department</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subject Specialization</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subject Code</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subject Name</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Department</th>
                                                </>
                                            )}
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {loading ? (
                                            <tr><td colSpan="5" className="text-center py-12 text-slate-500">Loading data...</td></tr>
                                        ) : (subView === 'faculty' ? filteredFaculty : filteredSubjects).length === 0 ? (
                                            <tr><td colSpan="5" className="text-center py-12 text-slate-500">No records found.</td></tr>
                                        ) : (
                                            (subView === 'faculty' ? filteredFaculty : filteredSubjects).map((item, idx) => (
                                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                                    {subView === 'faculty' ? (
                                                        <>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold ${['bg-purple-600', 'bg-blue-600', 'bg-indigo-600', 'bg-pink-600'][idx % 4]
                                                                        }`}>
                                                                        {item.full_name?.charAt(0) || 'U'}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-medium text-slate-900 dark:text-white">{item.full_name}</div>
                                                                        <div className="text-xs text-slate-500">{item.email}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-fit">
                                                                    <Building className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                                                                    <span className="text-sm text-slate-600 dark:text-slate-300">{item.department}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                                                                    {item.department === 'CSE' ? 'Algorithm Design' : 'Unassigned'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                                                                    <span className="text-sm text-slate-600 dark:text-slate-300">Active</span>
                                                                </div>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">{item.code}</td>
                                                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{item.name}</td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-fit">
                                                                    <Building className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                                                                    <span className="text-sm text-slate-600 dark:text-slate-300">{item.department}</span>
                                                                </div>
                                                            </td>
                                                        </>
                                                    )}
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => handleDelete(item.id, subView === 'faculty' ? 'users' : 'subjects')}
                                                            className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                Add New {subView === 'faculty' ? 'Faculty' : 'Subject'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {subView === 'faculty' ? (
                            <form onSubmit={handleAddFaculty} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Full Name</label>
                                    <input
                                        name="full_name"
                                        type="text"
                                        required
                                        value={newFaculty.full_name}
                                        onChange={e => setNewFaculty({ ...newFaculty, full_name: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Dr. John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Email Address</label>
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        value={newFaculty.email}
                                        onChange={e => setNewFaculty({ ...newFaculty, email: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="professor@college.edu"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Department</label>
                                    <input
                                        name="department"
                                        type="text"
                                        required
                                        value={newFaculty.department}
                                        onChange={e => setNewFaculty({ ...newFaculty, department: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Enter Department (e.g., CS)"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Password</label>
                                    <input
                                        name="password"
                                        type="password"
                                        required
                                        minLength={6}
                                        value={newFaculty.password}
                                        onChange={e => setNewFaculty({ ...newFaculty, password: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="******"
                                    />
                                </div>
                                <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors mt-2">
                                    Create Faculty Account
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleAddSubject} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Subject Code</label>
                                    <input
                                        type="text"
                                        required
                                        value={newSubject.code}
                                        onChange={e => setNewSubject({ ...newSubject, code: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="CS101"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Subject Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newSubject.name}
                                        onChange={e => setNewSubject({ ...newSubject, name: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Data Structures"
                                    />
                                </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Department</label>
                                        <input
                                            type="text"
                                            required
                                            value={newSubject.department}
                                            onChange={e => setNewSubject({ ...newSubject, department: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Enter Department (e.g., CS)"
                                        />
                                    </div>
                                <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-colors mt-2">
                                    Add Subject
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
