import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Card, CardContent, CardActions, Avatar, Typography, Chip, Button, Grid, Stack } from "@mui/material";
import { Work, LocationOn, AttachMoney, TrendingUp, ArrowForward, Visibility } from "@mui/icons-material";
import { SAMPLE_JOBS, ROUTES } from "../../constants";
import { COLORS } from "../../constants";

const TopJobsProjects = ({ jobsProjects = [], isCompanyAdmin = false }) => {
  const navigate = useNavigate();

  // Determine data source: fetched (company) or hardcoded (freelancers/job_seekers)
  const dataToShow = jobsProjects && jobsProjects.length > 0 ? jobsProjects : SAMPLE_JOBS;

  const handleClick = (item) => {
    if (isCompanyAdmin && item.type && item.id) {
      // For company admins: Store selected post and navigate to talent match
      localStorage.setItem("selectedPost", JSON.stringify({ type: item.type, id: item.id, title: item.title }));
      navigate("/talent-match");
    }
    // For freelancers/job_seekers: No action (hardcoded, no click)
  };

  const handleViewDetails = (item) => {
    // Navigate to talent details page
    // Ensure item has type field - map from item structure
    const itemWithType = {
      ...item,
      type: item.type || (item.title ? (item.project_type ? "project" : "job") : "company"),
    };
    const role = isCompanyAdmin ? "company_admin" : "guest";
    console.log("Navigating to talent details with item:", itemWithType);
    navigate(ROUTES.TALENT_DETAILS, { state: { item: itemWithType, role } });
  };

  const getInitials = (title) => {
    if (!title) return "J";
    return title.slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (title) => {
    const colors = [COLORS.success.main, COLORS.info.main, COLORS.accent.main, COLORS.primary.main, COLORS.secondary.main];
    const index = (title?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  return (
    <Box>
      <Grid container spacing={2}>
        {dataToShow.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderLeft: `4px solid ${getAvatarColor(item.title)}`,
                boxShadow: `0 2px 8px ${COLORS.neutral.gray300}`,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor: isCompanyAdmin ? "pointer" : "default",
                "&:hover": {
                  transform: isCompanyAdmin ? "translateY(-8px) scale(1.02)" : "none",
                  boxShadow: isCompanyAdmin ? `0 8px 24px ${getAvatarColor(item.title)}40` : `0 2px 8px ${COLORS.neutral.gray300}`,
                  borderLeft: `4px solid ${getAvatarColor(item.title)}`,
                },
                position: "relative",
                overflow: "hidden",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: `linear-gradient(90deg, ${getAvatarColor(item.title)}, ${COLORS.success.light})`,
                  opacity: 0,
                  transition: "opacity 0.3s",
                },
                "&:hover::before": {
                  opacity: isCompanyAdmin ? 1 : 0,
                },
              }}
              onClick={() => handleClick(item)}
            >
              <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: getAvatarColor(item.title),
                      width: 56,
                      height: 56,
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      mr: 2,
                      boxShadow: `0 4px 12px ${getAvatarColor(item.title)}50`,
                    }}
                  >
                    {getInitials(item.title)}
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: COLORS.primary.dark,
                        mb: 0.5,
                        lineHeight: 1.3,
                      }}
                    >
                      {item.title}
                    </Typography>
                    {(item.skills || item.domain) && (
                      <Chip
                        label={item.skills || item.domain}
                        size="small"
                        sx={{
                          bgcolor: `${COLORS.success.lightest}40`,
                          color: COLORS.success.dark,
                          fontWeight: 500,
                          fontSize: "0.75rem",
                          mt: 0.5,
                        }}
                      />
                    )}
                  </Box>
                </Box>

                <Stack spacing={1}>
                  {item.domain && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Work sx={{ fontSize: 18, color: COLORS.info.main }} />
                      <Typography variant="body2" color="text.secondary">
                        {item.domain || "General"}
                      </Typography>
                    </Box>
                  )}
                  {item.budget && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <AttachMoney sx={{ fontSize: 18, color: COLORS.accent.main }} />
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: COLORS.accent.dark,
                        }}
                      >
                        {item.budget}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
              {isCompanyAdmin && (
                <CardActions sx={{ px: 2, pb: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    endIcon={<ArrowForward />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClick(item);
                    }}
                    sx={{
                      background: `linear-gradient(135deg, ${COLORS.success.main} 0%, ${COLORS.success.dark} 100%)`,
                      "&:hover": {
                        background: `linear-gradient(135deg, ${COLORS.success.dark} 0%, ${COLORS.success.darker} 100%)`,
                        boxShadow: `0 4px 12px ${COLORS.success.main}50`,
                      },
                      textTransform: "none",
                      fontWeight: 600,
                    }}
                  >
                    Find Matches
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Visibility />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(item);
                    }}
                    sx={{
                      borderColor: COLORS.primary.main,
                      color: COLORS.primary.main,
                      "&:hover": {
                        borderColor: COLORS.primary.dark,
                        backgroundColor: `${COLORS.primary.lightest}20`,
                      },
                      textTransform: "none",
                      fontWeight: 600,
                    }}
                  >
                    More Details
                  </Button>
                </CardActions>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TopJobsProjects;


