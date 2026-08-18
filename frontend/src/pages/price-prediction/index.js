import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import axios from "axios";
import { COLORS, API_ENDPOINTS } from "../../constants";
import PageTitle from "../../components/common/PageTitle";
import { useTranslation } from "react-i18next";
import { API_BASE } from "../../config";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../providers/ToastProvider";

const EXPERIENCE_OPTIONS = ["beginner", "intermediate", "expert"];
const FREELANCER_OPTIONS = ["junior", "mid", "senior"];
const REGION_OPTIONS = ["pakistan", "india", "usa", "europe"];

function PricePrediction({ embedded = false, initialPrefill = null }) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const [description, setDescription] = useState("");
  const [featuresText, setFeaturesText] = useState("");
  const [region, setRegion] = useState("pakistan");
  const [experienceLevel, setExperienceLevel] = useState("intermediate");
  const [freelancerLevel, setFreelancerLevel] = useState("mid");
  const [effort, setEffort] = useState("1");
  const [urgency, setUrgency] = useState("1");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [feedbackCorrect, setFeedbackCorrect] = useState("");
  const [adjustedPrice, setAdjustedPrice] = useState("");
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);

  useEffect(() => {
    const prefill = initialPrefill || location.state?.prefill;
    if (!prefill) return;

    if (prefill.project_description) {
      setDescription(prefill.project_description);
    }
    if (prefill.features) {
      setFeaturesText(prefill.features);
    }
  }, [location.state, initialPrefill]);

  const parseFeatures = () => {
    const raw = featuresText
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return raw.length ? raw : undefined;
  };

  const handlePredict = async () => {
    const trimmed = description.trim();
    const feats = parseFeatures();
    if (!trimmed && !feats?.length) {
      showToast("Enter a project description and/or comma-separated features.", "warning");
      return;
    }
    if (!token) {
      showToast("You need to be logged in.", "error");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const body = {
        project_description: trimmed,
        region,
        experience_level: experienceLevel,
        freelancer_level: freelancerLevel,
        effort: parseFloat(effort) || 1,
        urgency: parseFloat(urgency) || 1,
      };
      if (feats) body.features = feats;

      const { data } = await axios.post(`${API_BASE}${API_ENDPOINTS.PREDICT_PRICE}`, body, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 120000,
      });
      setResult(data);
      showToast("Estimate ready.", "success");
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        (typeof err.response?.data?.detail === "object"
          ? JSON.stringify(err.response.data.detail)
          : null) ||
        err.message ||
        "Request failed";
      showToast(String(msg), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async () => {
    if (!result || result.final_price == null) {
      showToast("Run a prediction first.", "warning");
      return;
    }
    if (!token) return;

    let wasCorrect = null;
    if (feedbackCorrect === "yes") wasCorrect = true;
    if (feedbackCorrect === "no") wasCorrect = false;

    const adj = adjustedPrice.trim() ? parseFloat(adjustedPrice) : null;
    if (adjustedPrice.trim() && Number.isNaN(adj)) {
      showToast("Adjusted price must be a number.", "warning");
      return;
    }

    setFeedbackSending(true);
    try {
      await axios.post(
        `${API_BASE}${API_ENDPOINTS.PREDICT_PRICE_FEEDBACK}`,
        {
          predicted_price: result.final_price,
          was_correct: wasCorrect,
          adjusted_price: adj,
          notes: feedbackNotes.trim() || undefined,
          prediction_id: result.prediction_id ?? undefined,
          deal_id: result.deal_id ?? undefined,
          features: result.feature_breakdown?.extracted_features,
          complexity: result.feature_breakdown?.complexity,
          hours: result.feature_breakdown?.hours,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("Thanks — feedback saved to the database.", "success");
      setFeedbackCorrect("");
      setAdjustedPrice("");
      setFeedbackNotes("");
    } catch (e) {
      showToast("Could not save feedback.", "error");
    } finally {
      setFeedbackSending(false);
    }
  };

  const fb = result?.feature_breakdown;

  return (
    <Box sx={{ p: embedded ? 1 : 3 }}>
      {!embedded && (
        <PageTitle
          title={t("navigation.pricePrediction")}
          subtitle={t("navigation.pricePredictionDesc")}
          icon={<TrendingUpOutlinedIcon sx={{ fontSize: "2rem" }} />}
          color={COLORS.info.main}
        />
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              border: `1px solid ${COLORS.neutral.gray300}`,
              height: "100%",
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Project input
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={5}
                label="Project description"
                placeholder="e.g. Web app with login, dashboard, payments, and an AI support chatbot"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Features (optional)"
                placeholder="Comma-separated: login, dashboard, api integration"
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                helperText="Merged with detected features from the description."
                sx={{ mb: 2 }}
              />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Region</InputLabel>
                    <Select value={region} label="Region" onChange={(e) => setRegion(e.target.value)}>
                      {REGION_OPTIONS.map((r) => (
                        <MenuItem key={r} value={r}>
                          {r}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Experience</InputLabel>
                    <Select
                      value={experienceLevel}
                      label="Experience"
                      onChange={(e) => setExperienceLevel(e.target.value)}
                    >
                      {EXPERIENCE_OPTIONS.map((r) => (
                        <MenuItem key={r} value={r}>
                          {r}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Freelancer tier</InputLabel>
                    <Select
                      value={freelancerLevel}
                      label="Freelancer tier"
                      onChange={(e) => setFreelancerLevel(e.target.value)}
                    >
                      {FREELANCER_OPTIONS.map((r) => (
                        <MenuItem key={r} value={r}>
                          {r}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Effort ×"
                    value={effort}
                    onChange={(e) => setEffort(e.target.value)}
                    type="number"
                    inputProps={{ min: 0.5, max: 3, step: 0.1 }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Urgency ×"
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    type="number"
                    inputProps={{ min: 0.5, max: 3, step: 0.1 }}
                  />
                </Grid>
              </Grid>
              <Button
                variant="contained"
                color="primary"
                onClick={handlePredict}
                disabled={loading}
                sx={{ mt: 2 }}
              >
                Estimate price
              </Button>
              {loading && <LinearProgress sx={{ mt: 2 }} />}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ border: `1px solid ${COLORS.neutral.gray300}`, minHeight: 280 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Estimate
              </Typography>
              {!result && !loading && (
                <Typography color="text.secondary">Submit a project to see rule-based vs ML breakdown.</Typography>
              )}
              {result && (
                <>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: COLORS.info.main }}>
                    {result.final_price != null ? `$${result.final_price.toLocaleString()}` : "—"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Confidence: {result.confidence_score != null ? `${result.confidence_score}%` : "—"}
                  </Typography>
                  {result.prediction_id != null && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      Record #{result.prediction_id} — link feedback to this estimate
                    </Typography>
                  )}
                  {result.price_range && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Rule range: {result.price_range}
                    </Typography>
                  )}
                  <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
                    <Chip label={`Rule: $${result.rule_based_price}`} variant="outlined" />
                    <Chip label={`ML: $${result.ml_price}`} variant="outlined" />
                    {result.hybrid_price != null && (
                      <Chip label={`Hybrid: $${result.hybrid_price}`} color="primary" variant="outlined" />
                    )}
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Explanation
                  </Typography>
                  <Typography variant="body2" sx={{ color: COLORS.neutral.gray700 }}>
                    {result.explanation}
                  </Typography>
                  {fb?.extracted_features?.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Detected features
                      </Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {fb.extracted_features.map((f) => (
                          <Chip key={f} size="small" label={f} />
                        ))}
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Complexity: {fb.complexity} · Hours (hint): {fb.hours} · Timeline hint: ~{result.timeline_days_hint}{" "}
                        days
                      </Typography>
                    </Box>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {result && (
          <Grid item xs={12}>
            <Card sx={{ border: `1px solid ${COLORS.neutral.gray300}` }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Feedback
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Was this estimate useful? Optional adjusted price is stored for future retraining.
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Accurate?</InputLabel>
                      <Select
                        value={feedbackCorrect}
                        label="Accurate?"
                        onChange={(e) => setFeedbackCorrect(e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="">
                          <em>Skip</em>
                        </MenuItem>
                        <MenuItem value="yes">Yes</MenuItem>
                        <MenuItem value="no">No</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Your price (optional)"
                      value={adjustedPrice}
                      onChange={(e) => setAdjustedPrice(e.target.value)}
                      type="number"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Button variant="outlined" onClick={handleFeedback} disabled={feedbackSending}>
                      Send feedback
                    </Button>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Notes (optional)"
                      value={feedbackNotes}
                      onChange={(e) => setFeedbackNotes(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

export default PricePrediction;
