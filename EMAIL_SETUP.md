# Email Setup Guide

To enable email sending in production, you need to configure SMTP settings in the `app.py` file.

## Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to your Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Copy the 16-character password

3. **Update `app.py`**:

Find the `send_email` function (lines 277-295) and uncomment/edit this section:

```python
def send_email(recipient_email, subject, body):
    """Send email (configure with your SMTP settings)"""
    sender_email = "your-email@gmail.com"  # Your Gmail address
    sender_password = "your-app-password"   # The 16-char app password
    SMTP_SERVER = "smtp.gmail.com"
    SMTP_PORT = 587
    
    message = MIMEMultipart()
    message["From"] = sender_email
    message["To"] = recipient_email
    message["Subject"] = subject
    message.attach(MIMEText(body, "plain"))
    
    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(message)
```

Also uncomment lines 185-187 in the `send_campaign` function:
```python
send_email(customer['Email'], offer['subject'], 
          format_email_body(customer['CustomerID'], offer['message']))
```

## Other Email Providers

### Outlook/Hotmail
```python
SMTP_SERVER = "smtp-mail.outlook.com"
SMTP_PORT = 587
```

### Yahoo Mail
```python
SMTP_SERVER = "smtp.mail.yahoo.com"
SMTP_PORT = 587
```

### Custom SMTP Server
```python
SMTP_SERVER = "your-smtp-server.com"
SMTP_PORT = 587  # or 465 for SSL
```

For SSL (port 465), change the connection method:
```python
with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
    server.login(sender_email, sender_password)
    server.send_message(message)
```

## Testing Email Functionality

1. **Test Mode**: The application currently runs in test/simulation mode
2. **Enable Email**: Uncomment the email code in `app.py`
3. **Test with Small Campaign**: Start with 1-2 customers to verify
4. **Monitor Errors**: Check the terminal for any SMTP errors

## Security Notes

⚠️ **Important**:
- Never commit email credentials to version control
- Use environment variables for sensitive data
- Consider using a dedicated email service (SendGrid, Mailgun, etc.)
- Implement rate limiting for production use
- Add error logging for failed sends

## Environment Variables (Recommended)

Instead of hardcoding credentials, use environment variables:

```python
import os

sender_email = os.getenv('SMTP_EMAIL')
sender_password = os.getenv('SMTP_PASSWORD')
```

Set them before running:
```bash
export SMTP_EMAIL="your-email@gmail.com"
export SMTP_PASSWORD="your-app-password"
```

## Rate Limiting

For production, add delays between emails to avoid being flagged as spam:

```python
import time

for customer in customers:
    send_email(...)
    time.sleep(1)  # Wait 1 second between emails
```

