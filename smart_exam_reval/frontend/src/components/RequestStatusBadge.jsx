import React from 'react';
import { STATUS_LABELS } from '../constants/revaluationFilters';

const STATUS_STYLES = {
    SUBMITTED: 'text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-500/10',
    PROCESSING: 'text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/10',
    TEACHER_REVIEW: 'text-indigo-600 dark:text-indigo-400 border-indigo-500/20 bg-indigo-500/10',
    PUBLISHED: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
};

const RequestStatusBadge = ({ status }) => {
    const label = STATUS_LABELS[status] || status;
    return (
        <span
            className={`px-2 py-1 rounded-full text-xs font-semibold border ${
                STATUS_STYLES[status] || STATUS_STYLES.SUBMITTED
            }`}
        >
            {label}
        </span>
    );
};

export default RequestStatusBadge;
