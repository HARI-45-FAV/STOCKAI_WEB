// routes/stockRoutes.js
const express = require("express");
const { 
  processStock, 
  analyzeStocks, 
  predictStock,
  exportStocks,
  getStockHistory,
  deleteStockData,
  getCompanies
} = require("../controllers/stockController");

const router = express.Router();

// Stock processing routes
router.post("/process", processStock);
router.post("/analyze", analyzeStocks);
router.post("/predict", predictStock);
router.get("/export", exportStocks);
router.get("/history/:symbol", getStockHistory);
router.delete("/data/:id", deleteStockData);

// Get expanded companies list
router.get("/companies", getCompanies);

// Health check for stock routes
router.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Stock routes are working",
    timestamp: new Date().toISOString(),
    endpoints: {
      process: "POST /process",
      analyze: "POST /analyze", 
      predict: "POST /predict",
      export: "GET /export",
      companies: "GET /companies",
      history: "GET /history/:symbol",
      delete: "DELETE /data/:id"
    }
  });
});

// Get available stock symbols (now expanded to 30 companies)
router.get("/symbols", (req, res) => {
  const symbols = [
    // Technology Sector
    { label: "Apple Inc.", symbol: "AAPL", sector: "Technology" },
    { label: "Microsoft Corp.", symbol: "MSFT", sector: "Technology" },
    { label: "Alphabet Inc.", symbol: "GOOGL", sector: "Technology" },
    { label: "Amazon.com Inc.", symbol: "AMZN", sector: "Consumer Discretionary" },
    { label: "Meta Platforms Inc.", symbol: "META", sector: "Technology" },
    { label: "NVIDIA Corp.", symbol: "NVDA", sector: "Technology" },
    { label: "Tesla Inc.", symbol: "TSLA", sector: "Consumer Discretionary" },
    { label: "Netflix Inc.", symbol: "NFLX", sector: "Communication Services" },
    { label: "Adobe Inc.", symbol: "ADBE", sector: "Technology" },
    { label: "Salesforce Inc.", symbol: "CRM", sector: "Technology" },
    
    // Financial Services
    { label: "JPMorgan Chase & Co.", symbol: "JPM", sector: "Financial Services" },
    { label: "Bank of America Corp.", symbol: "BAC", sector: "Financial Services" },
    { label: "Wells Fargo & Co.", symbol: "WFC", sector: "Financial Services" },
    { label: "Goldman Sachs Group Inc.", symbol: "GS", sector: "Financial Services" },
    { label: "PayPal Holdings Inc.", symbol: "PYPL", sector: "Financial Services" },
    
    // Healthcare & Pharmaceuticals
    { label: "Johnson & Johnson", symbol: "JNJ", sector: "Healthcare" },
    { label: "Pfizer Inc.", symbol: "PFE", sector: "Healthcare" },
    { label: "UnitedHealth Group Inc.", symbol: "UNH", sector: "Healthcare" },
    { label: "Moderna Inc.", symbol: "MRNA", sector: "Healthcare" },
    { label: "AbbVie Inc.", symbol: "ABBV", sector: "Healthcare" },
    
    // Consumer & Retail
    { label: "Walmart Inc.", symbol: "WMT", sector: "Consumer Staples" },
    { label: "Coca-Cola Co.", symbol: "KO", sector: "Consumer Staples" },
    { label: "Procter & Gamble Co.", symbol: "PG", sector: "Consumer Staples" },
    { label: "Home Depot Inc.", symbol: "HD", sector: "Consumer Discretionary" },
    { label: "McDonald's Corp.", symbol: "MCD", sector: "Consumer Discretionary" },
    
    // Energy & Utilities
    { label: "ExxonMobil Corp.", symbol: "XOM", sector: "Energy" },
    { label: "Chevron Corp.", symbol: "CVX", sector: "Energy" },
    
    // Industrial & Materials
    { label: "Boeing Co.", symbol: "BA", sector: "Industrial" },
    { label: "3M Co.", symbol: "MMM", sector: "Industrial" },
    { label: "Caterpillar Inc.", symbol: "CAT", sector: "Industrial" }
  ];
  
  res.json({ 
    symbols,
    total: symbols.length,
    sectors: [...new Set(symbols.map(s => s.sector))]
  });
});

// Get market summary with more comprehensive data
router.get("/market-summary", async (req, res) => {
  try {
    const summary = {
      status: "Market Open",
      lastUpdated: new Date().toISOString(),
      indices: {
        "S&P 500": { value: 4500, change: "+1.2%", color: "green" },
        "NASDAQ": { value: 14000, change: "+0.8%", color: "green" },
        "DOW JONES": { value: 35000, change: "+0.5%", color: "green" },
        "RUSSELL 2000": { value: 2100, change: "-0.3%", color: "red" }
      },
      sectors: {
        "Technology": { change: "+1.5%", color: "green" },
        "Healthcare": { change: "+0.8%", color: "green" },
        "Financial Services": { change: "+1.1%", color: "green" },
        "Energy": { change: "-0.5%", color: "red" },
        "Consumer Discretionary": { change: "+0.3%", color: "green" }
      },
      market_stats: {
        total_volume: "12.5B",
        advancing: 1850,
        declining: 1200,
        unchanged: 150
      }
    };
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Failed to get market summary" });
  }
});

// Batch analysis for multiple stocks
router.post("/batch-analyze", async (req, res) => {
  try {
    const { symbols, period = "1y", interval = "1d" } = req.body;
    
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({ error: "symbols array is required" });
    }
    
    if (symbols.length > 10) {
      return res.status(400).json({ error: "Maximum 10 symbols allowed for batch analysis" });
    }
    
    // This would typically call the same analyzeStocks function
    // but with extended capabilities for batch processing
    const results = {};
    
    for (const symbol of symbols) {
      results[symbol] = {
        status: "queued",
        message: `Analysis queued for ${symbol}`
      };
    }
    
    res.json({
      success: true,
      batch_id: `batch_${Date.now()}`,
      symbols: symbols.length,
      results,
      estimated_completion: new Date(Date.now() + symbols.length * 5000).toISOString()
    });
    
  } catch (error) {
    res.status(500).json({ 
      error: "Batch analysis failed", 
      details: error.message 
    });
  }
});

module.exports = router;