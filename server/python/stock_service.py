#!/usr/bin/env python3
"""
Stock Service - Python-based stock data processing
Handles data cleaning, normalization, and preprocessing for stock market analysis
"""

import sys
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

def clean_stock_data(data):
    """
    Clean and preprocess stock data
    - Remove missing values
    - Handle outliers
    - Normalize date formats
    - Validate data types
    """
    try:
        # Convert to DataFrame
        df = pd.DataFrame(data)
        
        # Convert date column
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date').reset_index(drop=True)
        
        # Remove rows with missing critical data
        original_count = len(df)
        df = df.dropna(subset=['close', 'open', 'high', 'low'])
        
        # Validate price data
        df = df[df['close'] > 0]
        df = df[df['open'] > 0]
        df = df[df['high'] > 0]
        df = df[df['low'] > 0]
        
        # Check for price consistency (high >= low, etc.)
        df = df[df['high'] >= df['low']]
        df = df[df['high'] >= df['close']]
        df = df[df['high'] >= df['open']]
        df = df[df['close'] >= df['low']]
        df = df[df['open'] >= df['low']]
        
        # Handle volume (set to 0 if missing)
        df['volume'] = df['volume'].fillna(0)
        df['volume'] = df['volume'].clip(lower=0)
        
        # Remove extreme outliers (more than 3 standard deviations)
        for col in ['open', 'high', 'low', 'close']:
            mean = df[col].mean()
            std = df[col].std()
            df = df[np.abs(df[col] - mean) <= (3 * std)]
        
        # Ensure chronological order
        df = df.sort_values('date').reset_index(drop=True)
        
        cleaned_count = len(df)
        removed_count = original_count - cleaned_count
        
        return {
            'cleaned_data': df.to_dict('records'),
            'original_count': original_count,
            'cleaned_count': cleaned_count,
            'removed_count': removed_count,
            'cleaning_ratio': cleaned_count / original_count if original_count > 0 else 0
        }
        
    except Exception as e:
        raise Exception(f"Data cleaning failed: {str(e)}")

def calculate_basic_indicators(df):
    """
    Calculate basic technical indicators
    """
    try:
        if len(df) < 20:
            return {}
            
        # Convert to numeric
        df['close'] = pd.to_numeric(df['close'], errors='coerce')
        df['volume'] = pd.to_numeric(df['volume'], errors='coerce').fillna(0)
        
        # Basic statistics
        stats = {
            'mean_price': float(df['close'].mean()),
            'std_price': float(df['close'].std()),
            'min_price': float(df['close'].min()),
            'max_price': float(df['close'].max()),
            'mean_volume': float(df['volume'].mean()),
            'total_volume': float(df['volume'].sum()),
        }
        
        # Simple Moving Averages
        if len(df) >= 5:
            stats['sma_5'] = float(df['close'].rolling(window=5).mean().iloc[-1])
        if len(df) >= 10:
            stats['sma_10'] = float(df['close'].rolling(window=10).mean().iloc[-1])
        if len(df) >= 20:
            stats['sma_20'] = float(df['close'].rolling(window=20).mean().iloc[-1])
        if len(df) >= 50:
            stats['sma_50'] = float(df['close'].rolling(window=50).mean().iloc[-1])
        
        # Price changes
        df['daily_return'] = df['close'].pct_change()
        stats['avg_daily_return'] = float(df['daily_return'].mean())
        stats['volatility'] = float(df['daily_return'].std())
        
        # Price range
        df['price_range'] = df['high'] - df['low']
        stats['avg_price_range'] = float(df['price_range'].mean())
        
        return stats
        
    except Exception as e:
        print(f"Warning: Indicator calculation failed: {str(e)}")
        return {}

def normalize_dates(data):
    """
    Ensure all dates are in consistent format
    """
    try:
        for record in data:
            if 'date' in record:
                # Convert to datetime if string
                if isinstance(record['date'], str):
                    try:
                        dt = pd.to_datetime(record['date'])
                        record['date'] = dt.strftime('%Y-%m-%d')
                    except:
                        # If parsing fails, keep original
                        pass
        return data
    except Exception as e:
        print(f"Warning: Date normalization failed: {str(e)}")
        return data

def validate_data_integrity(data):
    """
    Perform data integrity checks
    """
    issues = []
    
    try:
        if not data:
            issues.append("No data provided")
            return issues
            
        # Check for required fields
        required_fields = ['date', 'open', 'high', 'low', 'close']
        for i, record in enumerate(data[:5]):  # Check first 5 records
            for field in required_fields:
                if field not in record or record[field] is None:
                    issues.append(f"Missing {field} in record {i}")
        
        # Check data types and ranges
        numeric_fields = ['open', 'high', 'low', 'close', 'volume']
        for i, record in enumerate(data[:10]):  # Check first 10 records
            for field in numeric_fields:
                if field in record and record[field] is not None:
                    try:
                        value = float(record[field])
                        if field != 'volume' and value <= 0:
                            issues.append(f"Invalid {field} value in record {i}: {value}")
                    except (ValueError, TypeError):
                        issues.append(f"Non-numeric {field} in record {i}")
        
        return issues
        
    except Exception as e:
        return [f"Validation error: {str(e)}"]

def process_stock_data(stock_data):
    """
    Main processing function
    """
    try:
        symbol = stock_data.get('symbol', 'UNKNOWN')
        period = stock_data.get('period', '1y')
        interval = stock_data.get('interval', '1d')
        data = stock_data.get('data', [])
        
        print(f"Processing {symbol} data: {len(data)} records", file=sys.stderr)
        
        # Validate input data
        validation_issues = validate_data_integrity(data)
        
        if not data:
            raise Exception("No stock data provided")
        
        # Step 1: Normalize dates
        normalized_data = normalize_dates(data)
        
        # Step 2: Clean data
        cleaning_result = clean_stock_data(normalized_data)
        cleaned_data = cleaning_result['cleaned_data']
        
        # Step 3: Calculate indicators
        df = pd.DataFrame(cleaned_data)
        indicators = calculate_basic_indicators(df)
        
        # Step 4: Prepare final result
        result = {
            'success': True,
            'symbol': symbol,
            'period': period,
            'interval': interval,
            'processed_at': datetime.now().isoformat(),
            'validation_issues': validation_issues,
            'cleaning_summary': {
                'original_count': cleaning_result['original_count'],
                'cleaned_count': cleaning_result['cleaned_count'],
                'removed_count': cleaning_result['removed_count'],
                'cleaning_ratio': round(cleaning_result['cleaning_ratio'], 3)
            },
            'indicators': indicators,
            'cleaned_data': cleaned_data[:100],  # Limit output size
            'data_summary': {
                'total_records': len(cleaned_data),
                'date_range': {
                    'start': cleaned_data[0]['date'] if cleaned_data else None,
                    'end': cleaned_data[-1]['date'] if cleaned_data else None
                },
                'price_summary': {
                    'first_close': cleaned_data[0]['close'] if cleaned_data else None,
                    'last_close': cleaned_data[-1]['close'] if cleaned_data else None,
                    'min_close': min(r['close'] for r in cleaned_data) if cleaned_data else None,
                    'max_close': max(r['close'] for r in cleaned_data) if cleaned_data else None
                }
            }
        }
        
        return result
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'symbol': stock_data.get('symbol', 'UNKNOWN'),
            'processed_at': datetime.now().isoformat()
        }

def main():
    """
    Main entry point - processes command line arguments
    """
    try:
        if len(sys.argv) < 2:
            raise Exception("No stock data provided as argument")
        
        # Parse JSON input from command line argument
        json_input = sys.argv[1]
        stock_data = json.loads(json_input)
        
        # Process the data
        result = process_stock_data(stock_data)
        
        # Output result as JSON
        print(json.dumps(result, indent=2))
        
    except json.JSONDecodeError as e:
        error_result = {
            'success': False,
            'error': f"Invalid JSON input: {str(e)}",
            'processed_at': datetime.now().isoformat()
        }
        print(json.dumps(error_result))
        sys.exit(1)
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'processed_at': datetime.now().isoformat()
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main()