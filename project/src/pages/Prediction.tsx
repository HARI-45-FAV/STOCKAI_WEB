import React, { useState, useEffect, useRef } from 'react';
// Import TooltipProps and its dependencies for strong typing
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer, 
    Line, 
    ComposedChart, 
    TooltipProps 
} from 'recharts';
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';


// --- INTERFACES (No changes) ---
interface CompanyOption {
  value: string;
  label: string;
}

interface TechnicalAnalysis {
  rsi: number;
  ma_20: number;
  ma_50: number;
}

interface HistoricalData {
  dates: string[];
  prices: number[];
}

interface ForecastData {
  dates: string[];
  values: number[];
  upper_ci: number[];
  lower_ci: number[];
}

interface CompanyPrediction {
  symbol: string;
  current_price: number;
  predicted_price: number;
  price_change: number;
  price_change_percent: number;
  volatility: number;
  risk_level: 'Low' | 'Medium' | 'High';
  prediction_confidence: number;
  trend_direction: 'Upward' | 'Downward';
  market_sentiment: 'Bullish' | 'Bearish';
  arima_params: number[];
  technical_analysis: TechnicalAnalysis;
  recent_historical: HistoricalData;
  forecast_data: ForecastData;
  error?: string;
}

interface PredictionResults {
  [companyName: string]: CompanyPrediction;
}

interface SummaryData {
  totalCompanies: number;
  averageGain: number;
  highestGain: number;
  lowestGain: number;
  bullishCount: number;
  bearishCount: number;
  averageVolatility: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
}


// --- API & THEME CONSTANTS ---
const API_BASE_URL = 'http://localhost:5000/api/prediction';

// New Premium UI Color Palette
const theme = {
  primary: '#5A67D8', // Indigo
  primaryLight: '#7F8BEA',
  secondary: '#38B2AC', // Teal
  background: '#F7FAFC',
  surface: '#FFFFFF',
  textPrimary: '#2D3748',
  textSecondary: '#718096',
  positive: '#38A169', // Green
  negative: '#E53E3E', // Red
  warning: '#DD6B20', // Orange
  border: '#E2E8F0',
};


// --- CUSTOM CHART TOOLTIP ---
// Correctly typed props instead of 'any'
const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const price = data.price || data.forecast;
    
    return (
      <div style={styles.tooltipContainer}>
        <p style={styles.tooltipLabel}>{label}</p>
        {price != null && <p style={styles.tooltipText}>Price: <strong>${price.toFixed(2)}</strong></p>}
        {data.type === 'forecast' && (
          <p style={styles.tooltipText}>
            CI: <strong>${data.lowerCI.toFixed(2)} - ${data.upperCI.toFixed(2)}</strong>
          </p>
        )}
      </div>
    );
  }
  return null;
};


// --- MAIN COMPONENT ---
const Prediction: React.FC = () => {
  // --- STATE AND REFS (No changes) ---
  const [availableCompanies, setAvailableCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<CompanyOption[]>([]);
  const [targetDate, setTargetDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [predictionResults, setPredictionResults] = useState<PredictionResults | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const resultsRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // --- EFFECTS (No changes) ---
  useEffect(() => {
    fetchAvailableCompanies();

    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setShowDropdown(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- LOGIC & HANDLERS (No changes) ---
  const fetchAvailableCompanies = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/companies`);
      const data = await response.json();
      if (data.success) {
        const companiesOptions = data.companies.map((company: string) => ({
          value: company,
          label: company,
        }));
        setAvailableCompanies(companiesOptions);
      } else {
        setError(data.message || 'Failed to fetch companies.');
      }
    } catch (err) {
      setError('Could not connect to the server to fetch companies.');
    }
  };

  const handleCompanySelect = (company: CompanyOption) => {
    if (selectedCompanies.length >= 5) {
      setError('You can select a maximum of 5 companies.');
      setTimeout(() => setError(null), 3000);
      return;
    }
    if (!selectedCompanies.find(c => c.value === company.value)) {
      setSelectedCompanies([...selectedCompanies, company]);
    }
    setShowDropdown(false);
    setSearchTerm('');
  };

  const removeCompany = (companyToRemove: CompanyOption) => {
    setSelectedCompanies(selectedCompanies.filter(c => c.value !== companyToRemove.value));
  };

  const filteredCompanies = availableCompanies.filter(company =>
    company.label.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedCompanies.find(selected => selected.value === company.value)
  );

  const handlePredict = async () => {
    if (selectedCompanies.length === 0) {
      setError('Please select at least one company.');
      return;
    }
    if (!targetDate) {
      setError('Please select a target date for prediction.');
      return;
    }
    if (new Date(targetDate) <= new Date()) {
      setError('Target date must be in the future.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPredictionResults(null);
    setSummary(null);

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companies: selectedCompanies.map(c => c.value),
          targetDate
        })
      });

      const data = await response.json();
      if (data.success) {
        setPredictionResults(data.data.predictions);
        setSummary(data.data.summary);
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        setError(data.message || 'Prediction analysis failed.');
      }
    } catch (err) {
      setError('An unexpected error occurred during prediction.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExportCSV = async () => {
    if (!predictionResults) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/export-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictions: predictionResults })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `predictions_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError('Failed to export CSV');
    }
  };

  const getChartData = (prediction: CompanyPrediction) => {
    const historical = prediction.recent_historical.dates.map((date, idx) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: prediction.recent_historical.prices[idx],
      type: 'historical',
      confidenceRange: [null, null] // No confidence for historical
    }));

    const lastHistoricalPrice = historical[historical.length - 1].price;

    const forecast = prediction.forecast_data.dates.map((date, idx) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: idx === 0 ? lastHistoricalPrice : null, // Continue line from historical
      forecast: prediction.forecast_data.values[idx],
      lowerCI: prediction.forecast_data.lower_ci[idx],
      upperCI: prediction.forecast_data.upper_ci[idx],
      confidenceRange: [prediction.forecast_data.lower_ci[idx], prediction.forecast_data.upper_ci[idx]],
      type: 'forecast'
    }));
    
    // Connect historical and forecast data seamlessly
    if (forecast.length > 0) {
        forecast[0].price = lastHistoricalPrice;
    }


    return [...historical, ...forecast];
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };
  
  const getRiskColor = (riskLevel: 'Low' | 'Medium' | 'High') => {
      switch (riskLevel) {
          case 'Low': return theme.positive;
          case 'Medium': return theme.warning;
          case 'High': return theme.negative;
          default: return theme.textSecondary;
      }
  };

  // --- JSX RENDER ---
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📈 AI Stock Prediction Center</h1>
        <p style={styles.subtitle}>Leverage advanced time-series analysis for intelligent market insights.</p>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} style={styles.closeError}>&times;</button>
        </div>
      )}

      <div style={styles.inputSection}>
        <div style={styles.grid}>
          <div style={styles.inputCard}>
            <h3 style={styles.inputCardTitle}>🏢 Select Companies (up to 5)</h3>
            <div style={styles.companySelector}>
              <div style={styles.selectedCompanies}>
                {selectedCompanies.map((company) => (
                  <span key={company.value} style={styles.companyTag}>
                    {company.label}
                    <button onClick={() => removeCompany(company)} style={styles.removeBtn}>&times;</button>
                  </span>
                ))}
              </div>
              <div ref={dropdownRef} style={styles.searchContainer}>
                <input
                  type="text"
                  placeholder="Search and add a company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  style={styles.searchInput}
                  className="searchInput" // Class for focus style
                />
                {showDropdown && filteredCompanies.length > 0 && (
                  <div style={styles.dropdown}>
                    {filteredCompanies.slice(0, 10).map((company) => (
                      <div
                        key={company.value}
                        onClick={() => handleCompanySelect(company)}
                        style={styles.dropdownItem}
                        className="dropdown-item"
                      >
                        {company.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={styles.inputCard}>
            <h3 style={styles.inputCardTitle}>🗓️ Select Target Date</h3>
            <input
              type="date"
              value={targetDate}
              min={getTomorrowDate()}
              onChange={(e) => setTargetDate(e.target.value)}
              style={styles.dateInput}
              disabled={isLoading}
              className="dateInput" // Class for focus style
            />
          </div>
        </div>

        <button
          onClick={handlePredict}
          disabled={isLoading || selectedCompanies.length === 0 || !targetDate}
          style={isLoading || selectedCompanies.length === 0 || !targetDate ? {...styles.predictBtn, ...styles.predictBtnDisabled} : styles.predictBtn}
          className="predict-button"
        >
          {isLoading ? (
            <>
              <div style={styles.spinner}></div>
              ANALYZING DATA...
            </>
          ) : (
            '🚀 Generate Predictions'
          )}
        </button>
      </div>
      
      {isLoading && (
        <div style={styles.loadingCard}>
          <div style={styles.bigSpinner}></div>
          <h3 style={styles.loadingTitle}>🧠 AI Engine is Warming Up</h3>
          <p style={styles.loadingText}>Analyzing historical data, running ARIMA models, and calculating technical indicators. Please wait a moment.</p>
          <div style={styles.progressBar}>
            <div style={styles.progress}></div>
          </div>
        </div>
      )}

      {summary && predictionResults && (
        <div ref={resultsRef} style={styles.resultsSection} className="results-fade-in">
          <div style={styles.summaryHeader}>
            <h2 style={styles.sectionTitle}>📊 Prediction Summary</h2>
            <button onClick={handleExportCSV} style={styles.exportBtn} className="export-button">
              📄 Export as CSV
            </button>
          </div>

          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard} className="summaryCard"><span style={styles.summaryIcon}>🏢</span><h3>Total Companies</h3><p style={styles.summaryValue}>{summary.totalCompanies}</p></div>
            <div style={styles.summaryCard} className="summaryCard"><span style={styles.summaryIcon}>💹</span><h3>Avg. Gain/Loss</h3><p style={{...styles.summaryValue, color: summary.averageGain >= 0 ? theme.positive : theme.negative}}>{summary.averageGain.toFixed(2)}%</p></div>
            <div style={styles.summaryCard} className="summaryCard"><span style={styles.summaryIcon}>🐂/🐻</span><h3>Bull vs Bear</h3><p style={styles.summaryValue}><span style={{color: theme.positive}}>{summary.bullishCount}</span> / <span style={{color: theme.negative}}>{summary.bearishCount}</span></p></div>
            <div style={styles.summaryCard} className="summaryCard"><span style={styles.summaryIcon}>⚡️</span><h3>Avg. Volatility</h3><p style={styles.summaryValue}>{summary.averageVolatility.toFixed(2)}%</p></div>
          </div>

          <h2 style={{...styles.sectionTitle, textAlign: 'center', marginTop: '60px'}}>🔬 Detailed Analysis</h2>

          {Object.entries(predictionResults).map(([companyName, prediction]) => (
            <div key={companyName} style={styles.companyCard}>
              <div style={styles.companyHeader}>
                <div>
                    <h3 style={styles.companyName}>{companyName}</h3>
                    <span style={styles.companySymbol}>{prediction.symbol}</span>
                </div>
                <div style={{...styles.confidenceBadge, backgroundColor: `rgba(56, 178, 172, 0.1)`, color: theme.secondary}}>
                  Confidence: {prediction.prediction_confidence.toFixed(1)}%
                </div>
              </div>

              {prediction.error ? (
                <div style={styles.errorBox}>❌ {prediction.error}</div>
              ) : (
                <>
                  <div style={styles.metricsRow}>
                    <div style={styles.metricBox}><h4>Current Price</h4><p>${prediction.current_price.toFixed(2)}</p></div>
                    <div style={styles.metricBox}><h4>Predicted Price</h4><p style={{color: prediction.price_change >= 0 ? theme.positive : theme.negative, fontWeight: 700}}>${prediction.predicted_price.toFixed(2)}</p></div>
                    <div style={styles.metricBox}><h4>Predicted Change</h4><p style={{color: prediction.price_change >= 0 ? theme.positive : theme.negative}}>{prediction.price_change >= 0 ? '▲' : '▼'} {prediction.price_change_percent.toFixed(2)}%</p></div>
                    <div style={styles.metricBox}><h4>Risk Level</h4><p style={{color: getRiskColor(prediction.risk_level), fontWeight: 700}}>{prediction.risk_level}</p></div>
                    <div style={styles.metricBox}><h4>Sentiment</h4><p style={{color: prediction.market_sentiment === 'Bullish' ? theme.positive : theme.negative}}>{prediction.market_sentiment === 'Bullish' ? '🐂' : '🐻'} {prediction.market_sentiment}</p></div>
                    <div style={styles.metricBox}><h4>RSI (14)</h4><p>{prediction.technical_analysis.rsi.toFixed(1)}</p></div>
                  </div>

                  <div style={styles.chartContainer}>
                    <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart data={getChartData(prediction)} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <defs>
                                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={theme.primary} stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor={theme.primary} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke={theme.border} strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" stroke={theme.textSecondary} fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke={theme.textSecondary} fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(90, 103, 216, 0.1)' }} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            
                            {/* Confidence Interval Band */}
                            <Area type="monotone" dataKey="confidenceRange" fill="#E2E8F0" stroke="none" name="Confidence Interval" />

                            {/* Historical Price Line */}
                            <Line type="monotone" dataKey="price" stroke="#A0AEC0" strokeWidth={2} dot={false} name="Historical Price" />
                            
                            {/* Forecast Price Area & Line */}
                            <Area type="monotone" dataKey="forecast" fill="url(#priceGradient)" stroke="none" />
                            <Line type="monotone" dataKey="forecast" stroke={theme.primary} strokeWidth={3} dot={false} name="Forecasted Price" />
                        </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


// --- STYLES OBJECT (Completely Revamped) ---
const styles: { [key: string]: React.CSSProperties } = {
  container: { padding: '2rem', maxWidth: '1400px', margin: '0 auto', fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"', backgroundColor: theme.background, minHeight: '100vh', color: theme.textPrimary },
  header: { textAlign: 'center', marginBottom: '40px', background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryLight} 100%)`, padding: '50px 30px', borderRadius: '24px', color: 'white', boxShadow: '0 10px 30px -10px rgba(90, 103, 216, 0.5)'},
  title: { fontSize: '2.75rem', margin: '0 0 10px 0', fontWeight: 700, letterSpacing: '-1px' },
  subtitle: { fontSize: '1.1rem', opacity: 0.9, margin: 0, fontWeight: 400 },
  errorBanner: { backgroundColor: '#FFF5F5', color: theme.negative, padding: '15px 20px', borderRadius: '12px', marginBottom: '25px', border: `1px solid #FED7D7`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 500 },
  closeError: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: theme.negative, lineHeight: 1 },
  inputSection: { backgroundColor: theme.surface, padding: '40px', borderRadius: '24px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)', marginBottom: '40px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '30px' },
  inputCard: {},
  inputCardTitle: { fontSize: '1.1rem', fontWeight: 600, color: theme.textPrimary, marginBottom: '16px' },
  companySelector: {},
  selectedCompanies: { display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '15px', minHeight: '42px' },
  companyTag: { backgroundColor: theme.primary, color: 'white', padding: '8px 16px', borderRadius: '999px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, animation: 'tagIn 0.3s ease' },
  removeBtn: { background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', color: 'white', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s ease' },
  searchContainer: { position: 'relative' },
  searchInput: { width: '100%', padding: '14px 18px', border: `2px solid ${theme.border}`, borderRadius: '12px', fontSize: '16px', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box' },
  dropdown: { position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: '12px', maxHeight: '220px', overflowY: 'auto', zIndex: 1000, boxShadow: '0 10px 20px rgba(0, 0, 0, 0.08)' },
  dropdownItem: { padding: '14px 18px', cursor: 'pointer', borderBottom: `1px solid ${theme.border}`, transition: 'background-color 0.2s' },
  dateInput: { width: '100%', padding: '14px 18px', border: `2px solid ${theme.border}`, borderRadius: '12px', fontSize: '16px', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box', color: theme.textPrimary },
  predictBtn: { width: '100%', padding: '18px 24px', background: `linear-gradient(45deg, ${theme.primary} 0%, ${theme.primaryLight} 100%)`, color: 'white', border: 'none', borderRadius: '14px', fontSize: '18px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', transition: 'all 0.3s ease', boxShadow: '0 4px 15px -5px rgba(90, 103, 216, 0.6)' },
  predictBtnDisabled: { opacity: 0.5, cursor: 'not-allowed', boxShadow: 'none' },
  spinner: { width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  loadingCard: { backgroundColor: theme.surface, borderRadius: '24px', padding: '60px 40px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)', marginBottom: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' },
  loadingTitle: { fontSize: '1.75rem', color: theme.textPrimary, margin: 0 },
  loadingText: { fontSize: '1rem', color: theme.textSecondary, maxWidth: '600px', margin: 0 },
  bigSpinner: { width: '50px', height: '50px', border: `5px solid ${theme.border}`, borderTop: `5px solid ${theme.primary}`, borderRadius: '50%', animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite' },
  progressBar: { width: '100%', maxWidth: '400px', height: '8px', backgroundColor: theme.border, borderRadius: '4px', overflow: 'hidden', marginTop: '10px' },
  progress: { width: '100%', height: '100%', backgroundColor: theme.primary, animation: 'progress 2s ease-in-out infinite' },
  resultsSection: {},
  summaryHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' },
  sectionTitle: { fontSize: '2rem', color: theme.textPrimary, fontWeight: 700, margin: 0 },
  exportBtn: { backgroundColor: theme.secondary, color: 'white', padding: '12px 24px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: 600, transition: 'all 0.3s ease' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '25px', marginBottom: '60px' },
  summaryCard: { backgroundColor: theme.surface, padding: '25px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)', textAlign: 'center', border: `1px solid ${theme.border}`, transition: 'transform 0.3s, box-shadow 0.3s' },
  summaryIcon: { fontSize: '2.5rem', display: 'block', marginBottom: '15px' },
  summaryValue: { fontSize: '2rem', fontWeight: 700, color: theme.textPrimary, margin: '5px 0 0 0' },
  companyCard: { backgroundColor: theme.surface, borderRadius: '24px', padding: '35px', marginBottom: '30px', boxShadow: '0 8px 40px rgba(0, 0, 0, 0.06)', border: `1px solid ${theme.border}`, overflow: 'hidden' },
  companyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '20px', borderBottom: `1px solid ${theme.border}` },
  companyName: { fontSize: '1.75rem', color: theme.textPrimary, margin: 0, fontWeight: 700 },
  companySymbol: { fontSize: '1rem', color: theme.textSecondary, fontWeight: 500 },
  confidenceBadge: { padding: '8px 16px', borderRadius: '999px', fontSize: '14px', fontWeight: 600 },
  errorBox: { backgroundColor: '#FFF5F5', color: theme.negative, padding: '20px', borderRadius: '12px', textAlign: 'center', fontWeight: 500 },
  metricsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '20px', marginBottom: '30px' },
  metricBox: { backgroundColor: theme.background, padding: '20px', borderRadius: '12px', textAlign: 'center', border: `1px solid ${theme.border}` },
  chartContainer: { marginTop: '20px' },
  tooltipContainer: { backgroundColor: 'rgba(255, 255, 255, 0.95)', border: `1px solid ${theme.border}`, padding: '12px 16px', borderRadius: '12px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)', backdropFilter: 'blur(5px)' },
  tooltipLabel: { margin: 0, marginBottom: '8px', color: theme.textPrimary, fontWeight: 600 },
  tooltipText: { margin: 0, color: theme.textSecondary },
};

// --- DYNAMIC STYLES & ANIMATIONS ---
const styleSheet = document.createElement('style');
styleSheet.innerHTML = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes progress {
    0% { transform: translateX(-100%); }
    50% { transform: translateX(100%); }
    100% { transform: translateX(-100%); }
  }
  
  @keyframes tagIn {
      from { transform: scale(0.5); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .results-fade-in {
      animation: fadeIn 0.8s ease-out forwards;
  }
  
  .dropdown-item:hover {
    background-color: ${theme.background} !important;
  }

  .removeBtn:hover {
      background-color: rgba(255,255,255,0.4) !important;
  }
  
  .predict-button:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 7px 20px -5px rgba(90, 103, 216, 0.8) !important;
  }
  
  .export-button:hover {
      background-color: #2C7A7B !important;
      transform: translateY(-2px);
  }
  
  .summaryCard:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.07) !important;
  }

  /* Custom input focus styles */
  .searchInput:focus, .dateInput:focus {
      border-color: ${theme.primary} !important;
      box-shadow: 0 0 0 3px rgba(90, 103, 216, 0.2) !important;
  }
`;
document.head.appendChild(styleSheet);

export default Prediction;