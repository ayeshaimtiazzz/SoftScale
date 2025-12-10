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


def convert_html_to_text(html_content: str) -> str:
    """Convert HTML proposal to plain text format suitable for download."""
    # First strip HTML tags
    text = strip_html_tags(html_content)
    # Convert section headings to uppercase
    lines = text.split('\n')
    result = []
    for line in lines:
        stripped = line.strip()
        # If line looks like a heading (all caps or title case), make it uppercase
        if stripped and not stripped.startswith('-') and len(stripped) < 50:
            # Check if it's a known section heading
            section_headings = [
                'Executive Summary', 'Objectives', 'Methodology',
                'Timeline', 'Expected Outcomes', 'Recommendations'
            ]
            if any(heading.lower() in stripped.lower() for heading in section_headings):
                result.append(stripped.upper())
            else:
                result.append(line)
        else:
            result.append(line)
    return '\n'.join(result)

