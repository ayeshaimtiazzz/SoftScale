/**
 * Suggests deal value from project description via /api/predict-price.
 * Intended for Negotiation / Proposal stages; works whenever scope text exists.
 */
import React, { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import axios from "axios";
import { API_BASE } from "../../../config";
import { API_ENDPOINTS, COLORS } from "../../../constants";
import { useToast } from "../../../providers/ToastProvider";

/** Deal routes are mounted without `/api` (same as other CRM deal calls). */
const DEALS_API_ROOT = API_BASE.replace(/\/api\/?$/, "");

const MIN_DESC = 12;

export default function DealPricingAssistant({
  description,
  token,
  stage,
  negotiationStageLabel = "Negotiation",
  onApplySuggestedValue,
  /** When set, calls POST /deals/{id}/price-suggestion (server reads scope from DB; body can override). */
  dealNumericId = null,
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const trimmed = (description || "").trim();
  const hasSavedDeal = dealNumericId != null && Number.isFinite(Number(dealNumericId));
  const canUse =
    token && (trimmed.length >= MIN_DESC || hasSavedDeal);
  const isNegotiation = stage === negotiationStageLabel;

  const runSuggest = async () => {
    if (!token) return;
    if (!hasSavedDeal && trimmed.length < MIN_DESC) {
      showToast("Add a longer scope description (or sign in) to get a suggestion.", "warning");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const useDealEndpoint = hasSavedDeal;
      const url = useDealEndpoint
        ? `${DEALS_API_ROOT}/deals/${dealNumericId}/price-suggestion`
        : `${API_BASE}${API_ENDPOINTS.PREDICT_PRICE}`;
      const requestBody =
        useDealEndpoint && trimmed.length >= MIN_DESC
          ? { project_description: trimmed }
          : useDealEndpoint
            ? {}
            : { project_description: trimmed };
      const { data } = await axios.post(url, requestBody, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 120000,
      });
      setResult(data);
      setOpen(true);
      showToast("Price suggestion ready.", "success");
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        (typeof err.response?.data?.detail === "object"
          ? JSON.stringify(err.response.data.detail)
          : null) ||
        err.message ||
        "Prediction failed";
      showToast(String(msg), "error");
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (result?.final_price == null || !onApplySuggestedValue) return;
    onApplySuggestedValue(Math.round(Number(result.final_price)));
    showToast("Deal value updated — save the deal when ready.", "info");
  };

  if (!token) return null;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderColor: COLORS.info.light,
        backgroundColor: `${COLORS.info.lightest}18`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <AutoAwesomeOutlinedIcon sx={{ color: COLORS.info.main, fontSize: "1.25rem" }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Pricing assistant
        </Typography>
        {isNegotiation && (
          <Chip size="small" label="Negotiation" color="info" variant="outlined" sx={{ height: 22 }} />
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
        Uses the same hybrid model as Price Prediction: scope text → features → rules + ML. Saved deals call the
        deal-scoped API (uses stored description unless you type a longer override above).
      </Typography>
      <Button
        size="small"
        variant="contained"
        color="info"
        onClick={runSuggest}
        disabled={!canUse || loading}
      >
        Suggest price from description
      </Button>
      {!canUse && trimmed.length > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          Description should be at least {MIN_DESC} characters.
        </Typography>
      )}
      {loading && <LinearProgress sx={{ mt: 2 }} />}
      <Collapse in={open && !!result}>
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.info.dark }}>
            ${result?.final_price != null ? Number(result.final_price).toLocaleString() : "—"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Confidence {result?.confidence_score != null ? `${result.confidence_score}%` : "—"} · Rule $
            {result?.rule_based_price} · ML ${result?.ml_price}
          </Typography>
          {result?.explanation && (
            <Typography variant="body2" sx={{ mt: 1, color: COLORS.neutral.gray700 }}>
              {result.explanation}
            </Typography>
          )}
          {result?.prediction_id != null && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Logged as prediction #{result.prediction_id}
            </Typography>
          )}
          {onApplySuggestedValue && (
            <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={apply}>
              Apply to deal value
            </Button>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}
