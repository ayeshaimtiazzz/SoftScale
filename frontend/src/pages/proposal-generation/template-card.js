// src/modules/proposal-generation/Template.js
import React from "react";
import "./styles.css";

export default function TemplateCard({ template, onUse, onPreview, active = false }) {
  return (
    <div className={`tpl-card ${active ? "active" : ""}`}>
      <div className="tpl-card-head">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <strong>{template.title}</strong>
          <span className="tpl-category">{template.category}</span>
        </div>
      </div>
      <p className="tpl-desc">{template.description}</p>
      <div className="tpl-actions">
        <button className="btn small" onClick={onPreview}>Preview</button>
        <button className="btn primary small" onClick={onUse}>Use</button>
      </div>
    </div>
  );
}
