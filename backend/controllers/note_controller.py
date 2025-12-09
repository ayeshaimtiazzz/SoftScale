"""Note controller."""
from fastapi import HTTPException, status
from services import NoteService

class NoteController:
    """Controller for note endpoints."""

    @staticmethod
    def create_note(deal_id: int, user_id: int, note_text: str):
        """Create a new note."""
        try:
            return NoteService.create_note(deal_id, user_id, note_text)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def get_notes(deal_id: int, user_id: int):
        """Get all notes for a deal."""
        try:
            notes = NoteService.get_notes(deal_id, user_id)
            return {"success": True, "notes": notes}
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def update_note(note_id: int, user_id: int, note_text: str):
        """Update a note."""
        try:
            return NoteService.update_note(note_id, user_id, note_text)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    @staticmethod
    def delete_note(note_id: int, user_id: int):
        """Delete a note."""
        try:
            return NoteService.delete_note(note_id, user_id)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

