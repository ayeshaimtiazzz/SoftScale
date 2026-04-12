import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Card, CardContent, CardActions, Avatar, Typography, Chip, Grid, Stack, CircularProgress, Snackbar, Alert, Tooltip, IconButton } from "@mui/material";
import { Work, AttachMoney, ArrowForward, Visibility, Business, People, AddBusiness, Send as SendIcon, QueryStats } from "@mui/icons-material";
import { ROUTES } from "../../constants";
import { COLORS } from "../../constants";
import { useAuth } from "../../contexts/AuthContext";
import ProspectsModal from "./ProspectsModal";
import { API_BASE } from "../../config";
import axios from "axios";

const TopJobsProjects = ({
  jobsProjects = [],
  isCompanyAdmin = false,
  showPursueAsDeal = false,
  onPursueAsDeal = null,
  userRole = null,
  /** When set (e.g. My workspace catalog), card click opens in-place detail instead of navigating away */
  onCatalogItemOpen = null,
  /** When drawer is open, highlight the matching card (id + type from listing row) */
  catalogSelectedItem = null,
}) => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [creatingDeal, setCreatingDeal] = useState(null);
  const [applyingToJob, setApplyingToJob] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [prospectsModal, setProspectsModal] = useState({
    open: false,
    jobId: null,
    projectId: null,
    itemTitle: "",
  });

  const detectItemType = (item) => {
    if (item?.type === "job" || item?.job_id || item?.job_title) return "job";
    if (item?.type === "project" || item?.type === "projects" || item?.project_id || item?.project_title) return "project";
    return null;
  };

  const viewingAsJobSeeker = userRole === "job_seeker" || userRole === "jobseeker";

  // Use only fetched data, no hardcoded fallback
  const dataToShow = useMemo(() => {
    if (!jobsProjects || jobsProjects.length === 0) return [];
    return jobsProjects
      .filter((item) => {
        if (!viewingAsJobSeeker) return true;
        return detectItemType(item) === "job";
      })
      .map((item) => ({
        ...item,
        title: item.title || item.job_title || item.project_title || "Untitled",
      }));
  }, [jobsProjects, viewingAsJobSeeker]);

  /** Card body click: catalogue in My workspace when `onCatalogItemOpen` is passed; otherwise same as Lead Discovery for admins */
  const handleCatalogOrLeadDiscovery = (item) => {
    if (isCompanyAdmin && typeof onCatalogItemOpen === "function") {
      onCatalogItemOpen(item);
      return;
    }
    handleLeadDiscovery(item);
  };

  const handleLeadDiscovery = (item) => {
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

  const handleClick = handleLeadDiscovery;

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

  const openDetailsOrCatalog = (item) => {
    if (typeof onCatalogItemOpen === "function") {
      onCatalogItemOpen(item);
    } else {
      handleViewDetails(item);
    }
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

  // Determine if user can create deals
  // Only freelancers can create deals (for projects/jobs they want to pursue)
  // Job seekers should not create deals - they just apply to jobs
  const canCreateDeal = useMemo(() => {
    return userRole === "freelancer";
  }, [userRole]);

  // Determine if user is a job seeker
  const isJobSeeker = useMemo(() => {
    return userRole === "job_seeker" || userRole === "jobseeker";
  }, [userRole]);

  // Determine if item is a job or project
  const getItemType = (item) => detectItemType(item);

  // Handle create deal from job
  const handleCreateDealFromJob = async (item) => {
    const jobId = item.id || item.job_id;
    if (!jobId || !token) {
      setSnackbar({ open: true, message: "Please log in to create deals", severity: "error" });
      return;
    }

    setCreatingDeal(jobId);
    try {
      const dealsBaseUrl = API_BASE.replace('/api', '');
      const response = await axios.post(
        `${dealsBaseUrl}/deals/from-job/${jobId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSnackbar({ open: true, message: "Deal created successfully! Redirecting to Deal Management...", severity: "success" });

      // Navigate to CRM after a short delay
      setTimeout(() => {
        navigate(ROUTES.CRM);
      }, 1500);
    } catch (error) {
      console.error("Failed to create deal from job:", error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || "Failed to create deal";
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
    } finally {
      setCreatingDeal(null);
    }
  };

  // Handle create deal from project (freelancers only)
  const handleCreateDealFromProject = async (item) => {
    const projectId = item.id || item.project_id;
    if (!projectId || !token) {
      setSnackbar({ open: true, message: "Please log in to create deals", severity: "error" });
      return;
    }

    setCreatingDeal(projectId);
    try {
      const dealsBaseUrl = API_BASE.replace('/api', '');
      const response = await axios.post(
        `${dealsBaseUrl}/deals/from-project-freelancer/${projectId}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSnackbar({ open: true, message: "Deal created successfully! Redirecting to Deal Management...", severity: "success" });

      // Navigate to CRM after a short delay
      setTimeout(() => {
        navigate(ROUTES.CRM);
      }, 1500);
    } catch (error) {
      console.error("Failed to create deal from project:", error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || "Failed to create deal";
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
    } finally {
      setCreatingDeal(null);
    }
  };

  // Handle job application for job seekers
  const handleApplyToJob = async (item) => {
    const jobId = item.id || item.job_id;
    if (!jobId || !token) {
      setSnackbar({ open: true, message: "Please log in to apply", severity: "error" });
      return;
    }

    setApplyingToJob(jobId);
    try {
      // Get candidate_id for job seeker
      const candidateResponse = await axios.get(`${API_BASE}/get-job-seeker-profile-id`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const candidateId = candidateResponse.data?.candidate_id;

      // Apply to job (creates prospect and triggers automation)
      const response = await axios.post(
        `${API_BASE}/jobs/${jobId}/apply`,
        {
          talent_id: candidateId ? String(candidateId) : null,
          talent_type: "job_seeker",
          auto_create_deal: true, // Automatically create deal for company
          generate_proposal: true, // Optionally generate application proposal
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSnackbar({
        open: true,
        message: response.data?.message || "Application submitted successfully! The company has been notified.",
        severity: "success"
      });
    } catch (error) {
      console.error("Failed to apply to job:", error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || "Failed to submit application";
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
    } finally {
      setApplyingToJob(null);
    }
  };

  // Determine if deal button should be shown for this item
  // Only freelancers can create deals (for projects and jobs they want to pursue)
  const shouldShowDealButton = (item) => {
    if (!canCreateDeal || userRole !== "freelancer") return false;

    const itemType = getItemType(item);
    // Freelancers can create deals from both jobs and projects
    return itemType === "job" || itemType === "project";
  };

  const isOwnPost = (item) => {
    if (isCompanyAdmin) return true;

    if (item?.is_owner === true) return true;

    const currentUserId = Number(user?.user_id ?? user?.id);
    const itemUserIds = [
      item?.user_id,
      item?.owner_user_id,
      item?.created_by,
      item?.posted_by,
      item?.author_id,
    ]
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (currentUserId > 0 && itemUserIds.includes(currentUserId)) return true;

    const currentCompanyId = Number(user?.company_id ?? user?.companyId ?? user?.profile_id);
    const itemCompanyIds = [item?.company_id, item?.owner_company_id]
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);

    if (currentCompanyId > 0 && itemCompanyIds.includes(currentCompanyId)) return true;

    if (user?.company_name && item?.company_name) {
      return String(user.company_name).trim().toLowerCase() === String(item.company_name).trim().toLowerCase();
    }

    return false;
  };

  const shouldShowProspectsAction = (item) => {
    const itemType = getItemType(item);
    if (itemType !== "job" && itemType !== "project") return false;
    return isOwnPost(item);
  };

  const openProspectsModal = (item) => {
    const itemId = item.id || item.job_id || item.project_id;
    const itemTitle = item.title || item.job_title || item.project_title || "Item";
    setProspectsModal({
      open: true,
      jobId: item.job_id || (item.type === "job" ? itemId : null),
      projectId: item.project_id || (item.type === "project" || item.type === "projects" ? itemId : null),
      itemTitle,
    });
  };

  const handleOpenPricePrediction = async (item) => {
    let prefillSource = { ...item };
    const projectId = item?.project_id || (getItemType(item) === "project" ? item?.id : null);
    const hasCorePrefill = Boolean(item?.project_description || item?.description || item?.required_skills || item?.skills);

    if (projectId && !hasCorePrefill) {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const profileResponse = await axios.get(`${API_BASE}/profile/${projectId}?type=project`, { headers });
        prefillSource = profileResponse.data?.data || profileResponse.data || prefillSource;
      } catch (error) {
        // Keep fallback to item-level data if details fetch fails.
      }
    }

    navigate(ROUTES.PRICE_PREDICTION, {
      state: {
        prefill: {
          project_description: prefillSource.project_description || prefillSource.description || item.project_description || item.description || "",
          features: prefillSource.required_skills || prefillSource.skills || item.required_skills || item.skills || "",
          domain: prefillSource.domain || prefillSource.preferred_domain || item.domain || item.preferred_domain || "",
          title: prefillSource.title || prefillSource.project_title || item.title || item.project_title || "Project",
        },
      },
    });
  };

  const actionGroupSx = {
    display: "flex",
    alignItems: "center",
    gap: 0.5,
    flexWrap: "wrap",
  };

  const actionIconSx = {
    border: `1px solid ${COLORS.neutral.gray200}`,
    backgroundColor: COLORS.neutral.white,
    "&:hover": {
      backgroundColor: COLORS.neutral.gray100,
    },
  };

  const isCatalogCardSelected = (item) => {
    if (!catalogSelectedItem || typeof onCatalogItemOpen !== "function") return false;
    const rowId = item.id ?? item.job_id ?? item.project_id;
    if (rowId == null || catalogSelectedItem.id == null || rowId !== catalogSelectedItem.id) return false;
    return String(catalogSelectedItem.type || "") === String(item.type || "");
  };

  if (dataToShow.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="body1" color="text.secondary">
          {isJobSeeker ? "No jobs available at the moment." : "No jobs or projects available at the moment."}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={2}>
        {dataToShow.map((item, index) => {
          const catalogSelected = isCatalogCardSelected(item);
          return (
          <Grid item xs={12} sm={6} md={4} key={`${item.type ?? "row"}-${item.id ?? index}`}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderLeft: `4px solid ${getAvatarColor(item)}`,
                boxShadow: `0 2px 8px ${COLORS.neutral.gray300}`,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor: isCompanyAdmin ? "pointer" : "default",
                ...(catalogSelected
                  ? {
                      bgcolor: `${COLORS.primary.main}14`,
                      boxShadow: `inset 4px 0 0 ${COLORS.primary.main}, 0 2px 8px ${COLORS.neutral.gray300}`,
                    }
                  : {}),
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
              onClick={() => handleCatalogOrLeadDiscovery(item)}
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
              {(isCompanyAdmin || canCreateDeal || isJobSeeker) && (
                <CardActions
                  sx={{
                    px: 2,
                    pb: 2,
                    pt: 0.5,
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    gap: 1,
                    borderTop: `1px solid ${COLORS.neutral.gray200}`,
                  }}
                >
                  {showPursueAsDeal && onPursueAsDeal ? (
                    <Box sx={actionGroupSx}>
                      <Tooltip title="Pursue as Deal" arrow>
                        <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          const projectId = item.id || item.project_id;
                          if (projectId && onPursueAsDeal) {
                            onPursueAsDeal(projectId);
                          }
                        }}
                        sx={{
                          ...actionIconSx,
                          color: COLORS.accent.main,
                          "&:hover": {
                            ...actionIconSx["&:hover"],
                            color: COLORS.accent.dark,
                          },
                        }}
                      >
                        <Business />
                      </IconButton>
                      </Tooltip>
                      <Tooltip title="More Details" arrow>
                        <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetailsOrCatalog(item);
                        }}
                        sx={{
                          ...actionIconSx,
                          color: COLORS.primary.main,
                          "&:hover": {
                            ...actionIconSx["&:hover"],
                            color: COLORS.primary.dark,
                          },
                        }}
                      >
                        <Visibility />
                      </IconButton>
                      </Tooltip>
                      {shouldShowProspectsAction(item) && (
                        <Tooltip title="View Prospects" arrow>
                          <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            openProspectsModal(item);
                          }}
                          sx={{
                            ...actionIconSx,
                            color: COLORS.accent.main,
                            "&:hover": {
                              ...actionIconSx["&:hover"],
                              color: COLORS.accent.dark,
                            },
                          }}
                        >
                          <People />
                        </IconButton>
                        </Tooltip>
                      )}
                      {!canCreateDeal && getItemType(item) === "project" && (
                        <Tooltip title="Price Prediction" arrow>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPricePrediction(item);
                            }}
                            sx={{
                              ...actionIconSx,
                              color: COLORS.info.main,
                              "&:hover": {
                                ...actionIconSx["&:hover"],
                                color: COLORS.info.dark,
                              },
                            }}
                          >
                            <QueryStats />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  ) : !isJobSeeker ? (
                    <Box sx={actionGroupSx}>
                      <Tooltip title="Find Matches" arrow>
                        <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClick(item);
                        }}
                        sx={{
                          ...actionIconSx,
                          color: COLORS.success.main,
                          "&:hover": {
                            ...actionIconSx["&:hover"],
                            color: COLORS.success.dark,
                          },
                        }}
                      >
                        <ArrowForward />
                      </IconButton>
                      </Tooltip>
                      <Tooltip title="More Details" arrow>
                        <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetailsOrCatalog(item);
                        }}
                        sx={{
                          ...actionIconSx,
                          color: COLORS.primary.main,
                          "&:hover": {
                            ...actionIconSx["&:hover"],
                            color: COLORS.primary.dark,
                          },
                        }}
                      >
                        <Visibility />
                      </IconButton>
                      </Tooltip>
                      {shouldShowProspectsAction(item) && (
                        <Tooltip title="View Prospects" arrow>
                          <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            openProspectsModal(item);
                          }}
                          sx={{
                            ...actionIconSx,
                            color: COLORS.accent.main,
                            "&:hover": {
                              ...actionIconSx["&:hover"],
                              color: COLORS.accent.dark,
                            },
                          }}
                        >
                          <People />
                        </IconButton>
                        </Tooltip>
                      )}
                      {!canCreateDeal && getItemType(item) === "project" && (
                        <Tooltip title="Price Prediction" arrow>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPricePrediction(item);
                            }}
                            sx={{
                              ...actionIconSx,
                              color: COLORS.info.main,
                              "&:hover": {
                                ...actionIconSx["&:hover"],
                                color: COLORS.info.dark,
                              },
                            }}
                          >
                            <QueryStats />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  ) : null}
                  {/* Apply button for job seekers on jobs */}
                  {isJobSeeker && getItemType(item) === "job" && (
                    <Box sx={actionGroupSx}>
                      <Tooltip title={applyingToJob === (item.id || item.job_id) ? "Applying..." : "Apply Now"} arrow>
                        <span>
                          <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyToJob(item);
                      }}
                      disabled={applyingToJob === (item.id || item.job_id)}
                      sx={{
                        ...actionIconSx,
                        color: COLORS.success.main,
                        "&:hover": {
                          ...actionIconSx["&:hover"],
                          color: COLORS.success.dark,
                        },
                      }}
                    >
                      {applyingToJob === (item.id || item.job_id) ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                    </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  )}
                  {/* View Details button for job seekers */}
                  {isJobSeeker && (
                    <Box sx={actionGroupSx}>
                      <Tooltip title="More Details" arrow>
                        <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(item);
                      }}
                      sx={{
                        ...actionIconSx,
                        color: COLORS.primary.main,
                        "&:hover": {
                          ...actionIconSx["&:hover"],
                          color: COLORS.primary.dark,
                        },
                      }}
                    >
                      <Visibility />
                    </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                  {/* Deal creation buttons for freelancers */}
                  {canCreateDeal && shouldShowDealButton(item) && (
                    <Box sx={actionGroupSx}>
                      <Tooltip title={creatingDeal === (item.id || item.job_id || item.project_id) ? "Creating Deal..." : "Create Deal"} arrow>
                        <span>
                          <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          const itemType = getItemType(item);
                          if (itemType === "job") {
                            handleCreateDealFromJob(item);
                          } else if (itemType === "project" && userRole === "freelancer") {
                            handleCreateDealFromProject(item);
                          }
                        }}
                        disabled={creatingDeal === (item.id || item.job_id || item.project_id)}
                        sx={{
                          ...actionIconSx,
                          color: COLORS.accent.main,
                          "&:hover": {
                            ...actionIconSx["&:hover"],
                            color: COLORS.accent.dark,
                          },
                        }}
                      >
                        {creatingDeal === (item.id || item.job_id || item.project_id) ? <CircularProgress size={18} color="inherit" /> : <AddBusiness />}
                      </IconButton>
                        </span>
                      </Tooltip>
                      {shouldShowProspectsAction(item) && (
                        <Tooltip title="View Prospects" arrow>
                          <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            openProspectsModal(item);
                          }}
                          sx={{
                            ...actionIconSx,
                            color: COLORS.accent.main,
                            "&:hover": {
                              ...actionIconSx["&:hover"],
                              color: COLORS.accent.dark,
                            },
                          }}
                        >
                          <People />
                        </IconButton>
                        </Tooltip>
                      )}
                      {getItemType(item) === "project" && (
                        <Tooltip title="Price Prediction" arrow>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPricePrediction(item);
                            }}
                            sx={{
                              ...actionIconSx,
                              color: COLORS.info.main,
                              "&:hover": {
                                ...actionIconSx["&:hover"],
                                color: COLORS.info.dark,
                              },
                            }}
                          >
                            <QueryStats />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  )}
                </CardActions>
              )}
            </Card>
          </Grid>
          );
        })}
      </Grid>

      <ProspectsModal
        open={prospectsModal.open}
        onClose={() => setProspectsModal({ open: false, jobId: null, projectId: null, itemTitle: "" })}
        jobId={prospectsModal.jobId}
        projectId={prospectsModal.projectId}
        itemTitle={prospectsModal.itemTitle}
        token={token}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TopJobsProjects;


