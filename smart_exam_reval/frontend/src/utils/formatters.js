/**
 * Truncates a long tracking ID with ellipsis in the middle
 * e.g., "REV-550E8400-ABC12345" → "REV-55...2345"
 * @param {string} id - The full tracking ID
 * @param {number} maxLength - Max visible chars (default 10)
 * @returns {string} Truncated ID with middle ellipsis
 */
export const formatTrackingId = (id, maxLength = 10) => {
    if (!id) return '';
    const str = String(id);
    if (str.length <= maxLength) return str;

    const start = Math.ceil(maxLength / 2);
    const end = Math.floor(maxLength / 2);
    return `${str.slice(0, start)}...${str.slice(-end)}`;
};