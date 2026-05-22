import React from 'react';

const EmptyState = ({
    icon: Icon,
    title,
    message,
    actionLabel,
    onAction,
    className = '',
}) => (
    <div className={`flex flex-col items-center justify-center px-6 py-10 text-center ${className}`}>
        {Icon && (
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <Icon className="h-6 w-6" />
            </div>
        )}
        <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{message}</p>
        {actionLabel && onAction && (
            <button
                type="button"
                onClick={onAction}
                className="mt-5 inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-500"
            >
                {actionLabel}
            </button>
        )}
    </div>
);

export default EmptyState;
