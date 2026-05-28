/**
 * Shared parameterized SQL filters for revaluation request list endpoints.
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseRevaluationFilters(query = {}) {
    const safeString = (value) => (typeof value === "string" ? value.trim() : "");

    const search = safeString(query.search);
    const department = safeString(query.department);
    const payment = safeString(query.payment);
    const status = safeString(query.status);
    const subject = safeString(query.subject);
    const dateFrom = safeString(query.dateFrom);
    const dateTo = safeString(query.dateTo);

    const isAll = (value) => !value || value.toLowerCase() === "all";

    const page = Math.max(1, parseInt(query.page, 10) || DEFAULT_PAGE);
    let limit = parseInt(query.limit, 10) || DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;
    if (limit < 1) limit = DEFAULT_LIMIT;

    const searchMode =
        query.searchMode === "ilike" ? "ilike" : search ? "fts" : "none";

    return {
        search,
        department: isAll(department) ? "" : department,
        payment: isAll(payment) ? "" : payment,
        status: isAll(status) ? "" : status,
        subject: isAll(subject) ? "" : subject,
        dateFrom,
        dateTo,
        page,
        limit,
        offset: (page - 1) * limit,
        searchMode,
    };
}

/**
 * Document vector used for PostgreSQL full-text search (simple = no aggressive stemming).
 */
const FTS_DOCUMENT = `
    setweight(to_tsvector('simple', coalesce(u.full_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(u.email, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(u.reg_no, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(CAST(r.id AS TEXT), '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(m.subject_name, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(m.subject_code, '')), 'C')
`;

function buildRevaluationFilterSql(filters, startParamIndex) {
    const conditions = [];
    const values = [];
    let paramIndex = startParamIndex;

    if (filters.search) {
        if (filters.searchMode === "fts") {
            conditions.push(`(${FTS_DOCUMENT}) @@ plainto_tsquery('simple', $${paramIndex})`);
            values.push(filters.search);
            paramIndex += 1;
        } else {
            conditions.push(`(
                u.full_name ILIKE $${paramIndex}
                OR u.email ILIKE $${paramIndex}
                OR u.reg_no ILIKE $${paramIndex}
                OR CAST(r.id AS TEXT) ILIKE $${paramIndex}
                OR COALESCE(m.subject_name, '') ILIKE $${paramIndex}
                OR COALESCE(m.subject_code, '') ILIKE $${paramIndex}
            )`);
            values.push(`%${filters.search}%`);
            paramIndex += 1;
        }
    }

    if (filters.department) {
        conditions.push(`u.department = $${paramIndex}`);
        values.push(filters.department);
        paramIndex += 1;
    }

    if (filters.payment) {
        conditions.push(`LOWER(TRIM(r.payment_status::text)) = LOWER($${paramIndex})`);
        values.push(filters.payment);
        paramIndex += 1;
    }

    if (filters.status) {
        conditions.push(`UPPER(TRIM(r.status::text)) = UPPER($${paramIndex})`);
        values.push(filters.status);
        paramIndex += 1;
    }

    if (filters.subject) {
        conditions.push(`(
            UPPER(COALESCE(m.subject_code, '')) = UPPER($${paramIndex})
            OR COALESCE(m.subject_code, '') ILIKE $${paramIndex + 1}
            OR COALESCE(m.subject_name, '') ILIKE $${paramIndex + 1}
        )`);
        values.push(filters.subject, `%${filters.subject}%`);
        paramIndex += 2;
    }

    if (filters.dateFrom) {
        conditions.push(`r.created_at >= $${paramIndex}::date`);
        values.push(filters.dateFrom);
        paramIndex += 1;
    }

    if (filters.dateTo) {
        conditions.push(`r.created_at < ($${paramIndex}::date + INTERVAL '1 day')`);
        values.push(filters.dateTo);
        paramIndex += 1;
    }

    return {
        sqlFragment: conditions.length ? ` AND ${conditions.join(" AND ")}` : "",
        values,
        nextParamIndex: paramIndex,
    };
}

function buildPaginationSql(filters, startParamIndex) {
    return {
        sqlFragment: ` LIMIT $${startParamIndex} OFFSET $${startParamIndex + 1}`,
        values: [filters.limit, filters.offset],
        nextParamIndex: startParamIndex + 2,
    };
}

module.exports = {
    parseRevaluationFilters,
    buildRevaluationFilterSql,
    buildPaginationSql,
    DEFAULT_LIMIT,
    parseDashboardFilters: parseRevaluationFilters,
    buildDashboardFilterSql: buildRevaluationFilterSql,
};
