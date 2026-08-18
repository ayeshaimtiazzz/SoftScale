"""Note repository for deal notes."""
import psycopg2
from typing import List, Dict, Any, Optional

class NoteRepository:
    """Repository for deal note operations."""

    @staticmethod
    def ensure_notes_table(conn):
        """Ensure deal_notes table exists."""
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS deal_notes (
                    note_id SERIAL PRIMARY KEY,
                    deal_id INTEGER REFERENCES deals(deal_id) ON DELETE CASCADE,
                    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
                    note_text TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_deal_notes_deal_id ON deal_notes(deal_id);
                CREATE INDEX IF NOT EXISTS idx_deal_notes_user_id ON deal_notes(user_id);
                CREATE INDEX IF NOT EXISTS idx_deal_notes_created_at ON deal_notes(created_at);
            """)
            conn.commit()

    @staticmethod
    def create_note(conn, deal_id: int, user_id: int, note_text: str) -> int:
        """Create a new note and return note_id."""
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO deal_notes (deal_id, user_id, note_text)
                VALUES (%s, %s, %s)
                RETURNING note_id
            """, (deal_id, user_id, note_text))
            note_id = cur.fetchone()[0]
            conn.commit()
            return note_id

    @staticmethod
    def get_notes_by_deal(conn, deal_id: int, user_id: int) -> List[Dict[str, Any]]:
        """Get all notes for a deal."""
        with conn.cursor() as cur:
            cur.execute("""
                SELECT n.*, u.name as author_name
                FROM deal_notes n
                LEFT JOIN users u ON n.user_id = u.user_id
                WHERE n.deal_id = %s AND n.user_id = %s
                ORDER BY n.created_at DESC
            """, (deal_id, user_id))

            rows = cur.fetchall()
            colnames = [desc[0] for desc in cur.description]
            notes = []

            for row in rows:
                note = dict(zip(colnames, row))
                # Format dates
                if note.get('created_at'):
                    note['created_at'] = note['created_at'].isoformat()
                if note.get('updated_at'):
                    note['updated_at'] = note['updated_at'].isoformat()
                notes.append(note)

            return notes

    @staticmethod
    def update_note(conn, note_id: int, user_id: int, note_text: str) -> bool:
        """Update a note."""
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE deal_notes
                SET note_text = %s, updated_at = CURRENT_TIMESTAMP
                WHERE note_id = %s AND user_id = %s
            """, (note_text, note_id, user_id))
            conn.commit()
            return cur.rowcount > 0

    @staticmethod
    def delete_note(conn, note_id: int, user_id: int) -> bool:
        """Delete a note."""
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM deal_notes
                WHERE note_id = %s AND user_id = %s
            """, (note_id, user_id))
            conn.commit()
            return cur.rowcount > 0

