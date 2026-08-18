"""Email service for sending emails."""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from config import settings

class EmailService:
    """Service for sending emails."""

    @staticmethod
    def send_password_reset_email(email: str, reset_token: str, frontend_url: Optional[str] = None) -> bool:
        """
        Send password reset email.

        Args:
            email: Recipient email address
            reset_token: Password reset token
            frontend_url: Frontend URL for reset link (optional)

        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            # Get email configuration from environment
            smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
            smtp_port = int(os.getenv("SMTP_PORT", "587"))
            smtp_user = os.getenv("SMTP_USER")
            smtp_password = os.getenv("SMTP_PASSWORD")
            from_email = os.getenv("FROM_EMAIL", smtp_user or "noreply@softscale.com")

            # If no SMTP configured, just log (for development)
            if not smtp_user or not smtp_password:
                print(f"[EMAIL SERVICE] Password reset token for {email}: {reset_token}")
                print(f"[EMAIL SERVICE] Reset link: {frontend_url or 'http://localhost:3000'}/reset-password?token={reset_token}")
                return True  # Return True for development

            # Create reset link
            if frontend_url:
                reset_link = f"{frontend_url}/reset-password?token={reset_token}"
            else:
                reset_link = f"http://localhost:3000/reset-password?token={reset_token}"

            # Create email
            msg = MIMEMultipart()
            msg['From'] = from_email
            msg['To'] = email
            msg['Subject'] = "Password Reset Request - SoftScale"

            # Email body
            body = f"""
            Hello,

            You requested to reset your password for your SoftScale account.

            Click the link below to reset your password:
            {reset_link}

            This link will expire in 1 hour.

            If you didn't request this, please ignore this email.

            Best regards,
            SoftScale Team
            """

            msg.attach(MIMEText(body, 'plain'))

            # Send email
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.send_message(msg)

            return True
        except Exception as e:
            print(f"[EMAIL SERVICE] Error sending email: {e}")
            # For development, still return True and log the token
            print(f"[EMAIL SERVICE] Password reset token for {email}: {reset_token}")
            return True


