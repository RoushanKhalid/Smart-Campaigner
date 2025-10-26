"""
Quick start script for Smart Campaigner
Run this file to start the Flask web application
"""

import os
import sys

# Check if required packages are installed
try:
    import flask
    import pandas
    import sklearn
except ImportError as e:
    print(f"Error: Missing required package: {e}")
    print("\nPlease install dependencies first:")
    print("pip install -r requirements.txt")
    sys.exit(1)

# Start the Flask app
if __name__ == '__main__':
    from app import app
    print("\n" + "="*60)
    print("  🛍️  Smart Campaigner - RFM Analysis Web Application")
    print("="*60)
    print("\nStarting server...")
    print("Open your browser and go to: http://localhost:5000")
    print("\nPress Ctrl+C to stop the server")
    print("="*60 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)

