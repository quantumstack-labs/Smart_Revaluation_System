/** Shared department codes for revaluation + faculty admin filters */
export const DEPARTMENT_CODES = ['All', 'CS', 'IT', 'ECE', 'CSE'];

export const DEPARTMENT_FILTER_OPTIONS = DEPARTMENT_CODES.map((value) => ({
    value,
    label: value,
}));

export const PAYMENT_FILTER_OPTIONS = ['All', 'Paid', 'Pending'].map((value) => ({
    value,
    label: value,
}));

export const STATUS_LABELS = {
    SUBMITTED: 'Submitted',
    PROCESSING: 'Processing',
    PUBLISHED: 'Published',
    TEACHER_REVIEW: 'Teacher Review',
};

export const STATUS_FILTER_OPTIONS = [
    { value: 'All', label: 'All' },
    { value: 'SUBMITTED', label: STATUS_LABELS.SUBMITTED },
    { value: 'PROCESSING', label: STATUS_LABELS.PROCESSING },
    { value: 'PUBLISHED', label: STATUS_LABELS.PUBLISHED },
    { value: 'TEACHER_REVIEW', label: STATUS_LABELS.TEACHER_REVIEW },
];

export const DEFAULT_PAGE_SIZE = 20;

export const SAVED_FILTER_STORAGE_KEYS = {
    teacher: 'reval_saved_filters_teacher',
    admin: 'reval_saved_filters_admin',
};

/** Build query params for revaluation list APIs from dashboard filter state */
export function buildFilterParamsFromState(state) {
    const params = {};
    const q = (state.search || '').trim();
    if (q) params.search = q;
    if (state.department && state.department !== 'All') params.department = state.department;
    if (state.payment && state.payment !== 'All') params.payment = state.payment;
    if (state.status && state.status !== 'All') params.status = state.status;
    if (state.subject && state.subject !== 'All') params.subject = state.subject;
    if (state.dateFrom) params.dateFrom = state.dateFrom;
    if (state.dateTo) params.dateTo = state.dateTo;
    if (state.page && state.page > 1) params.page = state.page;
    if (state.limit) params.limit = state.limit;
    return params;
}

/** Build subject dropdown/pill options from request rows */
export function buildSubjectOptionsFromRows(rows = []) {
    const map = new Map();
    rows.forEach((r) => {
        const code = (r.subject_code || '').trim();
        if (!code || code === 'N/A') return;
        const name = (r.subject_name || '').trim();
        const label = name && name !== 'Unknown Subject' ? `${code} — ${name}` : code;
        map.set(code, label);
    });
    return [
        { value: 'All', label: 'All subjects' },
        ...[...map.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([value, label]) => ({
                value,
                label: label.length > 48 ? value : label,
            })),
    ];
}
