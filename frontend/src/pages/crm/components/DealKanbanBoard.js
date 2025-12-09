/**
 * Deal Kanban Board Component
 * Visual kanban board for managing deals across stages
 */

import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
  Stack,
  Tooltip,
  CircularProgress,
  IconButton,
} from "@mui/material";
import {
  DragIndicator as DragIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { COLORS } from "../../../constants";

const DEAL_STAGES = {
  PROSPECTING: "Prospecting",
  CONTACTED: "Contacted",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
};

const STAGE_COLORS = {
  [DEAL_STAGES.PROSPECTING]: COLORS.info,
  [DEAL_STAGES.CONTACTED]: COLORS.accent,
  [DEAL_STAGES.PROPOSAL_SENT]: COLORS.primary,
  [DEAL_STAGES.NEGOTIATION]: COLORS.secondary,
  [DEAL_STAGES.CLOSED_WON]: COLORS.success,
  [DEAL_STAGES.CLOSED_LOST]: COLORS.neutral,
};

const DealKanbanBoard = ({ deals, onDealClick, onDealStageUpdate, loading, canEdit = true, userRole = "guest" }) => {
  const [draggedDeal, setDraggedDeal] = useState(null);

  // Group deals by stage
  const dealsByStage = React.useMemo(() => {
    const grouped = {};
    Object.values(DEAL_STAGES).forEach((stage) => {
      grouped[stage] = deals.filter((deal) => deal.stage === stage);
    });
    return grouped;
  }, [deals]);

  // Calculate responsive column width
  const columnWidth = React.useMemo(() => {
    const stageCount = Object.keys(DEAL_STAGES).length;
    // On mobile: full width, on tablet: 2 columns, on desktop: fit to screen
    return {
      xs: "100%",
      sm: `calc((100% - 16px) / 2)`,
      md: `calc((100% - ${(stageCount - 1) * 16}px) / ${stageCount})`,
    };
  }, []);

  const handleDragStart = (e, deal) => {
    setDraggedDeal(deal);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    if (draggedDeal && draggedDeal.stage !== targetStage) {
      // Call the parent's stage update handler if provided
      if (onDealStageUpdate) {
        await onDealStageUpdate(draggedDeal, targetStage);
      } else {
        // Fallback to local update
        onDealClick({ ...draggedDeal, stage: targetStage });
      }
    }
    setDraggedDeal(null);
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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        gap: 0.5,
        overflow: "hidden",
        pb: 2,
        px: { xs: 0.5, sm: 1 },
        height: { xs: "auto", md: "calc(100vh - 400px)" },
        minHeight: { xs: "600px", md: "calc(100vh - 400px)" },
        maxHeight: { xs: "none", md: "calc(100vh - 400px)" },
        width: "100%",
      }}
    >
      {Object.entries(DEAL_STAGES).map(([key, stage]) => {
        const stageDeals = dealsByStage[stage] || [];
        const stageColor = STAGE_COLORS[stage];

        return (
          <Paper
            key={key}
            sx={{
              flex: "1 1 0",
              minWidth: 0,
              width: "100%",
              backgroundColor: COLORS.neutral.white,
              border: `1px solid ${COLORS.neutral.gray200}`,
              borderRadius: 2.5,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: `0 1px 3px ${COLORS.neutral.gray300}30, 0 1px 2px ${COLORS.neutral.gray200}20`,
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                boxShadow: `0 4px 12px ${COLORS.neutral.gray300}40, 0 2px 4px ${COLORS.neutral.gray200}30`,
                borderColor: COLORS.neutral.gray300,
              },
            }}
            onDragOver={canEdit ? handleDragOver : undefined}
            onDrop={canEdit ? (e) => handleDrop(e, stage) : undefined}
          >
            {/* Stage Header */}
            <Box
              sx={{
                p: 2.5,
                backgroundColor: `${stageColor.lightest}15`,
                borderBottom: `1px solid ${COLORS.neutral.gray200}`,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 600,
                    color: stageColor.dark,
                    fontSize: "1rem",
                  }}
                >
                  {stage}
                </Typography>
                <Chip
                  label={stageDeals.length}
                  size="small"
                  sx={{
                    backgroundColor: stageColor.main,
                    color: COLORS.neutral.white,
                    fontWeight: 600,
                  }}
                />
              </Stack>
            </Box>

            {/* Stage Deals */}
            <Box
              sx={{
                flex: 1,
                p: { xs: 1.5, sm: 2 },
                overflowY: "auto",
                overflowX: "hidden",
                minHeight: { xs: "400px", md: "calc(100vh - 500px)" },
                maxHeight: { xs: "600px", md: "calc(100vh - 500px)" },
                backgroundColor: COLORS.neutral.gray50,
                "&::-webkit-scrollbar": {
                  width: 6,
                },
                "&::-webkit-scrollbar-track": {
                  backgroundColor: "transparent",
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: COLORS.neutral.gray400,
                  borderRadius: 3,
                  "&:hover": {
                    backgroundColor: COLORS.neutral.gray500,
                  },
                },
              }}
            >
              {stageDeals.length === 0 ? (
                <Box
                  sx={{
                    p: 3,
                    textAlign: "center",
                    color: COLORS.neutral.gray500,
                  }}
                >
                  <Typography variant="body2">No deals in this stage</Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  {stageDeals.map((deal) => (
                    <Card
                      key={deal.id}
                      draggable={canEdit}
                      onDragStart={canEdit ? (e) => handleDragStart(e, deal) : undefined}
                      onClick={() => onDealClick(deal)}
                      sx={{
                        cursor: "pointer",
                        borderLeft: `3px solid ${stageColor.main}`,
                        backgroundColor: COLORS.neutral.white,
                        boxShadow: `0 1px 2px ${COLORS.neutral.gray200}40, 0 1px 1px ${COLORS.neutral.gray200}20`,
                        transition: "all 0.2s ease",
                        mb: 0,
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: `0 4px 8px ${stageColor.light}30, 0 2px 4px ${COLORS.neutral.gray200}20`,
                          borderLeft: `3px solid ${stageColor.dark}`,
                        },
                        "&:active": canEdit
                          ? {
                              cursor: "grabbing",
                            }
                          : {},
                      }}
                    >
                      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                        <Stack spacing={1.5}>
                          {/* Deal Title */}
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 600,
                              color: COLORS.neutral.gray900,
                              lineHeight: 1.3,
                            }}
                          >
                            {deal.dealTitle || "Untitled Deal"}
                          </Typography>

                          {/* Talent Info */}
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                bgcolor: stageColor.main,
                                fontSize: "0.75rem",
                              }}
                            >
                              {getInitials(deal.talentName)}
                            </Avatar>
                            <Typography variant="body2" sx={{ color: COLORS.neutral.gray700, flex: 1 }}>
                              {deal.talentName || "Unknown"}
                            </Typography>
                          </Stack>

                          {/* Deal Value */}
                          {deal.value && (
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <MoneyIcon sx={{ fontSize: 16, color: COLORS.accent.main }} />
                              <Typography variant="body2" sx={{ fontWeight: 600, color: COLORS.accent.dark }}>
                                {formatCurrency(deal.value)}
                              </Typography>
                            </Stack>
                          )}

                          {/* Expected Close Date */}
                          {deal.expectedCloseDate && (
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <ScheduleIcon sx={{ fontSize: 16, color: COLORS.neutral.gray600 }} />
                              <Typography variant="caption" sx={{ color: COLORS.neutral.gray600 }}>
                                {new Date(deal.expectedCloseDate).toLocaleDateString()}
                              </Typography>
                            </Stack>
                          )}

                          {/* Tags */}
                          {deal.tags && deal.tags.length > 0 && (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                              {deal.tags.slice(0, 2).map((tag, idx) => (
                                <Chip
                                  key={idx}
                                  label={tag}
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: "0.65rem",
                                    backgroundColor: `${stageColor.lightest}30`,
                                    color: stageColor.dark,
                                  }}
                                />
                              ))}
                            </Stack>
                          )}

                          {/* Drag Indicator */}
                          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.5 }}>
                            <DragIcon sx={{ fontSize: 16, color: COLORS.neutral.gray400 }} />
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
};

export default DealKanbanBoard;
