/** Map API rows to the shape used by teacher/admin dashboards */
export function mapRevaluationRequests(rawRequests) {
    return rawRequests.map((r) => ({
        ...r,
        id: r.request_id ?? r.id,
        users: {
            full_name: r.student_name,
            reg_no: r.reg_no,
            email: r.student_email ?? r.users?.email,
            department: r.student_department,
        },
        ai_status: r.ai_feedback ? 'Graded' : 'Pending',
    }));
}

export const mapTeacherDashboardRequests = mapRevaluationRequests;
