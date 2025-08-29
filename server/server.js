const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Stock analysis libs (keep existing, though prediction_service.py handles most of this now)
const yahooFinance = require("yahoo-finance2").default;
const { RSI, EMA, SMA, BollingerBands, MACD, Stochastic } = require("technicalindicators");
const { Parser } = require("json2csv");

// Import routes
const stockRoutes = require("./routes/stockRoutes");
const predictionRoutes = require("./routes/predictionRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "mysecretkey";

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/myappdb", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected successfully"))
.catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/stocks", stockRoutes);
app.use("/api/prediction", predictionRoutes);

// Enhanced Schemas
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, unique: true, required: true },
  password:  { type: String, required: true },
  preferences: {
    defaultPeriod: { type: String, default: '1y' },
    defaultInterval: { type: String, default: '1d' },
    favoriteSymbols: [String],
    riskTolerance: { type: String, default: 'MEDIUM' }
  },
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model("User", userSchema);

const memSchema = new mongoose.Schema({
  stage: String,
  values: [String],
  processedAt: { type: Date, default: Date.now }
});
const MEM = mongoose.model("MEM", memSchema);

const stockDataSchema = new mongoose.Schema({
  symbol: { type: String, required: true, index: true },
  period: { type: String, required: true },
  interval: { type: String, required: true },
  dataType: { type: String, enum: ['analysis', 'prediction', 'processing'], default: 'analysis' },
  data: mongoose.Schema.Types.Mixed,
  metadata: {
    dataPoints: Number,
    qualityScore: Number,
    processingTime: Number,
    version: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24*60*60*1000) }
});

stockDataSchema.index({ symbol: 1, period: 1, interval: 1, dataType: 1 });
stockDataSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const StockData = mongoose.model("StockData", stockDataSchema);

const userActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: String,
  details: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
});
const UserActivity = mongoose.model("UserActivity", userActivitySchema);

// Health Check
app.get("/", (_req, res) => {
  res.json({
    status: "Enhanced AIStock Pro Server",
    version: "2.0.0",
    features: [
      "30+ Company Analysis",
      "Advanced Technical Indicators", 
      "Future Price Prediction",
      "Historical Pattern Analysis",
      "RADAPT Processing",
      "Real-time Market Data"
    ],
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get("/health", async (_req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const memUsage = process.memoryUsage();
    const recentActivity = await StockData.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
    });

    res.json({
      status: "OK",
      database: dbStatus,
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
      },
      recentActivity,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Authentication
app.post("/signup", async (req, res) => {
  const { firstName, lastName, email, password, preferences } = req.body;
  try {
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      preferences: preferences || {}
    });
    await newUser.save();

    await UserActivity.create({
      userId: newUser._id,
      action: 'signup',
      details: { email, timestamp: new Date() }
    });

    res.json({
      message: "User created successfully",
      user: {
        id: newUser._id,
        firstName,
        lastName,
        email,
        preferences: newUser.preferences
      }
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Account creation failed" });
  }
});

app.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid email or password" });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    await UserActivity.create({
      userId: user._id,
      action: 'signin',
      details: { email, timestamp: new Date() }
    });

    res.json({
      message: "Signin successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        preferences: user.preferences
      }
    });
  } catch (err) {
    console.error("Signin error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// User profile endpoints
app.get("/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const recentActivity = await UserActivity
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(10);

    res.json({
      user,
      recentActivity,
      stats: {
        totalSessions: await UserActivity.countDocuments({ userId, action: 'signin' }),
        dataAnalyzed: await StockData.countDocuments({
          'metadata.userId': userId,
          dataType: 'analysis'
        })
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Enhanced MEM/RADAPT
app.post("/api/reprocess", async (_req, res) => {
  try {
    const startTime = Date.now();

    const enhancedReprocessedData = [
      {
        stage: "Recognition",
        values: ["Pattern_Recognition", "Anomaly_Detection", "Trend_Identification", "Volume_Spike_Recognition"],
        metadata: { confidence: 0.85, processingTime: Date.now() - startTime }
      },
      {
        stage: "Assimilation", 
        values: ["Technical_Integration", "Fundamental_Merge", "Sentiment_Fusion", "Risk_Consolidation"],
        metadata: { confidence: 0.78, processingTime: Date.now() - startTime }
      },
      {
        stage: "Decision",
        values: ["Signal_Generation", "Risk_Assessment", "Probability_Weighting", "Timing_Optimization"],
        metadata: { confidence: 0.82, processingTime: Date.now() - startTime }
      },
      {
        stage: "Action",
        values: ["Trade_Execution", "Position_Sizing", "Stop_Loss_Setting", "Profit_Taking"],
        metadata: { confidence: 0.90, processingTime: Date.now() - startTime }
      },
      {
        stage: "PAST",
        values: ["Historical_Patterns", "Seasonal_Trends", "Cyclical_Analysis", "Performance_Metrics", "Volatility_Cycles"],
        metadata: { confidence: 0.75, processingTime: Date.now() - startTime }
      },
      {
        stage: "Transfer",
        values: ["Knowledge_Application", "Learning_Integration", "Strategy_Adaptation", "Model_Updates"],
        metadata: { confidence: 0.80, processingTime: Date.now() - startTime }
      }
    ];

    await MEM.deleteMany({});
    await MEM.insertMany(enhancedReprocessedData);

    const totalTime = Date.now() - startTime;

    res.json({
      message: "Enhanced RADAPT reprocessing completed",
      processingTime: totalTime + "ms",
      stagesProcessed: enhancedReprocessedData.length,
      averageConfidence: enhancedReprocessedData.reduce((sum, stage) =>
        sum + (stage.metadata?.confidence || 0), 0) / enhancedReprocessedData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Enhanced RADAPT error:", error);
    res.status(500).json({ error: "Error in enhanced reprocessing" });
  }
});

app.get("/api/mem", async (_req, res) => {
  try {
    const memData = await MEM.find().sort({ processedAt: -1 });
    res.json(memData);
  }
  catch (error) {
    console.error("MEM fetch error:", error);
    res.status(500).json({ error: "Failed to fetch MEM data" });
  }
});

app.get("/api/task1", async (_req, res) => {
  try {
    const past = await MEM.findOne({ stage: "PAST" });
    res.json(past || { stage: "PAST", values: [] });
  } catch (error) {
    console.error("PAST fetch error:", error);
    res.status(500).json({ error: "Failed to fetch PAST data" });
  }
});

// Data Analytics Dashboard
app.get("/api/analytics/dashboard", async (_req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24*60*60*1000);
    const last7d = new Date(now.getTime() - 7*24*60*60*1000);

    const analytics = {
      overview: {
        totalUsers: await User.countDocuments(),
        activeUsers24h: await UserActivity.distinct('userId', {
          timestamp: { $gte: last24h }
        }).then(users => users.length),
        totalAnalyses: await StockData.countDocuments({ dataType: 'analysis' }),
        totalPredictions: await StockData.countDocuments({ dataType: 'prediction' })
      },
      recent_activity: {
        analyses_24h: await StockData.countDocuments({
          dataType: 'analysis',
          createdAt: { $gte: last24h }
        }),
        predictions_24h: await StockData.countDocuments({
          dataType: 'prediction',
          createdAt: { $gte: last24h }
        }),
        radapt_processes: await MEM.countDocuments({
          processedAt: { $gte: last7d }
        })
      },
      popular_symbols: await StockData.aggregate([
        { $match: { createdAt: { $gte: last7d } } },
        { $group: { _id: '$symbol', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      system_performance: {
        average_processing_time: await StockData.aggregate([
          { $match: { 'metadata.processingTime': { $exists: true } } },
          { $group: { _id: null, avg: { $avg: '$metadata.processingTime' } } }
        ]).then(result => result[0]?.avg || 0),
        average_quality_score: await StockData.aggregate([
          { $match: { 'metadata.qualityScore': { $exists: true } } },
          { $group: { _id: null, avg: { $avg: '$metadata.qualityScore' } } }
        ]).then(result => result[0]?.avg || 0)
      }
    };

    res.json(analytics);
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: "Failed to generate analytics" });
  }
});

// Bulk data cleanup endpoint
app.delete("/api/cleanup", async (_req, res) => {
  try {
    const cutoffDate = new Date(Date.now() - 7*24*60*60*1000);

    const cleanupResults = {
      stockData: await StockData.deleteMany({ createdAt: { $lt: cutoffDate } }),
      oldActivity: await UserActivity.deleteMany({ timestamp: { $lt: cutoffDate } }),
      oldMem: await MEM.deleteMany({ processedAt: { $lt: cutoffDate } })
    };

    res.json({
      message: "Cleanup completed",
      deletedDocuments: {
        stockData: cleanupResults.stockData.deletedCount,
        userActivity: cleanupResults.oldActivity.deletedCount,
        memData: cleanupResults.oldMem.deletedCount
      },
      cutoffDate: cutoffDate.toISOString()
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    res.status(500).json({ error: "Cleanup failed" });
  }
});

// Error Handling
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;