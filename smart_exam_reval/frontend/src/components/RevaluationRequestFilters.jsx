import React, { useEffect, useState } from 'react';
import { Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    DEPARTMENT_FILTER_OPTIONS,
    PAYMENT_FILTER_OPTIONS,
    STATUS_FILTER_OPTIONS,
    SAVED_FILTER_STORAGE_KEYS,
} from '../constants/revaluationFilters';

const FILTER_TRACK =
    'inline-flex flex-wrap gap-1 p-1 rounded-full bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800';
const FILTER_PILL_BASE =
    'inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200';
const FILTER_PILL_ACTIVE = 'bg-indigo-600 text-white shadow-sm';
const FILTER_PILL_INACTIVE =
    'text-slate-600 dark:text-slate-400 border border-transparent hover:bg-white dark:hover:bg-slate-800/90 hover:border-slate-200/80 dark:hover:border-slate-700/80 hover:text-slate-900 dark:hover:text-slate-100';

const FilterButtonRow = ({ label, options, value, onChange }) => {
    const normalized = options.map((option) =>
        typeof option === 'string' ? { value: option, label: option } : option
    );

    return (
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 w-28 shrink-0 sm:pt-1.5">
                {label}
            </span>
            <div className={`${FILTER_TRACK} flex-1 min-w-0`}>
                {normalized.map(({ value: optionValue, label: optionLabel }) => (
                    <button
                        key={optionValue}
                        type="button"
                        onClick={() => onChange(optionValue)}
                        className={`${FILTER_PILL_BASE} ${
                            value === optionValue ? FILTER_PILL_ACTIVE : FILTER_PILL_INACTIVE
                        }`}
                    >
                        {optionLabel}
                    </button>
                ))}
            </div>
        </div>
    );
};

const emptySnapshot = () => ({
    search: '',
    department: 'All',
    payment: 'All',
    status: 'All',
    subject: 'All',
    dateFrom: '',
    dateTo: '',
});

const SUBJECT_PILL_MAX = 8;

/**
 * Shared search + filter bar for teacher and admin revaluation tables.
 */
const RevaluationRequestFilters = ({
    role = 'teacher',
    showDateRange = false,
    searchQuery,
    onSearchChange,
    selectedDepartment,
    onDepartmentChange,
    selectedPayment,
    onPaymentChange,
    selectedStatus,
    onStatusChange,
    selectedSubject = 'All',
    onSubjectChange,
    subjectOptions = [{ value: 'All', label: 'All subjects' }],
    dateFrom = '',
    onDateFromChange,
    dateTo = '',
    onDateToChange,
    onClear,
    resultLabel,
    page = 1,
    totalPages = 1,
    onPageChange,
}) => {
    const storageKey = SAVED_FILTER_STORAGE_KEYS[role] || SAVED_FILTER_STORAGE_KEYS.teacher;
    const [savedFilters, setSavedFilters] = useState([]);
    const [presetName, setPresetName] = useState('');

    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) setSavedFilters(JSON.parse(raw));
        } catch {
            setSavedFilters([]);
        }
    }, [storageKey]);

    const persistSaved = (list) => {
        setSavedFilters(list);
        localStorage.setItem(storageKey, JSON.stringify(list));
    };

    const handleSavePreset = () => {
        const name = presetName.trim();
        if (!name) return;
        const snapshot = {
            name,
            ...emptySnapshot(),
            search: searchQuery,
            department: selectedDepartment,
            payment: selectedPayment,
            status: selectedStatus,
            subject: selectedSubject,
            dateFrom: showDateRange ? dateFrom : '',
            dateTo: showDateRange ? dateTo : '',
        };
        const next = [...savedFilters.filter((p) => p.name !== name), snapshot];
        persistSaved(next);
        setPresetName('');
    };

    const applyPreset = (preset) => {
        onSearchChange(preset.search || '');
        onDepartmentChange(preset.department || 'All');
        onPaymentChange(preset.payment || 'All');
        onStatusChange(preset.status || 'All');
        onSubjectChange?.(preset.subject || 'All');
        if (showDateRange) {
            onDateFromChange?.(preset.dateFrom || '');
            onDateToChange?.(preset.dateTo || '');
        }
        onPageChange?.(1);
    };

    const deletePreset = (name) => {
        persistSaved(savedFilters.filter((p) => p.name !== name));
    };

    const hasPagination = totalPages > 1;

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <input
                    type="text"
                    placeholder="Search student, reg no, subject, email..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition-all duration-200 focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/30 dark:focus:border-violet-500/40"
                />
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">{resultLabel}</p>
                    {onClear && (
                        <button
                            type="button"
                            onClick={onClear}
                            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors duration-200"
                        >
                            Clear filters
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-5">
                <FilterButtonRow
                    label="Department"
                    options={DEPARTMENT_FILTER_OPTIONS}
                    value={selectedDepartment}
                    onChange={onDepartmentChange}
                />
                <FilterButtonRow
                    label="Payment"
                    options={PAYMENT_FILTER_OPTIONS}
                    value={selectedPayment}
                    onChange={onPaymentChange}
                />
                <FilterButtonRow
                    label="Status"
                    options={STATUS_FILTER_OPTIONS}
                    value={selectedStatus}
                    onChange={onStatusChange}
                />
                {subjectOptions.length > 0 && onSubjectChange && (
                    subjectOptions.length <= SUBJECT_PILL_MAX ? (
                        <FilterButtonRow
                            label="Subject"
                            options={subjectOptions}
                            value={selectedSubject}
                            onChange={onSubjectChange}
                        />
                    ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 w-28 shrink-0">
                                Subject
                            </span>
                            <select
                                value={selectedSubject}
                                onChange={(e) => onSubjectChange(e.target.value)}
                                className="flex-1 max-w-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500/40 outline-none"
                                aria-label="Filter by subject"
                            >
                                {subjectOptions.map(({ value, label }) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )
                )}
                {showDateRange && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 w-28 shrink-0">
                            Date range
                        </span>
                        <div className="flex flex-wrap gap-3 flex-1">
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => onDateFromChange?.(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500/40 outline-none"
                                aria-label="From date"
                            />
                            <span className="text-slate-400 self-center text-sm">to</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => onDateToChange?.(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500/40 outline-none"
                                aria-label="To date"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex-1 flex flex-wrap gap-2 items-center">
                    <Bookmark className="h-4 w-4 text-slate-400 shrink-0" />
                    <input
                        type="text"
                        placeholder="Preset name"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        className="flex-1 min-w-[120px] max-w-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm"
                    />
                    <button
                        type="button"
                        onClick={handleSavePreset}
                        className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        Save preset
                    </button>
                </div>
                {savedFilters.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {savedFilters.map((preset) => (
                            <span
                                key={preset.name}
                                className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs"
                            >
                                <button
                                    type="button"
                                    onClick={() => applyPreset(preset)}
                                    className="font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600"
                                >
                                    {preset.name}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => deletePreset(preset.name)}
                                    className="text-slate-400 hover:text-red-500"
                                    aria-label={`Remove ${preset.name}`}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {hasPagination && onPageChange && (
                <div className="flex items-center justify-between gap-4 pt-2">
                    <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => onPageChange(page - 1)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </button>
                    <span className="text-sm text-slate-500 tabular-nums">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        type="button"
                        disabled={page >= totalPages}
                        onClick={() => onPageChange(page + 1)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default RevaluationRequestFilters;
