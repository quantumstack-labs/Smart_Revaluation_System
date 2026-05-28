const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

// Define Admin Routes
router.post('/create-teacher', protect, adminOnly, adminController.createTeacher);
router.get('/revaluation-requests', protect, adminOnly, adminController.getRevaluationRequests);
router.post(
    '/upload-semester-results',
    protect,
    adminOnly,
    adminController.uploadSemesterResultsMiddleware,
    adminController.uploadSemesterResults
);

module.exports = router;
