import DOMPurify from "dompurify";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: true });

/**
 * Detect HTML fragments (from the rich editor / API) vs markdown/plain text.
 */
export function isLikelyHtmlFragment(s) {
  if (!s || typeof s !== "string") return false;
  const t = s.trim();
  if (!t.startsWith("<")) return false;
  return /<\/?[a-z][\s\S]*>/i.test(t);
}

/**
 * Convert markdown or plain text to HTML for the editor or preview.
 * Already-HTML content is returned as-is (sanitization happens in getProposalPreviewHtml).
 */
export function markdownOrTextToHtml(raw) {
  if (raw == null || String(raw).trim() === "") return "<p></p>";
  const str = String(raw);
  if (isLikelyHtmlFragment(str)) return str;
  try {
    const html = marked.parse(str, { async: false });
    if (typeof html === "string" && html.trim()) return html;
  } catch {
    /* fall through */
  }
  return "<p></p>";
}

/**
 * Sanitized HTML for dangerouslySetInnerHTML (Document / View proposal).
 */
export function getProposalPreviewHtml(raw) {
  const html = markdownOrTextToHtml(raw);
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
  });
}
