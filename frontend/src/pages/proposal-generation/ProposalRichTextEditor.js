import React, { useMemo, useCallback } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Box } from "@mui/material";
import { COLORS } from "../../constants";
import { markdownOrTextToHtml } from "./proposalContent";

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
    ["blockquote", "code-block"],
    ["link"],
    ["clean"],
  ],
  clipboard: { matchVisual: false },
};

const formats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "bullet",
  "indent",
  "blockquote",
  "code-block",
  "link",
];

/**
 * React Quill rich text editor. `value` / `onChange` use HTML once edited; markdown/plain from the API is converted via `markdownOrTextToHtml`.
 */
export default function ProposalRichTextEditor({ value, onChange, placeholder, minHeight = 280 }) {
  const htmlValue = useMemo(() => markdownOrTextToHtml(value), [value]);

  const handleChange = useCallback(
    (content, _delta, source) => {
      if (source === "user") {
        onChange(content);
      }
    },
    [onChange]
  );

  return (
    <Box
      className="proposal-quill-wrapper"
      sx={{
        border: `1px solid ${COLORS.neutral.gray300}`,
        borderRadius: 1,
        backgroundColor: COLORS.neutral.white,
        overflow: "hidden",
        "& .quill": { display: "flex", flexDirection: "column" },
        "& .ql-toolbar": {
          border: "none",
          borderBottom: `1px solid ${COLORS.neutral.gray300}`,
          backgroundColor: COLORS.neutral.gray50,
        },
        "& .ql-container": {
          border: "none",
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "1rem",
          minHeight: minHeight,
        },
        "& .ql-editor": {
          minHeight: minHeight - 46,
          lineHeight: 1.75,
          color: COLORS.neutral.gray900,
        },
        "& .ql-editor.ql-blank::before": {
          color: COLORS.neutral.gray500,
          fontStyle: "normal",
        },
      }}
    >
      <ReactQuill
        theme="snow"
        value={htmlValue}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || "Edit your proposal…"}
      />
    </Box>
  );
}
