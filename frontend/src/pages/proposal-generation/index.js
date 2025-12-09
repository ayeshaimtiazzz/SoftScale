import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Fade,
  Select,
  Tooltip,
  FormControlLabel,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  ContentCopy as ContentCopyIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Send as SendIcon,
  Description as DescriptionIcon,
  Visibility as VisibilityIcon,
  Article as ArticleIcon,
  Code as CodeIcon,
  Close as CloseIcon,
  Menu as MenuIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { COLORS } from "../../constants";
import { config } from "../../config";
import { getAuthToken } from "../../utils/storage";
import "./styles.css";

const TONE_OPTIONS = ["Professional", "Casual", "Persuasive", "Formal"];
const PAGE_COUNT_OPTIONS = ["1-page", "2-page", "3-page", "4-page", "5-page+"];
const DETAIL_LEVEL_OPTIONS = [
  { value: "detailed", label: "Long & Detailed" },
  { value: "summarized", label: "Concise & Summarized" },
];

export default function ProposalGeneration() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // State declarations
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
  const [pageCount, setPageCount] = useState("");
  const [coverPage, setCoverPage] = useState(false);
  const [detailLevel, setDetailLevel] = useState("detailed");
  const [error, setError] = useState(null);
  const [previewMode, setPreviewMode] = useState("html");
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false);
  const [selectedTemplateForPreview, setSelectedTemplateForPreview] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);
  const [customizationExpanded, setCustomizationExpanded] = useState(true);
  const resultRef = useRef(null);

  // Helper functions
  const pushMessage = useCallback((m) => {
    setMessages((prevMessages) => [...prevMessages, m]);
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    setError(null);
    try {
      const token = getAuthToken();
      const response = await fetch(`${config.apiBase}/proposals/templates`, {
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
  }, [pushMessage]);

  // Fetch templates on component mount
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Handle pre-filled data from navigation state
  useEffect(() => {
    const state = location.state;
    if (state) {
      if (state.fromMatch && state.proposalData) {
        // Pre-fill from talent match
        const { proposalData } = state;
        const promptParts = [];

        if (proposalData.project_title || proposalData.job_title) {
          promptParts.push(`Project Title: ${proposalData.project_title || proposalData.job_title}`);
        }
        if (proposalData.talent_name) {
          promptParts.push(`Talent Name: ${proposalData.talent_name}`);
        }
        if (proposalData.skills) {
          promptParts.push(`Talent Skills: ${proposalData.skills}`);
        }
        if (proposalData.experience) {
          promptParts.push(`Talent Experience: ${proposalData.experience}`);
        }
        if (proposalData.company_name) {
          promptParts.push(`Company: ${proposalData.company_name}`);
        }
        if (proposalData.match_score) {
          promptParts.push(`Match Score: ${proposalData.match_score}%`);
        }

        const preFilledPrompt = promptParts.join("\n\n");
        setInput(preFilledPrompt);

        // Store proposal data for later use when generating
        setMessages([
          {
            from: "bot",
            text: "Proposal context pre-filled from talent match. Review and adjust the prompt below, then click Generate.",
          },
        ]);
      } else if (state.fromDeal && state.dealData) {
        // Pre-fill from deal
        const { dealData } = state;
        const promptParts = [];

        if (dealData.deal_title) {
          promptParts.push(`Deal Title: ${dealData.deal_title}`);
        }
        if (dealData.description) {
          promptParts.push(`Project Description: ${dealData.description}`);
        }
        if (dealData.talent_name) {
          promptParts.push(`Talent Name: ${dealData.talent_name}`);
        }
        if (dealData.skills) {
          promptParts.push(`Required Skills: ${dealData.skills}`);
        }
        if (dealData.experience) {
          promptParts.push(`Experience Required: ${dealData.experience}`);
        }
        if (dealData.company_name) {
          promptParts.push(`Company: ${dealData.company_name}`);
        }
        if (dealData.value) {
          promptParts.push(`Budget: $${dealData.value.toLocaleString()}`);
        }
        if (dealData.match_score) {
          promptParts.push(`Match Score: ${dealData.match_score}%`);
        }

        const preFilledPrompt = promptParts.join("\n\n");
        setInput(preFilledPrompt);

        setMessages([
          {
            from: "bot",
            text: "Proposal context pre-filled from deal. Review and adjust the prompt below, then click Generate.",
          },
        ]);
      }
    }
  }, [location.state]);

  const handleUseTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id);
    setInput(tpl.prompt);
    pushMessage({ from: "bot", text: `Template selected: ${tpl.title}` });
  };

  const handlePreviewTemplate = (tpl) => {
    setSelectedTemplateForPreview(tpl);
    setTemplatePreviewOpen(true);
  };

  const handleCloseTemplatePreview = () => {
    setTemplatePreviewOpen(false);
    setSelectedTemplateForPreview(null);
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
      const state = location.state;

      // Check if we should use deal or match endpoint
      if (state?.fromDeal && state.dealId) {
        // Generate from deal
        const templateId = selectedTemplateId ? templates.find((t) => t.id === selectedTemplateId)?.template_id : null;

        const response = await fetch(`${config.apiBase}/proposals/generate-from-deal`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            deal_id: state.dealId,
            tone: tone,
            template_id: templateId,
            page_count: pageCount || null,
            cover_page: coverPage ? "with" : "without",
            detail_level: detailLevel,
            save_to_deal: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || "Failed to generate proposal");
        }

        const data = await response.json();
        if (data.success) {
          setGenerated(data.proposal);
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
        } else {
          throw new Error(data.error || "Failed to generate proposal");
        }
      } else if (state?.fromMatch && state.proposalData) {
        // Generate from match
        const { proposalData } = state;
        const templateId = selectedTemplateId ? templates.find((t) => t.id === selectedTemplateId)?.template_id : null;

        const response = await fetch(`${config.apiBase}/proposals/generate-from-match`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            talent_id: proposalData.talent_id,
            talent_name: proposalData.talent_name,
            match_score: proposalData.match_score,
            skills: proposalData.skills,
            experience: proposalData.experience,
            job_id: proposalData.job_id,
            project_id: proposalData.project_id,
            job_title: proposalData.job_title,
            project_title: proposalData.project_title,
            job_description: proposalData.job_description,
            project_description: proposalData.project_description,
            company_name: proposalData.company_name,
            tone: tone,
            template_id: templateId,
            page_count: pageCount || null,
            cover_page: coverPage ? "with" : "without",
            detail_level: detailLevel,
            create_deal: proposalData.create_deal || false,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || "Failed to generate proposal");
        }

        const data = await response.json();
        if (data.success) {
          setGenerated(data.proposal);
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 120);

          // If deal was created, navigate to CRM
          if (data.deal_created && data.deal_id) {
            setTimeout(() => {
              navigate("/crm", { state: { highlightDealId: `deal-${data.deal_id}` } });
            }, 2000);
          }
        } else {
          throw new Error(data.error || "Failed to generate proposal");
        }
      } else {
        // Standard generation
        const templateId = selectedTemplateId ? templates.find((t) => t.id === selectedTemplateId)?.template_id : null;

        const response = await fetch(`${config.apiBase}/proposals/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            prompt: promptText,
            tone: tone,
            template_id: templateId,
            page_count: pageCount || null,
            cover_page: coverPage ? "with" : "without",
            detail_level: detailLevel,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || "Failed to generate proposal");
        }

        const data = await response.json();
        if (data.success) {
          setGenerated(data.proposal);
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
        } else {
          throw new Error(data.error || "Failed to generate proposal");
        }
      }
    } catch (err) {
      console.error("Error generating proposal:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated);
      // Don't add message to chat
    } catch (e) {
      // Silent fail
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
    // Don't add message to chat
  };

  const handleClear = () => {
    setInput("");
    setGenerated("");
    setSelectedTemplateId(null);
    setPageCount("");
    setCoverPage(false);
    setDetailLevel("detailed");
    setPreviewMode("html");
    setMessages([{ from: "bot", text: "Ready — choose a template, pick a tone, or type a prompt to generate a proposal." }]);
  };

  // Convert markdown/text to HTML for preview
  const formatProposalForHTML = (text) => {
    if (!text) return "";
    // Basic markdown to HTML conversion
    let html = text
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br/>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^# (.*$)/gm, "<h1>$1</h1>")
      .replace(/^## (.*$)/gm, "<h2>$1</h2>")
      .replace(/^### (.*$)/gm, "<h3>$1</h3>")
      .replace(/^#### (.*$)/gm, "<h4>$1</h4>");
    return `<p>${html}</p>`;
  };

  const filteredTemplates = categoryFilter === "All" ? templates : templates.filter((t) => t.category === categoryFilter);

  const sidebarWidth = sidebarOpen ? 360 : 0; // Increased width for better layout

  return (
    <Box sx={{ height: "calc(100vh - 7rem)", backgroundColor: COLORS.neutral.gray50, overflow: "hidden" }}>
      <Grid container sx={{ height: "100%" }}>
        {/* Templates Sidebar Column */}
        {sidebarOpen && (
          <Grid
            item
            xs={false}
            sx={{
              width: `${sidebarWidth}px`,
              borderRight: `1px solid ${COLORS.neutral.gray300}`,
              backgroundColor: COLORS.neutral.white,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              height: "100%",
            }}
          >
            {/* Header merged with sidebar */}
            <Paper
              elevation={0}
              sx={{
                borderBottom: `1px solid ${COLORS.neutral.gray200}`,
                backgroundColor: COLORS.neutral.white,
                p: 2,
                flexShrink: 0,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box display={"flex"} sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <IconButton size="small" onClick={() => setSidebarOpen(false)} sx={{ color: COLORS.neutral.gray700 }}>
                      <MenuIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Typography
                    variant="h4"
                    component="h1"
                    sx={{ fontWeight: 600, color: COLORS.neutral.gray900, fontSize: "1.75rem", lineHeight: 1.3, mb: 0.5 }}
                  >
                    {t("navigation.proposalGeneration") || "Proposal Generation"}
                    <Typography variant="body1" sx={{ color: COLORS.neutral.gray600, fontSize: "0.9375rem", lineHeight: 1.5 }}>
                      {t("navigation.proposalGenerationDesc") || "Generate professional proposals using AI-powered templates"}
                    </Typography>
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.5}>
                  <IconButton size="small" onClick={fetchTemplates} disabled={loadingTemplates} sx={{ color: COLORS.neutral.gray700 }}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Paper>

            {/* Templates Accordion */}
            <Accordion
              defaultExpanded={true}
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                boxShadow: "none",
                borderBottom: `1px solid ${COLORS.neutral.gray200}`,
                borderTop: `1px solid ${COLORS.neutral.gray200}`,
                "&:before": { display: "none" },
                "&.Mui-expanded": { margin: 0 },
                overflow: "hidden",
                minHeight: 0,
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: COLORS.neutral.gray600, fontSize: "1rem" }} />}
                sx={{
                  minHeight: "28px !important",
                  maxHeight: "28px !important",
                  backgroundColor: COLORS.neutral.gray50,
                  borderBottom: `1px solid ${COLORS.neutral.gray200}`,
                  px: 1.5,
                  py: 0,
                  flexShrink: 0,
                  "&.Mui-expanded": { minHeight: "28px !important", maxHeight: "28px !important" },
                  "& .MuiAccordionSummary-content": {
                    margin: "4px 0 !important",
                    "&.Mui-expanded": { margin: "4px 0 !important" },
                  },
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600, color: COLORS.neutral.gray900, fontSize: "0.7rem" }}>
                  Templates
                </Typography>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  p: 0,
                  flex: 1,
                  overflowY: "auto",
                  overflowX: "hidden",
                  maxHeight: customizationExpanded ? "17.5rem" : "29rem",
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  "&::-webkit-scrollbar": { width: "6px" },
                  "&::-webkit-scrollbar-track": { backgroundColor: COLORS.neutral.gray100 },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: COLORS.neutral.gray400,
                    borderRadius: "3px",
                    "&:hover": { backgroundColor: COLORS.neutral.gray500 },
                  },
                }}
              >
                {/* Category Filter at top */}
                <Box sx={{ p: 1.5, pb: 1, borderBottom: `1px solid ${COLORS.neutral.gray200}`, flexShrink: 0 }}>
                  <TextField
                    select
                    label="Category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    size="small"
                    fullWidth
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        fontSize: "0.75rem",
                      },
                      "& .MuiInputLabel-root": {
                        fontSize: "0.75rem",
                      },
                    }}
                  >
                    {categories.map((cat) => (
                      <MenuItem key={cat} value={cat} sx={{ fontSize: "0.75rem" }}>
                        {cat}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    minHeight: 0,
                    p: 1.5,
                    "&::-webkit-scrollbar": { width: "6px" },
                    "&::-webkit-scrollbar-track": { backgroundColor: COLORS.neutral.gray100 },
                    "&::-webkit-scrollbar-thumb": {
                      backgroundColor: COLORS.neutral.gray400,
                      borderRadius: "3px",
                      "&:hover": { backgroundColor: COLORS.neutral.gray500 },
                    },
                  }}
                >
                  {loadingTemplates ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : filteredTemplates.length === 0 ? (
                    <Typography variant="body2" sx={{ textAlign: "center", color: COLORS.neutral.gray500, py: 4, fontSize: "0.75rem" }}>
                      No templates found
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {filteredTemplates.map((tpl) => (
                        <Card
                          key={tpl.id}
                          sx={{
                            border: `1px solid ${selectedTemplateId === tpl.id ? COLORS.info.main : COLORS.neutral.gray200}`,
                            backgroundColor: selectedTemplateId === tpl.id ? `${COLORS.info.lightest}15` : COLORS.neutral.white,
                            transition: "all 0.2s ease",
                            cursor: "pointer",
                            "&:hover": {
                              borderColor: COLORS.info.main,
                              boxShadow: `0 1px 4px ${COLORS.info.light}20`,
                            },
                          }}
                          onClick={() => handleUseTemplate(tpl)}
                        >
                          <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={0.5}>
                              <Box sx={{ flex: 1 }}>
                                <Typography
                                  variant="caption"
                                  sx={{ fontWeight: 600, mb: 0.5, color: COLORS.neutral.gray900, fontSize: "0.75rem", display: "block" }}
                                >
                                  {tpl.title}
                                </Typography>
                                <Chip
                                  label={tpl.category}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: "0.65rem",
                                    backgroundColor: `${COLORS.info.lightest}40`,
                                    color: COLORS.info.dark,
                                    mb: 0.75,
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: COLORS.neutral.gray600,
                                    fontSize: "0.7rem",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {tpl.description}
                                </Typography>
                              </Box>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(tpl.id);
                                }}
                                sx={{
                                  color: favorites.includes(tpl.id) ? COLORS.accent.main : COLORS.neutral.gray400,
                                  p: 0.5,
                                }}
                              >
                                {favorites.includes(tpl.id) ? (
                                  <StarIcon sx={{ fontSize: "0.9rem" }} />
                                ) : (
                                  <StarBorderIcon sx={{ fontSize: "0.9rem" }} />
                                )}
                              </IconButton>
                            </Stack>
                            <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<VisibilityIcon sx={{ fontSize: "0.85rem !important" }} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePreviewTemplate(tpl);
                                }}
                                sx={{
                                  flex: 1,
                                  fontSize: "0.7rem",
                                  py: 0.5,
                                  borderColor: COLORS.neutral.gray300,
                                  color: COLORS.neutral.gray700,
                                  "&:hover": { borderColor: COLORS.info.main, backgroundColor: `${COLORS.info.lightest}10` },
                                }}
                              >
                                Preview
                              </Button>
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Customization Options Accordion */}
            <Accordion
              expanded={customizationExpanded}
              onChange={(e, expanded) => setCustomizationExpanded(expanded)}
              sx={{
                boxShadow: "none",
                borderBottom: `1px solid ${COLORS.neutral.gray200}`,
                borderTop: `1px solid ${COLORS.neutral.gray200}`,
                "&:before": { display: "none" },
                "&.Mui-expanded": { margin: 0 },
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: COLORS.neutral.gray600, fontSize: "1rem" }} />}
                sx={{
                  minHeight: "28px !important",
                  maxHeight: "28px !important",
                  backgroundColor: COLORS.neutral.gray50,
                  px: 1.5,
                  py: 0,
                  flexShrink: 0,
                  "&.Mui-expanded": { minHeight: "28px !important", maxHeight: "28px !important" },
                  "& .MuiAccordionSummary-content": {
                    margin: "4px 0 !important",
                    "&.Mui-expanded": { margin: "4px 0 !important" },
                  },
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600, color: COLORS.neutral.gray900, fontSize: "0.7rem" }}>
                  Customization Options
                </Typography>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  p: 1.5,
                  backgroundColor: COLORS.neutral.white,
                  overflowY: "auto",
                  overflowX: "hidden",
                  maxHeight: "300px",
                  "&::-webkit-scrollbar": { width: "6px" },
                  "&::-webkit-scrollbar-track": { backgroundColor: COLORS.neutral.gray100 },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: COLORS.neutral.gray400,
                    borderRadius: "3px",
                    "&:hover": { backgroundColor: COLORS.neutral.gray500 },
                  },
                }}
              >
                <Stack>
                  {/* Tone Selection - Slider */}
                  <Box sx={{ px: 4 }}>
                    <Typography
                      variant="caption"
                      sx={{ color: COLORS.neutral.gray600, fontWeight: 600, mb: 0.5, display: "block", fontSize: "0.7rem" }}
                    >
                      Tone: <strong style={{ color: COLORS.neutral.gray900 }}>{tone}</strong>
                    </Typography>
                    <Slider
                      value={TONE_OPTIONS.indexOf(tone)}
                      onChange={(e, newValue) => {
                        setTone(TONE_OPTIONS[newValue]);
                      }}
                      min={0}
                      max={TONE_OPTIONS.length - 1}
                      step={1}
                      marks={TONE_OPTIONS.map((opt, index) => ({
                        value: index,
                        label: opt,
                      }))}
                      sx={{
                        color: COLORS.info.main,
                        px: 0.5,
                        "& .MuiSlider-thumb": {
                          width: 14,
                          height: 14,
                          backgroundColor: COLORS.info.main,
                          border: `2px solid ${COLORS.neutral.white}`,
                          boxShadow: `0 2px 4px ${COLORS.info.dark}40`,
                          "&:hover": {
                            backgroundColor: COLORS.info.dark,
                            boxShadow: `0 2px 8px ${COLORS.info.dark}60`,
                          },
                        },
                        "& .MuiSlider-track": {
                          background: `linear-gradient(to right, ${COLORS.primary.main}, ${COLORS.info.main}, ${COLORS.success.main}, ${COLORS.accent.main})`,
                          border: "none",
                          height: 3,
                        },
                        "& .MuiSlider-rail": {
                          backgroundColor: COLORS.neutral.gray200,
                          height: 3,
                        },
                        "& .MuiSlider-mark": {
                          backgroundColor: COLORS.neutral.gray300,
                          width: 2,
                          height: 6,
                          borderRadius: 1,
                        },
                        "& .MuiSlider-markLabel": {
                          fontSize: "0.6rem",
                          color: COLORS.neutral.gray600,
                          fontWeight: 500,
                          top: 18,
                        },
                        "& .MuiSlider-markLabelActive": {
                          color: COLORS.info.main,
                          fontWeight: 600,
                        },
                      }}
                    />
                  </Box>

                  {/* Length and Cover Page - Side by Side */}
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography
                        variant="caption"
                        sx={{ color: COLORS.neutral.gray600, fontWeight: 600, mb: 0.25, display: "block", fontSize: "0.7rem" }}
                      >
                        Length
                      </Typography>
                      <Select
                        value={pageCount}
                        onChange={(e) => setPageCount(e.target.value)}
                        size="small"
                        displayEmpty
                        fullWidth
                        sx={{
                          fontSize: "0.7rem",
                          backgroundColor: COLORS.neutral.white,
                          "& .MuiOutlinedInput-notchedOutline": {
                            borderColor: COLORS.neutral.gray300,
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            borderColor: COLORS.info.main,
                          },
                          "& .MuiSelect-select": {
                            py: 0.5,
                          },
                        }}
                      >
                        <MenuItem value="" sx={{ fontSize: "0.7rem" }}>
                          <em>Any</em>
                        </MenuItem>
                        {PAGE_COUNT_OPTIONS.map((opt) => (
                          <MenuItem key={opt} value={opt} sx={{ fontSize: "0.7rem" }}>
                            {opt}
                          </MenuItem>
                        ))}
                      </Select>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography
                        variant="caption"
                        sx={{ color: COLORS.neutral.gray600, fontWeight: 600, mb: 0.25, display: "block", fontSize: "0.7rem" }}
                      >
                        Cover
                      </Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={coverPage}
                            onChange={(e) => setCoverPage(e.target.checked)}
                            size="small"
                            sx={{
                              "& .MuiSwitch-switchBase.Mui-checked": {
                                color: COLORS.info.main,
                              },
                              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                backgroundColor: COLORS.info.main,
                              },
                            }}
                          />
                        }
                        label={
                          <Typography variant="caption" sx={{ fontSize: "0.65rem", color: COLORS.neutral.gray700 }}>
                            {coverPage ? "Yes" : "No"}
                          </Typography>
                        }
                        sx={{ m: 0 }}
                      />
                    </Grid>
                  </Grid>

                  {/* Detail Level - Horizontal Compact Design */}
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ color: COLORS.neutral.gray600, fontWeight: 600, mb: 0.5, display: "block", fontSize: "0.7rem" }}
                    >
                      Detail
                    </Typography>
                    <ToggleButtonGroup
                      value={detailLevel}
                      exclusive
                      onChange={(e, newLevel) => {
                        if (newLevel !== null) setDetailLevel(newLevel);
                      }}
                      size="small"
                      fullWidth
                      sx={{
                        "& .MuiToggleButton-root": {
                          px: 1,
                          py: 0.4,
                          fontSize: "0.65rem",
                          border: `1px solid ${COLORS.neutral.gray300}`,
                          color: COLORS.neutral.gray700,
                          "&.Mui-selected": {
                            backgroundColor: COLORS.success.main,
                            color: COLORS.neutral.white,
                            borderColor: COLORS.success.main,
                            "&:hover": {
                              backgroundColor: COLORS.success.dark,
                            },
                          },
                          "&:hover": {
                            backgroundColor: `${COLORS.success.lightest}20`,
                          },
                        },
                      }}
                    >
                      {DETAIL_LEVEL_OPTIONS.map((opt) => (
                        <ToggleButton key={opt.value} value={opt.value}>
                          {opt.value === "detailed" ? "Detailed" : "Summary"}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {/* Main Content Area */}
        <Grid item xs sx={{ display: "flex", flexDirection: "column", overflow: "hidden", height: "100%", minWidth: 0 }}>
          {/* Header when sidebar is closed */}
          {!sidebarOpen && (
            <Paper
              elevation={0}
              sx={{
                borderBottom: `1px solid ${COLORS.neutral.gray200}`,
                backgroundColor: COLORS.neutral.white,
                px: 3,
                py: 2,
                flexShrink: 0,
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box display={"flex"} sx={{ flex: 1 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <IconButton onClick={() => setSidebarOpen(true)} size="small">
                      <MenuIcon />
                    </IconButton>
                  </Stack>
                  <Typography
                    variant="h4"
                    component="h1"
                    sx={{ fontWeight: 600, color: COLORS.neutral.gray900, fontSize: "1.75rem", lineHeight: 1.3, mb: 0.5 }}
                  >
                    {t("navigation.proposalGeneration") || "Proposal Generation"}
                    <Typography variant="body1" sx={{ color: COLORS.neutral.gray600, fontSize: "0.9375rem", lineHeight: 1.5 }}>
                      {t("navigation.proposalGenerationDesc") || "Generate professional proposals using AI-powered templates"}
                    </Typography>
                  </Typography>
                </Box>
                {generated && (
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Fullscreen Preview">
                      <IconButton onClick={() => setFullscreenPreview(!fullscreenPreview)}>
                        {fullscreenPreview ? <FullscreenExitIcon /> : <FullscreenIcon />}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                )}
              </Stack>
            </Paper>
          )}

          {error && (
            <Alert severity="error" sx={{ mx: 3, mt: 2, flexShrink: 0 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Main Content - Split View */}
          <Box sx={{ flex: 1, display: "flex", overflow: "hidden", px: 2, gap: 3, minHeight: 0 }}>
            {/* Left: Input Section */}
            <Box sx={{ flex: "0 0 45%", display: "flex", flexDirection: "column", minWidth: 0, height: "100%" }}>
              <Card sx={{ height: "100%", display: "flex", flexDirection: "column", boxShadow: 2 }}>
                <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column", p: 3, overflow: "hidden" }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: COLORS.primary.dark, flexShrink: 0 }}>
                    Create Proposal
                  </Typography>

                  {/* Chat Window */}
                  <Paper
                    sx={{
                      height: "230px",
                      p: 2,
                      mb: 2,
                      backgroundColor: COLORS.neutral.gray100,
                      borderRadius: 2,
                      overflowY: "auto",
                      flexShrink: 0,
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
                    <Stack spacing={1}>
                      {messages
                        .filter((m) => {
                          // Only show initial bot message, user selections, and template selections
                          // Don't show API response messages like "Proposal generated" or errors
                          if (m.from === "user") return true;
                          if (m.text.includes("Template selected") || m.text.includes("tell me what kind")) return true;
                          return false;
                        })
                        .map((m, i) => (
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

                  {/* Input Area - Scrollable */}
                  <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
                    <Box
                      sx={{
                        flex: 1,
                        overflowY: "auto",
                        overflowX: "hidden",
                        pr: 1,
                        minHeight: 0,
                        "&::-webkit-scrollbar": { width: "6px" },
                        "&::-webkit-scrollbar-track": { backgroundColor: COLORS.neutral.gray100 },
                        "&::-webkit-scrollbar-thumb": { backgroundColor: COLORS.neutral.gray400, borderRadius: "3px" },
                      }}
                    >
                      <TextField
                        fullWidth
                        multiline
                        rows={5}
                        placeholder="Describe your proposal... What project are you proposing? What are the key requirements?"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        sx={{
                          mb: 2,
                          "& .MuiOutlinedInput-root": {
                            backgroundColor: COLORS.neutral.white,
                            "&:hover": {
                              "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: COLORS.info.main,
                              },
                            },
                          },
                        }}
                      />
                    </Box>

                    {/* Generate Button - Fixed at bottom */}
                    <Button
                      variant="contained"
                      fullWidth
                      size="large"
                      onClick={handleGenerate}
                      disabled={loading || !input.trim()}
                      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                      sx={{
                        py: 1.5,
                        flexShrink: 0,
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
                  </Box>
                </CardContent>
              </Card>
            </Box>

            {/* Right: Preview Section */}
            <Box sx={{ flex: "0 0 55%", display: "flex", flexDirection: "column", minWidth: 0, height: "100%" }}>
              <Card sx={{ height: "100%", display: "flex", flexDirection: "column", boxShadow: 2 }}>
                <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column", p: 0, overflow: "hidden" }}>
                  {/* Preview Header */}
                  <Box
                    sx={{
                      p: 2,
                      borderBottom: `1px solid ${COLORS.neutral.gray200}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.success.dark }}>
                      Preview
                    </Typography>
                    <Tabs value={previewMode} onChange={(e, v) => setPreviewMode(v)} sx={{ minHeight: "auto" }}>
                      <Tab
                        value="html"
                        icon={<ArticleIcon sx={{ fontSize: 18 }} />}
                        label="Document"
                        sx={{ minHeight: "auto", fontSize: "0.75rem", px: 1.5 }}
                      />
                      <Tab
                        value="text"
                        icon={<CodeIcon sx={{ fontSize: 18 }} />}
                        label="Text"
                        sx={{ minHeight: "auto", fontSize: "0.75rem", px: 1.5 }}
                      />
                    </Tabs>
                  </Box>

                  {/* Preview Content */}
                  <Box
                    ref={resultRef}
                    sx={{
                      flex: 1,
                      overflowY: "auto",
                      overflowX: "hidden",
                      minHeight: 0,
                      p: previewMode === "html" ? 4 : 3,
                      backgroundColor: previewMode === "html" ? COLORS.neutral.white : COLORS.neutral.gray50,
                      "&::-webkit-scrollbar": { width: "8px" },
                      "&::-webkit-scrollbar-track": { backgroundColor: COLORS.neutral.gray100 },
                      "&::-webkit-scrollbar-thumb": {
                        backgroundColor: COLORS.neutral.gray400,
                        borderRadius: "4px",
                        "&:hover": { backgroundColor: COLORS.neutral.gray500 },
                      },
                    }}
                  >
                    {generated ? (
                      previewMode === "html" ? (
                        <Box
                          sx={{
                            fontFamily: "'Georgia', 'Times New Roman', serif",
                            lineHeight: 1.8,
                            color: COLORS.neutral.gray900,
                            maxWidth: "800px",
                            margin: "0 auto",
                            "& h1": {
                              fontSize: "2rem",
                              fontWeight: 700,
                              marginBottom: "1rem",
                              marginTop: "1.5rem",
                              color: COLORS.primary.dark,
                              borderBottom: `2px solid ${COLORS.primary.main}`,
                              paddingBottom: "0.5rem",
                            },
                            "& h2": {
                              fontSize: "1.5rem",
                              fontWeight: 600,
                              marginBottom: "0.75rem",
                              marginTop: "1.25rem",
                              color: COLORS.primary.dark,
                            },
                            "& h3": {
                              fontSize: "1.25rem",
                              fontWeight: 600,
                              marginBottom: "0.5rem",
                              marginTop: "1rem",
                              color: COLORS.neutral.gray800,
                            },
                            "& h4": {
                              fontSize: "1.1rem",
                              fontWeight: 600,
                              marginBottom: "0.5rem",
                              marginTop: "0.75rem",
                              color: COLORS.neutral.gray700,
                            },
                            "& p": {
                              marginBottom: "1rem",
                              fontSize: "1rem",
                              textAlign: "justify",
                            },
                            "& strong": {
                              fontWeight: 600,
                              color: COLORS.neutral.gray900,
                            },
                            "& em": { fontStyle: "italic" },
                            "& ul, & ol": { marginLeft: "1.5rem", marginBottom: "1rem" },
                            "& li": { marginBottom: "0.5rem" },
                          }}
                          dangerouslySetInnerHTML={{ __html: formatProposalForHTML(generated) }}
                        />
                      ) : (
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
                      )
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
                        <DescriptionIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
                        <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
                          No Proposal Yet
                        </Typography>
                        <Typography variant="body2" sx={{ textAlign: "center", maxWidth: "400px" }}>
                          Select a template or enter a prompt, then click Generate to create your proposal.
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Preview Actions */}
                  {generated && (
                    <Box
                      sx={{
                        p: 2,
                        borderTop: `1px solid ${COLORS.neutral.gray200}`,
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        gap: 1.5,
                        flexShrink: 0,
                        backgroundColor: COLORS.neutral.white,
                      }}
                    >
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ContentCopyIcon />}
                        onClick={handleCopy}
                        sx={{ borderColor: COLORS.info.main, color: COLORS.info.main }}
                      >
                        Copy
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={() => handleDownload("txt")}
                        sx={{ borderColor: COLORS.success.main, color: COLORS.success.main }}
                      >
                        Download TXT
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<DeleteIcon />}
                        onClick={handleClear}
                        sx={{ borderColor: COLORS.secondary.main, color: COLORS.secondary.main }}
                      >
                        Clear
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Grid>
      </Grid>

      {/* Fullscreen Preview Dialog */}
      <Dialog
        open={fullscreenPreview}
        onClose={() => setFullscreenPreview(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            height: "90vh",
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: `1px solid ${COLORS.neutral.gray200}`,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Proposal Preview
          </Typography>
          <Stack direction="row" spacing={1}>
            <Tabs value={previewMode} onChange={(e, v) => setPreviewMode(v)} sx={{ minHeight: "auto" }}>
              <Tab value="html" icon={<ArticleIcon sx={{ fontSize: 18 }} />} label="Document" sx={{ minHeight: "auto", fontSize: "0.75rem" }} />
              <Tab value="text" icon={<CodeIcon sx={{ fontSize: 18 }} />} label="Text" sx={{ minHeight: "auto", fontSize: "0.75rem" }} />
            </Tabs>
            <IconButton onClick={() => setFullscreenPreview(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ p: 4, overflow: "auto" }}>
          {previewMode === "html" ? (
            <Box
              sx={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                lineHeight: 1.8,
                color: COLORS.neutral.gray900,
                maxWidth: "800px",
                margin: "0 auto",
                "& h1": {
                  fontSize: "2rem",
                  fontWeight: 700,
                  marginBottom: "1rem",
                  marginTop: "1.5rem",
                  color: COLORS.primary.dark,
                  borderBottom: `2px solid ${COLORS.primary.main}`,
                  paddingBottom: "0.5rem",
                },
                "& h2": {
                  fontSize: "1.5rem",
                  fontWeight: 600,
                  marginBottom: "0.75rem",
                  marginTop: "1.25rem",
                  color: COLORS.primary.dark,
                },
                "& h3": {
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                  marginTop: "1rem",
                  color: COLORS.neutral.gray800,
                },
                "& p": { marginBottom: "1rem", fontSize: "1rem", textAlign: "justify" },
                "& strong": { fontWeight: 600 },
                "& ul, & ol": { marginLeft: "1.5rem", marginBottom: "1rem" },
              }}
              dangerouslySetInnerHTML={{ __html: formatProposalForHTML(generated) }}
            />
          ) : (
            <Typography
              component="pre"
              sx={{
                whiteSpace: "pre-wrap",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', monospace",
                fontSize: "0.875rem",
              }}
            >
              {generated}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: `1px solid ${COLORS.neutral.gray200}`, p: 2 }}>
          <Button onClick={handleCopy} startIcon={<ContentCopyIcon />}>
            Copy
          </Button>
          <Button onClick={() => handleDownload("txt")} startIcon={<DownloadIcon />} variant="contained">
            Download
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog
        open={templatePreviewOpen}
        onClose={handleCloseTemplatePreview}
        maxWidth="md"
        fullWidth
        TransitionComponent={Fade}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, ${COLORS.info.main} 0%, ${COLORS.info.dark} 100%)`,
            color: COLORS.neutral.white,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: 2,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {selectedTemplateForPreview?.title}
            </Typography>
            {selectedTemplateForPreview?.category && (
              <Chip
                label={selectedTemplateForPreview.category}
                size="small"
                sx={{
                  mt: 1,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  color: COLORS.neutral.white,
                  fontWeight: 500,
                }}
              />
            )}
          </Box>
          <IconButton onClick={handleCloseTemplatePreview} sx={{ color: COLORS.neutral.white }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedTemplateForPreview && (
            <Stack spacing={3}>
              {selectedTemplateForPreview.description && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: COLORS.neutral.gray700 }}>
                    Description
                  </Typography>
                  <Typography variant="body2" sx={{ color: COLORS.neutral.gray600 }}>
                    {selectedTemplateForPreview.description}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: COLORS.neutral.gray700 }}>
                  Prompt Preview
                </Typography>
                <Paper
                  sx={{
                    p: 2,
                    backgroundColor: COLORS.neutral.gray50,
                    border: `1px solid ${COLORS.neutral.gray200}`,
                    borderRadius: 2,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: "pre-wrap",
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', monospace",
                      color: COLORS.neutral.gray800,
                      lineHeight: 1.6,
                    }}
                  >
                    {selectedTemplateForPreview.prompt}
                  </Typography>
                </Paper>
              </Box>
              {selectedTemplateForPreview.metadata && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: COLORS.neutral.gray700 }}>
                    Additional Information
                  </Typography>
                  <Typography variant="body2" sx={{ color: COLORS.neutral.gray600 }}>
                    {JSON.stringify(selectedTemplateForPreview.metadata, null, 2)}
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: `1px solid ${COLORS.neutral.gray200}` }}>
          <Button onClick={handleCloseTemplatePreview} sx={{ color: COLORS.neutral.gray600 }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (selectedTemplateForPreview) {
                handleUseTemplate(selectedTemplateForPreview);
                handleCloseTemplatePreview();
              }
            }}
            sx={{
              background: `linear-gradient(135deg, ${COLORS.info.main} 0%, ${COLORS.info.dark} 100%)`,
              "&:hover": {
                background: `linear-gradient(135deg, ${COLORS.info.dark} 0%, ${COLORS.info.darker} 100%)`,
              },
            }}
          >
            Use This Template
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
