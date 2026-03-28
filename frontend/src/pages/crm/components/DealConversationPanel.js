/**
 * Deal conversations: thread list + chat-style messages with live sentiment from API.
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Grid,
  Collapse,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddCommentOutlinedIcon from "@mui/icons-material/AddCommentOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import ReplyOutlinedIcon from "@mui/icons-material/ReplyOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import SendIcon from "@mui/icons-material/Send";
import ForumOutlinedIcon from "@mui/icons-material/ForumOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import axios from "axios";
import { API_BASE } from "../../../config";
import { COLORS } from "../../../constants";
import { useToast } from "../../../providers/ToastProvider";

/** Model may store confidence as 0–1 (classifier) or occasionally 0–100. */
function formatConfidenceLabel(confidence) {
  if (confidence == null || confidence === "" || Number.isNaN(Number(confidence))) return null;
  const n = Number(confidence);
  if (n >= 0 && n <= 1) return `${Math.round(n * 100)}% sure`;
  if (n > 1 && n <= 100) return `${Math.round(n)}% sure`;
  return `${n}% sure`;
}

function humanizeIntent(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatInterestDisplay(value) {
  if (value == null || value === "" || Number.isNaN(Number(value))) return null;
  const n = Number(value);
  if (n >= 0 && n <= 100) return `${Math.round(n)}%`;
  return String(value);
}

function isMeaningfulSummary(text) {
  if (text == null || !String(text).trim()) return false;
  const t = String(text).trim().toLowerCase();
  if (t.includes("summary not available") && t.includes("could not extract")) return false;
  return true;
}

function sentimentVisual(label) {
  const l = (label || "").toLowerCase();
  if (l === "positive") {
    return {
      chip: "success",
      bar: COLORS.success.main,
      bg: alpha(COLORS.success.main, 0.08),
      border: alpha(COLORS.success.main, 0.35),
    };
  }
  if (l === "negative") {
    return {
      chip: "error",
      bar: COLORS.secondary.main,
      bg: alpha(COLORS.secondary.main, 0.08),
      border: alpha(COLORS.secondary.main, 0.35),
    };
  }
  return {
    chip: "default",
    bar: COLORS.accent.main,
    bg: alpha(COLORS.accent.main, 0.08),
    border: alpha(COLORS.accent.main, 0.25),
  };
}

function StatMini({ label, value, color }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        px: 1,
        py: 0.75,
        borderRadius: 1,
        bgcolor: alpha(COLORS.neutral.gray100, 0.6),
        borderColor: COLORS.neutral.gray200,
        textAlign: "center",
        minWidth: 0,
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: "0.65rem", lineHeight: 1.2 }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          fontSize: "0.8rem",
          lineHeight: 1.3,
          color: color || "text.primary",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={value}
      >
        {value || "—"}
      </Typography>
    </Paper>
  );
}

function MessageBubble({ row, currentUserId, showToast }) {
  const [detailTab, setDetailTab] = useState(0);
  const mine = currentUserId != null && Number(row.user_id) === Number(currentUserId);
  /** Expand analysis by default for the other party’s messages (typical “paste what they said” case). */
  const [analysisOpen, setAnalysisOpen] = useState(() => !mine);
  const s = row.sentiment;
  const confidenceLabel = s ? formatConfidenceLabel(s.confidence) : null;
  const vis = sentimentVisual(s?.label);
  const pending = row.sentiment_status === "pending";
  const failed = row.sentiment_status === "failed";

  const hasReply = Boolean(s?.suggested_reply?.trim());
  const hasReport = Boolean(s?.report_text?.trim());
  const showTabs = hasReply && hasReport;
  const safeDetailTab = showTabs ? Math.min(Math.max(0, detailTab), 1) : 0;

  const copyReply = () => {
    if (!s?.suggested_reply) return;
    navigator.clipboard.writeText(s.suggested_reply).then(
      () => showToast?.("Reply copied to clipboard", "success"),
      () => showToast?.("Could not copy", "error")
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: mine ? "flex-end" : "flex-start",
        mb: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: "88%",
          p: 2,
          borderRadius: 2,
          border: `1px solid ${mine ? alpha(COLORS.primary.main, 0.2) : COLORS.neutral.gray200}`,
          backgroundColor: mine ? alpha(COLORS.primary.main, 0.04) : COLORS.neutral.white,
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} mb={1}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: COLORS.neutral.gray700 }}>
            {row.author_name || "User"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.created_at ? new Date(row.created_at).toLocaleString() : ""}
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
          {row.body}
        </Typography>

        <Box sx={{ mt: 1.5 }}>
          {pending && !s && (
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <PsychologyOutlinedIcon sx={{ fontSize: 18, color: COLORS.accent.main }} />
                <Typography variant="caption" color="text.secondary">
                  Analyzing tone & intent…
                </Typography>
              </Stack>
              <LinearProgress sx={{ borderRadius: 1, height: 4 }} />
            </Stack>
          )}
          {failed && !s && (
            <Chip size="small" label="Sentiment analysis failed" color="error" variant="outlined" />
          )}
          {s && (
            <Box sx={{ mt: 1 }}>
              <Paper
                variant="outlined"
                onClick={() => setAnalysisOpen((o) => !o)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setAnalysisOpen((o) => !o);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-expanded={analysisOpen}
                sx={{
                  p: 1.25,
                  borderRadius: 1.5,
                  cursor: "pointer",
                  borderColor: vis.border,
                  bgcolor: alpha(vis.bg, 0.65),
                  "&:hover": { bgcolor: alpha(vis.bg, 0.95) },
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ minWidth: 0 }}>
                    <PsychologyOutlinedIcon sx={{ fontSize: 20, color: vis.bar, flexShrink: 0 }} />
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: { xs: "none", sm: "block" } }}>
                      {mine ? "Your message" : "Their message"}
                    </Typography>
                    <Chip
                      size="small"
                      label={s.label || "unknown"}
                      color={vis.chip}
                      sx={{ fontWeight: 700, textTransform: "capitalize" }}
                    />
                    {confidenceLabel && <Chip size="small" variant="outlined" label={confidenceLabel} />}
                    {humanizeIntent(s.intent) && (
                      <Chip size="small" variant="outlined" label={humanizeIntent(s.intent)} sx={{ maxWidth: 160 }} />
                    )}
                  </Stack>
                  <IconButton
                    size="small"
                    aria-label={analysisOpen ? "Collapse analysis" : "Expand analysis"}
                    sx={{ flexShrink: 0 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnalysisOpen((o) => !o);
                    }}
                  >
                    {analysisOpen ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                  </IconButton>
                </Stack>
              </Paper>

              <Collapse in={analysisOpen} timeout="auto" unmountOnExit={false}>
                <Box
                  sx={{
                    mt: 1,
                    p: 1.5,
                    borderRadius: 1.5,
                    backgroundColor: vis.bg,
                    border: `1px solid ${vis.border}`,
                  }}
                >
                  <Stack direction="row" alignItems="stretch" spacing={1} mb={1}>
                    <Box
                      sx={{
                        width: 4,
                        borderRadius: 1,
                        backgroundColor: vis.bar,
                        flexShrink: 0,
                      }}
                    />
                    <Stack spacing={1} flex={1} minWidth={0}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {mine ? "How your message reads to the model" : "How their message reads — use this to reply"}
                      </Typography>
                      <Grid container spacing={0.75}>
                        <Grid item xs={4}>
                          <StatMini label="Intent" value={humanizeIntent(s.intent)} />
                        </Grid>
                        <Grid item xs={4}>
                          <StatMini
                            label="Interest"
                            value={formatInterestDisplay(s.interest_score)}
                            color={COLORS.accent.dark}
                          />
                        </Grid>
                        <Grid item xs={4}>
                          <StatMini
                            label="Urgency"
                            value={s.urgency_level ? humanizeIntent(s.urgency_level) : null}
                            color={s.urgency_level === "high" ? COLORS.secondary.main : undefined}
                          />
                        </Grid>
                      </Grid>
                      {isMeaningfulSummary(s.summary) && (
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.3 }}>
                            Summary
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, lineHeight: 1.45 }}>
                            {s.summary}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Stack>

                  {(hasReply || hasReport) && (
                    <Box sx={{ mt: 1, pt: 1, borderTop: `1px dashed ${alpha(COLORS.neutral.gray500, 0.35)}` }}>
                      {showTabs ? (
                        <>
                          <Tabs
                            value={safeDetailTab}
                            onChange={(_, v) => setDetailTab(v)}
                            variant="fullWidth"
                            sx={{
                              minHeight: 36,
                              "& .MuiTab-root": { minHeight: 36, py: 0.5, fontSize: "0.75rem", textTransform: "none" },
                            }}
                          >
                            <Tab icon={<ReplyOutlinedIcon sx={{ fontSize: "1rem !important" }} />} iconPosition="start" label="Suggested reply" />
                            <Tab icon={<ArticleOutlinedIcon sx={{ fontSize: "1rem !important" }} />} iconPosition="start" label="Full report" />
                          </Tabs>
                          <Box
                            sx={{
                              mt: 1,
                              maxHeight: 280,
                              overflow: "auto",
                              borderRadius: 1,
                              bgcolor: alpha(COLORS.neutral.white, 0.7),
                              border: `1px solid ${COLORS.neutral.gray200}`,
                            }}
                          >
                            {safeDetailTab === 0 && hasReply && (
                              <Box sx={{ p: 1.25, position: "relative" }} onClick={(e) => e.stopPropagation()}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                                  <Typography variant="caption" fontWeight={700} color="primary">
                                    Copy & send
                                  </Typography>
                                  <Tooltip title="Copy text">
                                    <IconButton size="small" onClick={copyReply} aria-label="Copy suggested reply">
                                      <ContentCopyOutlinedIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.5, pr: 0.5 }}>
                                  {s.suggested_reply}
                                </Typography>
                              </Box>
                            )}
                            {safeDetailTab === 1 && hasReport && (
                              <Box sx={{ p: 1.25 }} onClick={(e) => e.stopPropagation()}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" sx={{ mb: 0.75 }}>
                                  Analysis report (scroll inside)
                                </Typography>
                                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.45, fontSize: "0.8125rem" }}>
                                  {s.report_text}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </>
                      ) : (
                        <Box
                          sx={{
                            maxHeight: 280,
                            overflow: "auto",
                            borderRadius: 1,
                            bgcolor: alpha(COLORS.neutral.white, 0.7),
                            border: `1px solid ${COLORS.neutral.gray200}`,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {hasReply && (
                            <Box sx={{ p: 1.25 }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <ReplyOutlinedIcon sx={{ fontSize: 18, color: COLORS.primary.main }} />
                                  <Typography variant="caption" fontWeight={700}>
                                    Suggested reply
                                  </Typography>
                                </Stack>
                                <Tooltip title="Copy">
                                  <IconButton size="small" onClick={copyReply}>
                                    <ContentCopyOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                                {s.suggested_reply}
                              </Typography>
                            </Box>
                          )}
                          {hasReport && !hasReply && (
                            <Box sx={{ p: 1.25 }}>
                              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.75 }}>
                                <ArticleOutlinedIcon sx={{ fontSize: 18, color: COLORS.info.main }} />
                                <Typography variant="caption" fontWeight={700}>
                                  Full report
                                </Typography>
                              </Stack>
                              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.45, fontSize: "0.8125rem" }}>
                                {s.report_text}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              </Collapse>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

export default function DealConversationPanel({ deal, token, user, isActive }) {
  const { showToast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [thread, setThread] = useState([]);
  const [convInput, setConvInput] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [newTitleOpen, setNewTitleOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const listRef = useRef(null);
  const threadEndRef = useRef(null);

  const dealNumericId = useMemo(() => {
    if (!deal?.deal_id && !deal?.id) return null;
    let id = deal.deal_id ?? deal.id;
    if (typeof id === "string" && id.startsWith("deal-")) {
      id = parseInt(id.replace("deal-", ""), 10);
    } else if (typeof id === "string") {
      id = parseInt(id, 10);
    }
    const n = typeof id === "number" ? id : parseInt(id, 10);
    return Number.isFinite(n) ? n : null;
  }, [deal]);

  const currentUserId = user?.user_id ?? user?.userId ?? null;

  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  const loadConversations = useCallback(async () => {
    if (!dealNumericId || !token) return;
    setLoadingList(true);
    try {
      const res = await axios.get(`${API_BASE}/deals/${dealNumericId}/conversations`, {
        headers: authHeaders,
      });
      const list = res.data.conversations || [];
      setConversations(list);
      setSelectedId((prev) => {
        if (prev != null && list.some((c) => c.conversation_id === prev)) return prev;
        return list[0]?.conversation_id ?? null;
      });
    } catch (e) {
      console.error(e);
      showToast(e.response?.data?.detail || "Could not load conversations", "error");
    } finally {
      setLoadingList(false);
    }
  }, [dealNumericId, token, authHeaders, showToast]);

  const loadThread = useCallback(async () => {
    if (!dealNumericId || !token || !selectedId) return;
    setLoadingThread(true);
    try {
      const res = await axios.get(
        `${API_BASE}/deals/${dealNumericId}/conversations/${selectedId}/thread`,
        { headers: authHeaders }
      );
      setThread(res.data.messages || []);
    } catch (e) {
      console.error(e);
      setThread([]);
      if (e.response?.status === 404) {
        setSelectedId(null);
      }
    } finally {
      setLoadingThread(false);
    }
  }, [dealNumericId, token, selectedId, authHeaders]);

  useEffect(() => {
    if (!isActive || !dealNumericId || !token) return;
    loadConversations();
  }, [isActive, dealNumericId, token, loadConversations]);

  useEffect(() => {
    if (!isActive || !selectedId) return;
    loadThread();
  }, [isActive, selectedId, loadThread]);

  // Light polling while any message is still pending analysis
  useEffect(() => {
    if (!isActive || !selectedId) return;
    const pending = thread.some((m) => m.sentiment_status === "pending");
    if (!pending) return;
    const t = setInterval(() => loadThread(), 4000);
    return () => clearInterval(t);
  }, [isActive, selectedId, thread, loadThread]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [thread]);

  const handleCreateConversation = async () => {
    if (!dealNumericId || !token) return;
    try {
      const res = await axios.post(
        `${API_BASE}/deals/${dealNumericId}/conversations`,
        { title: newTitle.trim() || "New conversation" },
        { headers: authHeaders }
      );
      const cid = res.data.conversation_id;
      setNewTitleOpen(false);
      setNewTitle("");
      await loadConversations();
      if (cid) setSelectedId(cid);
    } catch (e) {
      console.error(e);
      showToast(e.response?.data?.detail || "Could not create thread", "error");
    }
  };

  const handleSend = async () => {
    if (!convInput.trim() || !dealNumericId || !token || !selectedId) return;
    setSending(true);
    try {
      await axios.post(
        `${API_BASE}/deals/${dealNumericId}/conversation/messages`,
        { body: convInput.trim(), conversation_id: selectedId },
        { headers: authHeaders }
      );
      setConvInput("");
      await loadThread();
      await loadConversations();
      showToast("Message sent — sentiment updates when ready.", "success");
    } catch (e) {
      console.error(e);
      showToast(e.response?.data?.detail || "Failed to send", "error");
    } finally {
      setSending(false);
    }
  };

  if (!dealNumericId) {
    return (
      <Typography variant="body2" color="text.secondary">
        Save the deal first to use conversations.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 420, maxHeight: "min(70vh, 640px)" }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <ForumOutlinedIcon sx={{ color: COLORS.primary.main }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Conversations
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={() => loadConversations().then(loadThread)}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddCommentOutlinedIcon />}
          onClick={() => setNewTitleOpen(true)}
          sx={{ textTransform: "none" }}
        >
          New thread
        </Button>
      </Stack>

      <Box sx={{ display: "flex", gap: 2, flex: 1, minHeight: 0 }}>
        {/* Thread list */}
        <Paper
          variant="outlined"
          sx={{
            width: 260,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <Box sx={{ p: 1.5, bgcolor: alpha(COLORS.primary.main, 0.06) }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              Your threads
            </Typography>
          </Box>
          <Box ref={listRef} sx={{ overflowY: "auto", flex: 1, p: 1 }}>
            {loadingList ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              conversations.map((c) => {
                const active = c.conversation_id === selectedId;
                return (
                  <Paper
                    key={c.conversation_id}
                    elevation={0}
                    onClick={() => setSelectedId(c.conversation_id)}
                    sx={{
                      p: 1.25,
                      mb: 1,
                      cursor: "pointer",
                      borderRadius: 1.5,
                      border: active ? `2px solid ${COLORS.primary.main}` : `1px solid ${COLORS.neutral.gray200}`,
                      bgcolor: active ? alpha(COLORS.primary.main, 0.06) : "transparent",
                      transition: "0.15s ease",
                      "&:hover": { bgcolor: alpha(COLORS.primary.main, 0.04) },
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }} noWrap>
                      {c.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                      {c.message_count || 0} message{(c.message_count || 0) === 1 ? "" : "s"}
                    </Typography>
                    {c.last_message_preview && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }} noWrap>
                        {c.last_message_preview}
                      </Typography>
                    )}
                  </Paper>
                );
              })
            )}
          </Box>
        </Paper>

        {/* Chat + composer */}
        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRadius: 2,
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.25,
              borderBottom: `1px solid ${COLORS.neutral.gray200}`,
              bgcolor: COLORS.neutral.gray50,
            }}
          >
            <Typography variant="subtitle2" fontWeight={700}>
              {conversations.find((c) => c.conversation_id === selectedId)?.title || "Select a thread"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Each message is analyzed; sentiment attaches to that message below.
            </Typography>
          </Box>

          <Box sx={{ flex: 1, overflowY: "auto", p: 2, bgcolor: alpha(COLORS.neutral.gray100, 0.35) }}>
            {loadingThread ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : !selectedId ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 6 }}>
                Select a conversation or create a new thread.
              </Typography>
            ) : thread.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 6 }}>
                No messages yet. Say hello below — analysis runs in the background.
              </Typography>
            ) : (
              thread.map((row) => (
                <MessageBubble
                  key={row.message_id}
                  row={row}
                  currentUserId={currentUserId}
                  showToast={showToast}
                />
              ))
            )}
            <div ref={threadEndRef} />
          </Box>

          <Box sx={{ p: 2, borderTop: `1px solid ${COLORS.neutral.gray200}`, bgcolor: COLORS.neutral.white }}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              maxRows={5}
              placeholder={
                selectedId ? "Write a message in this thread…" : "Select or create a thread first"
              }
              value={convInput}
              onChange={(e) => setConvInput(e.target.value)}
              disabled={!selectedId}
              sx={{ mb: 1 }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              variant="contained"
              disabled={!convInput.trim() || sending || !selectedId}
              startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
              onClick={handleSend}
              sx={{ textTransform: "none" }}
            >
              Send
            </Button>
          </Box>
        </Paper>
      </Box>

      <Dialog open={newTitleOpen} onClose={() => setNewTitleOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New conversation thread</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Title"
            placeholder="e.g. Follow-up on proposal"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewTitleOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateConversation}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
