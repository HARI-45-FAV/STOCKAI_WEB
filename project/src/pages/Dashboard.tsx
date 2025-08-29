import { useEffect, useState } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  TrendingUp, BarChart3, Activity, Settings, LogOut, Database,
  Download, RefreshCw, AlertCircle, CheckCircle, Clock, Target
} from "lucide-react";

// shadcn ui bits for modal & form
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// charts
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid, ResponsiveContainer, ReferenceLine,
  Area, AreaChart, BarChart, Bar, ComposedChart,
} from "recharts";

// API base URL
const API_URL = "http://localhost:5000";

interface MemStage {
  stage: string;
  values: string[];
}

type SeriesRow = {
  date: string;
  close: number | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  volume?: number | null;
  sma5?: number | null;
  sma20?: number | null;
  ema12?: number | null;
  ema26?: number | null;
  rsi14?: number | null;
  macd?: number | null;
  bb_upper?: number | null;
  bb_middle?: number | null;
  bb_lower?: number | null;
  vol20?: number | null;
  volume_ratio?: number | null;
};

type StockSummary = {
  firstClose: number;
  lastClose: number;
  change: number;
  changePct: number;
  avgDailyReturn: number;
  lastVol20: number | null;
  maxDrawdownPct: number;
  trend: string;
  sharpeRatio: number | null;
  avgVolume: number;
  lastRSI: number | null;
  lastMACD: number | null;
  high52w: number;
  low52w: number;
  currentFromHigh: number;
  currentFromLow: number;
  recommendation: string;
};

type StockPayload = {
  series: SeriesRow[];
  summary: StockSummary;
  meta: { 
    symbol: string; 
    period: string; 
    interval: string; 
    count: number;
    lastUpdated: string;
  };
  error?: string;
};

type ProcessingResult = {
  success: boolean;
  symbol: string;
  originalCount: number;
  processedCount: number;
  data: {
    cleaning_summary: {
      original_count: number;
      cleaned_count: number;
      removed_count: number;
      cleaning_ratio: number;
    };
    indicators: Record<string, number>;
    validation_issues: string[];
  };
};

const PREDEFINED = [
  { label: "Apple", symbol: "AAPL", sector: "Technology" },
  { label: "Microsoft", symbol: "MSFT", sector: "Technology" },
  { label: "Alphabet (Google)", symbol: "GOOGL", sector: "Technology" },
  { label: "Amazon", symbol: "AMZN", sector: "Consumer Discretionary" },
  { label: "Tesla", symbol: "TSLA", sector: "Consumer Discretionary" },
  { label: "Meta", symbol: "META", sector: "Technology" },
  { label: "NVIDIA", symbol: "NVDA", sector: "Technology" },
  { label: "Netflix", symbol: "NFLX", sector: "Communication Services" },
  { label: "PayPal", symbol: "PYPL", sector: "Financial Services" },
  { label: "Adobe", symbol: "ADBE", sector: "Technology" }
];

const PERIODS = [
  { value: "1d", label: "1 Day" },
  { value: "5d", label: "5 Days" },
  { value: "1mo", label: "1 Month" },
  { value: "3mo", label: "3 Months" },
  { value: "6mo", label: "6 Months" },
  { value: "1y", label: "1 Year" },
  { value: "2y", label: "2 Years" },
  { value: "5y", label: "5 Years" }
];

const INTERVALS = [
  { value: "1d", label: "Daily" },
  { value: "1wk", label: "Weekly" },
  { value: "1mo", label: "Monthly" }
];

const Dashboard = () => {
  const [memData, setMemData] = useState<MemStage[]>([]);
  const [pastData, setPastData] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state for analysis
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(["AAPL"]);
  const [period, setPeriod] = useState("1y");
  const [interval, setInterval] = useState("1d");
  const [results, setResults] = useState<Record<string, StockPayload>>({});
  const [analyzing, setAnalyzing] = useState(false);

  // Modal state for processing
  const [processOpen, setProcessOpen] = useState(false);
  const [processSelected, setProcessSelected] = useState("AAPL");
  const [processing, setProcessing] = useState(false);
  const [processResults, setProcessResults] = useState<Record<string, ProcessingResult>>({});

  // Fetch MEM data
  const fetchMem = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/mem`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setMemData(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch MEM data';
      console.error("Failed to fetch MEM:", errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Fetch PAST data
  const fetchPast = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/task1`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setPastData(data.values || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch PAST data';
      console.error("Failed to fetch PAST:", errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Trigger RADAPT
  const reprocessData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/reprocess`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      await fetchMem();
      await fetchPast();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Reprocessing failed';
      console.error("Reprocess failed:", errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Stock processing with Python
  const processStock = async () => {
    if (!processSelected) return;
    
    try {
      setProcessing(true);
      setError(null);
      
      const res = await fetch(`${API_URL}/api/stocks/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          symbol: processSelected, 
          period, 
          interval 
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      const json = await res.json();
      setProcessResults({ [processSelected]: json });
      
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Processing failed';
      console.error("Stock processing failed:", errorMsg);
      setError(errorMsg);
    } finally {
      setProcessing(false);
    }
  };

  // Stock analysis
  const runAnalysis = async () => {
    if (selected.length === 0 || selected.length > 3) return;
    
    try {
      setAnalyzing(true);
      setError(null);
      
      const res = await fetch(`${API_URL}/api/stocks/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: selected, period, interval }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      const json = await res.json();
      setResults(json.results || {});
      
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Analysis failed';
      console.error("Analysis failed:", errorMsg);
      setError(errorMsg);
    } finally {
      setAnalyzing(false);
    }
  };

  const exportCSV = (sym: string, format = "csv") => {
    const url = `${API_URL}/api/stocks/export?symbol=${encodeURIComponent(
      sym
    )}&period=${period}&interval=${interval}&format=${format}`;
    window.open(url, "_blank");
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case "STRONG_BUY": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "BUY": return "bg-green-400/10 text-green-400 border-green-400/20";
      case "HOLD": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "SELL": return "bg-red-400/10 text-red-400 border-red-400/20";
      case "STRONG_SELL": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "BULLISH": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "BEARISH": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "SIDEWAYS": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  useEffect(() => {
    fetchMem();
    fetchPast();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Navigation */}
      <nav className="border-b border-border/50 backdrop-blur-lg bg-card/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-gradient">
                AIStock Pro
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" className="hover:bg-muted">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Link to="/">
                <Button variant="ghost" className="hover:bg-muted">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main */}
      <div className="container mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome to Your Trading Dashboard
          </h1>
          <p className="text-xl text-muted-foreground">
            Your AI-powered trading intelligence center with Python processing and JavaScript analysis
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-500/50 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2" 
                onClick={() => setError(null)}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* RADAPT Section */}
        <Card className="mb-8 bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2" />
              RADAPT Reprocessing System
            </CardTitle>
            <CardDescription>
              Recognition → Assimilation → Decision → Action → PAST → Transfer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={reprocessData}
              disabled={loading}
              className="mb-4 bg-gradient-primary hover:shadow-glow"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? "Processing..." : "Run RADAPT Reprocessing"}
            </Button>
            
            <div className="grid md:grid-cols-3 gap-4">
              {memData.map((stage, i) => (
                <Card key={i} className="p-4 border-border/50">
                  <CardTitle className="text-sm mb-2 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                    {stage.stage}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {stage.values.map((v: string, j: number) => (
                      <Badge
                        key={j}
                        className="bg-accent/10 text-accent border-accent/20"
                      >
                        {v}
                      </Badge>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* PAST Data */}
        <Card className="mb-8 bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              PAST Data Analysis
            </CardTitle>
            <CardDescription>
              Historical pattern analysis from RADAPT reprocessing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pastData.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {pastData.map((val, idx) => (
                  <Badge
                    key={idx}
                    className="bg-primary/10 text-primary border-primary/20"
                  >
                    {val}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                No PAST data found. Run RADAPT reprocessing first.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stock Processing & Analysis */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Python Processing */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Stock Data Processing (Python)
              </CardTitle>
              <CardDescription>
                Clean, normalize, and preprocess raw stock data using Python
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={processOpen} onOpenChange={setProcessOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-primary hover:shadow-glow">
                    <Database className="h-4 w-4 mr-2" />
                    Run Processing
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Stock Data Processing</DialogTitle>
                  </DialogHeader>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Select Stock</Label>
                      <select 
                        className="w-full p-2 border border-border rounded-md bg-background"
                        value={processSelected}
                        onChange={(e) => setProcessSelected(e.target.value)}
                      >
                        {PREDEFINED.map(p => (
                          <option key={p.symbol} value={p.symbol}>
                            {p.label} ({p.symbol})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label>Period</Label>
                        <select 
                          className="w-full p-2 border border-border rounded-md bg-background"
                          value={period}
                          onChange={(e) => setPeriod(e.target.value)}
                        >
                          {PERIODS.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Interval</Label>
                        <select 
                          className="w-full p-2 border border-border rounded-md bg-background"
                          value={interval}
                          onChange={(e) => setInterval(e.target.value)}
                        >
                          {INTERVALS.map(i => (
                            <option key={i.value} value={i.value}>{i.label}</option>
                          ))}
                        </select>
                      </div>
                      <Button
                        onClick={processStock}
                        disabled={processing || !processSelected}
                        className="w-full"
                      >
                        {processing ? "Processing..." : "Process Data"}
                      </Button>
                    </div>
                  </div>

                  {/* Processing Results */}
                  {Object.keys(processResults).length > 0 && (
                    <div className="mt-6">
                      {Object.entries(processResults).map(([sym, result]) => (
                        <Card key={sym} className="border-border/50">
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <span>{sym} Processing Results</span>
                              <Badge className={result.success ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}>
                                {result.success ? "SUCCESS" : "FAILED"}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {result.success ? (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-blue-500">
                                    {result.originalCount}
                                  </div>
                                  <div className="text-sm text-muted-foreground">Original Records</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-green-500">
                                    {result.processedCount}
                                  </div>
                                  <div className="text-sm text-muted-foreground">Cleaned Records</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-orange-500">
                                    {result.data.cleaning_summary.removed_count}
                                  </div>
                                  <div className="text-sm text-muted-foreground">Removed Records</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-2xl font-bold text-purple-500">
                                    {(result.data.cleaning_summary.cleaning_ratio * 100).toFixed(1)}%
                                  </div>
                                  <div className="text-sm text-muted-foreground">Data Quality</div>
                                </div>
                              </div>
                            ) : (
                              <Alert className="border-red-500/50 bg-red-500/10">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  Processing failed for {sym}
                                </AlertDescription>
                              </Alert>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          {/* JavaScript Analysis */}
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Stock Market Analysis (JavaScript)
              </CardTitle>
              <CardDescription>
                Technical analysis with indicators, trends, and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-primary hover:shadow-glow">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Run Analysis
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Advanced Stock Analysis</DialogTitle>
                  </DialogHeader>

                  {/* Form */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="col-span-2">
                      <Label className="mb-2 block">Select Stocks (Max 3)</Label>
                      <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                        {PREDEFINED.map((p) => (
                          <label
                            key={p.symbol}
                            className="flex items-center space-x-2 rounded-lg p-3 border border-border/50 hover:bg-muted/30 cursor-pointer"
                          >
                            <Checkbox
                              checked={selected.includes(p.symbol)}
                              onCheckedChange={(chk) => {
                                if (chk) {
                                  if (selected.length >= 3) return;
                                  setSelected([...selected, p.symbol]);
                                } else {
                                  setSelected(
                                    selected.filter((s) => s !== p.symbol)
                                  );
                                }
                              }}
                            />
                            <div>
                              <div className="text-sm font-medium">{p.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {p.symbol} • {p.sector}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {selected.length}/3 selected
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <Label>Period</Label>
                        <select 
                          className="w-full p-2 border border-border rounded-md bg-background"
                          value={period}
                          onChange={(e) => setPeriod(e.target.value)}
                        >
                          {PERIODS.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Interval</Label>
                        <select 
                          className="w-full p-2 border border-border rounded-md bg-background"
                          value={interval}
                          onChange={(e) => setInterval(e.target.value)}
                        >
                          {INTERVALS.map(i => (
                            <option key={i.value} value={i.value}>{i.label}</option>
                          ))}
                        </select>
                      </div>
                      <Button
                        onClick={runAnalysis}
                        disabled={analyzing || selected.length === 0 || selected.length > 3}
                        className="w-full"
                      >
                        {analyzing ? "Analyzing..." : "Run Analysis"}
                      </Button>
                    </div>
                  </div>

                  {/* Results */}
                  {Object.keys(results).length > 0 && (
                    <div className="space-y-8">
                      {Object.entries(results).map(([sym, payload]) => {
                        if (payload.error) {
                          return (
                            <Alert key={sym} className="border-red-500/50 bg-red-500/10">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                <strong>{sym}:</strong> {payload.error}
                              </AlertDescription>
                            </Alert>
                          );
                        }

                        return (
                          <Card key={sym} className="border-border/50">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  {sym}
                                  <Badge className={getRecommendationColor(payload.summary.recommendation)}>
                                    {payload.summary.recommendation}
                                  </Badge>
                                  <Badge className={getTrendColor(payload.summary.trend)}>
                                    {payload.summary.trend}
                                  </Badge>
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-accent/10 text-accent border-accent/20">
                                    {payload.meta.count} pts
                                  </Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => exportCSV(sym, "csv")}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    CSV
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => exportCSV(sym, "json")}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    JSON
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Summary Stats */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="text-center">
                                  <div className={`text-lg font-bold ${payload.summary.changePct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {payload.summary.changePct.toFixed(2)}%
                                  </div>
                                  <div className="text-muted-foreground">Change</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold">
                                    {payload.summary.lastRSI?.toFixed(1) || 'N/A'}
                                  </div>
                                  <div className="text-muted-foreground">RSI</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold">
                                    {payload.summary.sharpeRatio?.toFixed(2) || 'N/A'}
                                  </div>
                                  <div className="text-muted-foreground">Sharpe</div>
                                </div>
                                <div className="text-center">
                                  <div className="text-lg font-bold text-red-500">
                                    {payload.summary.maxDrawdownPct.toFixed(1)}%
                                  </div>
                                  <div className="text-muted-foreground">Max DD</div>
                                </div>
                              </div>
                            </CardHeader>
                            
                            <CardContent>
                              <Tabs defaultValue="price" className="w-full">
                                <TabsList className="grid w-full grid-cols-4">
                                  <TabsTrigger value="price">Price & Moving Averages</TabsTrigger>
                                  <TabsTrigger value="rsi">RSI & Momentum</TabsTrigger>
                                  <TabsTrigger value="volume">Volume Analysis</TabsTrigger>
                                  <TabsTrigger value="table">Data Table</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="price" className="space-y-4">
                                  <div className="h-64 w-full">
                                    <ResponsiveContainer>
                                      <LineChart data={payload.series.slice(-100)}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" minTickGap={20} />
                                        <YAxis domain={["auto", "auto"]} />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="close" name="Close" stroke="#8884d8" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="sma20" name="SMA20" stroke="#82ca9d" strokeWidth={1} dot={false} />
                                        <Line type="monotone" dataKey="ema12" name="EMA12" stroke="#ffc658" strokeWidth={1} dot={false} />
                                        <Line type="monotone" dataKey="bb_upper" name="BB Upper" stroke="#ff7300" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                                        <Line type="monotone" dataKey="bb_lower" name="BB Lower" stroke="#ff7300" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                </TabsContent>
                                
                                <TabsContent value="rsi">
                                  <div className="h-48 w-full">
                                    <ResponsiveContainer>
                                      <ComposedChart data={payload.series.slice(-100)}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" minTickGap={20} />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip />
                                        <Legend />
                                        <Area type="monotone" dataKey="rsi14" name="RSI(14)" fill="#8884d8" fillOpacity={0.3} />
                                        <ReferenceLine y={30} strokeDasharray="3 3" stroke="#ff0000" />
                                        <ReferenceLine y={70} strokeDasharray="3 3" stroke="#ff0000" />
                                        <ReferenceLine y={50} strokeDasharray="2 2" stroke="#999999" />
                                      </ComposedChart>
                                    </ResponsiveContainer>
                                  </div>
                                </TabsContent>
                                
                                <TabsContent value="volume">
                                  <div className="h-48 w-full">
                                    <ResponsiveContainer>
                                      <ComposedChart data={payload.series.slice(-50)}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" minTickGap={10} />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="volume" name="Volume" fill="#8884d8" fillOpacity={0.6} />
                                        <Line type="monotone" dataKey="volume_ratio" name="Volume Ratio" stroke="#ff7300" strokeWidth={2} dot={false} />
                                      </ComposedChart>
                                    </ResponsiveContainer>
                                  </div>
                                </TabsContent>
                                
                                <TabsContent value="table">
                                  <div className="overflow-auto max-h-96 border border-border/40 rounded-lg">
                                    <table className="min-w-full text-sm">
                                      <thead className="bg-muted/40 sticky top-0">
                                        <tr>
                                          <th className="px-3 py-2 text-left">Date</th>
                                          <th className="px-3 py-2 text-right">Close</th>
                                          <th className="px-3 py-2 text-right">SMA20</th>
                                          <th className="px-3 py-2 text-right">RSI14</th>
                                          <th className="px-3 py-2 text-right">MACD</th>
                                          <th className="px-3 py-2 text-right">Volume</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {payload.series.slice(-20).map((r, idx) => (
                                          <tr key={idx} className="border-t">
                                            <td className="px-3 py-2">{r.date}</td>
                                            <td className="px-3 py-2 text-right font-medium">
                                              ${r.close?.toFixed(2)}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                              {r.sma20 ? `${r.sma20.toFixed(2)}` : "-"}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                              {r.rsi14 ? r.rsi14.toFixed(1) : "-"}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                              {r.macd ? r.macd.toFixed(3) : "-"}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                              {r.volume ? r.volume.toLocaleString() : "-"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </TabsContent>
                              </Tabs>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">RADAPT Status</span>
                  <Badge className="bg-green-500/10 text-green-500">
                    {memData.length > 0 ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">PAST Data</span>
                  <Badge className="bg-blue-500/10 text-blue-500">
                    {pastData.length} items
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Analysis Cache</span>
                  <Badge className="bg-purple-500/10 text-purple-500">
                    {Object.keys(results).length} symbols
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Processing Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Processed Symbols</span>
                  <span className="font-medium">
                    {Object.keys(processResults).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                  <span className="font-medium text-green-500">
                    {Object.keys(processResults).length > 0 
                      ? `${Math.round((Object.values(processResults).filter(r => r.success).length / Object.keys(processResults).length) * 100)}%`
                      : "N/A"
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Python Integration</span>
                  <Badge className="bg-green-500/10 text-green-500">Ready</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Market Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(results).slice(0, 3).map(([sym, data]) => {
                  if (data.error) return null;
                  return (
                    <div key={sym} className="flex justify-between items-center">
                      <span className="text-sm font-medium">{sym}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${data.summary.changePct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {data.summary.changePct >= 0 ? '+' : ''}{data.summary.changePct.toFixed(2)}%
                        </span>
                        <Badge className={getRecommendationColor(data.summary.recommendation)}>
                          {data.summary.recommendation}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(results).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center">
                    Run analysis to see market data
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            AIStock Pro Dashboard • Python Processing + JavaScript Analysis • 
            <span className="ml-1">
              Last updated: {new Date().toLocaleString()}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;