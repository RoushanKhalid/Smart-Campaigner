# Smart Campaigner - RFM Analysis Web Application

A comprehensive web application for customer segmentation using RFM (Recency, Frequency, Monetary) analysis with K-Means clustering.

## Features

- 📊 **RFM Analysis**: Automatically calculates Recency, Frequency, and Monetary values from transaction data
- 🎯 **Customer Segmentation**: Groups customers into 4 segments (Platinum, Gold, Silver, Bronze)
- 📈 **Visual Analytics**: Interactive charts and visualizations
- 📋 **Data Export**: Download customer lists by segment
- 🔍 **Search & Filter**: Advanced filtering and search capabilities
- 🎨 **Modern UI**: Beautiful, responsive design

## Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Setup

1. Clone or download this repository

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Application

1. Start the Flask server:
```bash
python app.py
```

2. Open your browser and navigate to:
```
http://localhost:5000
```

## Usage

### Upload Your CSV File

The CSV file should contain the following columns:
- `InvoiceNo`: Invoice/Transaction ID
- `CustomerID`: Unique customer identifier
- `InvoiceDate`: Date of the transaction
- `Quantity`: Number of items
- `UnitPrice`: Price per unit
- `Location`: Customer location (optional)
- `CustomerPhoneNo`: Phone number (optional)
- `Email`: Customer email (optional)

### Analyze Data

1. Click "Select File" and choose your CSV file
2. Click "Analyze Data" to start the analysis
3. View the results including:
   - Customer segmentation statistics
   - Interactive charts
   - Detailed customer data table
   - Download options for each segment

### Export Results

Click any of the download buttons (Platinum, Gold, Silver, Bronze) to download the customer list for that segment as a CSV file.

## API Endpoints

### POST `/api/analyze`
Upload and analyze a CSV file
- **Request**: Form data with CSV file
- **Response**: JSON with analysis results

### GET `/api/download/<segment>`
Download customer segment data
- **Parameters**: segment (platinum, gold, silver, bronze)
- **Response**: CSV file

## Customer Segments

- **Platinum**: Highest value customers (frequent, recent, high spending)
- **Gold**: High value customers with good engagement
- **Silver**: Moderate value customers
- **Bronze**: Lower value or inactive customers

## Technology Stack

- **Backend**: Flask (Python)
- **Frontend**: HTML, CSS, JavaScript
- **Data Analysis**: pandas, numpy, scikit-learn
- **Visualization**: Chart.js
- **Machine Learning**: K-Means Clustering

## Project Structure

```
Smart Campaigner/
│
├── app.py                          # Flask backend application
├── requirements.txt                # Python dependencies
├── README.md                       # This file
│
├── templates/
│   └── index.html                  # Main web page
│
├── static/
│   ├── style.css                  # Styling
│   └── script.js                  # Frontend JavaScript
│
├── uploads/                       # Temporary file upload directory
│
└── synthetic_swopno_transactions_200.csv  # Sample dataset
```

## How It Works

1. **Data Upload**: User uploads a CSV file with customer transaction data
2. **RFM Calculation**:
   - **Recency**: Days since last purchase
   - **Frequency**: Number of transactions
   - **Monetary**: Total spending amount
3. **Clustering**: Uses K-Means (k=4) to group similar customers
4. **Segmentation**: Assigns customer groups based on cluster characteristics
5. **Visualization**: Displays results in charts and tables
6. **Export**: Allows downloading segment-specific customer lists

## Customization

### Change Current Date for Analysis

Edit line 15 in `app.py`:
```python
results = perform_rfm_analysis(filepath, '2026-01-01')  # Change this date
```

### Adjust Number of Clusters

Edit line 108 in `app.py`:
```python
kmeans = KMeans(n_clusters=4, ...)  # Change cluster count
```

### Modify Segments

Update the `func` function in `app.py` (lines 137-145) to change how clusters are assigned to segments.

## Troubleshooting

### Port Already in Use

If port 5000 is busy, change it in `app.py`:
```python
app.run(debug=True, host='0.0.0.0', port=8080)  # Use port 8080 instead
```

### File Upload Errors

- Ensure the CSV file has the correct column names
- Check that dates are in a valid format
- Verify file size is under 16MB

## License

This project is provided as-is for educational and commercial use.

## Author

Smart Campaigner - RFM Analysis Tool

