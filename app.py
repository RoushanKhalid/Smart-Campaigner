from flask import Flask, render_template, request, jsonify, send_file, session
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import os
import json
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['SECRET_KEY'] = 'your-secret-key-change-this'  # Change in production

# Ensure uploads directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Default campaign offers (can be updated by admin via API)
campaign_offers = {
    'Bronze': {
        'subject': 'Come Back Special - Up to 50% Off!',
        'message': "We've missed you! Enjoy up to 50% off — just for coming back. Don't miss this exclusive deal!"
    },
    'Silver': {
        'subject': 'Your Exclusive Silver Member Offer!',
        'message': "Your exclusive comeback offer: up to 35% off on selected items. Limited time only!"
    },
    'Gold': {
        'subject': 'Gold Member Perks - 25% Off!',
        'message': "Gold perks unlocked! Get your exclusive 25% comeback deal! Valid on all items."
    },
    'Platinum': {
        'subject': 'Thank You, Platinum Member!',
        'message': "Platinum members only: Enjoy 10% off plus free shipping on your next order!"
    }
}

def perform_rfm_analysis(csv_path, current_date_str='2026-01-01'):
    """
    Perform RFM analysis on the uploaded CSV file.
    
    Returns:
        dict: Analysis results including RFM data, clusters, and customer segments
    """
    # Read dataset
    dataset = pd.read_csv(csv_path)
    
    # Validate required columns
    required_columns = ['InvoiceNo', 'CustomerID', 'InvoiceDate', 'Quantity', 'UnitPrice']
    missing_columns = [col for col in required_columns if col not in dataset.columns]
    if missing_columns:
        raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")
    
    # Convert InvoiceDate to datetime
    dataset['InvoiceDate'] = pd.to_datetime(dataset['InvoiceDate'], errors='coerce')
    
    # Set current date for analysis
    current_date = pd.to_datetime(current_date_str)
    
    # Calculate Recency
    max_date = dataset.groupby(["CustomerID"]).max()[['InvoiceDate']]
    max_date['InvoiceAge'] = (current_date - max_date['InvoiceDate']).dt.days
    recency = max_date.drop('InvoiceDate', axis=1)
    recency.columns = ['Recency']
    
    # Calculate Frequency
    freq = dataset.drop_duplicates(subset="InvoiceNo")
    freq = freq.groupby(["CustomerID"]).count()[["InvoiceNo"]]
    freq.columns = ['Frequency']
    
    # Calculate Monetary
    dataset["Total_in_BDT"] = dataset["Quantity"] * dataset["UnitPrice"]
    money = dataset.groupby(["CustomerID"])[["Total_in_BDT"]].sum()
    money.columns = ['Monetary']
    
    # Combine RFM
    RFM = pd.concat([recency, freq, money], axis=1)
    
    # Scale the data
    scaler = StandardScaler()
    scaled = scaler.fit_transform(RFM)
    
    # Perform KMeans clustering
    kmeans = KMeans(n_clusters=4, random_state=42, n_init=10)
    kmeans.fit(scaled)
    
    RFM["Clusters"] = kmeans.labels_
    
    # Assign customer groups based on clusters
    def func(row):
        if row["Clusters"] == 0:
            return "Bronze"
        elif row["Clusters"] == 1:
            return "Silver"
        elif row["Clusters"] == 2:
            return "Gold"
        else:
            return "Platinum"
    
    RFM['Group'] = RFM.apply(func, axis=1)
    
    # Get customer contact info FIRST (with fallback for missing columns)
    contact_cols = ['CustomerID']
    available_contact_cols = []
    
    for col in ['Location', 'CustomerPhoneNo', 'Email']:
        if col in dataset.columns:
            contact_cols.append(col)
            available_contact_cols.append(col)
    
    if available_contact_cols:
        customer_contact = dataset.groupby('CustomerID')[available_contact_cols].first().reset_index()
    else:
        # Create empty contact dataframe if no contact columns exist
        customer_contact = dataset.groupby('CustomerID')['CustomerID'].first().reset_index()
        for col in ['Location', 'CustomerPhoneNo', 'Email']:
            customer_contact[col] = 'N/A'
    
    # Calculate group statistics (before converting RFM)
    final = RFM.groupby("Clusters").agg({
        'Recency': 'mean',
        'Frequency': 'mean',
        'Monetary': 'mean'
    }).round(2)
    
    # Convert RFM values for JSON serialization BEFORE merging contact info
    RFM_converted = RFM.copy()
    RFM_converted['Recency'] = RFM_converted['Recency'].astype(int)
    RFM_converted['Frequency'] = RFM_converted['Frequency'].astype(int)
    RFM_converted['Monetary'] = RFM_converted['Monetary'].round(2)
    
    # Merge with contact info
    RFM_with_contact = pd.merge(RFM_converted.reset_index(), customer_contact, on='CustomerID', how='left')
    
    # Group statistics
    result = pd.DataFrame(RFM.Group.value_counts()).reset_index()
    result.columns = ['Group', 'count']
    result = result.sort_values(by='count', ascending=False)
    
    # Prepare results
    results_dict = {
        'rfm_data': RFM_with_contact.to_dict(orient='records'),
        'group_stats': result.to_dict(orient='records'),
        'cluster_stats': final.to_dict(orient='index'),
        'summary': {
            'total_customers': len(RFM),
            'groups': result.to_dict(orient='records'),
            'date_range': {
                'oldest_transaction': dataset['InvoiceDate'].min().strftime('%Y-%m-%d'),
                'newest_transaction': dataset['InvoiceDate'].max().strftime('%Y-%m-%d')
            }
        }
    }
    
    return results_dict

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/api/campaign-offers', methods=['GET', 'POST'])
def campaign_offers_api():
    """Get or update campaign offers"""
    global campaign_offers
    
    if request.method == 'POST':
        data = request.json
        for segment, offer in data.items():
            if segment in campaign_offers:
                campaign_offers[segment] = offer
        return jsonify({'success': True, 'message': 'Offers updated successfully'})
    
    return jsonify(campaign_offers)

@app.route('/api/send-campaign', methods=['POST'])
def send_campaign():
    """Send campaign emails to customers"""
    try:
        data = request.json
        segment = data.get('segment')
        customers = data.get('customers')
        
        if not segment or not customers:
            return jsonify({'error': 'Missing segment or customers data'}), 400
        
        # Get campaign offer for this segment
        offer = campaign_offers.get(segment, {})
        
        if not offer:
            return jsonify({'error': f'No offer defined for {segment} segment'}), 400
        
        # For demo purposes, we'll simulate email sending
        # In production, you'd configure SMTP settings
        sent_count = 0
        errors = []
        
        for customer in customers:
            if customer.get('Email') and customer['Email'] != 'N/A':
                try:
                    # In production, uncomment and configure:
                    # send_email(customer['Email'], offer['subject'], 
                    #           format_email_body(customer['CustomerID'], offer['message']))
                    sent_count += 1
                except Exception as e:
                    errors.append(f"{customer['CustomerID']}: {str(e)}")
        
        return jsonify({
            'success': True,
            'sent': sent_count,
            'total': len(customers),
            'errors': errors,
            'message': f'Successfully sent {sent_count} out of {len(customers)} emails'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze():
    """API endpoint to analyze uploaded CSV file"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if file and file.filename.endswith('.csv'):
            # Save uploaded file
            import uuid
            unique_filename = str(uuid.uuid4()) + '.csv'
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(filepath)
            
            try:
                # Perform RFM analysis
                results = perform_rfm_analysis(filepath)
                
                # Clean up uploaded file
                if os.path.exists(filepath):
                    os.remove(filepath)
                
                return jsonify(results)
            except Exception as e:
                # Clean up uploaded file on error
                if os.path.exists(filepath):
                    os.remove(filepath)
                raise e
        else:
            return jsonify({'error': 'Invalid file type. Please upload a CSV file.'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download', methods=['POST'])
def download_segment():
    """Download customer segment data"""
    try:
        data = request.json
        segment = data.get('segment')
        customers = data.get('customers')
        
        if not segment or not customers:
            return jsonify({'error': 'Invalid request data'}), 400
        
        # Convert customers data to DataFrame
        df = pd.DataFrame(customers)
        
        # Save to CSV
        output_path = f'{segment.lower()}_contact_info.csv'
        df.to_csv(output_path, index=False)
        
        response = send_file(output_path, as_attachment=True, download_name=f'{segment}_customers.csv')
        
        # Clean up file after sending
        import threading
        def delete_file():
            import time
            time.sleep(1)
            if os.path.exists(output_path):
                os.remove(output_path)
        
        threading.Thread(target=delete_file).start()
        
        return response
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def send_email(recipient_email, subject, body):
    """Send email (configure with your SMTP settings)"""
    # Uncomment and configure for production use
    # sender_email = "your-email@gmail.com"
    # sender_password = "your-app-password"
    # SMTP_SERVER = "smtp.gmail.com"
    # SMTP_PORT = 587
    # 
    # message = MIMEMultipart()
    # message["From"] = sender_email
    # message["To"] = recipient_email
    # message["Subject"] = subject
    # message.attach(MIMEText(body, "plain"))
    # 
    # with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
    #     server.starttls()
    #     server.login(sender_email, sender_password)
    #     server.send_message(message)
    pass

def format_email_body(customer_id, message):
    """Format email body with customer personalization"""
    return f"""Dear {customer_id},

{message}

Best Regards,
Smart Campaigner Team"""
    
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

