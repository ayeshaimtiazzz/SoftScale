"""Text processing utilities."""
import PyPDF2
import io
from talent import clean_text

def chunk_text(text, max_words=200):
    """Split text into chunks of max_words."""
    words = text.split()
    return [' '.join(words[i:i + max_words]) for i in range(0, len(words), max_words)]

def extract_text_from_pdf(file_path):
    """Extract text from PDF file."""
    text = ""
    try:
        with open(file_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() or ""
    except Exception as e:
        print(f"Error reading PDF: {e}")
    return text

def extract_text_from_txt(file_path):
    """Extract text from TXT file."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        print(f"Error reading TXT: {e}")
        return ""

def extract_text_from_upload(file_content, content_type):
    """Extract text from uploaded file (PDF or TXT)."""
    resume_text = ""
    if content_type == "text/plain":
        resume_text = file_content.decode("utf-8").strip()
    elif content_type == "application/pdf":
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        for page in pdf_reader.pages:
            resume_text += page.extract_text() or ""
        resume_text = resume_text.strip()
    return resume_text

