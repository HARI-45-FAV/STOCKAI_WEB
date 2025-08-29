#!/usr/bin/env python3
"""
RADAPT.py - Recognition, Assimilation, Decision, Action, PAST, Transfer
Advanced stock processing using the RADAPT methodology
"""

import sys
import json
import pandas as pd
import numpy as np
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

def radapt_recognition(data):
    """
    Recognition Phase: Identify patterns and anomalies in stock data
    """
    try:
        df = pd.DataFrame(data)
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        
        recognition_signals = []
        
        # Price pattern recognition
        if len(df) >= 5:
            recent_closes = df['close'].tail(5).values
            if np.all(np.diff(recent_closes) > 0):
                recognition_signals.append("UPTREND_PATTERN")
            elif np.all(np.diff(recent_closes) < 0):
                recognition_signals.append("DOWNTREND_PATTERN")
        
        # Volume spike recognition
        if len(df) >= 10:
            avg_volume = df['volume'].mean()
            recent_volume = df['volume'].tail(1).values[0]
            if recent_volume > avg_volume * 2:
                recognition_signals.append("VOLUME_SPIKE")
        
        # Price volatility recognition
        if len(df) >= 20:
            returns = df['close'].pct_change().dropna()
            volatility = returns.std()
            if volatility > 0.05:
                recognition_signals.append("HIGH_VOLATILITY")
        
        return {
            'phase': 'Recognition',
            'signals': recognition_signals,
            'data_points': len(df),
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'phase': 'Recognition',
            'error': str(e),
            'signals': []
        }

def radapt_assimilation(recognition_data, stock_data):
    """
    Assimilation Phase: Process and integrate recognized patterns
    """
    try:
        df = pd.DataFrame(stock_data)
        signals = recognition_data.get('signals', [])
        
        assimilated_insights = []
        
        # Assimilate trend information
        if "UPTREND_PATTERN" in signals:
            assimilated_insights.append({
                'type': 'TREND_ANALYSIS',
                'conclusion': 'BULLISH_MOMENTUM',
                'confidence': 0.8
            })
        elif "DOWNTREND_PATTERN" in signals:
            assimilated_insights.append({
                'type': 'TREND_ANALYSIS',
                'conclusion': 'BEARISH_MOMENTUM',
                'confidence': 0.8
            })
        
        # Assimilate volume data
        if "VOLUME_SPIKE" in signals:
            assimilated_insights.append({
                'type': 'VOLUME_ANALYSIS',
                'conclusion': 'INSTITUTIONAL_INTEREST',
                'confidence': 0.7
            })
        
        # Calculate technical indicators for assimilation
        if len(df) >= 20:
            df['sma_20'] = df['close'].rolling(window=20).mean()
            current_price = df['close'].iloc[-1]
            sma_20 = df['sma_20'].iloc[-1]
            
            if current_price > sma_20:
                assimilated_insights.append({
                    'type': 'TECHNICAL_ANALYSIS',
                    'conclusion': 'ABOVE_SMA20',
                    'confidence': 0.6
                })
        
        return {
            'phase': 'Assimilation',
            'insights': assimilated_insights,
            'processed_signals': len(signals),
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'phase': 'Assimilation',
            'error': str(e),
            'insights': []
        }

def radapt_decision(assimilation_data):
    """
    Decision Phase: Make trading decisions based on assimilated data
    """
    try:
        insights = assimilation_data.get('insights', [])
        
        decision_score = 0
        decision_factors = []
        
        for insight in insights:
            if insight['conclusion'] == 'BULLISH_MOMENTUM':
                decision_score += insight['confidence']
                decision_factors.append('POSITIVE_TREND')
            elif insight['conclusion'] == 'BEARISH_MOMENTUM':
                decision_score -= insight['confidence']
                decision_factors.append('NEGATIVE_TREND')
            elif insight['conclusion'] == 'INSTITUTIONAL_INTEREST':
                decision_score += insight['confidence'] * 0.5
                decision_factors.append('VOLUME_SUPPORT')
            elif insight['conclusion'] == 'ABOVE_SMA20':
                decision_score += insight['confidence'] * 0.3
                decision_factors.append('TECHNICAL_STRENGTH')
        
        # Make final decision
        if decision_score > 0.8:
            decision = "STRONG_BUY"
        elif decision_score > 0.4:
            decision = "BUY"
        elif decision_score > -0.4:
            decision = "HOLD"
        elif decision_score > -0.8:
            decision = "SELL"
        else:
            decision = "STRONG_SELL"
        
        return {
            'phase': 'Decision',
            'decision': decision,
            'confidence_score': round(abs(decision_score), 3),
            'decision_factors': decision_factors,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'phase': 'Decision',
            'error': str(e),
            'decision': 'HOLD'
        }

def radapt_action(decision_data, symbol):
    """
    Action Phase: Generate actionable trading recommendations
    """
    try:
        decision = decision_data.get('decision', 'HOLD')
        confidence = decision_data.get('confidence_score', 0)
        
        actions = []
        
        if decision in ['STRONG_BUY', 'BUY']:
            actions.append({
                'action_type': 'ENTRY',
                'direction': 'LONG',
                'urgency': 'HIGH' if decision == 'STRONG_BUY' else 'MEDIUM',
                'position_size': 'FULL' if confidence > 0.8 else 'PARTIAL'
            })
        elif decision in ['STRONG_SELL', 'SELL']:
            actions.append({
                'action_type': 'EXIT',
                'direction': 'SHORT',
                'urgency': 'HIGH' if decision == 'STRONG_SELL' else 'MEDIUM',
                'position_size': 'FULL' if confidence > 0.8 else 'PARTIAL'
            })
        else:
            actions.append({
                'action_type': 'MONITOR',
                'direction': 'NEUTRAL',
                'urgency': 'LOW',
                'position_size': 'HOLD'
            })
        
        return {
            'phase': 'Action',
            'symbol': symbol,
            'recommended_actions': actions,
            'execution_priority': 'HIGH' if confidence > 0.7 else 'MEDIUM',
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'phase': 'Action',
            'error': str(e),
            'recommended_actions': []
        }

def radapt_past_analysis(stock_data, symbol):
    """
    PAST Phase: Analyze historical patterns and performance
    """
    try:
        df = pd.DataFrame(stock_data)
        
        if len(df) < 30:
            return {
                'phase': 'PAST',
                'error': 'Insufficient historical data',
                'patterns': []
            }
        
        historical_patterns = []
        
        # Historical volatility analysis
        returns = df['close'].pct_change().dropna()
        volatility_percentile = np.percentile(returns.abs(), 95)
        
        if volatility_percentile > 0.05:
            historical_patterns.append("HIGH_HISTORICAL_VOLATILITY")
        
        # Support and resistance levels
        highs = df['high'].rolling(window=20).max()
        lows = df['low'].rolling(window=20).min()
        
        current_price = df['close'].iloc[-1]
        recent_high = highs.iloc[-1]
        recent_low = lows.iloc[-1]
        
        if current_price > recent_high * 0.95:
            historical_patterns.append("NEAR_RESISTANCE")
        elif current_price < recent_low * 1.05:
            historical_patterns.append("NEAR_SUPPORT")
        
        # Seasonal patterns (simplified)
        df['month'] = pd.to_datetime(df['date']).dt.month
        monthly_returns = df.groupby('month')['close'].pct_change().mean()
        
        if len(monthly_returns) > 0:
            best_month = monthly_returns.idxmax()
            historical_patterns.append(f"SEASONAL_STRENGTH_MONTH_{best_month}")
        
        return {
            'phase': 'PAST',
            'symbol': symbol,
            'historical_patterns': historical_patterns,
            'analysis_period': f"{len(df)}_days",
            'volatility_score': round(volatility_percentile, 4),
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'phase': 'PAST',
            'error': str(e),
            'historical_patterns': []
        }

def radapt_transfer(all_phases_data, symbol):
    """
    Transfer Phase: Consolidate all insights into actionable intelligence
    """
    try:
        final_recommendation = {
            'symbol': symbol,
            'radapt_analysis': {
                'recognition': all_phases_data.get('recognition', {}),
                'assimilation': all_phases_data.get('assimilation', {}),
                'decision': all_phases_data.get('decision', {}),
                'action': all_phases_data.get('action', {}),
                'past': all_phases_data.get('past', {})
            },
            'consolidated_recommendation': {},
            'risk_assessment': {},
            'timestamp': datetime.now().isoformat()
        }
        
        # Consolidate decision
        decision_phase = all_phases_data.get('decision', {})
        action_phase = all_phases_data.get('action', {})
        
        final_recommendation['consolidated_recommendation'] = {
            'primary_decision': decision_phase.get('decision', 'HOLD'),
            'confidence_level': decision_phase.get('confidence_score', 0),
            'recommended_actions': action_phase.get('recommended_actions', []),
            'execution_timeline': 'IMMEDIATE' if decision_phase.get('confidence_score', 0) > 0.8 else 'MONITOR'
        }
        
        # Risk assessment
        past_phase = all_phases_data.get('past', {})
        volatility = past_phase.get('volatility_score', 0)
        
        if volatility > 0.05:
            risk_level = 'HIGH'
        elif volatility > 0.03:
            risk_level = 'MEDIUM'
        else:
            risk_level = 'LOW'
        
        final_recommendation['risk_assessment'] = {
            'risk_level': risk_level,
            'volatility_score': volatility,
            'historical_patterns': past_phase.get('historical_patterns', [])
        }
        
        return final_recommendation
        
    except Exception as e:
        return {
            'symbol': symbol,
            'error': f"Transfer phase failed: {str(e)}",
            'timestamp': datetime.now().isoformat()
        }

def process_radapt(symbol, stock_data):
    """
    Execute complete RADAPT processing pipeline
    """
    try:
        print(f"Starting RADAPT analysis for {symbol}", file=sys.stderr)
        
        # Execute all phases
        recognition = radapt_recognition(stock_data)
        assimilation = radapt_assimilation(recognition, stock_data)
        decision = radapt_decision(assimilation)
        action = radapt_action(decision, symbol)
        past = radapt_past_analysis(stock_data, symbol)
        
        # Combine all phases
        all_phases = {
            'recognition': recognition,
            'assimilation': assimilation,
            'decision': decision,
            'action': action,
            'past': past
        }
        
        # Transfer phase - final consolidation
        transfer = radapt_transfer(all_phases, symbol)
        
        return {
            'success': True,
            'symbol': symbol,
            'radapt_complete': transfer,
            'processing_summary': {
                'phases_completed': len(all_phases),
                'total_data_points': len(stock_data),
                'analysis_timestamp': datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'symbol': symbol,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

def main():
    """
    Main entry point for RADAPT processing
    """
    try:
        if len(sys.argv) < 2:
            print(json.dumps({
                'success': False,
                'error': 'No symbol provided',
                'usage': 'python radapt.py <symbol>'
            }))
            return
        
        symbol = sys.argv[1]
        
        # For demo purposes, create sample stock data
        # In production, this would fetch real data
        sample_data = []
        base_price = 100.0
        
        for i in range(60):  # 60 days of sample data
            date = datetime.now().replace(day=1) + pd.DateOffset(days=i)
            price = base_price + np.random.normal(0, 2) + (i * 0.1)  # Slight uptrend with noise
            volume = 1000000 + np.random.randint(-200000, 200000)
            
            sample_data.append({
                'date': date.strftime('%Y-%m-%d'),
                'open': price * 0.995,
                'high': price * 1.02,
                'low': price * 0.98,
                'close': price,
                'volume': max(volume, 100000)
            })
        
        # Process with RADAPT
        result = process_radapt(symbol, sample_data)
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': f"RADAPT processing failed: {str(e)}",
            'timestamp': datetime.now().isoformat()
        }
        print(json.dumps(error_result))

if __name__ == "__main__":
    main()