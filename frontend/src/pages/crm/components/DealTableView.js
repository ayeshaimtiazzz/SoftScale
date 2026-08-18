/**
 * Deal Table/List View Component
 * Displays deals in table or list format with sorting and filtering
 */

import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Chip,
  Avatar,
  Stack,
  IconButton,
  Tooltip,
  Paper,
  CircularProgress,
  Tabs,
  Tab,
  Badge,
} from "@mui/material";
import {
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  MoreVert as MoreVertIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import { COLORS } from "../../../constants";

const DealTableView = ({
  deals,
  onDealClick,
  viewMode = "table",
  loading,
  statusTab = "all",
  onStatusTabChange,
  canEdit = true,
  userRole = "guest",
}) => {
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState("desc");

  const sortedDeals = React.useMemo(() => {
    const sorted = [...deals];
    sorted.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === "value") {
        aVal = a.value || 0;
        bVal = b.value || 0;
      } else if (sortBy === "updatedAt" || sortBy === "createdAt" || sortBy === "expectedCloseDate") {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      } else {
        aVal = String(aVal || "").toLowerCase();
        bVal = String(bVal || "").toLowerCase();
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
    return sorted;
  }, [deals, sortBy, sortOrder]);

  // Get status counts for tabs
  const statusCounts = React.useMemo(() => {
    const counts = {
      all: deals.length,
      active: deals.filter((d) => d.status === "active").length,
      pending: deals.filter((d) => d.status === "pending").length,
      closed: deals.filter((d) => d.status === "closed").length,
    };
    return counts;
  }, [deals]);

  // Filter deals by status tab
  const tabFilteredDeals = React.useMemo(() => {
    if (statusTab === "all") return sortedDeals;
    return sortedDeals.filter((deal) => deal.status === statusTab);
  }, [sortedDeals, statusTab]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStageColor = (stage) => {
    const stageColors = {
      Prospecting: COLORS.info,
      Contacted: COLORS.accent,
      "Proposal Sent": COLORS.primary,
      Negotiation: COLORS.secondary,
      "Closed Won": COLORS.success,
      "Closed Lost": COLORS.neutral,
    };
    return stageColors[stage] || COLORS.neutral;
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (viewMode === "list") {
    return (
      <Box>
        {/* Status Tabs */}
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            px: 2,
            pt: 1,
            backgroundColor: COLORS.neutral.white,
          }}
        >
          <Tabs
            value={statusTab}
            onChange={(e, v) => onStatusTabChange?.(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 500,
                minHeight: 48,
                fontSize: "0.875rem",
              },
              "& .Mui-selected": {
                color: `${COLORS.secondary.main} !important`,
              },
              "& .MuiTabs-indicator": {
                backgroundColor: COLORS.secondary.main,
                height: 3,
              },
            }}
          >
            <Tab
              label={
                <Badge badgeContent={statusCounts.all} color="primary" max={999}>
                  <Box sx={{ px: 1 }}>All Deals</Box>
                </Badge>
              }
              value="all"
              icon={<TrendingUpIcon sx={{ fontSize: 18, mb: 0.5 }} />}
              iconPosition="start"
            />
            <Tab
              label={
                <Badge badgeContent={statusCounts.active} color="success" max={999}>
                  <Box sx={{ px: 1 }}>Active</Box>
                </Badge>
              }
              value="active"
              icon={<CheckCircleIcon sx={{ fontSize: 18, mb: 0.5 }} />}
              iconPosition="start"
            />
            <Tab
              label={
                <Badge badgeContent={statusCounts.pending} color="warning" max={999}>
                  <Box sx={{ px: 1 }}>Pending</Box>
                </Badge>
              }
              value="pending"
              icon={<HourglassIcon sx={{ fontSize: 18, mb: 0.5 }} />}
              iconPosition="start"
            />
            <Tab
              label={
                <Badge badgeContent={statusCounts.closed} color="default" max={999}>
                  <Box sx={{ px: 1 }}>Closed</Box>
                </Badge>
              }
              value="closed"
              icon={<CancelIcon sx={{ fontSize: 18, mb: 0.5 }} />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Deal List */}
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
          <Stack spacing={2}>
            {tabFilteredDeals.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Typography variant="body1" sx={{ color: COLORS.neutral.gray600 }}>
                  No {statusTab !== "all" ? statusTab : ""} deals found
                </Typography>
              </Box>
            ) : (
              tabFilteredDeals.map((deal) => {
                const stageColor = getStageColor(deal.stage);
                return (
                  <Card
                    key={deal.id}
                    onClick={() => onDealClick(deal)}
                    sx={{
                      cursor: "pointer",
                      borderLeft: `4px solid ${stageColor.main}`,
                      backgroundColor: COLORS.neutral.white,
                      boxShadow: `0 2px 6px ${COLORS.neutral.gray300}`,
                      transition: "all 0.2s ease",
                      "&:hover": {
                        transform: "translateX(4px)",
                        boxShadow: `0 4px 12px ${stageColor.light}40`,
                        borderLeft: `4px solid ${stageColor.dark}`,
                      },
                    }}
                  >
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: stageColor.main,
                        }}
                      >
                        {getInitials(deal.talentName)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {deal.dealTitle || "Untitled Deal"}
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                          <Typography variant="body2" sx={{ color: COLORS.neutral.gray600 }}>
                            {deal.talentName}
                          </Typography>
                          {deal.companyName && (
                            <>
                              <Typography variant="body2" sx={{ color: COLORS.neutral.gray400 }}>
                                •
                              </Typography>
                              <Typography variant="body2" sx={{ color: COLORS.neutral.gray600 }}>
                                {deal.companyName}
                              </Typography>
                            </>
                          )}
                        </Stack>
                      </Box>
                      <Stack direction="row" spacing={2} alignItems="center">
                        {deal.value && (
                          <Box sx={{ textAlign: "right" }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.accent.dark }}>
                              {formatCurrency(deal.value)}
                            </Typography>
                          </Box>
                        )}
                        <Chip
                          label={deal.stage}
                          size="small"
                          sx={{
                            backgroundColor: `${stageColor.main}20`,
                            color: stageColor.dark,
                            fontWeight: 500,
                          }}
                        />
                        <IconButton size="small">
                          <MoreVertIcon />
                        </IconButton>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Stack>
      </Box>
      </Box>
    );
  }

  // Table view
  return (
    <Box>
      {/* Status Tabs for Table View */}
      <Box
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          px: 2,
          pt: 1,
          backgroundColor: COLORS.neutral.white,
        }}
      >
        <Tabs
          value={statusTab}
          onChange={(e, v) => onStatusTabChange?.(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 500,
              minHeight: 48,
              fontSize: "0.875rem",
            },
            "& .Mui-selected": {
              color: `${COLORS.secondary.main} !important`,
            },
            "& .MuiTabs-indicator": {
              backgroundColor: COLORS.secondary.main,
              height: 3,
            },
          }}
        >
          <Tab
            label={
              <Badge badgeContent={statusCounts.all} color="primary" max={999}>
                <Box sx={{ px: 1 }}>All Deals</Box>
              </Badge>
            }
            value="all"
            icon={<TrendingUpIcon sx={{ fontSize: 18, mb: 0.5 }} />}
            iconPosition="start"
          />
          <Tab
            label={
              <Badge badgeContent={statusCounts.active} color="success" max={999}>
                <Box sx={{ px: 1 }}>Active</Box>
              </Badge>
            }
            value="active"
            icon={<CheckCircleIcon sx={{ fontSize: 18, mb: 0.5 }} />}
            iconPosition="start"
          />
          <Tab
            label={
              <Badge badgeContent={statusCounts.pending} color="warning" max={999}>
                <Box sx={{ px: 1 }}>Pending</Box>
              </Badge>
            }
            value="pending"
            icon={<HourglassIcon sx={{ fontSize: 18, mb: 0.5 }} />}
            iconPosition="start"
          />
          <Tab
            label={
              <Badge badgeContent={statusCounts.closed} color="default" max={999}>
                <Box sx={{ px: 1 }}>Closed</Box>
              </Badge>
            }
            value="closed"
            icon={<CancelIcon sx={{ fontSize: 18, mb: 0.5 }} />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      <TableContainer component={Paper} sx={{ maxHeight: "calc(100vh - 500px)", overflow: "auto" }}>
        <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>
              <TableSortLabel
                active={sortBy === "dealTitle"}
                direction={sortBy === "dealTitle" ? sortOrder : "asc"}
                onClick={() => handleSort("dealTitle")}
              >
                Deal
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortBy === "talentName"}
                direction={sortBy === "talentName" ? sortOrder : "asc"}
                onClick={() => handleSort("talentName")}
              >
                Talent
              </TableSortLabel>
            </TableCell>
            <TableCell>Company</TableCell>
            <TableCell>
              <TableSortLabel
                active={sortBy === "stage"}
                direction={sortBy === "stage" ? sortOrder : "asc"}
                onClick={() => handleSort("stage")}
              >
                Stage
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortBy === "value"}
                direction={sortBy === "value" ? sortOrder : "asc"}
                onClick={() => handleSort("value")}
              >
                Value
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortBy === "expectedCloseDate"}
                direction={sortBy === "expectedCloseDate" ? sortOrder : "asc"}
                onClick={() => handleSort("expectedCloseDate")}
              >
                Expected Close
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortBy === "updatedAt"}
                direction={sortBy === "updatedAt" ? sortOrder : "asc"}
                onClick={() => handleSort("updatedAt")}
              >
                Last Updated
              </TableSortLabel>
            </TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tabFilteredDeals.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                <Typography variant="body1" sx={{ color: COLORS.neutral.gray600 }}>
                  No {statusTab !== "all" ? statusTab : ""} deals found
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            tabFilteredDeals.map((deal) => {
              const stageColor = getStageColor(deal.stage);
              return (
                <TableRow
                  key={deal.id}
                  hover
                  onClick={() => onDealClick(deal)}
                  sx={{
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: `${stageColor.lightest}10`,
                    },
                  }}
                >
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {deal.dealTitle || "Untitled Deal"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: stageColor.main,
                          fontSize: "0.75rem",
                        }}
                      >
                        {getInitials(deal.talentName)}
                      </Avatar>
                      <Typography variant="body2">{deal.talentName || "Unknown"}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{deal.companyName || "-"}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={deal.stage}
                      size="small"
                      sx={{
                        backgroundColor: `${stageColor.main}20`,
                        color: stageColor.dark,
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {deal.value ? (
                      <Typography variant="body2" sx={{ fontWeight: 600, color: COLORS.accent.dark }}>
                        {formatCurrency(deal.value)}
                      </Typography>
                    ) : (
                      <Typography variant="body2" sx={{ color: COLORS.neutral.gray400 }}>
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {deal.expectedCloseDate ? (
                      <Typography variant="body2">
                        {new Date(deal.expectedCloseDate).toLocaleDateString()}
                      </Typography>
                    ) : (
                      <Typography variant="body2" sx={{ color: COLORS.neutral.gray400 }}>
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: COLORS.neutral.gray600 }}>
                      {new Date(deal.updatedAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      </TableContainer>
    </Box>
  );
};

export default DealTableView;

