"""Build PDF from proposal content while preserving HTML/markup (headings, lists, emphasis)."""
from __future__ import annotations

import html as html_std
import re
from io import BytesIO
from typing import Optional

# Full HTML document with conservative CSS (xhtml2pdf supports a subset)
_PDF_HTML_TEMPLATE = """<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<style type="text/css">
@page {{ size: letter; margin: 0.85in; }}
body {{
  font-family: Georgia, "Times New Roman", serif;
  font-size: 11pt;
  line-height: 1.45;
  color: #212121;
}}
h1 {{
  font-size: 18pt;
  font-weight: bold;
  margin: 12pt 0 8pt 0;
  color: #0F172A;
  border-bottom: 1pt solid #334155;
  padding-bottom: 4pt;
}}
h2 {{
  font-size: 14pt;
  font-weight: bold;
  margin: 10pt 0 6pt 0;
  color: #0F172A;
}}
h3 {{
  font-size: 12pt;
  font-weight: bold;
  margin: 8pt 0 5pt 0;
  color: #334155;
}}
h4 {{
  font-size: 11pt;
  font-weight: bold;
  margin: 6pt 0 4pt 0;
  color: #424242;
}}
p {{ margin: 0 0 7pt 0; text-align: justify; }}
ul, ol {{ margin: 4pt 0 8pt 16pt; padding-left: 6pt; }}
li {{ margin-bottom: 3pt; }}
blockquote {{
  margin: 6pt 0 6pt 10pt;
  padding-left: 8pt;
  border-left: 2pt solid #BDBDBD;
  color: #424242;
}}
pre, code {{
  font-family: "Courier New", Courier, monospace;
  font-size: 9pt;
  background-color: #F5F5F5;
}}
pre {{ padding: 6pt; white-space: pre-wrap; }}
a {{ color: #1E5BB8; }}
strong, b {{ font-weight: bold; }}
em, i {{ font-style: italic; }}
</style>
</head>
<body>
{body}
</body>
</html>
"""


def _looks_like_html_fragment(s: str) -> bool:
    t = s.strip()
    if len(t) < 2 or not t.startswith("<"):
        return False
    return bool(re.search(r"</[a-zA-Z][a-zA-Z0-9]*\s*>", t) or re.search(r"<[a-zA-Z][^>]*/\s*>", t))


def _sanitize_html_fragment(html: str) -> str:
    """Remove script/style and trim obviously dangerous bits for PDF rendering."""
    out = re.sub(r"(?is)<script[^>]*>.*?</script>", "", html)
    out = re.sub(r"(?is)<style[^>]*>.*?</style>", "", out)
    out = re.sub(r"(?is)<iframe[^>]*>.*?</iframe>", "", out)
    return out.strip()


def _plain_or_markdown_to_html(text: str) -> str:
    """When content is not HTML, convert markdown if possible, else escaped paragraphs."""
    t = (text or "").strip()
    if not t:
        return "<p></p>"
    try:
        import markdown as md_lib

        return md_lib.markdown(t, extensions=["extra", "nl2br", "sane_lists"])
    except Exception:
        esc = html_std.escape(t)
        inner = esc.replace("\n\n", "</p><p>").replace("\n", "<br/>")
        return f"<p>{inner}</p>"


def proposal_body_to_html_for_pdf(raw: Optional[str]) -> str:
    """
    Normalize proposal body to an HTML fragment suitable for PDF.
    Preserves rich HTML from Quill/editor; otherwise markdown/plain → HTML.
    """
    s = raw if raw is not None else ""
    s = s.strip()
    if not s:
        return "<p></p>"
    if _looks_like_html_fragment(s):
        return _sanitize_html_fragment(s)
    return _sanitize_html_fragment(_plain_or_markdown_to_html(s))


def build_proposal_pdf_from_markup(raw_proposal: str) -> bytes:
    """Render proposal to PDF bytes using HTML layout (headings, lists, emphasis)."""
    from xhtml2pdf import pisa

    body_html = proposal_body_to_html_for_pdf(raw_proposal)
    document = _PDF_HTML_TEMPLATE.format(body=body_html)
    buffer = BytesIO()
    status = pisa.CreatePDF(
        document.encode("utf-8"),
        dest=buffer,
        encoding="utf-8",
    )
    if status.err:
        raise RuntimeError("PDF generation reported errors (xhtml2pdf)")
    data = buffer.getvalue()
    if not data:
        raise RuntimeError("Empty PDF output")
    return data
