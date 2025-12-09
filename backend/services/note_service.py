"""Note service for deal notes."""
from typing import Dict, Any, List
from data import get_db, NoteRepository

class NoteService:
    """Service for deal note operations."""

    @staticmethod
    def create_note(deal_id: int, user_id: int, note_text: str) -> Dict[str, Any]:
        """Create a new note."""
        conn = get_db()
        try:
            NoteRepository.ensure_notes_table(conn)
            note_id = NoteRepository.create_note(conn, deal_id, user_id, note_text)
            return {"success": True, "note_id": note_id, "message": "Note created successfully"}
        except Exception as e:
            conn.rollback()
            raise ValueError(str(e))
        finally:
            conn.close()

    @staticmethod
    def get_notes(deal_id: int, user_id: int) -> List[Dict[str, Any]]:
        """Get all notes for a deal."""
        conn = get_db()
        try:
            NoteRepository.ensure_notes_table(conn)
            return NoteRepository.get_notes_by_deal(conn, deal_id, user_id)
        finally:
            conn.close()

    @staticmethod
    def update_note(note_id: int, user_id: int, note_text: str) -> Dict[str, Any]:
        """Update a note."""
        conn = get_db()
        try:
            updated = NoteRepository.update_note(conn, note_id, user_id, note_text)
            if not updated:
                raise ValueError("Note not found or unauthorized")
            return {"success": True, "message": "Note updated successfully"}
        except Exception as e:
            conn.rollback()
            raise ValueError(str(e))
        finally:
            conn.close()

    @staticmethod
    def delete_note(note_id: int, user_id: int) -> Dict[str, Any]:
        """Delete a note."""
        conn = get_db()
        try:
            deleted = NoteRepository.delete_note(conn, note_id, user_id)
            if not deleted:
                raise ValueError("Note not found or unauthorized")
            return {"success": True, "message": "Note deleted successfully"}
        except Exception as e:
            conn.rollback()
            raise ValueError(str(e))
        finally:
            conn.close()

