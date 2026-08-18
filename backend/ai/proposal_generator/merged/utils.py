"""Utility functions for proposal formatting."""
import re


def strip_html_tags(html_content: str) -> str:
    """Remove all HTML tags from content, leaving only plain text."""
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', html_content)
    # Decode HTML entities (basic ones)
    text = text.replace('&nbsp;', ' ')
    text = text.replace('&amp;', '&')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    text = text.replace('&quot;', '"')
    text = text.replace('&#39;', "'")
    # Clean up extra whitespace
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
    text = text.strip()
    return text


def convert_html_to_markdown(html_content: str) -> str:
    """Convert HTML proposal to markdown-style plain text format."""
    import re

    text = html_content

    # Convert H1 to markdown heading
    text = re.sub(r'<h1[^>]*>(.*?)</h1>', r'# \1\n', text, flags=re.IGNORECASE | re.DOTALL)

    # Convert H2 to markdown heading
    text = re.sub(r'<h2[^>]*>(.*?)</h2>', r'\n## \1\n', text, flags=re.IGNORECASE | re.DOTALL)

    # Convert strong to markdown bold
    text = re.sub(r'<strong>(.*?)</strong>', r'**\1**', text, flags=re.IGNORECASE | re.DOTALL)

    # Convert em to markdown italic
    text = re.sub(r'<em>(.*?)</em>', r'*\1*', text, flags=re.IGNORECASE | re.DOTALL)

    # Convert ul/li to markdown list
    text = re.sub(r'<ul[^>]*>', '', text, flags=re.IGNORECASE)
    text = re.sub(r'</ul>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<li[^>]*>(.*?)</li>', r'- \1\n', text, flags=re.IGNORECASE | re.DOTALL)

    # Convert paragraphs to plain text with spacing
    text = re.sub(r'<p[^>]*>(.*?)</p>', r'\1\n\n', text, flags=re.IGNORECASE | re.DOTALL)

    # Remove any remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)

    # Decode HTML entities
    text = text.replace('&nbsp;', ' ')
    text = text.replace('&amp;', '&')
    text = text.replace('&lt;', '<')
    text = text.replace('&gt;', '>')
    text = text.replace('&quot;', '"')
    text = text.replace('&#39;', "'")

    # Clean up excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)  # Max 2 consecutive newlines
    text = re.sub(r'[ \t]+', ' ', text)  # Multiple spaces to single space
    text = re.sub(r' \n', '\n', text)  # Remove trailing spaces before newlines

    # Clean up list formatting
    text = re.sub(r'\n- ', '\n- ', text)  # Ensure proper list spacing

    return text.strip()

