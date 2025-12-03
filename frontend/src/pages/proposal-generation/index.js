import React, { useState, useRef } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Typography,
  Stack,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  HubOutlined as HubOutlinedIcon,
  ContentCopy as ContentCopyIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Send as SendIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";
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
  {
    id: "tpl-5",
    title: "Maintenance & Support Plan",
    category: "Support",
    description: "Post-launch maintenance plan and SLA summary.",
    prompt: "Provide a 2-page maintenance & support proposal with SLA tiers, support response times and monthly cost options.",
  },
];

const TONE_OPTIONS = ["Professional", "Casual", "Persuasive", "Formal"];

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
  };

  const toggleFavorite = (id) => {
    setFavorites((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const simulateGenerate = (promptText) => {
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
      }, 800);
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
      pushMessage({ from: "bot", text: "Proposal generated — review in the preview panel." });
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

  const handleClear = () => {
    setInput("");
    setGenerated("");
    setSelectedTemplateId(null);
    setMessages([{ from: "bot", text: "Ready — choose a template, pick a tone, or type a prompt to generate a proposal." }]);
  };

  const filteredTemplates =
    categoryFilter === "All" ? DUMMY_TEMPLATES : DUMMY_TEMPLATES.filter((t) => t.category === categoryFilter);

  const categories = ["All", ...new Set(DUMMY_TEMPLATES.map((t) => t.category))];

  return (
    <Box sx={{ p: 3, backgroundColor: COLORS.neutral.gray50, minHeight: "100vh" }}>
      <PageTitle
        title={t("navigation.proposalGeneration") || "Proposal Generation"}
        subtitle={t("navigation.proposalGenerationDesc") || "Generate professional proposals using AI-powered templates"}
        icon={<HubOutlinedIcon sx={{ fontSize: "2rem" }} />}
        color={COLORS.info.main}
      />

      <Grid container spacing={3}>
        {/* LEFT: Templates Section */}
        <Grid item xs={12} lg={5}>
          <Card
            sx={{
              borderLeft: `4px solid ${COLORS.info.main}`,
              backgroundColor: `${COLORS.info.lightest}10`,
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" sx={{ color: COLORS.info.dark, fontWeight: 600 }}>
                  Templates
                </Typography>
                <Stack direction="row" spacing={1}>
                  <IconButton size="small" onClick={handleClear} sx={{ color: COLORS.neutral.gray600 }}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>

              <Box sx={{ mb: 2 }}>
                <TextField
                  select
                  label="Filter by Category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  pr: 1,
                  "&::-webkit-scrollbar": {
                    width: "8px",
                  },
                  "&::-webkit-scrollbar-track": {
                    backgroundColor: COLORS.neutral.gray200,
                    borderRadius: "4px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: COLORS.neutral.gray400,
                    borderRadius: "4px",
                    "&:hover": {
                      backgroundColor: COLORS.neutral.gray500,
                    },
                  },
                }}
              >
                <Grid container spacing={2}>
                  {filteredTemplates.map((tpl) => (
                    <Grid item xs={12} key={tpl.id}>
                      <Card
                        sx={{
                          border: `2px solid ${selectedTemplateId === tpl.id ? COLORS.info.main : COLORS.neutral.gray300}`,
                          backgroundColor: selectedTemplateId === tpl.id ? `${COLORS.info.lightest}20` : COLORS.neutral.white,
                          transition: "all 0.3s ease",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: `0 4px 12px ${COLORS.info.light}40`,
                            borderColor: COLORS.info.main,
                          },
                        }}
                      >
                        <CardContent>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: COLORS.neutral.gray900 }}>
                              {tpl.title}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => toggleFavorite(tpl.id)}
                              sx={{ color: favorites.includes(tpl.id) ? COLORS.accent.main : COLORS.neutral.gray400 }}
                            >
                              {favorites.includes(tpl.id) ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                            </IconButton>
                          </Box>
                          <Chip
                            label={tpl.category}
                            size="small"
                            sx={{
                              mb: 1,
                              backgroundColor: `${COLORS.info.lightest}30`,
                              color: COLORS.info.dark,
                              fontWeight: 500,
                            }}
                          />
                          <Typography variant="body2" sx={{ color: COLORS.neutral.gray600, mb: 2, minHeight: "40px" }}>
                            {tpl.description}
                          </Typography>
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleUseTemplate(tpl)}
                            sx={{
                              background: `linear-gradient(135deg, ${COLORS.info.main} 0%, ${COLORS.info.dark} 100%)`,
                              "&:hover": {
                                background: `linear-gradient(135deg, ${COLORS.info.dark} 0%, ${COLORS.info.darker} 100%)`,
                              },
                            }}
                          >
                            Use Template
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* CENTER: Input & Chat Section */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={2} sx={{ height: "100%" }}>
            <Card
              sx={{
                borderLeft: `4px solid ${COLORS.primary.main}`,
                backgroundColor: `${COLORS.primary.lightest}10`,
                flex: 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <Typography variant="h6" sx={{ color: COLORS.primary.dark, fontWeight: 600, mb: 2 }}>
                  Create Proposal
                </Typography>

                {/* Chat Window */}
                <Paper
                  sx={{
                    flex: 1,
                    p: 2,
                    mb: 2,
                    backgroundColor: COLORS.neutral.gray100,
                    borderRadius: 2,
                    overflowY: "auto",
                    maxHeight: "300px",
                    "&::-webkit-scrollbar": {
                      width: "8px",
                    },
                    "&::-webkit-scrollbar-track": {
                      backgroundColor: COLORS.neutral.gray200,
                      borderRadius: "4px",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      backgroundColor: COLORS.neutral.gray400,
                      borderRadius: "4px",
                    },
                  }}
                >
                  <Stack spacing={1.5}>
                    {messages.map((m, i) => (
                      <Box
                        key={i}
                        sx={{
                          display: "flex",
                          justifyContent: m.from === "user" ? "flex-end" : "flex-start",
                        }}
                      >
                        <Paper
                          sx={{
                            p: 1.5,
                            maxWidth: "85%",
                            backgroundColor: m.from === "user" ? COLORS.primary.main : COLORS.neutral.white,
                            color: m.from === "user" ? COLORS.neutral.white : COLORS.neutral.gray900,
                            borderRadius: 2,
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          }}
                        >
                          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", fontSize: "0.875rem" }}>
                            {m.text}
                          </Typography>
                        </Paper>
                      </Box>
                    ))}
                    {loading && (
                      <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                        <CircularProgress size={24} sx={{ color: COLORS.info.main }} />
                      </Box>
                    )}
                  </Stack>
                </Paper>

                {/* Input Area */}
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    placeholder="Describe the proposal you want — or use a template above to load its prompt."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    sx={{ mb: 2 }}
                  />

                  <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                    <TextField
                      select
                      label="Tone"
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      size="small"
                      sx={{ flex: 1 }}
                    >
                      {TONE_OPTIONS.map((opt) => (
                        <MenuItem key={opt} value={opt}>
                          {opt}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setInput("Create a tailored proposal for a mobile app that helps patients book teleconsultations...");
                        pushMessage({ from: "bot", text: "Inserted sample prompt." });
                      }}
                      sx={{
                        borderColor: COLORS.neutral.gray300,
                        color: COLORS.neutral.gray700,
                        "&:hover": {
                          borderColor: COLORS.info.main,
                          backgroundColor: `${COLORS.info.lightest}20`,
                        },
                      }}
                    >
                      Example
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleGenerate}
                      disabled={loading || !input.trim()}
                      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                      sx={{
                        flex: 1,
                        background: `linear-gradient(135deg, ${COLORS.success.main} 0%, ${COLORS.success.dark} 100%)`,
                        "&:hover": {
                          background: `linear-gradient(135deg, ${COLORS.success.dark} 0%, ${COLORS.success.darker} 100%)`,
                        },
                        "&:disabled": {
                          backgroundColor: COLORS.neutral.gray300,
                        },
                      }}
                    >
                      {loading ? "Generating..." : "Generate Proposal"}
                    </Button>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* RIGHT: Preview Section */}
        <Grid item xs={12} lg={3}>
          <Card
            sx={{
              borderLeft: `4px solid ${COLORS.success.main}`,
              backgroundColor: `${COLORS.success.lightest}10`,
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" sx={{ color: COLORS.success.dark, fontWeight: 600 }}>
                  Preview
                </Typography>
                <DescriptionIcon sx={{ color: COLORS.success.main }} />
              </Box>

              <Paper
                ref={resultRef}
                sx={{
                  flex: 1,
                  p: 2,
                  mb: 2,
                  backgroundColor: COLORS.neutral.white,
                  borderRadius: 2,
                  border: `1px dashed ${COLORS.neutral.gray300}`,
                  overflowY: "auto",
                  minHeight: "400px",
                  "&::-webkit-scrollbar": {
                    width: "8px",
                  },
                  "&::-webkit-scrollbar-track": {
                    backgroundColor: COLORS.neutral.gray200,
                    borderRadius: "4px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: COLORS.neutral.gray400,
                    borderRadius: "4px",
                  },
                }}
              >
                {generated ? (
                  <Typography
                    component="pre"
                    sx={{
                      whiteSpace: "pre-wrap",
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', monospace",
                      fontSize: "0.875rem",
                      color: COLORS.neutral.gray900,
                      margin: 0,
                    }}
                  >
                    {generated}
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      color: COLORS.neutral.gray500,
                    }}
                  >
                    <DescriptionIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                    <Typography variant="body2" sx={{ textAlign: "center" }}>
                      No proposal yet. Use a template or write a prompt and click Generate.
                    </Typography>
                  </Box>
                )}
              </Paper>

              {generated && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ContentCopyIcon />}
                    onClick={handleCopy}
                    sx={{
                      borderColor: COLORS.info.main,
                      color: COLORS.info.main,
                      "&:hover": {
                        borderColor: COLORS.info.dark,
                        backgroundColor: `${COLORS.info.lightest}20`,
                      },
                    }}
                  >
                    Copy
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownload("txt")}
                    sx={{
                      borderColor: COLORS.success.main,
                      color: COLORS.success.main,
                      "&:hover": {
                        borderColor: COLORS.success.dark,
                        backgroundColor: `${COLORS.success.lightest}20`,
                      },
                    }}
                  >
                    Download
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DeleteIcon />}
                    onClick={handleClear}
                    sx={{
                      borderColor: COLORS.secondary.main,
                      color: COLORS.secondary.main,
                      "&:hover": {
                        borderColor: COLORS.secondary.dark,
                        backgroundColor: `${COLORS.secondary.lightest}20`,
                      },
                    }}
                  >
                    Clear
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
