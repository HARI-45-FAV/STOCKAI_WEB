// controllers/stockController.js
const runPython = require("../utils/runPython");
const yahooFinance = require("yahoo-finance2").default;
const { RSI, EMA, SMA, BollingerBands, MACD, Stochastic } = require("technicalindicators");
const { Parser } = require("json2csv");

// ------------------ EXPANDED COMPANY LIST ------------------
const EXPANDED_COMPANIES = [
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

// ------------------ CACHE ------------------
const cache = new Map();
const TTL_MS = 10 * 60 * 1000; // 10 minutes
const predictionCache = new Map();
const PREDICTION_TTL_MS = 30 * 60 * 1000; // 30 minutes for predictions

// ------------------ HELPERS ------------------
const zClip = (arr, z = 4) => {
  if (!arr.length) return [];
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length;
  const sd = Math.sqrt(variance);
  
  if (sd === 0) return arr;
  
  return arr.map(v => {
    const zval = (v - mean) / sd;
    if (zval > z) return mean + z * sd;
    if (zval < -z) return mean - z * sd;
    return v;
  });
};

const rollingVolatility = (returns, window = 20) => {
  const vols = [];
  for (let i = 0; i < returns.length; i++) {
    if (i < window - 1) {
      vols.push(null);
    } else {
      const slice = returns.slice(i - window + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
      const variance = slice.reduce((s, x) => s + (x - mean) ** 2, 0) / slice.length;
      vols.push(Math.sqrt(variance * 252)); // Annualized volatility
    }
  }
  return vols;
};

const maxDrawdown = (closes) => {
  let peak = closes[0];
  let maxDD = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = (peak - c) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
};

const detectTrends = (closes) => {
  if (closes.length < 20) return "INSUFFICIENT_DATA";
  
  const recent = closes.slice(-20);
  const older = closes.slice(-40, -20);
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  
  const trendStrength = (recentAvg - olderAvg) / olderAvg;
  
  if (trendStrength > 0.05) return "BULLISH";
  if (trendStrength < -0.05) return "BEARISH";
  return "SIDEWAYS";
};

const calculateSharpeRatio = (returns, riskFreeRate = 0.02) => {
  if (!returns || returns.length < 2) return null;
  
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const annualizedReturn = avgReturn * 252; // Daily to annual
  
  const variance = returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / returns.length;
  const volatility = Math.sqrt(variance * 252); // Annualized volatility
  
  if (volatility === 0) return null;
  
  return (annualizedReturn - riskFreeRate) / volatility;
};

// Simple linear regression for trend prediction
const linearRegression = (xValues, yValues) => {
  const n = xValues.length;
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
};

// Moving Average Convergence Divergence calculation
const calculateMACD = (closes) => {
  try {
    const ema12 = EMA.calculate({ period: 12, values: closes });
    const ema26 = EMA.calculate({ period: 26, values: closes });
    
    const macdLine = [];
    const signalLine = [];
    const histogram = [];
    
    // Calculate MACD line
    for (let i = 0; i < Math.min(ema12.length, ema26.length); i++) {
      macdLine.push(ema12[i + (ema12.length - Math.min(ema12.length, ema26.length))] - ema26[i]);
    }
    
    // Calculate signal line (EMA of MACD line)
    const macdEMA = EMA.calculate({ period: 9, values: macdLine });
    
    return { macdLine, signalLine: macdEMA, histogram: [] };
  } catch (error) {
    return { macdLine: [], signalLine: [], histogram: [] };
  }
};

const addFeatures = (rows) => {
  if (!rows.length) return [];

  const closes = rows.map(r => r.close);
  const highs = rows.map(r => r.high);
  const lows = rows.map(r => r.low);
  const volumes = rows.map(r => r.volume || 0);

  // Calculate returns
  const rets = closes.map((c, i) =>
    i === 0 ? 0 : (c - closes[i - 1]) / closes[i - 1]
  );
  const clipped = [0, ...zClip(rets.slice(1))];
  const logret = closes.map((c, i) =>
    i === 0 ? 0 : Math.log(c / closes[i - 1])
  );
  const vol20 = rollingVolatility(logret, 20);

  // Technical indicators
  let sma5 = [], sma20 = [], sma50 = [], ema12 = [], ema26 = [], rsi14 = [], bb = [], macd = [], stoch = [];
  
  try {
    if (closes.length >= 5) sma5 = SMA.calculate({ period: 5, values: closes });
    if (closes.length >= 20) sma20 = SMA.calculate({ period: 20, values: closes });
    if (closes.length >= 50) sma50 = SMA.calculate({ period: 50, values: closes });
    if (closes.length >= 12) ema12 = EMA.calculate({ period: 12, values: closes });
    if (closes.length >= 26) ema26 = EMA.calculate({ period: 26, values: closes });
    if (closes.length >= 14) rsi14 = RSI.calculate({ period: 14, values: closes });
    if (closes.length >= 20) bb = BollingerBands.calculate({ period: 20, values: closes, stdDev: 2 });
    if (closes.length >= 26) macd = calculateMACD(closes);
    
    // Stochastic Oscillator
    if (closes.length >= 14) {
      const stochInput = rows.map(r => ({ high: r.high, low: r.low, close: r.close }));
      stoch = Stochastic.calculate({ period: 14, kPeriod: 3, dPeriod: 3, high: highs, low: lows, close: closes });
    }
  } catch (error) {
    console.warn("⚠️ Technical indicator calculation error:", error.message);
  }

  // Volume indicators
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

  return rows.map((r, i) => {
    return {
      ...r,
      ret: clipped[i] ?? null,
      logret: logret[i] ?? null,
      sma5: i >= 4 && sma5[i - 4] ? sma5[i - 4] : null,
      sma20: i >= 19 && sma20[i - 19] ? sma20[i - 19] : null,
      sma50: i >= 49 && sma50[i - 49] ? sma50[i - 49] : null,
      ema12: i >= 11 && ema12[i - 11] ? ema12[i - 11] : null,
      ema26: i >= 25 && ema26[i - 25] ? ema26[i - 25] : null,
      rsi14: i >= 13 && rsi14[i - 13] ? rsi14[i - 13] : null,
      macd_line: macd.macdLine && macd.macdLine[i - 25] ? macd.macdLine[i - 25] : null,
      macd_signal: macd.signalLine && macd.signalLine[i - 33] ? macd.signalLine[i - 33] : null,
      bb_upper: i >= 19 && bb[i - 19] ? bb[i - 19].upper : null,
      bb_middle: i >= 19 && bb[i - 19] ? bb[i - 19].middle : null,
      bb_lower: i >= 19 && bb[i - 19] ? bb[i - 19].lower : null,
      stoch_k: i >= 13 && stoch[i - 13] ? stoch[i - 13].k : null,
      stoch_d: i >= 13 && stoch[i - 13] ? stoch[i - 13].d : null,
      vol20: vol20[i],
      volume_ratio: r.volume ? r.volume / avgVolume : null,
    };
  });
};

const summarize = (rows) => {
  if (!rows.length) return {};
  
  const closes = rows.map(r => r.close);
  const volumes = rows.map(r => r.volume || 0);
  const logrets = rows.map(r => r.logret ?? 0).slice(1); // skip first

  const first = closes[0];
  const last = closes[closes.length - 1];
  const change = last - first;
  const changePct = (change / first) * 100;

  const avgDailyReturn = logrets.length > 0
    ? logrets.reduce((a, b) => a + b, 0) / logrets.length
    : 0;

  const lastVol20 = rows[rows.length - 1]?.vol20 ?? null;
  const maxDD = maxDrawdown(closes) * 100;
  const trend = detectTrends(closes);
  const sharpeRatio = calculateSharpeRatio(logrets);
  
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const lastRSI = rows[rows.length - 1]?.rsi14 ?? null;
  const lastMACD = rows[rows.length - 1]?.macd_line ?? null;
  const lastStochK = rows[rows.length - 1]?.stoch_k ?? null;

  // Price levels
  const high52w = Math.max(...closes);
  const low52w = Math.min(...closes);
  const currentFromHigh = ((last - high52w) / high52w) * 100;
  const currentFromLow = ((last - low52w) / low52w) * 100;

  return {
    firstClose: first,
    lastClose: last,
    change,
    changePct,
    avgDailyReturn,
    lastVol20,
    maxDrawdownPct: maxDD,
    trend,
    sharpeRatio,
    avgVolume,
    lastRSI,
    lastMACD,
    lastStochK,
    high52w,
    low52w,
    currentFromHigh,
    currentFromLow,
    recommendation: generateRecommendation(lastRSI, trend, changePct, lastStochK)
  };
};

const generateRecommendation = (rsi, trend, changePct, stochK) => {
  let score = 0;
  
  // RSI analysis
  if (rsi) {
    if (rsi < 30) score += 2; // Oversold - buy signal
    else if (rsi > 70) score -= 2; // Overbought - sell signal
    else if (rsi >= 40 && rsi <= 60) score += 0.5; // Neutral zone
  }
  
  // Trend analysis
  if (trend === "BULLISH") score += 1.5;
  else if (trend === "BEARISH") score -= 1.5;
  
  // Price change analysis
  if (changePct > 10) score += 1;
  else if (changePct < -10) score -= 1;
  
  // Stochastic analysis
  if (stochK) {
    if (stochK < 20) score += 1; // Oversold
    else if (stochK > 80) score -= 1; // Overbought
  }
  
  // Generate recommendation
  if (score >= 3) return "STRONG_BUY";
  else if (score >= 1.5) return "BUY";
  else if (score <= -3) return "STRONG_SELL";
  else if (score <= -1.5) return "SELL";
  else return "HOLD";
};

const getStartDate = (period) => {
  const now = new Date();
  const periodMap = {
    '5d': 5,
    '1mo': 30,
    '3mo': 90,
    '6mo': 180,
    '1y': 365,
    '2y': 730,
    '5y': 1825,
    'max': 3650
  };
  
  const days = periodMap[period] || 365;
  return new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
};

// Future price prediction using simple trend analysis
const predictFuturePrices = (historicalData, targetDate) => {
  try {
    const closes = historicalData.map(r => r.close);
    const dates = historicalData.map(r => new Date(r.date).getTime());
    
    if (closes.length < 10) {
      throw new Error("Insufficient historical data for prediction");
    }
    
    // Use linear regression on recent 30 days for trend
    const recentCloses = closes.slice(-30);
    const recentDates = dates.slice(-30);
    const xValues = recentDates.map((d, i) => i);
    
    const regression = linearRegression(xValues, recentCloses);
    
    // Calculate prediction
    const lastDate = new Date(Math.max(...dates));
    const targetDateTime = new Date(targetDate).getTime();
    const daysDiff = Math.ceil((targetDateTime - lastDate.getTime()) / (24 * 60 * 60 * 1000));
    
    if (daysDiff <= 0) {
      throw new Error("Target date must be in the future");
    }
    
    if (daysDiff > 365) {
      throw new Error("Predictions limited to 1 year maximum");
    }
    
    const predictions = [];
    const lastPrice = closes[closes.length - 1];
    const volatility = calculateVolatility(closes.slice(-20));
    
    for (let i = 1; i <= daysDiff; i++) {
      const predictedPrice = regression.intercept + regression.slope * (recentDates.length - 1 + i);
      const confidenceInterval = volatility * Math.sqrt(i) * 1.96; // 95% confidence
      
      const currentDate = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000);
      
      predictions.push({
        date: currentDate.toISOString().slice(0, 10),
        predicted_price: Math.max(0, predictedPrice),
        lower_bound: Math.max(0, predictedPrice - confidenceInterval),
        upper_bound: predictedPrice + confidenceInterval,
        confidence: Math.max(0, 100 - (i * 2)) // Decreasing confidence over time
      });
    }
    
    return {
      predictions,
      model_info: {
        method: "Linear Regression with Volatility Adjustment",
        historical_period: "30 days",
        slope: regression.slope,
        r_squared: calculateRSquared(xValues, recentCloses, regression),
        volatility: volatility
      }
    };
    
  } catch (error) {
    throw new Error(`Prediction failed: ${error.message}`);
  }
};

const calculateVolatility = (prices) => {
  const returns = prices.slice(1).map((price, i) => Math.log(price / prices[i]));
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
  return Math.sqrt(variance * 252); // Annualized
};

const calculateRSquared = (xValues, yValues, regression) => {
  const yMean = yValues.reduce((a, b) => a + b, 0) / yValues.length;
  const totalSumSquares = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const residualSumSquares = xValues.reduce((sum, x, i) => {
    const predicted = regression.intercept + regression.slope * x;
    return sum + Math.pow(yValues[i] - predicted, 2);
  }, 0);
  
  return Math.max(0, 1 - (residualSumSquares / totalSumSquares));
};

// ------------------ CONTROLLERS ------------------

exports.getCompanies = async (req, res) => {
  try {
    res.json({
      success: true,
      companies: EXPANDED_COMPANIES,
      total: EXPANDED_COMPANIES.length,
      sectors: [...new Set(EXPANDED_COMPANIES.map(c => c.sector))]
    });
  } catch (error) {
    console.error("❌ getCompanies error:", error);
    res.status(500).json({ error: "Failed to get companies list" });
  }
};

exports.processStock = async (req, res) => {
  try {
    const { symbol, period = "1y", interval = "1d" } = req.body;
    if (!symbol) return res.status(400).json({ error: "Stock symbol required" });

    console.log(`🔍 Processing stock ${symbol} with Python`);

    // First get the data using Yahoo Finance
    const options = { 
      period1: getStartDate(period),
      period2: new Date(),
      interval: interval 
    };

    const rawData = await yahooFinance.chart(symbol, options);
    
    if (!rawData?.quotes?.length) {
      return res.status(404).json({ error: `No data found for symbol ${symbol}` });
    }

    // Prepare data for Python processing
    const stockData = {
      symbol,
      period,
      interval,
      data: rawData.quotes.map(q => ({
        date: new Date(q.date).toISOString(),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume
      }))
    };

    // Call Python script for processing
    const pythonResult = await runPython("python/stock_service.py", [JSON.stringify(stockData)]);
    const processedData = JSON.parse(pythonResult);

    res.json({ 
      success: true, 
      symbol,
      originalCount: rawData.quotes.length,
      processedCount: processedData.cleanedData?.length || 0,
      data: processedData
    });

  } catch (error) {
    console.error("❌ processStock error:", error);
    res.status(500).json({ 
      error: "Stock processing failed", 
      details: error.message,
      symbol: req.body.symbol 
    });
  }
};

exports.analyzeStocks = async (req, res) => {
  try {
    const { symbols, period = "1y", interval = "1d" } = req.body;
    
    console.log("📊 Analyzing stocks:", { symbols, period, interval });
    
    if (!symbols?.length) {
      return res.status(400).json({ error: "symbols array is required" });
    }

    if (symbols.length > 3) {
      return res.status(400).json({ error: "Maximum 3 symbols allowed" });
    }

    const results = {};
    
    for (const s of symbols) {
      try {
        const key = `${s}_${period}_${interval}`;
        const cached = cache.get(key);
        
        // Check cache first
        if (cached && Date.now() - cached.ts < TTL_MS) {
          console.log(`🔋 Using cached data for ${s}`);
          results[s] = cached.payload;
          continue;
        }

        console.log(`🔍 Fetching fresh data for ${s}...`);

        const options = { 
          period1: getStartDate(period),
          period2: new Date(),
          interval: interval,
          includeAdjustedClose: true
        };

        const q = await yahooFinance.chart(s, options);
        
        if (!q?.quotes?.length) {
          throw new Error(`No data available from Yahoo Finance for ${s}`);
        }

        // Filter and clean data
        const rows = q.quotes
          .filter(c => c && c.close != null && isFinite(c.close) && c.close > 0)
          .map(c => ({
            date: new Date(c.date).toISOString().slice(0, 10),
            open: c.open ?? null,
            high: c.high ?? null,
            low: c.low ?? null,
            close: c.close ?? null,
            volume: c.volume ?? null,
          }));

        if (rows.length === 0) {
          throw new Error(`No valid data points for ${s}`);
        }

        console.log(`✅ Got ${rows.length} data points for ${s}`);

        // Add technical analysis features
        const withFeatures = addFeatures(rows);
        const summary = summarize(withFeatures);

        const payload = {
          series: withFeatures,
          summary,
          meta: { 
            symbol: s, 
            period, 
            interval, 
            count: withFeatures.length,
            lastUpdated: new Date().toISOString()
          },
        };

        // Cache the result
        cache.set(key, { ts: Date.now(), payload });
        results[s] = payload;

      } catch (innerErr) {
        console.error(`❌ Failed to analyze ${s}:`, innerErr.message);
        results[s] = { 
          error: innerErr.message,
          symbol: s,
          timestamp: new Date().toISOString()
        };
      }
    }

    console.log(`✅ Analysis complete for ${Object.keys(results).length} symbols`);
    res.json({ ok: true, results, timestamp: new Date().toISOString() });

  } catch (err) {
    console.error("❌ analyzeStocks error:", err);
    res.status(500).json({ 
      error: "Stock analysis failed", 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
};

exports.predictStock = async (req, res) => {
  try {
    const { symbol, targetDate, historicalPeriod = "1y" } = req.body;
    
    if (!symbol) return res.status(400).json({ error: "Stock symbol required" });
    if (!targetDate) return res.status(400).json({ error: "Target date required" });
    
    const predictionKey = `${symbol}_${targetDate}_${historicalPeriod}`;
    const cached = predictionCache.get(predictionKey);
    
    if (cached && Date.now() - cached.ts < PREDICTION_TTL_MS) {
      return res.json({ success: true, cached: true, ...cached.data });
    }
    
    console.log(`🔮 Predicting ${symbol} for ${targetDate}`);
    
    // Get historical data
    const options = { 
      period1: getStartDate(historicalPeriod),
      period2: new Date(),
      interval: "1d"
    };

    const rawData = await yahooFinance.chart(symbol, options);
    
    if (!rawData?.quotes?.length) {
      return res.status(404).json({ error: `No historical data found for ${symbol}` });
    }

    const historicalData = rawData.quotes
      .filter(c => c && c.close != null && isFinite(c.close) && c.close > 0)
      .map(c => ({
        date: new Date(c.date).toISOString().slice(0, 10),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume
      }));

    // Generate predictions
    const predictionResult = predictFuturePrices(historicalData, targetDate);
    
    const result = {
      success: true,
      symbol,
      targetDate,
      historicalPeriod,
      historicalDataPoints: historicalData.length,
      predictions: predictionResult.predictions,
      modelInfo: predictionResult.model_info,
      generatedAt: new Date().toISOString()
    };
    
    // Cache the prediction
    predictionCache.set(predictionKey, { ts: Date.now(), data: result });
    
    res.json(result);
    
  } catch (error) {
    console.error("❌ predictStock error:", error);
    res.status(500).json({ 
      error: "Stock prediction failed", 
      details: error.message,
      symbol: req.body.symbol 
    });
  }
};

exports.exportStocks = async (req, res) => {
  try {
    const { symbol, period = "1y", interval = "1d", format = "csv" } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: "symbol parameter is required" });
    }

    const key = `${symbol}_${period}_${interval}`;
    const payload = cache.get(key)?.payload;
    
    if (!payload) {
      return res.status(400).json({ 
        error: "No data available. Please run analysis first.",
        symbol,
        suggestion: `POST /api/stocks/analyze with {"symbols": ["${symbol}"], "period": "${period}", "interval": "${interval}"}`
      });
    }

    if (format.toLowerCase() === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${symbol}_${period}_${interval}.json"`);
      res.json(payload);
      return;
    }

    // Default to CSV
    const parser = new Parser({
      fields: [
        'date', 'open', 'high', 'low', 'close', 'volume',
        'ret', 'logret', 'sma5', 'sma20', 'sma50', 'ema12', 'ema26', 
        'rsi14', 'macd_line', 'macd_signal', 'bb_upper', 'bb_middle', 'bb_lower', 
        'stoch_k', 'stoch_d', 'vol20', 'volume_ratio'
      ]
    });
    
    const csv = parser.parse(payload.series);
    
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${symbol}_${period}_${interval}.csv"`);
    res.send(csv);

  } catch (err) {
    console.error("❌ exportStocks error:", err);
    res.status(500).json({ 
      error: "Export failed", 
      details: err.message,
      timestamp: new Date().toISOString()
    });
  }
};

exports.getStockHistory = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { limit = 10 } = req.query;

    // Get cached data for this symbol
    const history = [];
    for (const [key, value] of cache.entries()) {
      if (key.startsWith(symbol + "_")) {
        history.push({
          key,
          symbol,
          period: key.split("_")[1],
          interval: key.split("_")[2],
          cachedAt: new Date(value.ts).toISOString(),
          dataPoints: value.payload?.meta?.count || 0
        });
      }
    }

    res.json({
      symbol,
      history: history.slice(0, parseInt(limit)),
      total: history.length
    });

  } catch (error) {
    console.error("❌ getStockHistory error:", error);
    res.status(500).json({ error: "Failed to get stock history" });
  }
};

exports.deleteStockData = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Remove from cache
    const deleted = cache.delete(id);
    
    res.json({
      success: deleted,
      message: deleted ? "Data deleted successfully" : "Data not found",
      id
    });

  } catch (error) {
    console.error("❌ deleteStockData error:", error);
    res.status(500).json({ error: "Failed to delete stock data" });
  }
};