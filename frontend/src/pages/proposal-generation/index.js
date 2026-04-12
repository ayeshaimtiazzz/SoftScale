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
  Badge,
  Menu,
  ListItemText,
  ListItemIcon,
  Divider,
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
  Edit as EditIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Menu as MenuIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  ExpandMore as ExpandMoreIcon,
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { COLORS, ROUTES } from "../../constants";
import { config } from "../../config";
import { getAuthToken } from "../../utils/storage";
import { getProposalPreviewHtml } from "./proposalContent";
import ProposalRichTextEditor from "./ProposalRichTextEditor";
import "./styles.css";

const PROPOSAL_DRAFT_KEY = "softscale_proposal_draft_v1";

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
  const [proposalSaved, setProposalSaved] = useState(false);
  const [savingProposal, setSavingProposal] = useState(false);
  const [currentDealId, setCurrentDealId] = useState(null);
  const [viewProposalDialog, setViewProposalDialog] = useState(false);
  const [viewingProposal, setViewingProposal] = useState(null);
  const [draftRestorable, setDraftRestorable] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const notificationsFetchRef = useRef(false);

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROPOSAL_DRAFT_KEY);
      if (raw && raw.trim()) setDraftRestorable(true);
    } catch (_) {
      /* ignore */
    }
  }, []);

  // Format time ago
  const formatTimeAgo = useCallback((dateString) => {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (notificationsFetchRef.current) return;

    const token = getAuthToken();
    if (!token) {
      setNotifications([]);
      return;
    }

    notificationsFetchRef.current = true;
    setLoadingNotifications(true);
    try {
      const response = await fetch(`${config.apiBase}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const formatted = (data.notifications || []).map((notif) => ({
            id: notif.notification_id,
            message: notif.message || notif.title,
            time: formatTimeAgo(notif.created_at),
            read: notif.is_read || false,
            notification_id: notif.notification_id,
            type: notif.type,
            related_entity_type: notif.related_entity_type,
            related_entity_id: notif.related_entity_id,
            deal_id: notif.deal_id,
            proposal_id: notif.proposal_id,
          }));
          setNotifications(formatted);
        }
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
      notificationsFetchRef.current = false;
    }
  }, [formatTimeAgo]);

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    const token = getAuthToken();
    if (!token) return;

    try {
      await fetch(`${config.apiBase}/notifications/${notificationId}/read`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === notificationId ? { ...n, read: true, is_read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  // Fetch notifications on mount and periodically
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      fetchNotifications();
      const interval = setInterval(() => {
        if (!notificationsFetchRef.current) {
          fetchNotifications();
        }
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const notificationOpen = Boolean(notificationAnchorEl);

  const handleNotificationNavigation = (notification) => {
    const dealId = notification?.deal_id || notification?.related_entity_id;
    const relatedType = notification?.related_entity_type || "";
    if (notification?.deal_id || relatedType === "deal" || relatedType === "deal_sentiment") {
      navigate(ROUTES.CRM, {
        state: {
          highlightDealId: dealId ? `deal-${dealId}` : undefined,
          refreshDeals: true,
        },
      });
      return;
    }
    if (notification?.proposal_id || relatedType === "proposal") {
      // already on proposal page; keep context by opening requested proposal if provided
      if (notification?.proposal_id) {
        setViewingProposal((prev) => ({ ...(prev || {}), proposal_id: notification.proposal_id }));
      }
      return;
    }
    navigate(ROUTES.DASHBOARD);
  };

  // Handle pre-filled data from navigation state
  useEffect(() => {
    const state = location.state;
    if (state) {
      // Handle viewing an existing proposal
      if (state.viewProposal && state.proposalContent) {
        setViewingProposal({
          proposalId: state.proposalId,
          content: state.proposalContent,
          dealId: state.dealId,
        });
        setViewProposalDialog(true);
        // Clear the state to prevent re-opening on re-render
        window.history.replaceState({}, document.title);
      } else if (state.fromMatch && state.proposalData) {
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
        // Generate from deal - don't save automatically, let user save manually
        const templateId = selectedTemplateId ? templates.find((t) => t.id === selectedTemplateId)?.template_id : null;
        // Ensure dealId is a number
        let dealId = state.dealId;
        if (typeof dealId === "string" && dealId.startsWith("deal-")) {
          dealId = parseInt(dealId.replace("deal-", ""));
        } else if (typeof dealId === "string") {
          dealId = parseInt(dealId);
        }
        setCurrentDealId(dealId);
        setProposalSaved(false); // Reset saved state

        const response = await fetch(`${config.apiBase}/proposals/generate-from-deal`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            deal_id: dealId,
            tone: tone,
            template_id: templateId,
            page_count: pageCount || null,
            cover_page: coverPage ? "with" : "without",
            detail_level: detailLevel,
            save_to_deal: false, // Don't save automatically - user will click "Save for Deal" button
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || "Failed to generate proposal");
        }

        const data = await response.json();
        if (data.success) {
          setGenerated(data.proposal);
          // Check if it was already saved (in case save_to_deal was true in response)
          if (data.saved) {
            setProposalSaved(true);
          }
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

        // Option to use Jupyter for generation (add ?use_jupyter=true to use Jupyter container)
        const useJupyter = new URLSearchParams(window.location.search).get('use_jupyter') === 'true';
        const apiUrl = `${config.apiBase}/proposals/generate${useJupyter ? '?use_jupyter=true' : ''}`;

        const response = await fetch(apiUrl, {
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

  /** Download as txt (client blob), docx, or pdf (backend). Pass `proposalContentOverride` when downloading from View dialog. */
  const downloadProposalAs = async (format = "txt", proposalContentOverride = null) => {
    const text = proposalContentOverride != null ? proposalContentOverride : generated;
    if (!text) return;

    try {
      const authToken = getAuthToken();
      if (!authToken) {
        alert("Please log in to download proposals");
        return;
      }

      if (format === "docx" || format === "pdf") {
        const response = await fetch(`${config.apiBase}/proposals/download?format=${format}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            proposal: text,
            project_title: null,
            sender_name: null,
            submission_date: new Date().toISOString(),
          }),
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.detail || `Failed to download ${format.toUpperCase()}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext = format === "pdf" ? "pdf" : "docx";
        a.download = `proposal_${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `proposal_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Download error:", error);
      alert(`Failed to download: ${error.message}`);
    }
  };

  const handleSaveDraftLocally = () => {
    if (!generated) return;
    try {
      localStorage.setItem(PROPOSAL_DRAFT_KEY, generated);
      setDraftRestorable(true);
      pushMessage({ from: "bot", text: "Proposal draft saved on this device." });
    } catch (e) {
      pushMessage({ from: "bot", text: "Could not save draft (storage may be unavailable)." });
    }
  };

  const handleRestoreDraft = () => {
    try {
      const raw = localStorage.getItem(PROPOSAL_DRAFT_KEY);
      if (!raw) return;
      setGenerated(raw);
      setProposalSaved(false);
      setPreviewMode("edit");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
      pushMessage({ from: "bot", text: "Draft restored. You can continue editing or switch to Document view." });
    } catch (e) {
      pushMessage({ from: "bot", text: "Could not read saved draft." });
    }
  };

  const handleClear = () => {
    setInput("");
    setGenerated("");
    setSelectedTemplateId(null);
    setPageCount("");
    setCoverPage(false);
    setDetailLevel("detailed");
    setPreviewMode("html");
    setProposalSaved(false);
    setCurrentDealId(null);
    try {
      localStorage.removeItem(PROPOSAL_DRAFT_KEY);
    } catch (_) {
      /* ignore */
    }
    setDraftRestorable(false);
    setMessages([{ from: "bot", text: "Ready — choose a template, pick a tone, or type a prompt to generate a proposal." }]);
  };

  const handleSaveForDeal = async () => {
    if (!generated || !currentDealId) {
      return;
    }

    setSavingProposal(true);
    try {
      const token = getAuthToken();
      const templateId = selectedTemplateId ? templates.find((t) => t.id === selectedTemplateId)?.template_id : null;

      // Call save-to-deal endpoint to save the current proposal content
      const response = await fetch(`${config.apiBase}/proposals/save-to-deal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deal_id: currentDealId,
          proposal_content: generated,
          tone: tone,
          template_id: templateId,
          page_count: pageCount || null,
          cover_page: coverPage ? "with" : "without",
          detail_level: detailLevel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to save proposal");
      }

      const data = await response.json();
      if (data.success && data.saved) {
        setProposalSaved(true);
        let message = "Proposal saved to deal successfully!";
        if (data.stage_updated && data.new_stage) {
          message += ` Deal moved to "${data.new_stage}" stage.`;
        }
        pushMessage({ from: "bot", text: message });
      } else {
        throw new Error(data.error || "Failed to save proposal");
      }
    } catch (err) {
      console.error("Error saving proposal to deal:", err);
      pushMessage({ from: "bot", text: `Error: ${err.message}` });
    } finally {
      setSavingProposal(false);
    }
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
                <Stack direction="row" spacing={1} alignItems="center">
                  {/* Notification Bell */}
                  <Box>
                    <IconButton
                      onClick={(e) => setNotificationAnchorEl(e.currentTarget)}
                      size="small"
                      sx={{
                        color: COLORS.neutral.gray700,
                        "&:hover": {
                          backgroundColor: `${COLORS.primary.lightest}20`,
                        },
                      }}
                    >
                      <Badge badgeContent={unreadCount} color="error">
                        {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
                      </Badge>
                    </IconButton>
                    <Menu
                      anchorEl={notificationAnchorEl}
                      open={notificationOpen}
                      onClose={() => setNotificationAnchorEl(null)}
                      transformOrigin={{ horizontal: "right", vertical: "top" }}
                      anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                      PaperProps={{
                        sx: {
                          borderRadius: 2,
                          minWidth: 320,
                          maxWidth: 400,
                          maxHeight: 400,
                          boxShadow: `0 4px 16px ${COLORS.neutral.gray300}40`,
                        },
                      }}
                    >
                      <MenuItem disabled>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2" fontWeight={600}>
                              Notifications
                            </Typography>
                          }
                        />
                      </MenuItem>
                      <Divider />
                      {loadingNotifications ? (
                        <MenuItem disabled>
                          <ListItemText primary="Loading notifications..." />
                        </MenuItem>
                      ) : notifications.length === 0 ? (
                        <MenuItem disabled>
                          <ListItemText primary="No notifications" />
                        </MenuItem>
                      ) : (
                        notifications.map((notification) => (
                          <MenuItem
                            key={notification.id}
                            onClick={() => {
                              if (!notification.read && notification.notification_id) {
                                handleMarkAsRead(notification.notification_id);
                              }
                              setNotificationAnchorEl(null);
                              handleNotificationNavigation(notification);
                            }}
                            sx={{
                              backgroundColor: notification.read ? "transparent" : `${COLORS.primary.lightest}20`,
                              "&:hover": {
                                backgroundColor: `${COLORS.primary.lightest}40`,
                              },
                            }}
                          >
                            <ListItemIcon>
                              <NotificationsIcon
                                fontSize="small"
                                sx={{ color: notification.read ? COLORS.neutral.gray400 : COLORS.primary.main }}
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={notification.message}
                              secondary={notification.time}
                              primaryTypographyProps={{
                                fontWeight: notification.read ? 400 : 600,
                                fontSize: "0.875rem",
                              }}
                              secondaryTypographyProps={{
                                fontSize: "0.75rem",
                              }}
                            />
                          </MenuItem>
                        ))
                      )}
                    </Menu>
                  </Box>
                  {generated && (
                    <Tooltip title="Fullscreen Preview">
                      <IconButton onClick={() => setFullscreenPreview(!fullscreenPreview)} size="small">
                        {fullscreenPreview ? <FullscreenExitIcon /> : <FullscreenIcon />}
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
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
                <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column", p: 3, overflow: "hidden", minHeight: 0 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: COLORS.primary.dark, flexShrink: 0 }}>
                    Create Proposal
                  </Typography>

                  {/* Chat Window - Takes remaining space */}
                  <Paper
                    sx={{
                      flex: 1,
                      p: 2,
                      mb: 2,
                      backgroundColor: COLORS.neutral.gray100,
                      borderRadius: 2,
                      overflowY: "auto",
                      minHeight: 0,
                      display: "flex",
                      flexDirection: "column",
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

                  {/* Input and Buttons Container - Fixed at bottom */}
                  <Box sx={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      placeholder="Describe your proposal... What project are you proposing? What are the key requirements?"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      sx={{
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

                    {/* Action Buttons */}
                    <Stack direction="row" spacing={1.5}>
                      <Button
                        variant="outlined"
                        size="medium"
                        onClick={handleClear}
                        disabled={loading}
                        startIcon={<DeleteIcon />}
                        sx={{
                          py: 0.75,
                          px: 2,
                          flex: 1,
                          borderColor: COLORS.secondary.main,
                          color: COLORS.secondary.main,
                          "&:hover": {
                            borderColor: COLORS.secondary.dark,
                            backgroundColor: `${COLORS.secondary.lightest}20`,
                          },
                          "&:disabled": {
                            borderColor: COLORS.neutral.gray300,
                            color: COLORS.neutral.gray400,
                          },
                        }}
                      >
                        Clear
                      </Button>
                      <Button
                        variant="contained"
                        size="medium"
                        onClick={handleGenerate}
                        disabled={loading || !input.trim()}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                        sx={{
                          py: 0.75,
                          px: 2,
                          flex: 2,
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
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Tabs value={previewMode} onChange={(e, v) => setPreviewMode(v)} sx={{ minHeight: "auto" }}>
                        <Tab
                          value="html"
                          icon={<ArticleIcon sx={{ fontSize: 18 }} />}
                          label="Document"
                          sx={{ minHeight: "auto", fontSize: "0.75rem", px: 1.5 }}
                        />
                        <Tab
                          value="edit"
                          icon={<EditIcon sx={{ fontSize: 18 }} />}
                          label="Edit"
                          sx={{ minHeight: "auto", fontSize: "0.75rem", px: 1.5 }}
                        />
                      </Tabs>
                      {generated && (
                        <Tooltip title="Fullscreen Preview">
                          <IconButton
                            onClick={() => setFullscreenPreview(true)}
                            size="small"
                            sx={{
                              color: COLORS.info.main,
                              "&:hover": {
                                backgroundColor: `${COLORS.info.lightest}20`,
                              },
                            }}
                          >
                            <FullscreenIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </Box>

                  {draftRestorable && !generated && (
                    <Alert
                      severity="info"
                      sx={{ mx: 2, mt: 1, py: 0.5 }}
                      action={
                        <Button color="inherit" size="small" onClick={handleRestoreDraft}>
                          Restore draft
                        </Button>
                      }
                    >
                      You have a proposal draft saved on this device.
                    </Alert>
                  )}

                  {/* Preview Content */}
                  <Box
                    ref={resultRef}
                    sx={{
                      flex: 1,
                      overflowY: "auto",
                      overflowX: "hidden",
                      minHeight: 0,
                      p: previewMode === "html" ? 4 : previewMode === "edit" ? 2 : 3,
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
                          dangerouslySetInnerHTML={{ __html: getProposalPreviewHtml(generated) }}
                        />
                      ) : (
                        <ProposalRichTextEditor
                          value={generated}
                          onChange={(html) => {
                            setGenerated(html);
                            setProposalSaved(false);
                          }}
                          minHeight={320}
                          placeholder="Edit your proposal. Use the toolbar for headings, lists, and links. Changes apply to Document view, downloads, and Save for Deal."
                        />
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
                        p: 1,
                        borderTop: `1px solid ${COLORS.neutral.gray200}`,
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        gap: 1,
                        flexShrink: 0,
                        backgroundColor: COLORS.neutral.white,
                        flexWrap: "wrap",
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
                        onClick={() => downloadProposalAs("txt")}
                        sx={{ borderColor: COLORS.success.main, color: COLORS.success.main }}
                      >
                        TXT
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PictureAsPdfIcon />}
                        onClick={() => downloadProposalAs("pdf")}
                        sx={{ borderColor: COLORS.secondary.main, color: COLORS.secondary.main }}
                      >
                        PDF
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<SaveIcon />}
                        onClick={handleSaveDraftLocally}
                        sx={{ borderColor: COLORS.neutral.gray600, color: COLORS.neutral.gray800 }}
                      >
                        Save draft
                      </Button>
                      {/* Save for Deal button - only show when generating from a deal */}
                      {currentDealId && (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={savingProposal ? <CircularProgress size={16} color="inherit" /> : <DescriptionIcon />}
                          onClick={handleSaveForDeal}
                          disabled={savingProposal || proposalSaved}
                          sx={{
                            background: proposalSaved
                              ? `linear-gradient(135deg, ${COLORS.success.main} 0%, ${COLORS.success.dark} 100%)`
                              : `linear-gradient(135deg, ${COLORS.accent.main} 0%, ${COLORS.accent.dark} 100%)`,
                            "&:hover": {
                              background: proposalSaved
                                ? `linear-gradient(135deg, ${COLORS.success.dark} 0%, ${COLORS.success.darker} 100%)`
                                : `linear-gradient(135deg, ${COLORS.accent.dark} 0%, ${COLORS.accent.darker} 100%)`,
                            },
                            "&:disabled": {
                              backgroundColor: COLORS.neutral.gray300,
                            },
                          }}
                        >
                          {savingProposal ? "Saving..." : proposalSaved ? "Saved to Deal" : "Save for Deal"}
                        </Button>
                      )}
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
        maxWidth="xl"
        fullWidth
        TransitionComponent={Fade}
        PaperProps={{
          sx: {
            height: "95vh",
            maxHeight: "95vh",
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, ${COLORS.success.main} 0%, ${COLORS.success.dark} 100%)`,
            color: COLORS.neutral.white,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: 2,
            px: 3,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Proposal Preview
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Tabs
              value={previewMode}
              onChange={(e, v) => setPreviewMode(v)}
              sx={{
                minHeight: "auto",
                "& .MuiTab-root": {
                  color: "rgba(255,255,255,0.7)",
                  "&.Mui-selected": {
                    color: COLORS.neutral.white,
                  },
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: COLORS.neutral.white,
                },
              }}
            >
              <Tab
                value="html"
                icon={<ArticleIcon sx={{ fontSize: 18 }} />}
                label="Document"
                sx={{ minHeight: "auto", fontSize: "0.75rem", px: 1.5 }}
              />
              <Tab
                value="edit"
                icon={<EditIcon sx={{ fontSize: 18 }} />}
                label="Edit"
                sx={{ minHeight: "auto", fontSize: "0.75rem", px: 1.5 }}
              />
            </Tabs>
            <IconButton onClick={() => setFullscreenPreview(false)} sx={{ color: COLORS.neutral.white }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent
          sx={{
            p: previewMode === "edit" ? 2 : 4,
            overflow: "auto",
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
                  maxWidth: "900px",
                  margin: "0 auto",
                  "& h1": {
                    fontSize: "2.5rem",
                    fontWeight: 700,
                    marginBottom: "1rem",
                    marginTop: "1.5rem",
                    color: COLORS.primary.dark,
                    borderBottom: `2px solid ${COLORS.primary.main}`,
                    paddingBottom: "0.5rem",
                  },
                  "& h2": {
                    fontSize: "1.75rem",
                    fontWeight: 600,
                    marginBottom: "0.75rem",
                    marginTop: "1.25rem",
                    color: COLORS.primary.dark,
                  },
                  "& h3": {
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    marginTop: "1rem",
                    color: COLORS.neutral.gray800,
                  },
                  "& h4": {
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    marginTop: "0.75rem",
                    color: COLORS.neutral.gray700,
                  },
                  "& p": {
                    marginBottom: "1rem",
                    fontSize: "1.1rem",
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
                dangerouslySetInnerHTML={{ __html: getProposalPreviewHtml(generated) }}
              />
            ) : (
              <ProposalRichTextEditor
                value={generated}
                onChange={(html) => {
                  setGenerated(html);
                  setProposalSaved(false);
                }}
                minHeight={420}
                placeholder="Edit your proposal text."
              />
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
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            borderTop: `1px solid ${COLORS.neutral.gray200}`,
            px: 2,
            py: 1,
            backgroundColor: COLORS.neutral.white,
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Button
            onClick={handleCopy}
            startIcon={<ContentCopyIcon />}
            sx={{
              borderColor: COLORS.info.main,
              color: COLORS.info.main,
              "&:hover": {
                borderColor: COLORS.info.dark,
                backgroundColor: `${COLORS.info.lightest}20`,
              },
            }}
            variant="outlined"
          >
            Copy
          </Button>
          <Button
            onClick={() => downloadProposalAs("txt")}
            startIcon={<DownloadIcon />}
            variant="outlined"
            sx={{
              borderColor: COLORS.success.main,
              color: COLORS.success.main,
              "&:hover": {
                borderColor: COLORS.success.dark,
                backgroundColor: `${COLORS.success.lightest}20`,
              },
            }}
          >
            TXT
          </Button>
          <Button
            onClick={() => downloadProposalAs("pdf")}
            startIcon={<PictureAsPdfIcon />}
            variant="outlined"
            sx={{
              borderColor: COLORS.secondary.main,
              color: COLORS.secondary.main,
              "&:hover": {
                borderColor: COLORS.secondary.dark,
                backgroundColor: `${COLORS.secondary.lighter}20`,
              },
            }}
          >
            PDF
          </Button>
          <Button
            onClick={handleSaveDraftLocally}
            startIcon={<SaveIcon />}
            variant="outlined"
            sx={{
              borderColor: COLORS.neutral.gray600,
              color: COLORS.neutral.gray800,
            }}
          >
            Save draft
          </Button>
          {/* Save for Deal button in fullscreen - only show when generating from a deal */}
          {currentDealId && (
            <Button
              variant="contained"
              startIcon={savingProposal ? <CircularProgress size={16} color="inherit" /> : <DescriptionIcon />}
              onClick={handleSaveForDeal}
              disabled={savingProposal || proposalSaved}
              sx={{
                background: proposalSaved
                  ? `linear-gradient(135deg, ${COLORS.success.main} 0%, ${COLORS.success.dark} 100%)`
                  : `linear-gradient(135deg, ${COLORS.accent.main} 0%, ${COLORS.accent.dark} 100%)`,
                "&:hover": {
                  background: proposalSaved
                    ? `linear-gradient(135deg, ${COLORS.success.dark} 0%, ${COLORS.success.darker} 100%)`
                    : `linear-gradient(135deg, ${COLORS.accent.dark} 0%, ${COLORS.accent.darker} 100%)`,
                },
                "&:disabled": {
                  backgroundColor: COLORS.neutral.gray300,
                },
              }}
            >
              {savingProposal ? "Saving..." : proposalSaved ? "Saved to Deal" : "Save for Deal"}
            </Button>
          )}
          <Button
            variant="outlined"
            onClick={() => setFullscreenPreview(false)}
            sx={{
              borderColor: COLORS.neutral.gray400,
              color: COLORS.neutral.gray700,
              "&:hover": {
                borderColor: COLORS.neutral.gray500,
                backgroundColor: `${COLORS.neutral.gray100}20`,
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Proposal Dialog */}
      <Dialog
        open={viewProposalDialog}
        onClose={() => {
          setViewProposalDialog(false);
          setViewingProposal(null);
        }}
        maxWidth="lg"
        fullWidth
        TransitionComponent={Fade}
        PaperProps={{
          sx: {
            height: "90vh",
            maxHeight: "90vh",
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.dark} 100%)`,
            color: COLORS.neutral.white,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: 2,
            px: 3,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              View Proposal
            </Typography>
            {viewingProposal?.proposalId && (
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)", mt: 0.5, display: "block" }}>
                Proposal #{viewingProposal.proposalId}
              </Typography>
            )}
          </Box>
          <IconButton
            onClick={() => {
              setViewProposalDialog(false);
              setViewingProposal(null);
            }}
            sx={{ color: COLORS.neutral.white }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            p: 4,
            overflow: "auto",
            backgroundColor: COLORS.neutral.white,
            "&::-webkit-scrollbar": { width: "8px" },
            "&::-webkit-scrollbar-track": { backgroundColor: COLORS.neutral.gray100 },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: COLORS.neutral.gray400,
              borderRadius: "4px",
              "&:hover": { backgroundColor: COLORS.neutral.gray500 },
            },
          }}
        >
          {viewingProposal?.content ? (
            <Box
              sx={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                lineHeight: 1.8,
                color: COLORS.neutral.gray900,
                maxWidth: "900px",
                margin: "0 auto",
                "& h1": {
                  fontSize: "2.5rem",
                  fontWeight: 700,
                  marginBottom: "1rem",
                  marginTop: "1.5rem",
                  color: COLORS.primary.dark,
                  borderBottom: `2px solid ${COLORS.primary.main}`,
                  paddingBottom: "0.5rem",
                },
                "& h2": {
                  fontSize: "1.75rem",
                  fontWeight: 600,
                  marginBottom: "0.75rem",
                  marginTop: "1.25rem",
                  color: COLORS.primary.dark,
                },
                "& h3": {
                  fontSize: "1.5rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                  marginTop: "1rem",
                  color: COLORS.neutral.gray800,
                },
                "& h4": {
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                  marginTop: "0.75rem",
                  color: COLORS.neutral.gray700,
                },
                "& p": {
                  marginBottom: "1rem",
                  fontSize: "1.1rem",
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
              dangerouslySetInnerHTML={{ __html: getProposalPreviewHtml(viewingProposal.content) }}
            />
          ) : (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            p: 2,
            borderTop: `1px solid ${COLORS.neutral.gray200}`,
            backgroundColor: COLORS.neutral.white,
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={async () => {
              if (viewingProposal?.content) {
                try {
                  await navigator.clipboard.writeText(viewingProposal.content);
                  pushMessage({ from: "bot", text: "Proposal copied to clipboard!" });
                } catch (e) {
                  console.error("Failed to copy:", e);
                }
              }
            }}
            sx={{ borderColor: COLORS.info.main, color: COLORS.info.main }}
          >
            Copy
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => {
              if (viewingProposal?.content) downloadProposalAs("txt", viewingProposal.content);
            }}
            sx={{ borderColor: COLORS.success.main, color: COLORS.success.main }}
          >
            TXT
          </Button>
          <Button
            variant="outlined"
            startIcon={<PictureAsPdfIcon />}
            onClick={() => {
              if (viewingProposal?.content) downloadProposalAs("pdf", viewingProposal.content);
            }}
            sx={{ borderColor: COLORS.secondary.main, color: COLORS.secondary.main }}
          >
            PDF
          </Button>
          {viewingProposal?.dealId && (
            <Button
              variant="contained"
              startIcon={<DescriptionIcon />}
              onClick={() => {
                setViewProposalDialog(false);
                setViewingProposal(null);
                navigate("/crm", {
                  state: {
                    highlightDealId: `deal-${viewingProposal.dealId}`,
                    openProposals: true,
                  },
                });
              }}
              sx={{
                background: `linear-gradient(135deg, ${COLORS.accent.main} 0%, ${COLORS.accent.dark} 100%)`,
                "&:hover": {
                  background: `linear-gradient(135deg, ${COLORS.accent.dark} 0%, ${COLORS.accent.darker} 100%)`,
                },
              }}
            >
              Go to Deal
            </Button>
          )}
          <Button
            variant="outlined"
            onClick={() => {
              setViewProposalDialog(false);
              setViewingProposal(null);
            }}
            sx={{ borderColor: COLORS.neutral.gray400, color: COLORS.neutral.gray700 }}
          >
            Close
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
