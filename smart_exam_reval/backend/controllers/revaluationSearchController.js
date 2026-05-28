const {
    searchByRole,
} = require('../services/revaluationRequestListService');

// @desc    Dedicated revaluation search (teacher or admin scope)
// @route   GET /api/revaluation-requests/search
// @query   search, department, payment, status, subject, dateFrom, dateTo, page, limit, searchMode
exports.searchRevaluationRequests = async (req, res) => {
    try {
        if (Object.prototype.hasOwnProperty.call(req.query, "role")) {
            return res.status(400).json({
                message: "Role must not be passed as a query parameter.",
            });
        }

        const result = await searchByRole(req.user, req.query);
        if (result.error) {
            return res.status(result.error.status).json({ message: result.error.message });
        }
        res.json(result);
    } catch (err) {
        console.error('Error in searchRevaluationRequests:', err);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
};
