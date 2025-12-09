"""Note routes."""
from fastapi import APIRouter, Depends, Path, Body
from controllers import NoteController
from middleware import get_current_user
from pydantic import BaseModel

router = APIRouter()

class CreateNoteRequest(BaseModel):
    note_text: str

class UpdateNoteRequest(BaseModel):
    note_text: str

@router.post("/deals/{deal_id}/notes")
def create_note(
    deal_id: int = Path(...),
    request: CreateNoteRequest = Body(...),
    user_id: int = Depends(get_current_user)
):
    """Create a new note for a deal."""
    return NoteController.create_note(deal_id, user_id, request.note_text)

@router.get("/deals/{deal_id}/notes")
def get_notes(
    deal_id: int = Path(...),
    user_id: int = Depends(get_current_user)
):
    """Get all notes for a deal."""
    return NoteController.get_notes(deal_id, user_id)

@router.put("/notes/{note_id}")
def update_note(
    note_id: int = Path(...),
    request: UpdateNoteRequest = Body(...),
    user_id: int = Depends(get_current_user)
):
    """Update a note."""
    return NoteController.update_note(note_id, user_id, request.note_text)

@router.delete("/notes/{note_id}")
def delete_note(
    note_id: int = Path(...),
    user_id: int = Depends(get_current_user)
):
    """Delete a note."""
    return NoteController.delete_note(note_id, user_id)

