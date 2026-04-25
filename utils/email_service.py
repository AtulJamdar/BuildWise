import os
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

def get_env(key, default=None):
    value = os.getenv(key, default)
    return value.strip() if isinstance(value, str) else value

EMAIL_SENDER = get_env("EMAIL_SENDER")
EMAIL_PASSWORD = get_env("EMAIL_PASSWORD")
SMTP_SERVER = get_env("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(get_env("SMTP_PORT", 587))


def send_invite_email(to_email: str, invite_link: str):
    if not EMAIL_SENDER or not EMAIL_PASSWORD:
        raise ValueError("Email sender credentials are not configured in environment variables.")

    body = f"""
You have been invited to join a team on BuildWise.

Click the link below to accept the invitation:
{invite_link}

If you did not expect this invite, please ignore this message.
"""

    msg = MIMEText(body)
    msg["Subject"] = "You're invited to BuildWise"
    msg["From"] = EMAIL_SENDER
    msg["To"] = to_email

    server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
    server.ehlo()
    server.starttls()
    server.ehlo()
    server.login(EMAIL_SENDER, EMAIL_PASSWORD)
    server.sendmail(EMAIL_SENDER, to_email, msg.as_string())
    server.quit()


def send_password_reset_email(to_email: str, reset_link: str):
    if not EMAIL_SENDER or not EMAIL_PASSWORD:
        raise ValueError("Email sender credentials are not configured in environment variables.")

    body = f"""
You requested a password reset for your BuildWise account.

Click the link below to reset your password:
{reset_link}

If you did not request this change, please ignore this message.
"""

    msg = MIMEText(body)
    msg["Subject"] = "BuildWise Password Reset"
    msg["From"] = EMAIL_SENDER
    msg["To"] = to_email

    server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
    server.ehlo()
    server.starttls()
    server.ehlo()
    server.login(EMAIL_SENDER, EMAIL_PASSWORD)
    server.sendmail(EMAIL_SENDER, to_email, msg.as_string())
    server.quit()


def send_email(to_email: str, subject: str, body: str):
    """Generic email sending function for notifications."""
    if not EMAIL_SENDER or not EMAIL_PASSWORD:
        raise ValueError("Email sender credentials are not configured in environment variables.")

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = EMAIL_SENDER
    msg["To"] = to_email

    server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
    server.ehlo()
    server.starttls()
    server.ehlo()
    server.login(EMAIL_SENDER, EMAIL_PASSWORD)
    server.sendmail(EMAIL_SENDER, to_email, msg.as_string())
    server.quit()


def send_pricing_request_submitted_email(customer_email: str, company_name: str, request_id: int):
    """Send confirmation email when customer submits pricing request."""
    subject = "✓ Pricing Request Received - BuildWise"
    
    body = f"""
Dear {company_name},

Thank you for submitting your custom pricing request to BuildWise!

We have received your request and our team will review it shortly. Here's what to expect:

📋 Request Details:
- Request ID: #{request_id}
- Status: Under Review
- Response Time: 24-48 hours

🎯 Next Steps:
Our team will analyze your requirements and create a customized pricing plan tailored to your needs. 
You will receive an email with our offer and a payment link once approved.

💡 Meanwhile, you can:
- Explore BuildWise features at https://buildwise.app
- Check our documentation at https://docs.buildwise.app
- Visit our blog for best practices

If you have any questions, feel free to reach out to our support team.

Best regards,
BuildWise Team
"""

    try:
        send_email(customer_email, subject, body)
        return True
    except Exception as e:
        print(f"⚠️ Failed to send pricing request confirmation email: {str(e)}")
        return False


def send_pricing_request_approved_email(customer_email: str, company_name: str, request_id: int, 
                                       custom_price: float, scans_per_month: int, payment_link: str):
    """Send email to customer when pricing request is approved with payment link."""
    subject = "🎉 Your Custom Pricing Plan is Ready - BuildWise"
    
    body = f"""
Dear {company_name},

Excellent news! Your custom pricing request has been approved! 🎉

We've created a specialized pricing plan tailored to your needs:

📊 Your Custom Plan:
- Monthly Price: ₹{custom_price:,.2f}
- Scans per Month: {scans_per_month:,}
- Validity: 12 months
- Plan ID: #{request_id}

💳 Next Step - Complete Your Purchase:
Please click the link below to proceed with payment:
{payment_link}

✨ What You Get:
- Unlimited API access with rate limits based on your plan
- Custom dashboard and reporting
- Priority support (24/7)
- Dedicated account manager
- Quarterly business reviews

❓ Questions or Need Modifications?
If you'd like to discuss the plan further or need any adjustments, 
please reply to this email or contact our sales team.

Security note: This payment link is valid for 7 days.

Best regards,
BuildWise Sales Team
"""

    try:
        send_email(customer_email, subject, body)
        return True
    except Exception as e:
        print(f"⚠️ Failed to send pricing approval email: {str(e)}")
        return False


def send_pricing_request_rejected_email(customer_email: str, company_name: str, request_id: int, 
                                       reason: str = ""):
    """Send email to customer when pricing request is rejected."""
    subject = "Custom Pricing Request Status - BuildWise"
    
    reason_text = f"\nReason:\n{reason}" if reason else "\nOur team found that your requirements may be better served with our standard plans."
    
    body = f"""
Dear {company_name},

Thank you for your interest in a custom pricing plan with BuildWise.

After reviewing your request (#{request_id}), we've determined that it's best to proceed with our standard pricing plans.
{reason_text}

📌 Available Options:
1. Professional Plan - ₹10,000/month
   - 1,000 scans/month
   - API access
   - Email support

2. Enterprise Plan - ₹25,000/month
   - 10,000 scans/month
   - API + Custom integrations
   - Priority support

3. Custom Plan - Let's discuss!
   - Have new requirements?
   - Reply to this email to resubmit

🤝 Next Steps:
- Visit https://buildwise.app/pricing to view all plans
- Or reach out to our sales team to discuss options

We'd love to help you find the perfect solution!

Best regards,
BuildWise Team
"""

    try:
        send_email(customer_email, subject, body)
        return True
    except Exception as e:
        print(f"⚠️ Failed to send pricing rejection email: {str(e)}")
        return False


def send_admin_pricing_request_notification(admin_email: str, company_name: str, request_id: int, 
                                           team_size: int, budget_min: float, budget_max: float):
    """Send notification email to admin when new pricing request is submitted."""
    subject = f"📌 New Custom Pricing Request - {company_name}"
    
    body = f"""
New custom pricing request received!

🏢 Customer Details:
- Company: {company_name}
- Team Size: {team_size} members
- Budget Range: ₹{budget_min:,.2f} - ₹{budget_max:,.2f}
- Request ID: #{request_id}

⚡ Action Required:
Please review and approve/reject this request in the admin dashboard:
https://admin.buildwise.app/pricing/requests/{request_id}

💬 What to do next:
1. Click the link above to view full request details
2. Review customer requirements
3. Create custom pricing plan
4. Send approval email with payment link

Approval needed by: 24 hours

BuildWise Admin System
"""

    try:
        send_email(admin_email, subject, body)
        return True
    except Exception as e:
        print(f"⚠️ Failed to send admin notification email: {str(e)}")
        return False


def send_payment_link_email(customer_email: str, company_name: str, custom_price: float, 
                            payment_link: str, plan_validity_days: int = 365):
    """Send payment link to customer for custom pricing plan."""
    subject = "💳 Complete Your Payment - BuildWise Custom Plan"
    
    body = f"""
Dear {company_name},

Your BuildWise custom pricing plan is ready for activation!

💰 Payment Details:
- Amount: ₹{custom_price:,.2f}
- Plan Duration: {plan_validity_days} days
- Valid Until: {plan_validity_days} days from activation

🔗 Payment Link:
{payment_link}

✨ After Payment:
- Your plan will be activated immediately
- You'll receive an activation confirmation email
- Access your custom dashboard and API keys
- Our team will schedule a onboarding call

🛡️ Security:
- Payment processed through Razorpay (secure gateway)
- Your data is encrypted
- No payment details stored on our servers

⏰ Link Validity:
This payment link is valid for 7 days. Please complete payment within this time.

❓ Issues with Payment?
If you face any issues, please reply to this email or contact:
- Support: support@buildwise.app
- Sales: sales@buildwise.app

Thank you for choosing BuildWise!

Best regards,
BuildWise Team
"""

    try:
        send_email(customer_email, subject, body)
        return True
    except Exception as e:
        print(f"⚠️ Failed to send payment link email: {str(e)}")
        return False


def send_payment_confirmation_email(customer_email: str, company_name: str, 
                                   plan_id: int, custom_price: float, expires_date: str):
    """Send confirmation email to customer when payment is completed."""
    subject = "✅ Payment Confirmed - Your BuildWise Plan is Active"
    
    body = f"""
Dear {company_name},

Thank you for your payment! 🎉

Your custom BuildWise plan is now active and ready to use.

📋 Plan Activation Details:
- Plan ID: #{plan_id}
- Amount Paid: ₹{custom_price:,.2f}
- Plan Expires: {expires_date}
- Status: ✅ ACTIVE

🚀 Get Started:
1. Log in to your BuildWise dashboard
2. Navigate to Settings → API Keys
3. Generate your API key for integrations
4. Start scanning your code with your custom plan limits

📚 Resources:
- API Documentation: https://api.buildwise.app/docs
- Getting Started Guide: https://docs.buildwise.app/getting-started
- Integration Examples: https://github.com/buildwise/examples

👥 Dedicated Support:
Your account now includes:
- Priority email support (4-hour response time)
- Dedicated Slack channel
- Quarterly business review calls
- Custom feature requests consideration

💡 Next Steps:
Our onboarding specialist will contact you within 24 hours to:
- Set up your account and integrations
- Discuss best practices
- Answer any questions

If you need immediate assistance:
- Email: support@buildwise.app
- Slack: #your-company-channel

Thank you for trusting BuildWise!

Best regards,
BuildWise Team
"""

    try:
        send_email(customer_email, subject, body)
        return True
    except Exception as e:
        print(f"⚠️ Failed to send payment confirmation email: {str(e)}")
        return False


def send_renewal_offer_email(customer_email: str, company_name: str, plan_id: int, 
                             current_expiry: str, renewal_options: list, admin_support_email: str = None):
    """
    Send renewal offer email to customer when plan is expiring soon.
    Includes multiple renewal period options with pro-rated pricing.
    
    Args:
        customer_email: Customer's email address
        company_name: Company name
        plan_id: Custom plan ID
        current_expiry: Current plan expiry date
        renewal_options: List of renewal options with pricing
        admin_support_email: Support email for inquiries
    """
    subject = "🔄 Renew Your BuildWise Plan - Special Renewal Pricing!"
    
    options_html = "<ul style='font-size: 14px;'>"
    for option in renewal_options:
        label = option.get('label', f"{option.get('days')} days")
        price = option.get('final_price', option.get('basePrice'))
        discount_text = ''
        if option.get('discount', 0) > 0:
            discount_amount = option.get('discount_amount', 0)
            discount_percent = option.get('discount', 0)
            discount_text = f' (Save ₹{discount_amount} - {discount_percent}% OFF!)'
        
        options_html += f"""
        <li>
            <strong>{label}:</strong> 
            ₹{price}{discount_text}
        </li>
        """
    options_html += "</ul>"
    
    support_email = admin_support_email or "support@buildwise.app"
    
    body = f"""
<html>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
        <h2 style="color: #2c3e50;">Time to Renew Your BuildWise Plan! 🚀</h2>
        
        <p>Hi {company_name},</p>
        
        <p>Your current BuildWise plan is expiring on <strong>{current_expiry}</strong>.</p>
        
        <p style="margin: 20px 0;">Don't miss out! Renew now and enjoy:</p>
        <ul style="color: #27ae60;">
            <li>Uninterrupted scanning and analysis</li>
            <li>All your configured features</li>
            <li>Continued team access</li>
            <li>Special renewal discounts (up to 15% off)</li>
        </ul>
        
        <h3 style="color: #2c3e50; margin-top: 25px;">Renewal Options:</h3>
        {options_html}
        
        <div style="margin: 30px 0; text-align: center;">
            <a href="https://app.buildwise.io/pricing/plans/{plan_id}/renew" 
               style="display: inline-block; background-color: #3498db; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold;">
                Renew Plan Now →
            </a>
        </div>
        
        <p style="margin-top: 25px; font-size: 13px; color: #666;">
            <strong>Need help deciding?</strong><br>
            Our onboarding team is ready to help! Just reply to this email or reach out to:
        </p>
        
        <p style="font-size: 13px; color: #666;">
            Email: {support_email}<br>
            We typically respond within 2-4 hours during business hours (9 AM - 6 PM IST)
        </p>
        
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999;">
            BuildWise - Code Quality & Security Platform
        </p>
    </div>
</body>
</html>
"""
    
    try:
        send_email(customer_email, subject, body)
        return True
    except Exception as e:
        print(f"⚠️ Failed to send renewal offer email: {str(e)}")
        return False


def send_renewal_confirmation_email(customer_email: str, company_name: str, renewal_data: dict):
    """
    Send renewal confirmation email after successful renewal payment.
    
    Args:
        customer_email: Customer's email address
        company_name: Company name
        renewal_data: Renewal details (plan_id, new_expiry, renewal_days, etc.)
    """
    subject = "✅ Plan Renewed Successfully! Your BuildWise Plan is Active"
    
    new_expiry = renewal_data.get('new_expiry', 'N/A')
    renewal_days = renewal_data.get('renewal_days', 0)
    amount = renewal_data.get('price', 0)
    invoice_id = renewal_data.get('invoice_id', 'N/A')
    
    body = f"""
<html>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
        <h2 style="color: #27ae60;">✅ Renewal Successful!</h2>
        
        <p>Hi {company_name},</p>
        
        <p>Your plan renewal has been processed successfully. Here are your renewal details:</p>
        
        <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #27ae60;">
            <p><strong>Renewal Period:</strong> {renewal_days} days</p>
            <p><strong>New Expiry Date:</strong> <span style="color: #27ae60; font-size: 16px;">{new_expiry}</span></p>
            <p><strong>Amount Charged:</strong> ₹{amount}</p>
            <p><strong>Invoice ID:</strong> {invoice_id}</p>
        </div>
        
        <p style="margin-top: 20px;">Your account is now active with all features enabled:</p>
        <ul style="color: #27ae60;">
            <li>Full scanning capabilities restored</li>
            <li>Team members regain access</li>
            <li>All integrations are active</li>
            <li>Usage tracking resumed</li>
        </ul>
        
        <p style="margin-top: 25px; font-size: 14px; color: #2c3e50;">
            <strong>What's Next?</strong><br>
            <a href="https://app.buildwise.io/dashboard" style="color: #3498db; text-decoration: none;">
                Continue scanning →
            </a>
        </p>
        
        <p style="margin-top: 30px; font-size: 13px; color: #666;">
            Questions or need assistance? Contact our support team at support@buildwise.app
        </p>
        
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999;">
            BuildWise - Code Quality & Security Platform<br>
            Invoice ID: {invoice_id}
        </p>
    </div>
</body>
</html>
"""
    
    try:
        send_email(customer_email, subject, body)
        return True
    except Exception as e:
        print(f"⚠️ Failed to send renewal confirmation email: {str(e)}")
        return False


def send_plan_expiry_reminder_email(customer_email: str, company_name: str, days_remaining: int):
    """
    Send reminder email when plan is expiring soon (7 days or less).
    
    Args:
        customer_email: Customer's email address
        company_name: Company name
        days_remaining: Number of days until expiry
    """
    if days_remaining <= 0:
        subject = "⚠️ Your BuildWise Plan Has Expired"
        urgency_text = "Your plan has expired and scanning is now disabled."
        action_text = "Renew Now to Restore Access"
    elif days_remaining == 1:
        subject = "🔴 Urgent: Your BuildWise Plan Expires Tomorrow!"
        urgency_text = f"Your plan expires in just <strong>1 day</strong>."
        action_text = "Renew Today to Avoid Service Interruption"
    else:
        subject = f"⏰ Your BuildWise Plan Expires in {days_remaining} Days"
        urgency_text = f"Your plan expires in <strong>{days_remaining} days</strong>."
        action_text = "Renew Now"
    
    body = f"""
<html>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fef5f5; border-radius: 8px; border-left: 4px solid #e74c3c;">
        <h2 style="color: #e74c3c;">Plan Expiration Reminder</h2>
        
        <p>Hi {company_name},</p>
        
        <p style="font-size: 16px; color: #e74c3c;">
            {urgency_text}
        </p>
        
        <p style="margin: 20px 0;">Once your plan expires, you will lose access to:</p>
        <ul style="color: #c0392b;">
            <li>Code scanning and analysis</li>
            <li>All team member accounts</li>
            <li>Historical data access</li>
            <li>Integration features</li>
        </ul>
        
        <div style="margin: 30px 0; text-align: center;">
            <a href="https://app.buildwise.io/pricing/plans/renew" 
               style="display: inline-block; background-color: #e74c3c; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                {action_text} →
            </a>
        </div>
        
        <p style="margin-top: 25px; padding: 15px; background-color: #fff; border-radius: 5px; border-left: 3px solid #f39c12;">
            <strong>💡 Pro Tip:</strong> Renew now and get up to 15% discount on renewal packages!
        </p>
        
        <p style="margin-top: 30px; font-size: 13px; color: #666;">
            Have questions? Our support team is here to help: support@buildwise.app
        </p>
        
        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999;">
            BuildWise - Code Quality & Security Platform
        </p>
    </div>
</body>
</html>
"""
    
    try:
        send_email(customer_email, subject, body)
        return True
    except Exception as e:
        print(f"⚠️ Failed to send expiry reminder email: {str(e)}")
        return False
