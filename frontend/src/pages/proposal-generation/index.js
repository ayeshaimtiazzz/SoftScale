import React, { useState, useRef, useEffect } from "react";
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
import { config } from "../../config";
import { getAuthToken } from "../../utils/storage";
import "./styles.css";

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
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [generated, setGenerated] = useState("");
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState(["All"]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [tone, setTone] = useState("Professional");
  const [error, setError] = useState(null);
  const resultRef = useRef(null);

  // Fetch templates on component mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    setError(null);
    try {
      const token = getAuthToken();
      const response = await fetch(`${config.apiBase}/api/proposals/templates`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }

      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates || []);
        const uniqueCategories = ["All", ...new Set((data.templates || []).map((t) => t.category).filter(Boolean))];
        setCategories(uniqueCategories);
      } else {
        throw new Error(data.error || "Failed to load templates");
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
      setError(err.message);
      pushMessage({ from: "bot", text: `Error loading templates: ${err.message}` });
    } finally {
      setLoadingTemplates(false);
    }
  };

  const pushMessage = (m) => setMessages((s) => [...s, m]);

  const handleUseTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id);
    setInput(tpl.prompt);
    pushMessage({ from: "bot", text: `Template selected: ${tpl.title}` });
  };

  const toggleFavorite = (id) => {
    setFavorites((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
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
    setError(null);

    try {
      const token = getAuthToken();
      // Extract template_id from selected template if available
      const templateId = selectedTemplateId ? templates.find((t) => t.id === selectedTemplateId)?.template_id : null;

      const response = await fetch(`${config.apiBase}/api/proposals/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: promptText,
          tone: tone,
          template_id: templateId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to generate proposal");
      }

      const data = await response.json();
      if (data.success) {
        setGenerated(data.proposal);
        pushMessage({ from: "bot", text: "Proposal generated — review in the preview panel." });
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
      } else {
        throw new Error(data.error || "Failed to generate proposal");
      }
    } catch (err) {
      console.error("Error generating proposal:", err);
      setError(err.message);
      pushMessage({ from: "bot", text: `Error: ${err.message}` });
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

  const filteredTemplates = categoryFilter === "All" ? templates : templates.filter((t) => t.category === categoryFilter);

  return (
    <Box sx={{ p: 3, backgroundColor: COLORS.neutral.gray50, minHeight: "100vh" }}>
      <PageTitle
        title={t("navigation.proposalGeneration") || "Proposal Generation"}
        subtitle={t("navigation.proposalGenerationDesc") || "Generate professional proposals using AI-powered templates"}
        icon={<HubOutlinedIcon sx={{ fontSize: "2rem" }} />}
        color={COLORS.info.main}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

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
                  <IconButton size="small" onClick={fetchTemplates} sx={{ color: COLORS.neutral.gray600 }} disabled={loadingTemplates}>
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
                {loadingTemplates ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <CircularProgress size={32} sx={{ color: COLORS.info.main }} />
                  </Box>
                ) : filteredTemplates.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 4, color: COLORS.neutral.gray500 }}>
                    <Typography variant="body2">No templates found. Try adjusting your filters.</Typography>
                  </Box>
                ) : (
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
                )}
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
                    <TextField select label="Tone" value={tone} onChange={(e) => setTone(e.target.value)} size="small" sx={{ flex: 1 }}>
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
