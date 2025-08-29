import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Brain,
  BarChart3,
  Activity,
  AlertTriangle,
  Bell,
  PieChart,
  ArrowRight,
} from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f1a] via-[#161625] to-[#1c1c2e] relative overflow-hidden text-white">
      {/* Hero Background */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${heroImage})` }}
      ></div>

      {/* Navigation */}
      <nav className="relative border-b border-white/10 backdrop-blur-lg bg-black/20 z-10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-extrabold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
              StockTrendAI
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#features"
              className="text-gray-300 hover:text-white transition"
            >
              Features
            </a>
          </div>

          <div className="flex items-center space-x-4">
            <Link to="/signin">
              <Button variant="ghost" className="hover:bg-white/10 text-white">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:shadow-lg hover:shadow-purple-500/30 text-white">
                Start Now
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-28 px-6 flex items-center justify-center z-10">
        <div className="container mx-auto text-center">
          <div className="bg-white/5 backdrop-blur-xl border border-white/20 rounded-3xl p-12 shadow-[0_0_60px_-15px_rgba(128,0,255,0.5)] max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-white">
              Predict Market Moves with{" "}
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                AI Precision
              </span>
            </h1>

            <p className="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed">
              Harness AI-powered models trained on Yahoo Finance data to forecast
              stock trends, analyze risks, and make smarter investment decisions
              in real-time.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:shadow-lg hover:shadow-blue-500/30 text-lg px-8 py-4 text-white"
                >
                  Start Now <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/demo">
                <Button
                  size="lg"
                  variant="outline"
                  className="border border-white/40 text-white hover:bg-white/10 px-8 py-4"
                >
                  Watch Demo
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 text-center">
            <div>
              <h3 className="text-4xl font-extrabold text-purple-400">95%</h3>
              <p className="text-gray-400">Accuracy Rate</p>
            </div>
            <div>
              <h3 className="text-4xl font-extrabold text-blue-400">$2.1B+</h3>
              <p className="text-gray-400">Assets Analyzed</p>
            </div>
            <div>
              <h3 className="text-4xl font-extrabold text-purple-400">50K+</h3>
              <p className="text-gray-400">Active Traders</p>
            </div>
            <div>
              <h3 className="text-4xl font-extrabold text-blue-400">24/7</h3>
              <p className="text-gray-400">Market Monitoring</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="relative py-20 px-6 border-t border-white/10 z-10 bg-black/30 backdrop-blur-sm"
      >
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-white">
              🚀 StockTrendAI – Features
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              AI-driven forecasts, sentiment analysis, and portfolio simulations
              to supercharge your trading decisions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Live Data */}
            <Card className="bg-white/5 border border-white/10 hover:shadow-lg hover:shadow-purple-500/20 transition">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-white">Live Market Data</CardTitle>
                <CardDescription className="text-gray-400">
                  Real-time prices, volume, and market cap – powered by Yahoo
                  Finance.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* AI Predictions */}
            <Card className="bg-white/5 border border-white/10 hover:shadow-lg hover:shadow-purple-500/20 transition">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-white">AI Predictions</CardTitle>
                <CardDescription className="text-gray-400">
                  Next-day forecast: $128 ±1.2% (Confidence: 78%) <br />
                  🔺 Uptrend, 🔻 Downtrend, ➖ Sideways
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Forecasting */}
            <Card className="bg-white/5 border border-white/10 hover:shadow-lg hover:shadow-purple-500/20 transition">
              <CardHeader>
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-white">Forecasting</CardTitle>
                <CardDescription className="text-gray-400">
                  Short-term (1–7 days) & Long-term (1–6 months) AI trend
                  forecasts.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* AI Risk Meter */}
            <Card className="bg-white/5 border border-white/10 hover:shadow-lg hover:shadow-purple-500/20 transition">
              <CardHeader>
                <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mb-4">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-white">AI Risk Meter</CardTitle>
                <CardDescription className="text-gray-400">
                  Tesla → High Risk 🚨 <br />
                  Apple → Low Risk ✅
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Sentiment */}
            <Card className="bg-white/5 border border-white/10 hover:shadow-lg hover:shadow-purple-500/20 transition">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mb-4">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-white">Sentiment Analysis</CardTitle>
                <CardDescription className="text-gray-400">
                  AI combines Yahoo news sentiment + historical data. Example: 📉
                  -2% dip expected due to negative headlines.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Portfolio Simulator */}
            <Card className="bg-white/5 border border-white/10 hover:shadow-lg hover:shadow-purple-500/20 transition">
              <CardHeader>
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mb-4">
                  <PieChart className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-white">Portfolio Simulator</CardTitle>
                <CardDescription className="text-gray-400">
                  Add 2–3 stocks & simulate growth over 1 week, 1 month, 1 year.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* AI Alerts */}
            <Card className="bg-white/5 border border-white/10 hover:shadow-lg hover:shadow-purple-500/20 transition">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center mb-4">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-white">AI Alerts</CardTitle>
                <CardDescription className="text-gray-400">
                  🔔 Amazon may rise +4% in 5 days. <br /> ✅ Safer option →
                  Microsoft.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/10 py-12 px-6 z-10 bg-black/30 backdrop-blur-md">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              StockTrendAI
            </span>
          </div>

          <div className="flex space-x-6 text-gray-400">
            <a href="#" className="hover:text-white transition">
              Privacy
            </a>
            <a href="#" className="hover:text-white transition">
              Terms
            </a>
            <a href="#" className="hover:text-white transition">
              Support
            </a>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 StockTrendAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
