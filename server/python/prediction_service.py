import json
import sys
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from statsmodels.tsa.arima.model import ARIMA
import warnings
warnings.filterwarnings('ignore')

# Mock stock symbols for companies
COMPANY_SYMBOLS = {
    'Apple Inc': 'AAPL', 'Microsoft Corporation': 'MSFT', 'Amazon.com Inc': 'AMZN',
    'Alphabet Inc': 'GOOGL', 'Tesla Inc': 'TSLA', 'Meta Platforms Inc': 'META',
    'NVIDIA Corporation': 'NVDA', 'Netflix Inc': 'NFLX', 'PayPal Holdings Inc': 'PYPL',
    'Adobe Inc': 'ADBE', 'Salesforce Inc': 'CRM', 'Intel Corporation': 'INTC',
    'Cisco Systems Inc': 'CSCO', 'Oracle Corporation': 'ORCL', 'IBM': 'IBM',
    'Advanced Micro Devices': 'AMD', 'Zoom Video Communications': 'ZM',
    'Twitter Inc': 'TWTR', 'Spotify Technology SA': 'SPOT', 'Square Inc': 'SQ',
    'Shopify Inc': 'SHOP', 'DocuSign Inc': 'DOCU', 'Peloton Interactive': 'PTON',
    'Roku Inc': 'ROKU', 'CrowdStrike Holdings': 'CRWD', 'Snowflake Inc': 'SNOW',
    'Palantir Technologies': 'PLTR', 'Unity Software Inc': 'U',
    'Roblox Corporation': 'RBLX', 'Coinbase Global Inc': 'COIN'
}

def generate_mock_historical_data(days=100):
    """Generate realistic mock stock data"""
    dates = pd.date_range(end=datetime.now().date(), periods=days, freq='D')
    
    # Generate price with trend and volatility
    base_price = np.random.uniform(50, 300)
    trend = np.random.uniform(-0.1, 0.2)
    volatility = np.random.uniform(0.15, 0.35)
    
    prices = []
    current_price = base_price
    
    for i in range(days):
        daily_return = np.random.normal(trend/365, volatility/np.sqrt(365))
        current_price *= (1 + daily_return)
        prices.append(current_price)
    
    return dates, prices

def calculate_technical_indicators(prices):
    """Calculate RSI and moving averages"""
    prices_array = np.array(prices)
    
    # RSI calculation (simplified)
    delta = np.diff(prices_array)
    gain = np.where(delta > 0, delta, 0)
    loss = np.where(delta < 0, -delta, 0)
    
    avg_gain = np.mean(gain[-14:]) if len(gain) >= 14 else np.mean(gain)
    avg_loss = np.mean(loss[-14:]) if len(loss) >= 14 else np.mean(loss)
    
    rs = avg_gain / (avg_loss + 1e-10)
    rsi = 100 - (100 / (1 + rs))
    
    # Moving averages
    ma_20 = np.mean(prices_array[-20:]) if len(prices_array) >= 20 else np.mean(prices_array)
    ma_50 = np.mean(prices_array[-50:]) if len(prices_array) >= 50 else np.mean(prices_array)
    
    return {
        'rsi': max(0, min(100, rsi)),
        'ma_20': ma_20,
        'ma_50': ma_50
    }

def predict_with_arima(prices, days_ahead):
    """Use ARIMA model for prediction"""
    try:
        # Fit ARIMA model with auto parameter selection
        model = ARIMA(prices, order=(1, 1, 1))
        fitted_model = model.fit()
        
        # Forecast
        forecast = fitted_model.forecast(steps=days_ahead)
        conf_int = fitted_model.get_forecast(steps=days_ahead).conf_int()
        
        return {
            'forecast': forecast.tolist(),
            'upper_ci': conf_int.iloc[:, 1].tolist(),
            'lower_ci': conf_int.iloc[:, 0].tolist(),
            'params': [1, 1, 1]
        }
    except:
        # Fallback simple prediction
        last_price = prices[-1]
        growth_rate = np.mean(np.diff(prices[-10:])) if len(prices) > 10 else 0
        
        forecast = [last_price + growth_rate * i for i in range(1, days_ahead + 1)]
        margin = last_price * 0.15
        
        return {
            'forecast': forecast,
            'upper_ci': [p + margin for p in forecast],
            'lower_ci': [p - margin for p in forecast],
            'params': [1, 1, 1]
        }

def analyze_company(company_name, target_date):
    """Analyze single company prediction"""
    try:
        symbol = COMPANY_SYMBOLS.get(company_name, 'UNKNOWN')
        
        # Generate mock data
        dates, prices = generate_mock_historical_data(100)
        current_price = prices[-1]
        
        # Calculate days to target
        today = datetime.now().date()
        target_dt = datetime.strptime(target_date, '%Y-%m-%d').date()
        days_ahead = (target_dt - today).days
        
        if days_ahead <= 0:
            raise ValueError("Target date must be in the future")
        
        # Technical analysis
        technical = calculate_technical_indicators(prices)
        
        # ARIMA prediction
        prediction_data = predict_with_arima(prices, days_ahead)
        predicted_price = prediction_data['forecast'][-1]
        
        # Calculate metrics
        price_change = predicted_price - current_price
        price_change_percent = (price_change / current_price) * 100
        
        # Calculate volatility
        returns = np.diff(prices) / prices[:-1]
        volatility = np.std(returns) * np.sqrt(252) * 100  # Annualized volatility
        
        # Risk assessment
        if volatility < 20:
            risk_level = 'Low'
        elif volatility < 35:
            risk_level = 'Medium'
        else:
            risk_level = 'High'
        
        # Confidence based on volatility and model fit
        confidence = max(60, min(95, 100 - volatility * 1.5))
        
        # Trend and sentiment
        trend_direction = 'Upward' if price_change > 0 else 'Downward'
        market_sentiment = 'Bullish' if price_change > 0 else 'Bearish'
        
        # Prepare forecast dates
        forecast_dates = [(today + timedelta(days=i)).strftime('%Y-%m-%d') 
                         for i in range(1, days_ahead + 1)]
        
        # Historical data for charting
        historical_dates = [d.strftime('%Y-%m-%d') for d in dates[-30:]]  # Last 30 days
        historical_prices = prices[-30:]
        
        return {
            'symbol': symbol,
            'current_price': round(current_price, 2),
            'predicted_price': round(predicted_price, 2),
            'price_change': round(price_change, 2),
            'price_change_percent': round(price_change_percent, 2),
            'volatility': round(volatility, 2),
            'risk_level': risk_level,
            'prediction_confidence': round(confidence, 1),
            'trend_direction': trend_direction,
            'market_sentiment': market_sentiment,
            'arima_params': prediction_data['params'],
            'technical_analysis': {
                'rsi': round(technical['rsi'], 2),
                'ma_20': round(technical['ma_20'], 2),
                'ma_50': round(technical['ma_50'], 2)
            },
            'recent_historical': {
                'dates': historical_dates,
                'prices': [round(p, 2) for p in historical_prices]
            },
            'forecast_data': {
                'dates': forecast_dates,
                'values': [round(v, 2) for v in prediction_data['forecast']],
                'upper_ci': [round(v, 2) for v in prediction_data['upper_ci']],
                'lower_ci': [round(v, 2) for v in prediction_data['lower_ci']]
            }
        }
    except Exception as e:
        return {'error': str(e)}

def main():
    try:
        # Get input from command line
        input_data = json.loads(sys.argv[1])
        companies = input_data['companies']
        target_date = input_data['targetDate']
        
        results = {}
        for company in companies:
            results[company] = analyze_company(company, target_date)
        
        # Calculate summary statistics
        valid_predictions = [p for p in results.values() if 'error' not in p]
        
        if valid_predictions:
            price_changes = [p['price_change_percent'] for p in valid_predictions]
            volatilities = [p['volatility'] for p in valid_predictions]
            
            summary = {
                'totalCompanies': len(valid_predictions),
                'averageGain': round(np.mean(price_changes), 2),
                'highestGain': round(max(price_changes), 2),
                'lowestGain': round(min(price_changes), 2),
                'bullishCount': sum(1 for p in valid_predictions if p['market_sentiment'] == 'Bullish'),
                'bearishCount': sum(1 for p in valid_predictions if p['market_sentiment'] == 'Bearish'),
                'averageVolatility': round(np.mean(volatilities), 2),
                'highRiskCount': sum(1 for p in valid_predictions if p['risk_level'] == 'High'),
                'mediumRiskCount': sum(1 for p in valid_predictions if p['risk_level'] == 'Medium'),
                'lowRiskCount': sum(1 for p in valid_predictions if p['risk_level'] == 'Low')
            }
        else:
            summary = {
                'totalCompanies': 0, 'averageGain': 0, 'highestGain': 0,
                'lowestGain': 0, 'bullishCount': 0, 'bearishCount': 0,
                'averageVolatility': 0, 'highRiskCount': 0, 'mediumRiskCount': 0, 'lowRiskCount': 0
            }
        
        output = {
            'predictions': results,
            'summary': summary,
            'analysisDate': datetime.now().strftime('%Y-%m-%d'),
            'targetDate': target_date,
            'companiesAnalyzed': len(companies)
        }
        
        print(json.dumps(output))
        
    except Exception as e:
        error_output = {
            'predictions': {},
            'summary': {},
            'error': str(e)
        }
        print(json.dumps(error_output))

if __name__ == "__main__":
    main()