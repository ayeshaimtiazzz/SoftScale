import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";
import SentimentNeutralIcon from "@mui/icons-material/SentimentNeutral";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import { COLORS, API_ENDPOINTS } from "../../constants";
import PageTitle from "../../components/common/PageTitle";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API_BASE } from "../../config";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../providers/ToastProvider";

const getSentimentIcon = (label) => {
  if (!label) return <SentimentNeutralIcon sx={{ fontSize: "3rem", color: COLORS.neutral.gray400 }} />;
  if (label.toLowerCase() === "positive") {
    return <SentimentSatisfiedAltIcon sx={{ fontSize: "3rem", color: COLORS.success.main }} />;
  }
  if (label.toLowerCase() === "negative") {
    return <SentimentDissatisfiedIcon sx={{ fontSize: "3rem", color: COLORS.secondary.main }} />;
  }
  return <SentimentNeutralIcon sx={{ fontSize: "3rem", color: COLORS.accent.main }} />;
};

const getInterestLabel = (score) => {
  if (score == null) return "";
  if (score >= 80) return "High Interest";
  if (score >= 50) return "Moderate Interest";
  if (score > 0) return "Low Interest";
  return "No Interest";
};

const getInterestColor = (score) => {
  if (score == null) return COLORS.neutral.gray300;
  if (score >= 80) return COLORS.success.main;
  if (score >= 50) return COLORS.accent.main;
  if (score > 0) return COLORS.secondary.main;
  return COLORS.neutral.gray400;
};

function SentimentAnalysis() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { showToast } = useToast();

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [reportHtml, setReportHtml] = useState("");
  const [reportPdfUrl, setReportPdfUrl] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  const handleAnalyze = async () => {
    if (!message.trim()) {
      showToast("Please paste a message to analyze.", "warning");
      return;
    }

    if (!token) {
      showToast("You need to be logged in to analyze messages.", "error");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE}${API_ENDPOINTS.SENTIMENT_ANALYSIS}`,
        { message },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = response.data || {};

      // Backend may either wrap result in { analysis, report_html, report_pdf_url }
      // or return the analysis object directly following the expected_output format.
      const result = data.analysis || data;

      setAnalysis(result || null);
      setReportHtml(data.report_html || "");
      setReportPdfUrl(data.report_pdf_url || "");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to run sentiment analysis:", error);
      showToast("Failed to analyze message. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  const sentimentLabel = analysis?.sentiment?.label;
  const sentimentConfidence = analysis?.sentiment?.confidence;
  const intentLabel = analysis?.intent;
  const intentConfidence = analysis?.confidence_scores?.intent_confidence;
  const overallConfidence = analysis?.confidence_scores?.overall_confidence;
  const interestScore = analysis?.interest_score;
  const urgencyLevel = analysis?.urgency?.level;
  const urgencyTime = analysis?.urgency?.recommended_response_time;
  const keySignals = analysis?.key_signals || {};
  const risks = analysis?.risks || [];
  const nextSteps = analysis?.next_steps || analysis?.Recommended_actions || [];
  const summary = analysis?.summary;
  const suggestedReply = analysis?.suggested_reply;
  const suggestedReplyConfidence = analysis?.suggested_reply_confidence;

  return (
    <Box sx={{ p: 3 }}>
      <PageTitle
        title={t("navigation.sentimentAnalysis")}
        subtitle={t("navigation.sentimentAnalysisDesc")}
        icon={<AssessmentOutlinedIcon sx={{ fontSize: "2rem" }} />}
        color={COLORS.secondary.main}
      />

      {/* Input + primary actions */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Card
            sx={{
              p: 3,
              borderRadius: 3,
              border: `1px solid ${COLORS.neutral.gray300}`,
              boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
              background: `linear-gradient(135deg, ${COLORS.neutral.white}, ${COLORS.neutral.gray50})`,
            }}
          >
            <CardContent sx={{ p: 0 }}>
              <Typography variant="subtitle2" sx={{ color: COLORS.neutral.gray700, mb: 1 }}>
                Message to analyze
              </Typography>
              <TextField
                multiline
                minRows={4}
                maxRows={10}
                fullWidth
                placeholder="Paste the latest recruiter or client message here to understand sentiment, intent, and next steps."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    backgroundColor: COLORS.neutral.white,
                  },
                }}
              />
              <Box
                sx={{
                  mt: 2,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="caption" sx={{ color: COLORS.neutral.gray600 }}>
                  The analysis will mirror your Sentiment Analysis view: sentiment, intent, interest, urgency, actions and
                  suggested reply.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleAnalyze}
                  disabled={loading}
                  sx={{ borderRadius: 999, px: 3 }}
                >
                  {loading ? "Analyzing..." : "Analyze Communication"}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card
            sx={{
              p: 3,
              borderRadius: 3,
              border: `1px solid ${COLORS.neutral.gray300}`,
              background: `radial-gradient(circle at top left, ${COLORS.info.lightest}, ${COLORS.neutral.white})`,
              boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ color: COLORS.neutral.gray700 }}>
                Sentiment Analysis summary
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.neutral.gray600, mt: 1 }}>
                Get a concise, structured view of how the other side feels about your proposal and what you should do next.
              </Typography>
            </Box>

            <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Chip
                  label={sentimentLabel ? sentimentLabel.charAt(0).toUpperCase() + sentimentLabel.slice(1) : "Awaiting analysis"}
                  color={sentimentLabel === "positive" ? "success" : sentimentLabel === "negative" ? "error" : "default"}
                  variant="outlined"
                  sx={{ fontWeight: 500 }}
                />
                {sentimentConfidence != null && (
                  <Typography variant="caption" sx={{ color: COLORS.neutral.gray600 }}>
                    Sentiment confidence: {(sentimentConfidence * 100).toFixed(0)}%
                  </Typography>
                )}
              </Box>

              {overallConfidence != null && (
                <Box>
                  <Typography variant="caption" sx={{ color: COLORS.neutral.gray600 }}>
                    Overall confidence
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={overallConfidence * 100}
                    sx={{
                      mt: 0.5,
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: COLORS.neutral.gray200,
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 999,
                        background: `linear-gradient(90deg, ${COLORS.info.light}, ${COLORS.success.main})`,
                      },
                    }}
                  />
                </Box>
              )}

              {analysis && (
                <Typography variant="caption" sx={{ color: COLORS.neutral.gray600 }}>
                  Insight based on the latest message. You can view a detailed report or download a PDF once analysis completes.
                </Typography>
              )}
            </Box>

            <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DescriptionOutlinedIcon />}
                disabled={!analysis}
                onClick={() => setReportOpen(true)}
              >
                View report
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadOutlinedIcon />}
                disabled={!reportPdfUrl}
                component="a"
                href={reportPdfUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
              >
                Download PDF
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress
            sx={{
              height: 4,
              borderRadius: 999,
              backgroundColor: COLORS.neutral.gray200,
              "& .MuiLinearProgress-bar": {
                borderRadius: 999,
                background: `linear-gradient(90deg, ${COLORS.info.light}, ${COLORS.success.main})`,
              },
            }}
          />
        </Box>
      )}

      {analysis && (
        <Grid container spacing={3}>
          {/* Row 1 cards */}
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                p: 3,
                borderRadius: 3,
                border: `1px solid ${COLORS.neutral.gray300}`,
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
              }}
            >
              <CardContent sx={{ p: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  {getSentimentIcon(sentimentLabel)}
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: COLORS.neutral.gray800 }}>
                      Sentiment
                    </Typography>
                    <Typography variant="h6" sx={{ color: COLORS.neutral.gray900 }}>
                      {sentimentLabel ? sentimentLabel.charAt(0).toUpperCase() + sentimentLabel.slice(1) : "Not available"}
                    </Typography>
                    {sentimentConfidence != null && (
                      <Typography variant="caption" sx={{ color: COLORS.neutral.gray600 }}>
                        Confidence {(sentimentConfidence * 100).toFixed(0)}%
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box>
                  <Box
                    sx={{
                      height: 6,
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${COLORS.secondary.main}, ${COLORS.accent.main}, ${COLORS.success.main})`,
                    }}
                  />
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mt: 0.5,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: COLORS.neutral.gray600 }}>
                      Negative
                    </Typography>
                    <Typography variant="caption" sx={{ color: COLORS.neutral.gray600 }}>
                      Neutral
                    </Typography>
                    <Typography variant="caption" sx={{ color: COLORS.neutral.gray600 }}>
                      Positive
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="body2" sx={{ color: COLORS.neutral.gray700 }}>
                  {sentimentLabel && sentimentConfidence != null
                    ? `The message is ${sentimentLabel.toLowerCase()} with a ${(sentimentConfidence * 100).toFixed(
                        0
                      )}% confidence score.`
                    : "Run the analysis to understand how positive, neutral, or negative the communication is."}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                p: 3,
                borderRadius: 3,
                border: `1px solid ${COLORS.neutral.gray300}`,
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
              }}
            >
              <CardContent sx={{ p: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="subtitle2" sx={{ color: COLORS.neutral.gray800 }}>
                  Intent Detected
                </Typography>
                <Typography variant="h6" sx={{ color: COLORS.info.dark }}>
                  {intentLabel
                    ? intentLabel
                        .replace(/_/g, " ")
                        .split(" ")
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(" ")
                    : "No clear intent detected"}
                </Typography>
                {intentConfidence != null && (
                  <Typography variant="caption" sx={{ color: COLORS.neutral.gray600 }}>
                    Confidence {(intentConfidence * 100).toFixed(0)}%
                  </Typography>
                )}
                <Typography variant="body2" sx={{ color: COLORS.neutral.gray700 }}>
                  {intentLabel
                    ? "This intent summarizes what the sender is trying to achieve so you can respond appropriately."
                    : "Intent helps you understand whether the sender is exploring, negotiating, or ready to move forward."}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                p: 3,
                borderRadius: 3,
                border: `1px solid ${COLORS.neutral.gray300}`,
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
              }}
            >
              <CardContent sx={{ p: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="subtitle2" sx={{ color: COLORS.neutral.gray800 }}>
                  Interest Score
                </Typography>
                <Typography variant="h4" sx={{ color: COLORS.neutral.gray900 }}>
                  {interestScore != null ? interestScore : "--"}
                </Typography>
                <Typography variant="body2" sx={{ color: getInterestColor(interestScore), fontWeight: 500 }}>
                  {getInterestLabel(interestScore)}
                </Typography>
                <Box
                  sx={{
                    mt: 1,
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: COLORS.neutral.gray200,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      width: `${Math.min(Math.max(interestScore || 0, 0), 100)}%`,
                      height: "100%",
                      background: `linear-gradient(90deg, ${COLORS.secondary.main}, ${COLORS.accent.main}, ${COLORS.success.main})`,
                    }}
                  />
                </Box>
                <Typography variant="body2" sx={{ color: COLORS.neutral.gray700 }}>
                  This score estimates how interested the other side is in moving forward based on sentiment, intent and tone.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Row 2 cards */}
          <Grid item xs={12} md={4}>
            <Card
              sx={{
                p: 3,
                borderRadius: 3,
                border: `1px solid ${COLORS.neutral.gray300}`,
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
              }}
            >
              <CardContent sx={{ p: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="subtitle2" sx={{ color: COLORS.neutral.gray800 }}>
                  Urgency
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Chip
                    label={urgencyLevel ? urgencyLevel.charAt(0).toUpperCase() + urgencyLevel.slice(1) : "Not specified"}
                    color={urgencyLevel === "high" ? "error" : urgencyLevel === "medium" ? "warning" : "default"}
                    sx={{ fontWeight: 500 }}
                  />
                  {urgencyTime && (
                    <Typography variant="caption" sx={{ color: COLORS.neutral.gray600 }}>
                      Respond within {urgencyTime}
                    </Typography>
                  )}
                </Box>
                <Typography variant="body2" sx={{ color: COLORS.neutral.gray700 }}>
                  {urgencyLevel
                    ? "Responding within the suggested window keeps momentum and shows you value the opportunity."
                    : "Once analyzed, you will see how quickly you should respond to avoid losing interest."}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                p: 3,
                borderRadius: 3,
                border: `1px solid ${COLORS.neutral.gray300}`,
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
              }}
            >
              <CardContent sx={{ p: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="subtitle2" sx={{ color: COLORS.neutral.gray800 }}>
                  Key Signals
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {Array.isArray(keySignals.interest_indicators) && keySignals.interest_indicators.length > 0 && (
                    <Box>
                      <Typography variant="caption" sx={{ color: COLORS.neutral.gray600 }}>
                        Interest Indicators
                      </Typography>
                      <Box sx={{ mt: 0.5, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                        {keySignals.interest_indicators.map((signal) => (
                          <Chip key={signal} label={signal} size="small" sx={{ backgroundColor: COLORS.success.lightest }} />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {Array.isArray(keySignals.action_requests) && keySignals.action_requests.length > 0 && (
                    <Box>
                      <Typography variant="caption" sx={{ color: COLORS.neutral.gray600 }}>
                        Action Requests
                      </Typography>
                      <Box sx={{ mt: 0.5, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                        {keySignals.action_requests.map((signal) => (
                          <Chip key={signal} label={signal} size="small" sx={{ backgroundColor: COLORS.info.lightest }} />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {!keySignals.interest_indicators && !keySignals.action_requests && (
                    <Typography variant="body2" sx={{ color: COLORS.neutral.gray700 }}>
                      Once analyzed, this section highlights the specific phrases that signal interest or concrete next steps.
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                p: 3,
                borderRadius: 3,
                border: `1px solid ${COLORS.neutral.gray300}`,
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
              }}
            >
              <CardContent sx={{ p: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="subtitle2" sx={{ color: COLORS.neutral.gray800 }}>
                  Suggested Reply
                </Typography>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${COLORS.neutral.gray200}`,
                    backgroundColor: COLORS.neutral.white,
                    maxHeight: 180,
                    overflowY: "auto",
                  }}
                >
                  <Typography variant="body2" sx={{ color: COLORS.neutral.gray800, whiteSpace: "pre-wrap" }}>
                    {suggestedReply || "Run the analysis to get a tailored reply that matches the sentiment and intent of this message."}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ color: COLORS.neutral.gray600 }}>
                    {suggestedReplyConfidence != null
                      ? `Confidence ${(suggestedReplyConfidence * 100).toFixed(0)}%`
                      : "Confidence will appear after analysis"}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      if (!suggestedReply) return;
                      navigator.clipboard.writeText(suggestedReply);
                      showToast("Suggested reply copied to clipboard.", "success");
                    }}
                    disabled={!suggestedReply}
                  >
                    Copy reply
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Summary + risks / actions */}
          <Grid item xs={12} md={8}>
            <Card
              sx={{
                p: 3,
                borderRadius: 3,
                border: `1px solid ${COLORS.neutral.gray300}`,
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
              }}
            >
              <CardContent sx={{ p: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="subtitle2" sx={{ color: COLORS.neutral.gray800 }}>
                  Summary
                </Typography>
                <Typography variant="body2" sx={{ color: COLORS.neutral.gray800, whiteSpace: "pre-wrap" }}>
                  {summary || "After running analysis, this section summarizes the overall situation and what matters most right now."}
                </Typography>

                {Array.isArray(risks) && risks.length > 0 && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="subtitle2" sx={{ color: COLORS.neutral.gray800 }}>
                      Potential Risks
                    </Typography>
                    <Box component="ul" sx={{ pl: 3, m: 0, color: COLORS.neutral.gray700 }}>
                      {risks.map((risk, index) => (
                        <li key={`${risk.type || "risk"}-${index}`}>
                          <Typography variant="body2">
                            <strong>{risk.type ? `${risk.type}: ` : ""}</strong>
                            {risk.description}
                          </Typography>
                        </li>
                      ))}
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                p: 3,
                borderRadius: 3,
                border: `1px solid ${COLORS.neutral.gray300}`,
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
              }}
            >
              <CardContent sx={{ p: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Typography variant="subtitle2" sx={{ color: COLORS.neutral.gray800 }}>
                  Recommended Actions
                </Typography>
                {Array.isArray(nextSteps) && nextSteps.length > 0 ? (
                  <Box component="ul" sx={{ pl: 3, m: 0, color: COLORS.neutral.gray700 }}>
                    {nextSteps.map((step, index) => (
                      <li key={`${step}-${index}`}>
                        <Typography variant="body2">{step}</Typography>
                      </li>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: COLORS.neutral.gray700 }}>
                    Once analyzed, you&apos;ll see concrete next steps to keep the opportunity moving.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Developer view: raw JSON */}
          <Grid item xs={12}>
            <Card
              sx={{
                p: 2,
                borderRadius: 2,
                border: `1px dashed ${COLORS.neutral.gray300}`,
                backgroundColor: COLORS.neutral.gray50,
              }}
            >
              <Typography variant="caption" sx={{ color: COLORS.neutral.gray600 }}>
                Raw SentimentAnalysisResult (developer view)
              </Typography>
              <Box
                component="pre"
                sx={{
                  mt: 1,
                  p: 1.5,
                  borderRadius: 1,
                  backgroundColor: COLORS.neutral.gray900,
                  color: COLORS.neutral.gray50,
                  fontSize: 12,
                  maxHeight: 260,
                  overflow: "auto",
                }}
              >
                {JSON.stringify(analysis, null, 2)}
              </Box>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Report dialog */}
      <Dialog open={reportOpen} onClose={() => setReportOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Communication Analysis Report</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {reportHtml || "Once the backend returns the report text, it will appear here in a clean, readable format."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportOpen(false)}>Close</Button>
          {reportPdfUrl && (
            <Button
              variant="contained"
              startIcon={<DownloadOutlinedIcon />}
              component="a"
              href={reportPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download PDF
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SentimentAnalysis;
