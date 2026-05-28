import React from 'react';

/**
 * Highlights case-insensitive matches of `query` inside `text`.
 */
const HighlightText = ({ text, query, className = '' }) => {
    const value = text == null ? '' : String(text);
    const q = (query || '').trim();
    if (!q || !value) {
        return <span className={className}>{value || '—'}</span>;
    }

    const lower = value.toLowerCase();
    const needle = q.toLowerCase();
    const parts = [];
    let cursor = 0;
    let index = lower.indexOf(needle, cursor);

    while (index !== -1) {
        if (index > cursor) {
            parts.push({ text: value.slice(cursor, index), match: false });
        }
        parts.push({ text: value.slice(index, index + needle.length), match: true });
        cursor = index + needle.length;
        index = lower.indexOf(needle, cursor);
    }

    if (cursor < value.length) {
        parts.push({ text: value.slice(cursor), match: false });
    }

    if (parts.length === 0) {
        return <span className={className}>{value}</span>;
    }

    return (
        <span className={className}>
            {parts.map((part, i) =>
                part.match ? (
                    <mark
                        key={i}
                        className="bg-violet-200/80 dark:bg-violet-500/35 text-inherit rounded px-0.5"
                    >
                        {part.text}
                    </mark>
                ) : (
                    <span key={i}>{part.text}</span>
                )
            )}
        </span>
    );
};

export default HighlightText;
