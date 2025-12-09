import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Card, CardContent, CardActions, Avatar, Typography, Chip, Button, Grid, Stack } from "@mui/material";
import { Work, LocationOn, AttachMoney, TrendingUp, ArrowForward, Visibility, Business, People } from "@mui/icons-material";
import { ROUTES } from "../../constants";
import { COLORS } from "../../constants";
import { useAuth } from "../../contexts/AuthContext";
import ProspectsModal from "./ProspectsModal";

const TopJobsProjects = ({ jobsProjects = [], isCompanyAdmin = false, showPursueAsDeal = false, onPursueAsDeal = null }) => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [prospectsModal, setProspectsModal] = useState({
    open: false,
    jobId: null,
    projectId: null,
    itemTitle: "",
  });

  // Use only fetched data, no hardcoded fallback
  const dataToShow = useMemo(() => {
    if (!jobsProjects || jobsProjects.length === 0) return [];
    // Ensure all items have a valid title field
    return jobsProjects.map(item => ({
      ...item,
      title: item.title || item.job_title || item.project_title || "Untitled"
    }));
  }, [jobsProjects]);

  const handleClick = (item) => {
    if (isCompanyAdmin) {
      // Normalize type: API returns 'projects' (plural) but we need 'project' (singular)
      let itemType = item.type;
      if (itemType === "projects") {
        itemType = "project";
      } else if (!itemType) {
        // Fallback: try to determine type from other fields
        if (item.project_type || item.project_title) {
          itemType = "project";
        } else if (item.job_type || item.job_title) {
          itemType = "job";
        }
      }

      const itemId = item.id || item.job_id || item.project_id;
      const itemTitle = item.title || item.job_title || item.project_title || "Untitled";

      if (itemType && itemId) {
        // For company admins: Store selected post and navigate to talent match
        localStorage.setItem("selectedPost", JSON.stringify({ type: itemType, id: itemId, title: itemTitle }));
        navigate("/talent-match");
      }
    }
    // For freelancers/job_seekers: No action (hardcoded, no click)
  };

  const handleViewDetails = (item) => {
    // Navigate to talent details page
    // Ensure item has type field - normalize from API response
    let itemType = item.type;

    // Normalize type: API returns 'projects' (plural) but talent details expects 'project' (singular)
    if (itemType === "projects") {
      itemType = "project";
    } else if (!itemType) {
      // Fallback: try to determine type from other fields
      if (item.project_type || item.project_title) {
        itemType = "project";
      } else if (item.job_type || item.job_title) {
        itemType = "job";
      } else if (item.title) {
        // Default to job if we have a title but no other indicators
        itemType = "job";
      } else {
        itemType = "company";
      }
    }

    // Ensure we have id field (could be job_id, project_id, or id)
    const itemId = item.id || item.job_id || item.project_id;

    if (!itemId) {
      console.error("Cannot navigate to details: item missing id", item);
      return;
    }

    const itemWithType = {
      ...item,
      type: itemType,
      id: itemId,
      // Ensure title field exists (could be job_title, project_title, or title)
      title: item.title || item.job_title || item.project_title || "Untitled",
    };

    const role = isCompanyAdmin ? "company_admin" : "guest";
    console.log("Navigating to talent details with item:", itemWithType);
    navigate(ROUTES.TALENT_DETAILS, { state: { item: itemWithType, role } });
  };

  const getInitials = (item) => {
    const title = item?.title || item?.job_title || item?.project_title || "J";
    if (!title || title === "J") return "J";
    return title.slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (item) => {
    const title = item?.title || item?.job_title || item?.project_title || "Default";
    const colors = [COLORS.success.main, COLORS.info.main, COLORS.accent.main, COLORS.primary.main, COLORS.secondary.main];
    const index = (title?.charCodeAt(0) || 68) % colors.length; // 68 is 'D' for Default
    return colors[index];
  };

  const getItemTitle = (item) => {
    return item?.title || item?.job_title || item?.project_title || "Untitled";
  };

  if (dataToShow.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body1" color="text.secondary">
          No jobs or projects available at the moment.
        </Typography>
      </Box>
    );
  }

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
                borderLeft: `4px solid ${getAvatarColor(item)}`,
                boxShadow: `0 2px 8px ${COLORS.neutral.gray300}`,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor: isCompanyAdmin ? "pointer" : "default",
                "&:hover": {
                  transform: isCompanyAdmin ? "translateY(-8px) scale(1.02)" : "none",
                  boxShadow: isCompanyAdmin ? `0 8px 24px ${getAvatarColor(item)}40` : `0 2px 8px ${COLORS.neutral.gray300}`,
                  borderLeft: `4px solid ${getAvatarColor(item)}`,
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
                  background: `linear-gradient(90deg, ${getAvatarColor(item)}, ${COLORS.success.light})`,
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
                      bgcolor: getAvatarColor(item),
                      width: 56,
                      height: 56,
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      mr: 2,
                      boxShadow: `0 4px 12px ${getAvatarColor(item)}50`,
                    }}
                  >
                    {getInitials(item)}
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
                      {getItemTitle(item)}
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
                  {(item.domain || item.preferred_domain) && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Work sx={{ fontSize: 18, color: COLORS.info.main }} />
                      <Typography variant="body2" color="text.secondary">
                        {item.domain || item.preferred_domain || "General"}
                      </Typography>
                    </Box>
                  )}
                  {(item.salaryRange || item.salary || item.budget) && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <AttachMoney sx={{ fontSize: 18, color: COLORS.accent.main }} />
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: COLORS.accent.dark,
                        }}
                      >
                        {item.salaryRange || (item.salary ? `$${item.salary.toLocaleString()}` : "") || item.budget}
                      </Typography>
                    </Box>
                  )}
                  {item.company_name && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Company:</strong> {item.company_name}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
              {isCompanyAdmin && (
                <CardActions sx={{ px: 2, pb: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                  {showPursueAsDeal && onPursueAsDeal ? (
                    <>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<Business />}
                        onClick={(e) => {
                          e.stopPropagation();
                          const projectId = item.id || item.project_id;
                          if (projectId && onPursueAsDeal) {
                            onPursueAsDeal(projectId);
                          }
                        }}
                        sx={{
                          background: `linear-gradient(135deg, ${COLORS.accent.main} 0%, ${COLORS.accent.dark} 100%)`,
                          "&:hover": {
                            background: `linear-gradient(135deg, ${COLORS.accent.dark} 0%, ${COLORS.accent.darker} 100%)`,
                            boxShadow: `0 4px 12px ${COLORS.accent.main}50`,
                          },
                          textTransform: "none",
                          fontWeight: 600,
                        }}
                      >
                        Pursue as Deal
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
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<People />}
                        onClick={(e) => {
                          e.stopPropagation();
                          const itemId = item.id || item.job_id || item.project_id;
                          const itemTitle = item.title || item.job_title || item.project_title || "Item";
                          setProspectsModal({
                            open: true,
                            jobId: item.job_id || (item.type === "job" ? itemId : null),
                            projectId: item.project_id || (item.type === "project" || item.type === "projects" ? itemId : null),
                            itemTitle,
                          });
                        }}
                        sx={{
                          borderColor: COLORS.accent.main,
                          color: COLORS.accent.main,
                          "&:hover": {
                            borderColor: COLORS.accent.dark,
                            backgroundColor: `${COLORS.accent.lightest}20`,
                          },
                          textTransform: "none",
                          fontWeight: 600,
                        }}
                      >
                        View Prospects
                      </Button>
                    </>
                  ) : (
                    <>
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
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<People />}
                        onClick={(e) => {
                          e.stopPropagation();
                          const itemId = item.id || item.job_id || item.project_id;
                          const itemTitle = item.title || item.job_title || item.project_title || "Item";
                          setProspectsModal({
                            open: true,
                            jobId: item.job_id || (item.type === "job" ? itemId : null),
                            projectId: item.project_id || (item.type === "project" || item.type === "projects" ? itemId : null),
                            itemTitle,
                          });
                        }}
                        sx={{
                          borderColor: COLORS.accent.main,
                          color: COLORS.accent.main,
                          "&:hover": {
                            borderColor: COLORS.accent.dark,
                            backgroundColor: `${COLORS.accent.lightest}20`,
                          },
                          textTransform: "none",
                          fontWeight: 600,
                        }}
                      >
                        View Prospects
                      </Button>
                    </>
                  )}
                </CardActions>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>

      <ProspectsModal
        open={prospectsModal.open}
        onClose={() => setProspectsModal({ open: false, jobId: null, projectId: null, itemTitle: "" })}
        jobId={prospectsModal.jobId}
        projectId={prospectsModal.projectId}
        itemTitle={prospectsModal.itemTitle}
        token={token}
      />
    </Box>
  );
};

export default TopJobsProjects;


