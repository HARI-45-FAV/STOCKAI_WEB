const { spawn } = require('child_process');
const path = require('path');

// List of 30 companies for analysis
const AVAILABLE_COMPANIES = [
  'Apple Inc', 'Microsoft Corporation', 'Amazon.com Inc', 'Alphabet Inc', 'Tesla Inc',
  'Meta Platforms Inc', 'NVIDIA Corporation', 'Netflix Inc', 'PayPal Holdings Inc', 'Adobe Inc',
  'Salesforce Inc', 'Intel Corporation', 'Cisco Systems Inc', 'Oracle Corporation', 'IBM',
  'Advanced Micro Devices', 'Zoom Video Communications', 'Twitter Inc', 'Spotify Technology SA',
  'Square Inc', 'Shopify Inc', 'DocuSign Inc', 'Peloton Interactive', 'Roku Inc',
  'CrowdStrike Holdings', 'Snowflake Inc', 'Palantir Technologies', 'Unity Software Inc',
  'Roblox Corporation', 'Coinbase Global Inc'
];

const getAvailableCompanies = async (req, res) => {
  try {
    res.json({
      success: true,
      companies: AVAILABLE_COMPANIES,
      total: AVAILABLE_COMPANIES.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch companies',
      error: error.message
    });
  }
};

const analyzePredictions = async (req, res) => {
  try {
    const { companies, targetDate } = req.body;

    if (!companies || companies.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one company'
      });
    }

    if (companies.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 companies allowed'
      });
    }

    // Call Python prediction script
    const pythonScript = path.join(__dirname, '../python/prediction_service.py');
    const pythonProcess = spawn('python', [pythonScript, JSON.stringify({ companies, targetDate })]);
    
    let dataString = '';
    let errorString = '';

    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', errorString);
        return res.status(500).json({
          success: false,
          message: 'Prediction analysis failed',
          error: errorString
        });
      }

      try {
        const results = JSON.parse(dataString);
        res.json({
          success: true,
          data: results
        });
      } catch (parseError) {
        res.status(500).json({
          success: false,
          message: 'Failed to parse prediction results',
          error: parseError.message
        });
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

const exportToCSV = async (req, res) => {
  try {
    const { predictions } = req.body;
    
    if (!predictions) {
      return res.status(400).json({
        success: false,
        message: 'No prediction data provided'
      });
    }

    // Generate CSV content
    let csvContent = 'Company,Symbol,Current Price,Predicted Price,Price Change,Price Change %,Risk Level,Volatility,Confidence,Trend,Sentiment,RSI,MA20,MA50\n';
    
    Object.entries(predictions).forEach(([company, data]) => {
      if (!data.error) {
        csvContent += `"${company}","${data.symbol}",${data.current_price},${data.predicted_price},${data.price_change},${data.price_change_percent},"${data.risk_level}",${data.volatility},${data.prediction_confidence},"${data.trend_direction}","${data.market_sentiment}",${data.technical_analysis.rsi},${data.technical_analysis.ma_20},${data.technical_analysis.ma_50}\n`;
      }
    });

    const filename = `prediction_results_${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export CSV',
      error: error.message
    });
  }
};

module.exports = {
  getAvailableCompanies,
  analyzePredictions,
  exportToCSV
};