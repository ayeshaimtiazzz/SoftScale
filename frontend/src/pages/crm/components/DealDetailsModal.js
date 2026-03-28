/**
 * Deal Details Modal Component
 * Comprehensive deal details view with edit capabilities
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Stack,
  Chip,
  Avatar,
  Divider,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
} from "@mui/material";
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Description as DescriptionIcon,
  History as HistoryIcon,
  Note as NoteIcon,
  CheckCircle as CheckCircleIcon,
  Send as SendIcon,
  Forum as ForumIcon,
} from "@mui/icons-material";
import { COLORS } from "../../../constants";
import { useToast } from "../../../providers/ToastProvider";
import { useAuth } from "../../../contexts/AuthContext";
import axios from "axios";
import { API_BASE } from "../../../config";

const DEAL_STAGES = {
  PROSPECTING: "Prospecting",
  CONTACTED: "Contacted",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
};

const DealDetailsModal = ({ open, deal, onClose, onUpdate, onDelete }) => {
  const { showToast } = useToast();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(!deal);
  const [activeTab, setActiveTab] = useState(0);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [convMessages, setConvMessages] = useState([]);
  const [convInput, setConvInput] = useState("");
  const [loadingConv, setLoadingConv] = useState(false);
  const [sendingConv, setSendingConv] = useState(false);
  const [sentimentRows, setSentimentRows] = useState([]);
  const [loadingSentiment, setLoadingSentiment] = useState(false);
  const [formData, setFormData] = useState({
    dealTitle: "",
    talentName: "",
    companyName: "",
    stage: DEAL_STAGES.PROSPECTING,
    status: "active",
    value: "",
    probability: "",
    expectedCloseDate: "",
    description: "",
    tags: [],
  });

  useEffect(() => {
    if (deal) {
      setFormData({
        dealTitle: deal.dealTitle || "",
        talentName: deal.talentName || "",
        companyName: deal.companyName || "",
        stage: deal.stage || DEAL_STAGES.PROSPECTING,
        status: deal.status || "active",
        value: deal.value || "",
        probability: deal.probability || "",
        expectedCloseDate: deal.expectedCloseDate ? deal.expectedCloseDate.split("T")[0] : "",
        description: deal.description || "",
        tags: deal.tags || [],
      });
      setIsEditing(false);

      // Load notes and proposals when deal is opened
      if (open && deal.deal_id) {
        loadNotes();
        loadProposals();
        loadConversation();
        loadDealSentiment();
      }
    } else {
      // New deal
      setFormData({
        dealTitle: "",
        talentName: "",
        companyName: "",
        stage: DEAL_STAGES.PROSPECTING,
        status: "active",
        value: "",
        probability: "",
        expectedCloseDate: "",
        description: "",
        tags: [],
      });
      setIsEditing(true);
      setNotes([]);
    }
  }, [deal, open]);

  const loadNotes = async () => {
    if (!deal?.deal_id || !token) return;

    setLoadingNotes(true);
    try {
      let dealId = deal.deal_id || deal.id;
      if (typeof dealId === "string" && dealId.startsWith("deal-")) {
        dealId = parseInt(dealId.replace("deal-", ""));
      }

      const response = await axios.get(`${API_BASE}/deals/${dealId}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes(response.data.notes || []);
    } catch (err) {
      console.error("Failed to load notes:", err);
      showToast("Failed to load notes", "error");
    } finally {
      setLoadingNotes(false);
    }
  };

  const loadConversation = async () => {
    if (!deal?.deal_id || !token) return;
    setLoadingConv(true);
    try {
      let dealId = deal.deal_id || deal.id;
      if (typeof dealId === "string" && dealId.startsWith("deal-")) {
        dealId = parseInt(dealId.replace("deal-", ""), 10);
      }
      const response = await axios.get(`${API_BASE}/deals/${dealId}/conversation/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConvMessages(response.data.messages || []);
    } catch (err) {
      console.error("Failed to load deal conversation:", err);
    } finally {
      setLoadingConv(false);
    }
  };

  const loadDealSentiment = async () => {
    if (!deal?.deal_id || !token) return;
    setLoadingSentiment(true);
    try {
      let dealId = deal.deal_id || deal.id;
      if (typeof dealId === "string" && dealId.startsWith("deal-")) {
        dealId = parseInt(dealId.replace("deal-", ""), 10);
      }
      const response = await axios.get(`${API_BASE}/deals/${dealId}/sentiment-analyses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSentimentRows(response.data.analyses || []);
    } catch (err) {
      console.error("Failed to load deal sentiment:", err);
    } finally {
      setLoadingSentiment(false);
    }
  };

  const handleSendConversation = async () => {
    if (!convInput.trim() || !deal?.deal_id || !token) return;
    setSendingConv(true);
    try {
      let dealId = deal.deal_id || deal.id;
      if (typeof dealId === "string" && dealId.startsWith("deal-")) {
        dealId = parseInt(dealId.replace("deal-", ""), 10);
      }
      await axios.post(
        `${API_BASE}/deals/${dealId}/conversation/messages`,
        { body: convInput.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConvInput("");
      showToast("Message sent. Sentiment analysis runs in the background.", "success");
      await loadConversation();
      setTimeout(() => loadDealSentiment(), 3000);
    } catch (err) {
      console.error("Failed to send conversation message:", err);
      showToast(err.response?.data?.detail || "Failed to send message", "error");
    } finally {
      setSendingConv(false);
    }
  };

  const loadProposals = async () => {
    if (!deal?.deal_id || !token) return;

    setLoadingProposals(true);
    try {
      let dealId = deal.deal_id || deal.id;
      if (typeof dealId === "string" && dealId.startsWith("deal-")) {
        dealId = parseInt(dealId.replace("deal-", ""));
      }

      const response = await axios.get(`${API_BASE}/proposals/deals/${dealId}/proposals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setProposals(response.data.proposals || []);
      }
    } catch (err) {
      console.error("Failed to load proposals:", err);
      // Don't show error toast as proposals might not exist yet
    } finally {
      setLoadingProposals(false);
    }
  };

  const handleSendProposal = async (proposalId) => {
    if (!token) return;

    try {
      const response = await axios.post(
        `${API_BASE}/proposals/${proposalId}/send`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        showToast("Proposal marked as sent successfully", "success");
        loadProposals();
        // Update deal stage if needed
        if (onUpdate && deal) {
          onUpdate({ ...deal, stage: DEAL_STAGES.PROPOSAL_SENT });
        }
      }
    } catch (err) {
      console.error("Failed to send proposal:", err);
      showToast("Failed to send proposal", "error");
    }
  };

  const handleSaveNote = async () => {
    if (!newNote.trim() || !deal?.deal_id || !token) return;

    setSavingNote(true);
    try {
      let dealId = deal.deal_id || deal.id;
      if (typeof dealId === "string" && dealId.startsWith("deal-")) {
        dealId = parseInt(dealId.replace("deal-", ""));
      }

      await axios.post(
        `${API_BASE}/deals/${dealId}/notes`,
        { note_text: newNote },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNewNote("");
      showToast("Note saved successfully", "success");
      loadNotes();
    } catch (err) {
      console.error("Failed to save note:", err);
      showToast("Failed to save note", "error");
    } finally {
      setSavingNote(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.dealTitle || !formData.talentName) {
      showToast("Please fill in required fields", "error");
      return;
    }

    const dealData = {
      ...formData,
      id: deal?.id || `deal-${Date.now()}`,
      value: formData.value ? parseFloat(formData.value) : null,
      probability: formData.probability ? parseInt(formData.probability) : null,
      expectedCloseDate: formData.expectedCloseDate ? new Date(formData.expectedCloseDate).toISOString() : null,
      updatedAt: new Date().toISOString(),
      createdAt: deal?.createdAt || new Date().toISOString(),
    };

    onUpdate(dealData);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this deal?")) {
      onDelete(deal.id);
      onClose();
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatCurrency = (value) => {
    if (!value) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStageColor = (stage) => {
    const stageColors = {
      [DEAL_STAGES.PROSPECTING]: COLORS.info,
      [DEAL_STAGES.CONTACTED]: COLORS.accent,
      [DEAL_STAGES.PROPOSAL_SENT]: COLORS.primary,
      [DEAL_STAGES.NEGOTIATION]: COLORS.secondary,
      [DEAL_STAGES.CLOSED_WON]: COLORS.success,
      [DEAL_STAGES.CLOSED_LOST]: COLORS.neutral,
    };
    return stageColors[stage] || COLORS.neutral;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {deal ? "Deal Details" : "Create New Deal"}
          </Typography>
          <Stack direction="row" spacing={1}>
            {deal && !isEditing && (
              <>
                <IconButton onClick={() => setIsEditing(true)} size="small">
                  <EditIcon />
                </IconButton>
                <IconButton onClick={handleDelete} size="small" sx={{ color: COLORS.secondary.main }}>
                  <DeleteIcon />
                </IconButton>
              </>
            )}
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {isEditing ? (
          <Stack spacing={3} sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Deal Title *"
                  fullWidth
                  value={formData.dealTitle}
                  onChange={(e) => handleChange("dealTitle", e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Talent Name *"
                  fullWidth
                  value={formData.talentName}
                  onChange={(e) => handleChange("talentName", e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Company Name"
                  fullWidth
                  value={formData.companyName}
                  onChange={(e) => handleChange("companyName", e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Stage</InputLabel>
                  <Select
                    value={formData.stage}
                    label="Stage"
                    onChange={(e) => handleChange("stage", e.target.value)}
                  >
                    {Object.values(DEAL_STAGES).map((stage) => (
                      <MenuItem key={stage} value={stage}>
                        {stage}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => handleChange("status", e.target.value)}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="closed">Closed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Deal Value ($)"
                  type="number"
                  fullWidth
                  value={formData.value}
                  onChange={(e) => handleChange("value", e.target.value)}
                  InputProps={{
                    startAdornment: <MoneyIcon sx={{ mr: 1, color: COLORS.neutral.gray500 }} />,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Probability (%)"
                  type="number"
                  fullWidth
                  value={formData.probability}
                  onChange={(e) => handleChange("probability", e.target.value)}
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Expected Close Date"
                  type="date"
                  fullWidth
                  value={formData.expectedCloseDate}
                  onChange={(e) => handleChange("expectedCloseDate", e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  fullWidth
                  multiline
                  rows={4}
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </Grid>
            </Grid>
          </Stack>
        ) : (
          <Box>
            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 3 }}>
              <Tab icon={<DescriptionIcon />} iconPosition="start" label="Overview" />
              <Tab icon={<HistoryIcon />} iconPosition="start" label="Activity" />
              <Tab icon={<NoteIcon />} iconPosition="start" label="Notes" />
              <Tab icon={<ForumIcon />} iconPosition="start" label="Conversation" />
              <Tab icon={<DescriptionIcon />} iconPosition="start" label="Proposals" />
            </Tabs>

            {activeTab === 0 && (
              <Stack spacing={3}>
                {/* Deal Header */}
                <Paper
                  sx={{
                    p: 3,
                    backgroundColor: `${getStageColor(formData.stage).lightest}10`,
                    borderLeft: `4px solid ${getStageColor(formData.stage).main}`,
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                    <Avatar
                      sx={{
                        width: 64,
                        height: 64,
                        bgcolor: getStageColor(formData.stage).main,
                        fontSize: "1.5rem",
                      }}
                    >
                      {getInitials(formData.talentName)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {formData.dealTitle}
                      </Typography>
                      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <Chip
                          label={formData.stage}
                          sx={{
                            backgroundColor: `${getStageColor(formData.stage).main}20`,
                            color: getStageColor(formData.stage).dark,
                            fontWeight: 600,
                          }}
                        />
                        <Chip
                          label={formData.status}
                          size="small"
                          sx={{
                            backgroundColor:
                              formData.status === "active"
                                ? `${COLORS.success.main}20`
                                : formData.status === "closed"
                                ? `${COLORS.neutral.gray400}20`
                                : `${COLORS.accent.main}20`,
                            color:
                              formData.status === "active"
                                ? COLORS.success.dark
                                : formData.status === "closed"
                                ? COLORS.neutral.gray700
                                : COLORS.accent.dark,
                          }}
                        />
                      </Stack>
                    </Box>
                  </Stack>
                </Paper>

                {/* Key Information */}
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2 }}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <PersonIcon sx={{ color: COLORS.info.main }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Talent
                        </Typography>
                      </Stack>
                      <Typography variant="body1">{formData.talentName}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2 }}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <BusinessIcon sx={{ color: COLORS.primary.main }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Company
                        </Typography>
                      </Stack>
                      <Typography variant="body1">{formData.companyName || "-"}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2 }}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <MoneyIcon sx={{ color: COLORS.accent.main }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Deal Value
                        </Typography>
                      </Stack>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.accent.dark }}>
                        {formatCurrency(formData.value)}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2 }}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                        <ScheduleIcon sx={{ color: COLORS.secondary.main }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Expected Close
                        </Typography>
                      </Stack>
                      <Typography variant="body1">
                        {formData.expectedCloseDate
                          ? new Date(formData.expectedCloseDate).toLocaleDateString()
                          : "-"}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Description */}
                {formData.description && (
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Description
                    </Typography>
                    <Typography variant="body2" sx={{ color: COLORS.neutral.gray700 }}>
                      {formData.description}
                    </Typography>
                  </Paper>
                )}
              </Stack>
            )}

            {activeTab === 1 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Activity Timeline
                </Typography>
                <Stack spacing={3}>
                  {/* Deal Created */}
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        minWidth: 40,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: COLORS.info.main,
                          mb: 1,
                        }}
                      >
                        <CheckCircleIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                      <Box
                        sx={{
                          width: 2,
                          flex: 1,
                          bgcolor: COLORS.neutral.gray300,
                          minHeight: 40,
                        }}
                      />
                    </Box>
                    <Box sx={{ flex: 1, pb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Deal Created
                      </Typography>
                      <Typography variant="body2" sx={{ color: COLORS.neutral.gray600 }}>
                        {deal?.createdAt ? new Date(deal.createdAt).toLocaleString() : "Recently"}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Last Updated */}
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        minWidth: 40,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: COLORS.secondary.main,
                        }}
                      >
                        <ScheduleIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Last Updated
                      </Typography>
                      <Typography variant="body2" sx={{ color: COLORS.neutral.gray600 }}>
                        {deal?.updatedAt ? new Date(deal.updatedAt).toLocaleString() : "Recently"}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Box>
            )}

            {activeTab === 2 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Notes
                </Typography>

                {/* Add Note Form */}
                <Paper sx={{ p: 2, mb: 3, backgroundColor: COLORS.neutral.gray50 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    placeholder="Add notes about this deal..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    startIcon={savingNote ? <CircularProgress size={16} /> : <SaveIcon />}
                    onClick={handleSaveNote}
                    disabled={!newNote.trim() || savingNote}
                    sx={{
                      background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.dark} 100%)`,
                    }}
                  >
                    Save Note
                  </Button>
                </Paper>

                {/* Notes List */}
                {loadingNotes ? (
                  <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : notes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", p: 3 }}>
                    No notes yet. Add your first note above.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {notes.map((note) => (
                      <Paper key={note.note_id} sx={{ p: 2, backgroundColor: COLORS.neutral.white }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {note.author_name || "You"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(note.created_at).toLocaleString()}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                          {note.note_text}
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            )}

            {activeTab === 3 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Deal conversation
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Messages here are analyzed automatically; results appear below and in notifications when ready.
                </Typography>
                <Paper sx={{ p: 2, mb: 2, backgroundColor: COLORS.neutral.gray50 }}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    placeholder="Write a message on this deal thread..."
                    value={convInput}
                    onChange={(e) => setConvInput(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    startIcon={sendingConv ? <CircularProgress size={16} /> : <SendIcon />}
                    onClick={handleSendConversation}
                    disabled={!convInput.trim() || sendingConv}
                  >
                    Send
                  </Button>
                </Paper>
                {loadingConv ? (
                  <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                    <CircularProgress size={28} />
                  </Box>
                ) : convMessages.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    No messages yet.
                  </Typography>
                ) : (
                  <Stack spacing={1} sx={{ mb: 3 }}>
                    {convMessages.map((m) => (
                      <Paper key={m.message_id} sx={{ p: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                          <Typography variant="subtitle2">{m.author_name || "User"}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {m.created_at ? new Date(m.created_at).toLocaleString() : ""}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                          {m.body}
                        </Typography>
                        <Chip
                          size="small"
                          label={m.sentiment_status || "pending"}
                          sx={{ mt: 1 }}
                          color={
                            m.sentiment_status === "completed"
                              ? "success"
                              : m.sentiment_status === "failed"
                              ? "error"
                              : "default"
                          }
                        />
                      </Paper>
                    ))}
                  </Stack>
                )}

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Saved sentiment analyses
                </Typography>
                {loadingSentiment ? (
                  <CircularProgress size={28} />
                ) : sentimentRows.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    None yet — they appear after messages are processed.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {sentimentRows.map((row) => {
                      const aj = row.analysis_json || {};
                      const label = aj.sentiment?.label || "—";
                      const intent = aj.intent || "—";
                      return (
                        <Paper key={row.analysis_id} sx={{ p: 2, backgroundColor: COLORS.neutral.white }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {row.created_at ? new Date(row.created_at).toLocaleString() : ""} · Message #{row.conversation_message_id || "—"}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            <strong>Sentiment:</strong> {label} · <strong>Intent:</strong> {intent}
                          </Typography>
                          {row.message_excerpt && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                              {row.message_excerpt.slice(0, 200)}
                              {row.message_excerpt.length > 200 ? "…" : ""}
                            </Typography>
                          )}
                          {row.report_text && (
                            <Typography variant="body2" sx={{ mt: 1, whiteSpace: "pre-wrap", maxHeight: 160, overflow: "auto" }}>
                              {row.report_text.slice(0, 800)}
                              {row.report_text.length > 800 ? "…" : ""}
                            </Typography>
                          )}
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            )}

            {activeTab === 4 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Proposals
                </Typography>

                {loadingProposals ? (
                  <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : proposals.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: "center", backgroundColor: COLORS.neutral.gray50 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      No proposals yet for this deal.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<DescriptionIcon />}
                      onClick={() => {
                        let dealId = deal.deal_id || deal.id;
                        if (typeof dealId === "string" && dealId.startsWith("deal-")) {
                          dealId = parseInt(dealId.replace("deal-", ""));
                        }
                        navigate("/proposal-generation", {
                          state: {
                            fromDeal: true,
                            dealId: dealId,
                            dealData: {
                              deal_title: deal.dealTitle || deal.deal_title,
                              talent_name: deal.talentName || deal.talent_name,
                              company_name: deal.companyName || deal.company_name,
                              description: deal.description,
                              value: deal.value,
                            },
                          },
                        });
                        onClose();
                      }}
                      sx={{
                        background: `linear-gradient(135deg, ${COLORS.accent.main} 0%, ${COLORS.accent.dark} 100%)`,
                      }}
                    >
                      Generate Proposal
                    </Button>
                  </Paper>
                ) : (
                  <Stack spacing={2}>
                    {proposals.map((proposal) => (
                      <Paper key={proposal.proposal_id} sx={{ p: 2, backgroundColor: COLORS.neutral.white }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              Proposal #{proposal.proposal_id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Created: {new Date(proposal.created_at).toLocaleString()}
                            </Typography>
                            {proposal.status && (
                              <Chip
                                label={proposal.status}
                                size="small"
                                sx={{
                                  mt: 1,
                                  backgroundColor:
                                    proposal.status === "sent"
                                      ? `${COLORS.success.main}20`
                                      : `${COLORS.info.main}20`,
                                  color:
                                    proposal.status === "sent"
                                      ? COLORS.success.dark
                                      : COLORS.info.dark,
                                }}
                              />
                            )}
                          </Box>
                          <Stack direction="row" spacing={1}>
                            {proposal.status !== "sent" && (
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<SendIcon />}
                                onClick={() => handleSendProposal(proposal.proposal_id)}
                                sx={{
                                  background: `linear-gradient(135deg, ${COLORS.success.main} 0%, ${COLORS.success.dark} 100%)`,
                                }}
                              >
                                Send
                              </Button>
                            )}
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                navigate("/proposal-generation", {
                                  state: {
                                    viewProposal: true,
                                    proposalId: proposal.proposal_id,
                                    proposalContent: proposal.content || proposal.proposal_content,
                                    dealId: deal.deal_id || deal.id,
                                  },
                                });
                                onClose();
                              }}
                            >
                              View
                            </Button>
                          </Stack>
                        </Stack>
                        {(proposal.content || proposal.proposal_content) && (
                          <Typography
                            variant="body2"
                            sx={{
                              mt: 1,
                              maxHeight: 100,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              color: COLORS.neutral.gray700,
                            }}
                          >
                            {(proposal.content || proposal.proposal_content).substring(0, 200)}...
                          </Typography>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        {isEditing ? (
          <>
            <Button onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSave}
              startIcon={<SaveIcon />}
              sx={{
                background: `linear-gradient(135deg, ${COLORS.secondary.main} 0%, ${COLORS.secondary.dark} 100%)`,
              }}
            >
              {deal ? "Update Deal" : "Create Deal"}
            </Button>
          </>
        ) : (
          <>
            {deal && (
              <>
                <Button
                  variant="outlined"
                  onClick={async () => {
                    // Move to next stage
                    const stages = Object.values(DEAL_STAGES);
                    const currentIndex = stages.indexOf(formData.stage);
                    if (currentIndex < stages.length - 1) {
                      const nextStage = stages[currentIndex + 1];
                      try {
                        let dealId = deal.deal_id || deal.id;
                        if (typeof dealId === "string" && dealId.startsWith("deal-")) {
                          dealId = parseInt(dealId.replace("deal-", ""));
                        }

                        const response = await axios.patch(
                          `${API_BASE}/deals/${dealId}/stage`,
                          { stage: nextStage },
                          { headers: { Authorization: `Bearer ${token}` } }
                        );

                        // Get updated deal from response
                        const updatedDeal = response.data || {};

                        showToast(`Deal moved to ${nextStage}`, "success");

                        // Update local form data
                        setFormData({ ...formData, stage: nextStage });

                        // Construct the updated deal object with all necessary fields
                        const mergedDeal = {
                          ...deal,
                          ...updatedDeal,
                          stage: nextStage,
                          dealTitle: updatedDeal.deal_title || deal.dealTitle || deal.deal_title,
                          talentName: updatedDeal.talent_name || deal.talentName || deal.talent_name,
                          companyName: updatedDeal.company_name || deal.companyName || deal.company_name,
                          deal_id: updatedDeal.deal_id || deal.deal_id || deal.id,
                          id: updatedDeal.deal_id || updatedDeal.id || deal.deal_id || deal.id,
                        };

                        // Update parent component with full deal data
                        if (onUpdate) {
                          onUpdate(mergedDeal);
                        }
                      } catch (err) {
                        console.error("Failed to update stage:", err);
                        const errorMessage = err.response?.data?.detail || err.message || "Failed to update stage";
                        showToast(errorMessage, "error");
                      }
                    }
                  }}
                  disabled={
                    formData.stage === DEAL_STAGES.CLOSED_LOST ||
                    formData.stage === DEAL_STAGES.CLOSED_WON ||
                    (() => {
                      const stages = Object.values(DEAL_STAGES);
                      const currentIndex = stages.indexOf(formData.stage);
                      return currentIndex >= stages.length - 1;
                    })()
                  }
                  sx={{ mr: 1 }}
                >
                  Move to {(() => {
                    const stages = Object.values(DEAL_STAGES);
                    const currentIndex = stages.indexOf(formData.stage);
                    return currentIndex < stages.length - 1 ? stages[currentIndex + 1] : "Next Stage";
                  })()}
                </Button>
                {/* Contact button - moves deal to Contacted stage */}
                {formData.stage === DEAL_STAGES.PROSPECTING && (
                  <Button
                    variant="contained"
                    onClick={async () => {
                      try {
                        let dealId = deal.deal_id || deal.id;
                        if (typeof dealId === "string" && dealId.startsWith("deal-")) {
                          dealId = parseInt(dealId.replace("deal-", ""));
                        }

                        const response = await axios.patch(
                          `${API_BASE}/deals/${dealId}/stage`,
                          { stage: DEAL_STAGES.CONTACTED },
                          { headers: { Authorization: `Bearer ${token}` } }
                        );

                        const updatedDeal = response.data || {};

                        showToast("Deal moved to Contacted stage", "success");

                        // Update local form data
                        setFormData({ ...formData, stage: DEAL_STAGES.CONTACTED });

                        // Construct the updated deal object
                        const mergedDeal = {
                          ...deal,
                          ...updatedDeal,
                          stage: DEAL_STAGES.CONTACTED,
                          dealTitle: updatedDeal.deal_title || deal.dealTitle || deal.deal_title,
                          talentName: updatedDeal.talent_name || deal.talentName || deal.talent_name,
                          companyName: updatedDeal.company_name || deal.companyName || deal.company_name,
                          deal_id: updatedDeal.deal_id || deal.deal_id || deal.id,
                          id: updatedDeal.deal_id || updatedDeal.id || deal.deal_id || deal.id,
                        };

                        if (onUpdate) {
                          onUpdate(mergedDeal);
                        }
                      } catch (err) {
                        console.error("Failed to update stage:", err);
                        const errorMessage = err.response?.data?.detail || err.message || "Failed to update deal stage";
                        showToast(errorMessage, "error");
                      }
                    }}
                    startIcon={<PersonIcon />}
                    sx={{
                      background: `linear-gradient(135deg, ${COLORS.accent.main} 0%, ${COLORS.accent.dark} 100%)`,
                      "&:hover": {
                        background: `linear-gradient(135deg, ${COLORS.accent.dark} 0%, ${COLORS.accent.darker} 100%)`,
                      },
                      mr: 1,
                    }}
                  >
                    Contact
                  </Button>
                )}
                <Button
                  variant="contained"
                  onClick={() => {
                    // Extract numeric deal_id
                    let dealId = deal.deal_id || deal.id;
                    if (typeof dealId === "string" && dealId.startsWith("deal-")) {
                      dealId = parseInt(dealId.replace("deal-", ""));
                    }

                    // Navigate to proposal generation with deal context
                    navigate("/proposal-generation", {
                      state: {
                        fromDeal: true,
                        dealId: dealId,
                        dealData: {
                          deal_title: deal.dealTitle || deal.deal_title,
                          talent_name: deal.talentName || deal.talent_name,
                          company_name: deal.companyName || deal.company_name,
                          description: deal.description,
                          value: deal.value,
                          skills: deal.skills,
                          experience: deal.experience,
                          match_score: deal.matchScore || deal.match_score,
                        },
                      },
                    });
                    onClose();
                  }}
                  startIcon={<DescriptionIcon />}
                  sx={{
                    background: `linear-gradient(135deg, ${COLORS.accent.main} 0%, ${COLORS.accent.dark} 100%)`,
                    "&:hover": {
                      background: `linear-gradient(135deg, ${COLORS.accent.dark} 0%, ${COLORS.accent.darker} 100%)`,
                    },
                  }}
                >
                  Generate Proposal
                </Button>
              </>
            )}
            <Button onClick={onClose} variant="contained">
              Close
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DealDetailsModal;
