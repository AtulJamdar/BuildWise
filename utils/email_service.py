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
