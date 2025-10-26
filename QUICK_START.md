# Quick Start Guide - Smart Campaigner

## 🚀 Getting Started in 3 Steps

### Step 1: Install Dependencies

Open a terminal/command prompt in the project directory and run:

```bash
pip install -r requirements.txt
```

### Step 2: Start the Application

**For Windows users:**
```bash
start.bat
```
or
```bash
python run.py
```

**For Linux/Mac users:**
```bash
chmod +x start.sh
./start.sh
```
or
```bash
python3 run.py
```

### Step 3: Open in Browser

Once the server starts, open your browser and go to:
```
http://localhost:5000
```

## 📋 Using the Application

1. **Upload CSV File**: Click "Select File" and choose your transaction CSV file
2. **Analyze**: Click "Analyze Data" to process your customer data
3. **View Results**: See your customers segmented into Bronze, Silver, Gold, and Platinum groups
4. **Download**: Click any segment's download button to get the customer list as a CSV file

## 📊 CSV File Format

Your CSV file must include these columns:
- `InvoiceNo` - Invoice/Transaction ID
- `CustomerID` - Unique customer identifier
- `InvoiceDate` - Date of transaction (any format)
- `Quantity` - Number of items purchased
- `UnitPrice` - Price per unit

Optional columns for contact information:
- `Location` - Customer location
- `CustomerPhoneNo` - Phone number
- `Email` - Email address

## ✨ Features

- ✅ Automatic customer segmentation
- ✅ Interactive charts and visualizations
- ✅ Search and filter functionality
- ✅ Download segment-specific CSV files
- ✅ Beautiful, responsive UI
- ✅ Real-time analysis

## 🛠️ Troubleshooting

**Port 5000 already in use?**
Edit `app.py` line 182 and change the port:
```python
app.run(debug=True, host='0.0.0.0', port=8080)
```

**Module not found error?**
Make sure you've installed all dependencies:
```bash
pip install -r requirements.txt
```

**Upload fails?**
- Check that your CSV file has all required columns
- Ensure file size is under 16MB
- Verify dates are in a valid format

## 📞 Need Help?

Check the full README.md for detailed documentation and troubleshooting guide.

---

**Happy Analyzing! 🎉**

