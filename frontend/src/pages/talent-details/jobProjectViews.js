/**
 * Job and project detail layouts — shared by Talent details page and My workspace catalog drawer.
 */
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Stack,
  Avatar,
  Paper,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import {
  LocationOn,
  AttachMoney,
  Work,
  AccessTime,
  TrendingUp,
  RocketLaunch,
} from "@mui/icons-material";
import { API_BASE } from "config";

export const JobDetailsView = ({ data, item, typeColor, embedded = false }) => {
  const title = data.job_title || item?.title || "Job Opportunity";
  const company = data.company_info?.company_name || item?.company_name || data.company_name || "Company";
  const location = `${data.city || item?.city || ""}, ${data.country || item?.country || ""}`.trim().replace(/^,\s*|,\s*$/g, "");

  const titleVariant = embedded ? "h4" : "h3";
  const heroPad = embedded ? 2 : 4;
  const heroMb = embedded ? 2 : 4;
  const avSize = embedded ? 56 : 80;

  const inner = (
    <>
      <Paper
        elevation={embedded ? 1 : 3}
        sx={{
          p: heroPad,
          mb: heroMb,
          background: `linear-gradient(135deg, ${typeColor.main}15 0%, ${typeColor.lightest} 100%)`,
          borderLeft: `6px solid ${typeColor.main}`,
        }}
      >
        <Stack direction="row" spacing={embedded ? 2 : 3} alignItems="center">
          <Avatar
            sx={{
              width: avSize,
              height: avSize,
              bgcolor: typeColor.main,
              fontSize: embedded ? "1.5rem" : "2rem",
            }}
          >
            <Work />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant={titleVariant} fontWeight={700} sx={{ color: typeColor.dark, mb: 1 }}>
              {title}
            </Typography>
            <Typography variant="h6" sx={{ color: typeColor.dark, mb: 2, opacity: 0.8, fontSize: embedded ? "1rem" : undefined }}>
              {company}
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {location && (
                <Chip
                  icon={<LocationOn />}
                  label={location}
                  size={embedded ? "small" : "medium"}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
              {data.work_mode && (
                <Chip
                  icon={<Work />}
                  label={data.work_mode}
                  size={embedded ? "small" : "medium"}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
              {data.job_type && (
                <Chip label={data.job_type} size={embedded ? "small" : "medium"} sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }} />
              )}
              {data.preferred_domain && (
                <Chip label={data.preferred_domain} size={embedded ? "small" : "medium"} sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }} />
              )}
            </Stack>
          </Box>
        </Stack>
      </Paper>

      <Grid container spacing={embedded ? 2 : 3}>
        <Grid item xs={12} md={8}>
          <Card elevation={embedded ? 1 : 2} sx={{ mb: embedded ? 2 : 3 }}>
            <CardContent>
              <Typography variant="h5" fontWeight={600} sx={{ color: typeColor.main, mb: 2, fontSize: embedded ? "1.1rem" : undefined }}>
                Job Description
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                {data.job_description || "No description available."}
              </Typography>
            </CardContent>
          </Card>

          {data.required_skills && (
            <Card elevation={embedded ? 1 : 2} sx={{ mb: embedded ? 2 : 3 }}>
              <CardContent>
                <Typography variant="h5" fontWeight={600} sx={{ color: typeColor.main, mb: 2, fontSize: embedded ? "1.1rem" : undefined }}>
                  Required Skills
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {data.required_skills.split(",").map((skill, idx) => (
                    <Chip
                      key={idx}
                      label={skill.trim()}
                      size="small"
                      sx={{ bgcolor: `${typeColor.lightest}`, color: typeColor.dark }}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={embedded ? 1 : 2} sx={{ mb: embedded ? 2 : 3, position: embedded ? "relative" : "sticky", top: embedded ? undefined : 20 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ color: typeColor.main, mb: 2 }}>
                Key Details
              </Typography>
              <Stack spacing={2}>
                {data.salary && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <AttachMoney sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Salary
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.salary}
                    </Typography>
                  </Box>
                )}
                {data.required_experience && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <AccessTime sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Experience
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.required_experience}
                    </Typography>
                  </Box>
                )}
                {data.preferred_domain && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <TrendingUp sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Domain
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.preferred_domain}
                    </Typography>
                  </Box>
                )}
                {data.work_mode && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <Work sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Work Mode
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.work_mode}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>

          {data.company_info && (
            <Card elevation={embedded ? 1 : 2}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} sx={{ color: typeColor.main, mb: 2 }}>
                  Company Info
                </Typography>
                <Stack spacing={1.5}>
                  {data.company_info.company_name && (
                    <Typography variant="body2">
                      <strong>Name:</strong> {data.company_info.company_name}
                    </Typography>
                  )}
                  {data.company_info.domain && (
                    <Typography variant="body2">
                      <strong>Domain:</strong> {data.company_info.domain}
                    </Typography>
                  )}
                  {data.company_info.company_size && (
                    <Typography variant="body2">
                      <strong>Size:</strong> {data.company_info.company_size}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </>
  );

  if (embedded) {
    return <Box sx={{ px: { xs: 0, sm: 0.5 }, pb: 1 }}>{inner}</Box>;
  }
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {inner}
    </Container>
  );
};

export const ProjectDetailsView = ({ data, item, typeColor, token, embedded = false }) => {
  const title = data.project_title || item?.title || "Project";
  const company = data.company_info?.company_name || item?.company_name || data.company_name || "Company";
  const location = `${data.city || item?.city || ""}, ${data.country || item?.country || ""}`.trim().replace(/^,\s*|,\s*$/g, "");
  const [pricePrediction, setPricePrediction] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState("");

  const titleVariant = embedded ? "h4" : "h3";
  const heroPad = embedded ? 2 : 4;
  const heroMb = embedded ? 2 : 4;
  const avSize = embedded ? 56 : 80;

  const runPricePrediction = async () => {
    if (!token) {
      setPriceError("Login required to run price prediction.");
      return;
    }
    setPriceLoading(true);
    setPriceError("");
    try {
      const payload = {
        project_description: data.project_description || item?.project_description || item?.description || title,
        features: (data.required_skills || item?.required_skills || item?.skills || "")
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
        region: "pakistan",
        experience_level: "intermediate",
        freelancer_level: "mid",
        effort: 1,
        urgency: 1,
      };
      const response = await axios.post(`${API_BASE}/predict-price`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPricePrediction(response.data || null);
    } catch (err) {
      const message = err.response?.data?.detail || err.message || "Failed to predict project price.";
      setPriceError(String(message));
    } finally {
      setPriceLoading(false);
    }
  };

  useEffect(() => {
    runPricePrediction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.project_id, data.project_title, token]);

  const inner = (
    <>
      <Paper
        elevation={embedded ? 1 : 3}
        sx={{
          p: heroPad,
          mb: heroMb,
          background: `linear-gradient(135deg, ${typeColor.main}15 0%, ${typeColor.lightest} 100%)`,
          borderLeft: `6px solid ${typeColor.main}`,
        }}
      >
        <Stack direction="row" spacing={embedded ? 2 : 3} alignItems="center">
          <Avatar
            sx={{
              width: avSize,
              height: avSize,
              bgcolor: typeColor.main,
              fontSize: embedded ? "1.5rem" : "2rem",
            }}
          >
            <RocketLaunch />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant={titleVariant} fontWeight={700} sx={{ color: typeColor.dark, mb: 1 }}>
              {title}
            </Typography>
            <Typography variant="h6" sx={{ color: typeColor.dark, mb: 2, opacity: 0.8, fontSize: embedded ? "1rem" : undefined }}>
              {company}
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {location && (
                <Chip
                  icon={<LocationOn />}
                  label={location}
                  size={embedded ? "small" : "medium"}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
              {data.project_type && (
                <Chip label={data.project_type} size={embedded ? "small" : "medium"} sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }} />
              )}
              {data.payment_type && (
                <Chip
                  icon={<AttachMoney />}
                  label={data.payment_type}
                  size={embedded ? "small" : "medium"}
                  sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }}
                />
              )}
              {data.domain && (
                <Chip label={data.domain} size={embedded ? "small" : "medium"} sx={{ bgcolor: `${typeColor.main}20`, color: typeColor.dark }} />
              )}
            </Stack>
          </Box>
        </Stack>
      </Paper>

      <Grid container spacing={embedded ? 2 : 3}>
        <Grid item xs={12} md={8}>
          <Card elevation={embedded ? 1 : 2} sx={{ mb: embedded ? 2 : 3 }}>
            <CardContent>
              <Typography variant="h5" fontWeight={600} sx={{ color: typeColor.main, mb: 2, fontSize: embedded ? "1.1rem" : undefined }}>
                Project Description
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
                {data.project_description || "No description available."}
              </Typography>
            </CardContent>
          </Card>

          {data.required_skills && (
            <Card elevation={embedded ? 1 : 2} sx={{ mb: embedded ? 2 : 3 }}>
              <CardContent>
                <Typography variant="h5" fontWeight={600} sx={{ color: typeColor.main, mb: 2, fontSize: embedded ? "1.1rem" : undefined }}>
                  Required Skills
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {data.required_skills.split(",").map((skill, idx) => (
                    <Chip
                      key={idx}
                      label={skill.trim()}
                      size="small"
                      sx={{ bgcolor: `${typeColor.lightest}`, color: typeColor.dark }}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          <Card elevation={embedded ? 1 : 2} sx={{ mb: embedded ? 2 : 3 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h5" fontWeight={600} sx={{ color: typeColor.main, fontSize: embedded ? "1.1rem" : undefined }}>
                  Price Prediction
                </Typography>
                <Button size="small" variant="outlined" onClick={runPricePrediction} disabled={priceLoading} sx={{ textTransform: "none" }}>
                  Refresh Estimate
                </Button>
              </Stack>

              {priceLoading && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">
                    Calculating estimate...
                  </Typography>
                </Box>
              )}

              {!priceLoading && priceError && <Alert severity="warning">{priceError}</Alert>}

              {!priceLoading && !priceError && pricePrediction && (
                <Stack spacing={1}>
                  <Typography variant="h4" fontWeight={700} sx={{ color: typeColor.dark }}>
                    {pricePrediction.final_price != null ? `$${Number(pricePrediction.final_price).toLocaleString()}` : "N/A"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Confidence: {pricePrediction.confidence_score != null ? `${pricePrediction.confidence_score}%` : "N/A"}
                  </Typography>
                  {pricePrediction.price_range && (
                    <Typography variant="body2" color="text.secondary">
                      Suggested range: {pricePrediction.price_range}
                    </Typography>
                  )}
                  {pricePrediction.explanation && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {pricePrediction.explanation}
                    </Typography>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={embedded ? 1 : 2} sx={{ mb: embedded ? 2 : 3, position: embedded ? "relative" : "sticky", top: embedded ? undefined : 20 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} sx={{ color: typeColor.main, mb: 2 }}>
                Project Details
              </Typography>
              <Stack spacing={2}>
                {data.budget && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <AttachMoney sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Budget
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.budget}
                    </Typography>
                  </Box>
                )}
                {data.payment_type && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <AttachMoney sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Payment Type
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.payment_type}
                    </Typography>
                  </Box>
                )}
                {data.project_type && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <RocketLaunch sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Project Type
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.project_type}
                    </Typography>
                  </Box>
                )}
                {data.domain && (
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <TrendingUp sx={{ color: typeColor.main }} />
                      <Typography variant="subtitle2" fontWeight={600}>
                        Domain
                      </Typography>
                    </Stack>
                    <Typography variant="body1" sx={{ pl: 4 }}>
                      {data.domain}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );

  if (embedded) {
    return <Box sx={{ px: { xs: 0, sm: 0.5 }, pb: 1 }}>{inner}</Box>;
  }
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {inner}
    </Container>
  );
};
