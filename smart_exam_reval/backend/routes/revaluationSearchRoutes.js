const express = require('express');
const router = express.Router();
const { protect, teacherOrAdmin } = require('../middleware/auth');
const revaluationSearchController = require('../controllers/revaluationSearchController');

router.get(
    '/search',
    protect,
    teacherOrAdmin,
    revaluationSearchController.searchRevaluationRequests
);

module.exports = router;
