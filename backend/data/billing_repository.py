"""Billing data repository."""
import psycopg2
from typing import List, Dict, Any, Optional

class BillingRepository:
    """Repository for billing-related database operations."""
    
    @staticmethod
    def ensure_subscriptions_table(conn):
        """Ensure subscriptions table exists."""
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS subscriptions (
                    subscription_id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                    plan_name VARCHAR(100) DEFAULT 'Free',
                    price DECIMAL(10, 2) DEFAULT 0,
                    billing_cycle VARCHAR(20) DEFAULT 'monthly',
                    status VARCHAR(20) DEFAULT 'active',
                    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    end_date TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id)
                )
            """)
            conn.commit()
    
    @staticmethod
    def ensure_payment_methods_table(conn):
        """Ensure payment_methods table exists."""
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS payment_methods (
                    payment_method_id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                    card_type VARCHAR(50),
                    last_four VARCHAR(4),
                    expiry_month INTEGER,
                    expiry_year INTEGER,
                    is_default BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
    
    @staticmethod
    def ensure_billing_history_table(conn):
        """Ensure billing_history table exists."""
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS billing_history (
                    invoice_id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                    amount DECIMAL(10, 2),
                    status VARCHAR(20) DEFAULT 'pending',
                    description TEXT,
                    invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
    
    @staticmethod
    def ensure_user_preferences_table(conn):
        """Ensure user_preferences table exists."""
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_preferences (
                    user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
                    email_notifications BOOLEAN DEFAULT TRUE,
                    push_notifications BOOLEAN DEFAULT TRUE,
                    billing_alerts BOOLEAN DEFAULT TRUE,
                    marketing_emails BOOLEAN DEFAULT FALSE,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
    
    @staticmethod
    def get_subscription(conn, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user subscription."""
        BillingRepository.ensure_subscriptions_table(conn)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT plan_name, price, billing_cycle, status, start_date, end_date
                FROM subscriptions WHERE user_id = %s
            """, (user_id,))
            row = cur.fetchone()
            if row:
                return {
                    "plan_name": row[0],
                    "price": float(row[1]),
                    "billing_cycle": row[2],
                    "status": row[3],
                    "start_date": row[4].isoformat() if row[4] else None,
                    "end_date": row[5].isoformat() if row[5] else None
                }
            return {
                "plan_name": "Free",
                "price": 0.0,
                "billing_cycle": "monthly",
                "status": "active",
                "start_date": None,
                "end_date": None
            }
    
    @staticmethod
    def update_subscription(conn, user_id: int, plan_name: str, price: float, billing_cycle: str):
        """Update user subscription."""
        BillingRepository.ensure_subscriptions_table(conn)
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO subscriptions (user_id, plan_name, price, billing_cycle, status, start_date)
                VALUES (%s, %s, %s, %s, 'active', CURRENT_TIMESTAMP)
                ON CONFLICT (user_id) DO UPDATE SET
                    plan_name = EXCLUDED.plan_name,
                    price = EXCLUDED.price,
                    billing_cycle = EXCLUDED.billing_cycle,
                    updated_at = CURRENT_TIMESTAMP
            """, (user_id, plan_name, price, billing_cycle))
            conn.commit()
    
    @staticmethod
    def get_payment_methods(conn, user_id: int) -> List[Dict[str, Any]]:
        """Get user payment methods."""
        BillingRepository.ensure_payment_methods_table(conn)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT payment_method_id, card_type, last_four, expiry_month, expiry_year, is_default
                FROM payment_methods WHERE user_id = %s ORDER BY is_default DESC, created_at DESC
            """, (user_id,))
            rows = cur.fetchall()
            return [
                {
                    "id": row[0],
                    "card_type": row[1],
                    "last_four": row[2],
                    "expiry_month": row[3],
                    "expiry_year": row[4],
                    "is_default": row[5]
                }
                for row in rows
            ]
    
    @staticmethod
    def add_payment_method(conn, user_id: int, card_type: str, last_four: str,
                          expiry_month: int, expiry_year: int, is_default: bool) -> int:
        """Add payment method."""
        BillingRepository.ensure_payment_methods_table(conn)
        with conn.cursor() as cur:
            if is_default:
                cur.execute("UPDATE payment_methods SET is_default = FALSE WHERE user_id = %s", (user_id,))
            
            cur.execute("""
                INSERT INTO payment_methods (user_id, card_type, last_four, expiry_month, expiry_year, is_default)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING payment_method_id
            """, (user_id, card_type, last_four, expiry_month, expiry_year, is_default))
            payment_id = cur.fetchone()[0]
            conn.commit()
            return payment_id
    
    @staticmethod
    def delete_payment_method(conn, payment_method_id: int, user_id: int) -> bool:
        """Delete payment method."""
        with conn.cursor() as cur:
            cur.execute("SELECT user_id FROM payment_methods WHERE payment_method_id = %s", (payment_method_id,))
            row = cur.fetchone()
            if not row or row[0] != user_id:
                return False
            
            cur.execute("DELETE FROM payment_methods WHERE payment_method_id = %s", (payment_method_id,))
            conn.commit()
            return True
    
    @staticmethod
    def get_billing_history(conn, user_id: int) -> List[Dict[str, Any]]:
        """Get billing history."""
        BillingRepository.ensure_billing_history_table(conn)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT invoice_id, invoice_date, amount, status, description
                FROM billing_history WHERE user_id = %s ORDER BY invoice_date DESC LIMIT 50
            """, (user_id,))
            rows = cur.fetchall()
            return [
                {
                    "invoice_id": str(row[0]),
                    "date": row[1].isoformat() if row[1] else None,
                    "amount": float(row[2]),
                    "status": row[3],
                    "description": row[4]
                }
                for row in rows
            ]
    
    @staticmethod
    def get_notification_preferences(conn, user_id: int) -> Dict[str, bool]:
        """Get notification preferences."""
        BillingRepository.ensure_user_preferences_table(conn)
        with conn.cursor() as cur:
            cur.execute("""
                SELECT email_notifications, push_notifications, billing_alerts, marketing_emails
                FROM user_preferences WHERE user_id = %s
            """, (user_id,))
            row = cur.fetchone()
            if row:
                return {
                    "email_notifications": row[0],
                    "push_notifications": row[1],
                    "billing_alerts": row[2],
                    "marketing_emails": row[3]
                }
            return {
                "email_notifications": True,
                "push_notifications": True,
                "billing_alerts": True,
                "marketing_emails": False
            }
    
    @staticmethod
    def update_notification_preferences(conn, user_id: int, email_notifications: bool,
                                       push_notifications: bool, billing_alerts: bool,
                                       marketing_emails: bool):
        """Update notification preferences."""
        BillingRepository.ensure_user_preferences_table(conn)
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO user_preferences (user_id, email_notifications, push_notifications, billing_alerts, marketing_emails)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id) DO UPDATE SET
                    email_notifications = EXCLUDED.email_notifications,
                    push_notifications = EXCLUDED.push_notifications,
                    billing_alerts = EXCLUDED.billing_alerts,
                    marketing_emails = EXCLUDED.marketing_emails,
                    updated_at = CURRENT_TIMESTAMP
            """, (user_id, email_notifications, push_notifications, billing_alerts, marketing_emails))
            conn.commit()

