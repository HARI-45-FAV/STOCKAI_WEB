#!/usr/bin/env python3
"""
Health check script for the stock prediction service.
Verifies that all required dependencies are installed and working.
"""

import sys
import json
from datetime import datetime

def check_dependencies():
    """Check if all required Python packages are available"""
    required_packages = [
        'numpy', 'pandas', 'yfinance', 'statsmodels', 
        'sklearn', 'warnings', 'datetime', 'json'
    ]
    
    missing_packages = []
    package_versions = {}
    
    for package in required_packages:
        try:
            if package == 'sklearn':
                import sklearn
                package_versions[package] = sklearn.__version__
            elif package == 'yfinance':
                import yfinance
                package_versions[package] = yfinance.__version__ if hasattr(yfinance, '__version__') else 'unknown'
            elif package == 'statsmodels':
                import statsmodels
                package_versions[package] = statsmodels.__version__
            elif package == 'pandas':
                import pandas
                package_versions[package] = pandas.__version__
            elif package == 'numpy':
                import numpy
                package_versions[package] = numpy.__version__
            elif package in ['warnings', 'datetime', 'json']:
                # Built-in modules
                exec(f'import {package}')
                package_versions[package] = 'built-in'
                
        except ImportError:
            missing_packages.append(package)
    
    return missing_packages, package_versions

def test_data_fetching():
    """Test if we can fetch real-time data"""
    try:
        import yfinance as yf
        
        # Test with a reliable stock
        ticker = yf.Ticker("AAPL")
        hist = ticker.history(period="5d")
        
        if hist.empty:
            return False, "No data returned from yfinance"
            
        return True, f"Successfully fetched {len(hist)} days of data"
    except Exception as e:
        return False, f"Data fetching failed: {str(e)}"

def test_model_libraries():
    """Test if modeling libraries work correctly"""
    try:
        import numpy as np
        import pandas as pd
        from statsmodels.tsa.arima.model import ARIMA
        from sklearn.linear_model import LinearRegression
        from sklearn.preprocessing import MinMaxScaler
        
        # Create test data
        test_data = np.random.randn(100).cumsum() + 100
        
        # Test ARIMA
        try:
            arima_model = ARIMA(test_data, order=(1, 1, 1))
            arima_fitted = arima_model.fit()
            arima_forecast = arima_fitted.forecast(steps=5)
        except Exception as e:
            return False, f"ARIMA test failed: {str(e)}"
        
        # Test Linear Regression
        try:
            X = np.arange(len(test_data)).reshape(-1, 1)
            lr_model = LinearRegression()
            lr_model.fit(X, test_data)
            lr_pred = lr_model.predict([[len(test_data)]])
        except Exception as e:
            return False, f"Linear Regression test failed: {str(e)}"
        
        # Test MinMaxScaler
        try:
            scaler = MinMaxScaler()
            scaled_data = scaler.fit_transform(test_data.reshape(-1, 1))
        except Exception as e:
            return False, f"MinMaxScaler test failed: {str(e)}"
        
        return True, "All modeling libraries working correctly"
        
    except ImportError as e:
        return False, f"Failed to import modeling libraries: {str(e)}"

def main():
    try:
        health_status = {
            'timestamp': datetime.now().isoformat(),
            'python_version': f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            'status': 'healthy',
            'checks': {}
        }
        
        # Check dependencies
        missing_packages, package_versions = check_dependencies()
        if missing_packages:
            health_status['status'] = 'unhealthy'
            health_status['checks']['dependencies'] = {
                'status': 'failed',
                'missing_packages': missing_packages,
                'installed_packages': package_versions
            }
        else:
            health_status['checks']['dependencies'] = {
                'status': 'passed',
                'installed_packages': package_versions
            }
        
        # Test data fetching
        data_test_success, data_test_message = test_data_fetching()
        health_status['checks']['data_fetching'] = {
            'status': 'passed' if data_test_success else 'failed',
            'message': data_test_message
        }
        
        if not data_test_success:
            health_status['status'] = 'degraded'
        
        # Test model libraries
        model_test_success, model_test_message = test_model_libraries()
        health_status['checks']['modeling_libraries'] = {
            'status': 'passed' if model_test_success else 'failed',
            'message': model_test_message
        }
        
        if not model_test_success:
            health_status['status'] = 'unhealthy'
        
        # Overall assessment
        if health_status['status'] == 'healthy':
            health_status['message'] = 'All systems operational'
        elif health_status['status'] == 'degraded':
            health_status['message'] = 'Some non-critical issues detected'
        else:
            health_status['message'] = 'Critical issues detected'
        
        print(json.dumps(health_status, indent=2))
        
        # Exit with appropriate code
        if health_status['status'] == 'unhealthy':
            sys.exit(1)
        elif health_status['status'] == 'degraded':
            sys.exit(2)
        else:
            sys.exit(0)
            
    except Exception as e:
        error_status = {
            'timestamp': datetime.now().isoformat(),
            'status': 'unhealthy',
            'message': 'Health check script failed',
            'error': str(e)
        }
        print(json.dumps(error_status, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()