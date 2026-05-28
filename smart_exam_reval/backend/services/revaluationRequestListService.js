const pool = require("../config/db");
const {
    parseRevaluationFilters,
    buildRevaluationFilterSql,
    buildPaginationSql,
} = require("../utils/revaluationRequestFilters");

const SELECT_FIELDS = `
    r.id AS request_id,
    u.full_name AS student_name,
    u.email AS student_email,
    u.reg_no,
    u.department AS student_department,
    COALESCE(m.subject_name, 'Unknown Subject') AS subject_name,
    COALESCE(m.subject_code, 'N/A') AS subject_code,
    m.score AS original_score,
    r.status,
    r.payment_status,
    r.amount_paid,
    r.ai_feedback,
    r.ocr_data,
    r.created_at,
    r.updated_at,
    r.teacher_id
`;

const FROM_JOIN = `
    FROM revaluation_requests r
    LEFT JOIN users u ON r.student_id = u.id
    LEFT JOIN marks m ON r.subject_id = m.id
`;

function buildTeacherScopeSql(startParamIndex, userId, specialization) {
    const sql = `
        UPPER(r.status::text) NOT IN ('DRAFT')
        AND (
          (
            r.teacher_id = $${startParamIndex}
            AND (
              $${startParamIndex + 1}::text IS NULL
              OR TRIM($${startParamIndex + 1}) = ''
              OR UPPER(COALESCE(m.subject_code, '')) LIKE '%' || UPPER(TRIM($${startParamIndex + 1})) || '%'
              OR UPPER(COALESCE(m.subject_name, '')) LIKE '%' || UPPER(TRIM($${startParamIndex + 1})) || '%'
            )
          )
          OR (
            r.teacher_id IS NULL
            AND $${startParamIndex + 1}::text IS NOT NULL
            AND TRIM($${startParamIndex + 1}) != ''
            AND (
              UPPER(COALESCE(m.subject_code, '')) LIKE '%' || UPPER(TRIM($${startParamIndex + 1})) || '%'
              OR UPPER(COALESCE(m.subject_name, '')) LIKE '%' || UPPER(TRIM($${startParamIndex + 1})) || '%'
            )
          )
        )`;
    return {
        sqlFragment: sql,
        values: [userId, specialization || null],
        nextParamIndex: startParamIndex + 2,
    };
}

function buildAdminScopeSql() {
    return {
        sqlFragment: `UPPER(r.status::text) NOT IN ('DRAFT')`,
        values: [],
        nextParamIndex: 1,
    };
}

async function runListQuery(scope, scopeParams, query, options = {}) {
    const filters = parseRevaluationFilters(query);
    if (options.forceIlike && filters.search) {
        filters.searchMode = "ilike";
    }

    let paramIndex = 1;
    const values = [];

    const scopePart =
        scope === "teacher"
            ? buildTeacherScopeSql(paramIndex, scopeParams.userId, scopeParams.specialization)
            : buildAdminScopeSql();

    values.push(...scopePart.values);
    paramIndex = scopePart.nextParamIndex;

    const filterPart = buildRevaluationFilterSql(filters, paramIndex);
    values.push(...filterPart.values);
    paramIndex = filterPart.nextParamIndex;

    const whereClause = `WHERE ${scopePart.sqlFragment}${filterPart.sqlFragment}`;

    try {
        const countResult = await pool.query(
            `SELECT COUNT(*)::int AS total ${FROM_JOIN} ${whereClause}`,
            values
        );
        const total = countResult.rows[0]?.total ?? 0;

        const paginationPart = buildPaginationSql(filters, paramIndex);
        const dataValues = [...values, ...paginationPart.values];

        const dataResult = await pool.query(
            `SELECT ${SELECT_FIELDS} ${FROM_JOIN} ${whereClause}
             ORDER BY r.created_at DESC${paginationPart.sqlFragment}`,
            dataValues
        );

        const totalPages = Math.max(1, Math.ceil(total / filters.limit));

        return {
            revaluation_requests: dataResult.rows,
            pagination: {
                page: filters.page,
                limit: filters.limit,
                total,
                totalPages,
            },
            filters_applied: {
                search: filters.search || null,
                searchMode: filters.search ? filters.searchMode : null,
                department: filters.department || null,
                payment: filters.payment || null,
            status: filters.status || null,
            subject: filters.subject || null,
            dateFrom: filters.dateFrom || null,
                dateTo: filters.dateTo || null,
            },
        };
    } catch (err) {
        if (!options.forceIlike && filters.search && filters.searchMode === "fts") {
            console.warn("[revaluation list] FTS failed, falling back to ILIKE:", err.message);
            return runListQuery(scope, scopeParams, query, { forceIlike: true });
        }
        throw err;
    }
}

async function getTeacherDashboardList(userId, query) {
    const teacherResult = await pool.query(
        `SELECT id, full_name, department, subject_specialization
         FROM users WHERE id = $1 AND role = 'teacher'`,
        [userId]
    );
    const teacher = teacherResult.rows[0];
    if (!teacher) {
        return { error: { status: 404, message: "Teacher profile not found" } };
    }

    const trimmedSpec = teacher.subject_specialization
        ? teacher.subject_specialization.trim()
        : "";

    const list = await runListQuery("teacher", { userId, specialization: trimmedSpec }, query);

    return {
        teacher_info: {
            ...teacher,
            specialization: teacher.subject_specialization,
        },
        ...list,
    };
}

async function getAdminRevaluationList(query) {
    return runListQuery("admin", {}, query);
}

async function searchByRole(user, query) {
    const role = String(user?.role || "").toLowerCase();

    if (role === "admin") {
        return { scope: "admin", ...(await getAdminRevaluationList(query)) };
    }
    if (role === "teacher") {
        const data = await getTeacherDashboardList(user.id, query);
        if (data.error) return data;
        return { scope: "teacher", ...data };
    }
    return {
        error: {
            status: 403,
            message: "Only teachers and admins can search revaluation requests.",
        },
    };
}

module.exports = {
    getTeacherDashboardList,
    getAdminRevaluationList,
    searchByRole,
};
