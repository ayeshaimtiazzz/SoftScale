"""Note service for deal notes."""
from typing import Dict, Any, List
from data import get_db, NoteRepository, log_deal_activity_safe

class NoteService:
    """Service for deal note operations."""

    @staticmethod
    def create_note(deal_id: int, user_id: int, note_text: str) -> Dict[str, Any]:
        """Create a new note."""
        conn = get_db()
        try:
            NoteRepository.ensure_notes_table(conn)
            note_id = NoteRepository.create_note(conn, deal_id, user_id, note_text)
            log_deal_activity_safe(
                deal_id=deal_id,
                user_id=user_id,
                event_type="note_created",
                title="Deal note added",
                description=(note_text[:180] + "…") if len(note_text) > 180 else note_text,
                metadata={"note_id": note_id},
            )
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
            # Resolve deal for timeline linkage
            with conn.cursor() as cur:
                cur.execute("SELECT deal_id FROM deal_notes WHERE note_id = %s", (note_id,))
                row = cur.fetchone()
            if row:
                log_deal_activity_safe(
                    deal_id=row[0],
                    user_id=user_id,
                    event_type="note_updated",
                    title="Deal note updated",
                    description=(note_text[:180] + "…") if len(note_text) > 180 else note_text,
                    metadata={"note_id": note_id},
                )
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
            deal_id = None
            with conn.cursor() as cur:
                cur.execute("SELECT deal_id FROM deal_notes WHERE note_id = %s AND user_id = %s", (note_id, user_id))
                row = cur.fetchone()
                if row:
                    deal_id = row[0]
            deleted = NoteRepository.delete_note(conn, note_id, user_id)
            if not deleted:
                raise ValueError("Note not found or unauthorized")
            if deal_id:
                log_deal_activity_safe(
                    deal_id=deal_id,
                    user_id=user_id,
                    event_type="note_deleted",
                    title="Deal note deleted",
                    description=f"Deleted note #{note_id}",
                    metadata={"note_id": note_id},
                )
            return {"success": True, "message": "Note deleted successfully"}
        except Exception as e:
            conn.rollback()
            raise ValueError(str(e))
        finally:
            conn.close()

