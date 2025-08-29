const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');

// Get available companies
router.get('/companies', predictionController.getAvailableCompanies);

// Analyze predictions for selected companies
router.post('/analyze', predictionController.analyzePredictions);

// Export predictions to CSV
router.post('/export-csv', predictionController.exportToCSV);

module.exports = router;