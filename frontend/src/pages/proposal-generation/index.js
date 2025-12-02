// src/modules/proposal-generation/ProposalGeneration.js
import React, { useState, useRef } from "react";
import TemplateCard from "./template-card";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import PageTitle from "../../components/common/PageTitle";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../constants";
import "./styles.css";

const DUMMY_TEMPLATES = [
  {
    id: "tpl-1",
    title: "Short Project Proposal",
    category: "Business",
    description: "1-page concise proposal suitable for quick client pitches.",
    prompt:
      "Write a 1-page project proposal for a web app that connects local artisans with customers. Include goal, timeline (4 weeks), tech stack and rough cost estimate.",
  },
  {
    id: "tpl-2",
    title: "Detailed Technical Proposal",
    category: "Technical",
    description: "Detailed scope, milestones, deliverables, and technical architecture.",
    prompt:
      "Generate a detailed technical proposal for building an e-commerce platform with inventory sync, payments, and analytics. Include milestones, team roles, and estimates.",
  },
  {
    id: "tpl-3",
    title: "Freelancer Bid / Cover Letter",
    category: "Freelance",
    description: "Short personalized proposal to bid on a freelance job.",
    prompt:
      "Create a freelancer bid to apply for a React + Node.js UI rebuild, include past experience, approach, timeline (3 weeks) and hourly rate.",
  },
  {
    id: "tpl-4",
    title: "Research & Discovery Proposal",
    category: "Research",
    description: "Proposal to run discovery, user research and a prototype phase.",
    prompt: "Write a proposal for a 3-week discovery phase for a mobile health app: deliverables, methods, and acceptance criteria.",
  },
  // dummy extras
  {
    id: "tpl-5",
    title: "Maintenance & Support Plan",
    category: "Support",
    description: "Post-launch maintenance plan and SLA summary.",
    prompt: "Provide a 2-page maintenance & support proposal with SLA tiers, support response times and monthly cost options.",
  },
];

export default function ProposalGeneration() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([
    {
      from: "bot",
      text: "Hi — tell me what kind of proposal you want. Pick a template, choose tone/category, or type a custom prompt below.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [tone, setTone] = useState("Professional");
  const resultRef = useRef(null);

  const pushMessage = (m) => setMessages((s) => [...s, m]);

  const handleUseTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id);
    setInput(tpl.prompt);
    pushMessage({ from: "bot", text: `Template selected: ${tpl.title}` });
    // center/scroll handled by CSS + resultRef
  };

  const toggleFavorite = (id) => {
    setFavorites((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const simulateGenerate = (promptText) => {
    // Simulate generation — replace with real backend call later
    return new Promise((resolve) => {
      setTimeout(() => {
        const header = `Proposal — ${tone} Tone\nGenerated: ${new Date().toLocaleString()}\n\n`;
        const generatedText = [
          header,
          `Prompt: ${promptText}`,
          "",
          "Overview:",
          `This proposal outlines a solution based on the brief. Objective is to deliver a high-quality result using best practices and a ${tone.toLowerCase()} approach.`,
          "",
          "Scope & Deliverables:",
          "- Requirement analysis and design",
          "- Implementation and testing",
          "- Deployment and handover",
          "",
          "Timeline:",
          "Week 1 — Requirements & design",
          "Week 2 — Implementation (MVP)",
          "Week 3 — Polishing & QA",
          "Week 4 — Deployment & handover",
          "",
          "Estimated Budget:",
          "USD 3,500 — 7,500 depending on scope and integrations.",
          "",
          "Why choose us:",
          "- Experienced team, timely delivery, and transparent communication.",
          "",
          "Next steps:",
          "1) Approve scope",
          "2) Sign agreement",
          "3) Begin discovery",
        ].join("\n");
        resolve(generatedText);
      }, 800); // responsive delay
    });
  };

  const handleGenerate = async () => {
    const promptText = input.trim();
    if (!promptText) {
      pushMessage({ from: "bot", text: "Please enter a prompt or choose a template first." });
      return;
    }
    pushMessage({ from: "user", text: promptText });
    setLoading(true);
    setGenerated("");
    try {
      const result = await simulateGenerate(promptText);
      setGenerated(result);
      pushMessage({ from: "bot", text: "Proposal generated — review at the right panel." });
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
    } catch (err) {
      pushMessage({ from: "bot", text: "Something went wrong generating the proposal." });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated);
      pushMessage({ from: "bot", text: "Copied proposal to clipboard." });
    } catch (e) {
      pushMessage({ from: "bot", text: "Copy failed — you can select and copy manually." });
    }
  };

  const handleDownload = (format = "txt") => {
    if (!generated) return;
    const blob = new Blob([generated], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proposal_${Date.now()}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    pushMessage({ from: "bot", text: `Proposal downloaded as .${format}` });
  };

  const handleShareMock = (tpl) => {
    // dummy share UX
    pushMessage({ from: "bot", text: `Shared "${tpl.title}" to team (mock).` });
  };

  const filteredTemplates = categoryFilter === "All" ? DUMMY_TEMPLATES : DUMMY_TEMPLATES.filter((t) => t.category === categoryFilter);

  const handleClear = () => {
    setInput("");
    setGenerated("");
    setSelectedTemplateId(null);
    setMessages([{ from: "bot", text: "Ready — choose a template, pick a tone, or type a prompt to generate a proposal." }]);
  };

  return (
    <div className="pg-root">
      {/* LEFT: Chat + Prompt input */}
      <div className="pg-left">
        <div className="pg-feature-header">
          <div>
            <PageTitle
              title={t("navigation.proposalGeneration")}
              subtitle={t("navigation.proposalGenerationDesc")}
              icon={<HubOutlinedIcon sx={{ fontSize: "2rem" }} />}
              color={COLORS.accent.main}
              sx={{ mb: 2 }}
            />
          </div>
          <div className="pg-feature-actions">
            <button
              className="btn"
              onClick={() => {
                setMessages([]);
                pushMessage({ from: "bot", text: "Chat reset." });
              }}
            >
              Reset Chat
            </button>
            <button
              className="btn btn-outline"
              onClick={() => {
                setInput("");
                setGenerated("");
              }}
            >
              Clear Draft
            </button>
          </div>
        </div>

        <div className="pg-chat-window" aria-live="polite">
          {messages.length === 0 && (
            <div className="pg-msg bot">
              <div className="pg-msg-text">Ready — choose a template or write a prompt.</div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`pg-msg ${m.from === "bot" ? "bot" : "user"}`}>
              <div className="pg-msg-text">{m.text}</div>
            </div>
          ))}
        </div>

        <div className="pg-input-area">
          <textarea
            placeholder="Describe the proposal you want — or press a template's Use button to load its prompt."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
          />
          <div className="pg-controls-row">
            <div className="pg-selectors">
              <label className="small-label">Tone</label>
              <select value={tone} onChange={(e) => setTone(e.target.value)}>
                <option>Professional</option>
                <option>Casual</option>
                <option>Persuasive</option>
                <option>Formal</option>
              </select>

              <label className="small-label">Category</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="All">All</option>
                <option value="Business">Business</option>
                <option value="Technical">Technical</option>
                <option value="Freelance">Freelance</option>
                <option value="Research">Research</option>
                <option value="Support">Support</option>
              </select>
            </div>

            <div className="pg-actions">
              <button
                className="btn"
                onClick={() => {
                  setInput("Create a tailored proposal for a mobile app that helps patients book teleconsultations...");
                  pushMessage({ from: "bot", text: "Inserted sample prompt." });
                }}
              >
                Insert Example
              </button>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
                {loading ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER: Templates grid */}
      <div className="pg-center">
        <div className="pg-center-header">
          <h3>Templates</h3>
          <p className="muted">
            Browse templates. Click <strong>Use</strong> to load the prompt. Favorite or save templates to your library.
          </p>
        </div>

        <div className="pg-templates-grid">
          {filteredTemplates.map((tpl) => (
            <div key={tpl.id} className={`tpl-wrapper ${selectedTemplateId === tpl.id ? "selected" : ""}`}>
              <TemplateCard
                template={tpl}
                active={tpl.id === selectedTemplateId}
                onUse={() => handleUseTemplate(tpl)}
                onPreview={() => {
                  setSelectedTemplateId(tpl.id);
                  setInput(tpl.prompt);
                  pushMessage({ from: "bot", text: `Previewed template: ${tpl.title}` });
                }}
              />
              <div className="tpl-utilities">
                <button className="link-btn" onClick={() => toggleFavorite(tpl.id)}>
                  {favorites.includes(tpl.id) ? "★ Favorited" : "☆ Favorite"}
                </button>
                <button className="link-btn" onClick={() => handleShareMock(tpl)}>
                  Share
                </button>
                <button className="link-btn" onClick={() => handleDownload("txt")}>
                  Export
                </button>
                <button className="link-btn" onClick={() => pushMessage({ from: "bot", text: `Saved "${tpl.title}" to library (mock).` })}>
                  Save to Library
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pg-quick-actions">
          <button
            className="btn btn-outline"
            onClick={() => {
              setCategoryFilter("All");
              pushMessage({ from: "bot", text: "Showing all templates." });
            }}
          >
            Show All
          </button>
          <button
            className="btn"
            onClick={() => {
              setCategoryFilter("Technical");
              pushMessage({ from: "bot", text: "Filtered: Technical." });
            }}
          >
            Show Technical
          </button>
          <button
            className="btn"
            onClick={() => {
              setCategoryFilter("Business");
              pushMessage({ from: "bot", text: "Filtered: Business." });
            }}
          >
            Show Business
          </button>
        </div>
      </div>

      {/* RIGHT: Preview / results */}
      <div className="pg-right">
        <div className="pg-preview-header">
          <h3>Preview</h3>
          <p className="muted">Generated proposal will appear here. Use Copy / Export to save.</p>
        </div>

        <div className="pg-preview" ref={resultRef}>
          {generated ? (
            <>
              <pre className="pg-generated">{generated}</pre>
              <div className="pg-preview-actions">
                <button className="btn btn-outline" onClick={handleCopy}>
                  Copy
                </button>
                <button className="btn btn-outline" onClick={() => handleDownload("txt")}>
                  Download .txt
                </button>
                <button className="btn btn-outline" onClick={() => handleDownload("pdf")}>
                  Download .pdf (mock)
                </button>
                <button className="btn" onClick={() => pushMessage({ from: "bot", text: "Added proposal to project workspace (mock)." })}>
                  Add to Workspace
                </button>
              </div>
            </>
          ) : (
            <div className="pg-empty">
              <p className="muted">No proposal yet. Use a template or write a prompt and click Generate.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
