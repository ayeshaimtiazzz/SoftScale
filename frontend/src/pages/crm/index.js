/**
 * Deal Management (CRM) Page
 * Professional deal tracking and management system for SoftScale
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Stack,
  Grid,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Paper,
  Divider,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  ReceiptLongOutlined as ReceiptLongIcon,
  ViewKanban as KanbanIcon,
  ViewList as ListIcon,
  TableChart as TableIcon,
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { COLORS, STORAGE_KEYS } from "../../constants";
import PageTitle from "../../components/common/PageTitle";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../providers/ToastProvider";
import axios from "axios";
import { API_BASE } from "config";
import DealKanbanBoard from "./components/DealKanbanBoard";
import DealTableView from "./components/DealTableView";
import DealDetailsModal from "./components/DealDetailsModal";
import DealMetrics from "./components/DealMetrics";
import "./styles.css";

const DEAL_STAGES = {
  PROSPECTING: "Prospecting",
  CONTACTED: "Contacted",
  PROPOSAL_SENT: "Proposal Sent",
  NEGOTIATION: "Negotiation",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
};

const VIEW_MODES = {
  KANBAN: "kanban",
  LIST: "list",
  TABLE: "table",
};

function CRM() {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const { showToast } = useToast();

  // Get user role
  const userRole = useMemo(() => {
    if (!user) return "guest";
    let role = user.role || "guest";
    if (role === "jobseeker") role = "job_seeker";
    return role;
  }, [user]);

  // Role-based permissions
  const canCreateDeal = useMemo(() => {
    return userRole === "company_admin" || userRole === "company";
  }, [userRole]);

  const canEditDeal = useMemo(() => {
    return userRole === "company_admin" || userRole === "company";
  }, [userRole]);

  // State Management
  const [viewMode, setViewMode] = useState(VIEW_MODES.KANBAN);
  const [deals, setDeals] = useState([]);
  const [filteredDeals, setFilteredDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusTab, setStatusTab] = useState("all"); // For list view tabs
  const [metrics, setMetrics] = useState(null);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);

  // Fetch deals from API
  useEffect(() => {
    fetchDeals();
    fetchMetrics();
  }, []);

  // Listen for storage changes to refresh deals when new ones are created
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "deals") {
        fetchDeals();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    // Also listen for custom event for same-window updates
    window.addEventListener("dealCreated", fetchDeals);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("dealCreated", fetchDeals);
    };
  }, []);

  // Filter deals based on search, filters, and role
  useEffect(() => {
    let filtered = [...deals];

    // Role-based filtering
    if (userRole === "freelancer" || userRole === "job_seeker") {
      // Freelancers/job seekers see deals where they are the talent
      filtered = filtered.filter((deal) => deal.talentId === user?.user_id || deal.talentName === user?.name);
    } else if (userRole === "company_admin" || userRole === "company") {
      // Companies see all their deals
      // No additional filtering needed - they see all deals
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (deal) =>
          deal.talentName?.toLowerCase().includes(query) ||
          deal.dealTitle?.toLowerCase().includes(query) ||
          deal.companyName?.toLowerCase().includes(query) ||
          deal.description?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((deal) => deal.status === statusFilter);
    }

    // Stage filter
    if (stageFilter !== "all") {
      filtered = filtered.filter((deal) => deal.stage === stageFilter);
    }

    // Status tab filter (for list view)
    if (statusTab !== "all") {
      filtered = filtered.filter((deal) => deal.status === statusTab);
    }

    setFilteredDeals(filtered);
  }, [deals, searchQuery, statusFilter, stageFilter, statusTab, userRole, user]);

  const fetchDeals = async () => {
    try {
      setLoading(true);
      const authToken = token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

      if (!authToken) {
        setDeals([]);
        return;
      }

      const response = await axios.get(`${API_BASE}/deals`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const apiDeals = response.data.deals || [];

      // Also check localStorage for deals created from Talent Match (for backward compatibility)
      const storedDeals = JSON.parse(localStorage.getItem("deals") || "[]");

      // Merge API deals with stored deals, prioritizing API deals
      const allDeals = [...apiDeals];
      storedDeals.forEach((storedDeal) => {
        if (!allDeals.find((d) => d.id === storedDeal.id || d.talentId === storedDeal.talentId)) {
          allDeals.push(storedDeal);
        }
      });

      setDeals(allDeals);

      // Check if we need to highlight a specific deal (from navigation state)
      const locationState = window.history.state?.usr;
      if (locationState?.highlightDealId) {
        const dealToHighlight = allDeals.find((d) => d.id === locationState.highlightDealId);
        if (dealToHighlight) {
          setTimeout(() => {
            setSelectedDeal(dealToHighlight);
            setIsDealModalOpen(true);
            showToast("Deal created from Talent Match!", "success");
          }, 500);
        }
      }
    } catch (error) {
      console.error("Failed to fetch deals:", error);
      // Fallback to localStorage if API fails
      const storedDeals = JSON.parse(localStorage.getItem("deals") || "[]");
      setDeals(storedDeals);
      if (error.response?.status !== 401) {
        showToast("Failed to load deals", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const authToken = token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

      if (!authToken) {
        // Calculate from local deals if no token
        if (deals.length > 0) {
          setMetrics({
            totalDeals: deals.length,
            activeDeals: deals.filter((d) => d.status === "active").length,
            closedWon: deals.filter((d) => d.stage === DEAL_STAGES.CLOSED_WON).length,
            totalValue: deals.reduce((sum, d) => sum + (d.value || 0), 0),
            avgDealValue: deals.length > 0 ? deals.reduce((sum, d) => sum + (d.value || 0), 0) / deals.length : 0,
            winRate: deals.length > 0 ? (deals.filter((d) => d.stage === DEAL_STAGES.CLOSED_WON).length / deals.length) * 100 : 0,
            avgDealDuration: 18,
          });
        }
        return;
      }

      const response = await axios.get(`${API_BASE}/deals/metrics`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      setMetrics(response.data);
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
      // Fallback to calculating from local deals
      if (deals.length > 0) {
        setMetrics({
          totalDeals: deals.length,
          activeDeals: deals.filter((d) => d.status === "active").length,
          closedWon: deals.filter((d) => d.stage === DEAL_STAGES.CLOSED_WON).length,
          totalValue: deals.reduce((sum, d) => sum + (d.value || 0), 0),
          avgDealValue: deals.length > 0 ? deals.reduce((sum, d) => sum + (d.value || 0), 0) / deals.length : 0,
          winRate: deals.length > 0 ? (deals.filter((d) => d.stage === DEAL_STAGES.CLOSED_WON).length / deals.length) * 100 : 0,
          avgDealDuration: 18,
        });
      }
    }
  };

  // Update metrics when deals change
  useEffect(() => {
    if (deals.length > 0) {
      setMetrics({
        totalDeals: deals.length,
        activeDeals: deals.filter((d) => d.status === "active").length,
        closedWon: deals.filter((d) => d.stage === DEAL_STAGES.CLOSED_WON).length,
        totalValue: deals.reduce((sum, d) => sum + (d.value || 0), 0),
        avgDealValue: deals.length > 0 ? deals.reduce((sum, d) => sum + (d.value || 0), 0) / deals.length : 0,
        winRate: deals.length > 0 ? (deals.filter((d) => d.stage === DEAL_STAGES.CLOSED_WON).length / deals.length) * 100 : 0,
        avgDealDuration: 18,
      });
    }
  }, [deals]);

  const handleCreateDeal = () => {
    setSelectedDeal(null);
    setIsDealModalOpen(true);
  };

  const handleDealClick = (deal) => {
    setSelectedDeal(deal);
    setIsDealModalOpen(true);
  };

  const handleDealUpdate = async (updatedDeal) => {
    try {
      const authToken = token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

      if (!authToken) {
        // Fallback to local update
        setDeals((prev) => {
          if (selectedDeal && prev.find((d) => d.id === updatedDeal.id)) {
            // Update existing deal
            return prev.map((d) => (d.id === updatedDeal.id ? updatedDeal : d));
          } else {
            // Add new deal
            return [...prev, updatedDeal];
          }
        });
        setSelectedDeal(null);
        setIsDealModalOpen(false);
        showToast(selectedDeal ? "Deal updated successfully" : "Deal created successfully", "success");
        fetchMetrics();
        return;
      }

      // Check if this is a new deal (no existing deal or no deal_id from database)
      // Deals from database have both deal_id and id, new deals only have a temporary id
      const isNewDeal = !selectedDeal || !updatedDeal.deal_id;

      if (isNewDeal) {
        // Create new deal via POST
        const response = await axios.post(
          `${API_BASE}/deals`,
          {
            deal_title: updatedDeal.dealTitle,
            talent_name: updatedDeal.talentName,
            company_name: updatedDeal.companyName,
            stage: updatedDeal.stage,
            status: updatedDeal.status,
            value: updatedDeal.value,
            probability: updatedDeal.probability,
            expected_close_date: updatedDeal.expectedCloseDate,
            description: updatedDeal.description,
            tags: updatedDeal.tags,
            lead_source: updatedDeal.leadSource || "manual",
            match_score: updatedDeal.matchScore,
            skills: updatedDeal.skills,
            experience: updatedDeal.experience,
            location: updatedDeal.location,
            work_model: updatedDeal.workModel,
          },
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );

        // Add new deal to local state
        setDeals((prev) => [...prev, response.data]);
        setSelectedDeal(null);
        setIsDealModalOpen(false);
        showToast("Deal created successfully", "success");
        fetchMetrics();
      } else {
        // Update existing deal via PUT
        // Extract numeric ID from deal_id string (format: "deal-123") or use deal_id
        let dealId = updatedDeal.deal_id || updatedDeal.id;
        if (typeof dealId === "string" && dealId.startsWith("deal-")) {
          dealId = dealId.replace("deal-", "");
        }

        const response = await axios.put(
          `${API_BASE}/deals/${dealId}`,
          {
            deal_title: updatedDeal.dealTitle,
            talent_name: updatedDeal.talentName,
            company_name: updatedDeal.companyName,
            stage: updatedDeal.stage,
            status: updatedDeal.status,
            value: updatedDeal.value,
            probability: updatedDeal.probability,
            expected_close_date: updatedDeal.expectedCloseDate,
            description: updatedDeal.description,
            tags: updatedDeal.tags,
          },
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );

        // Update local state with response
        setDeals((prev) => prev.map((d) => (d.id === updatedDeal.id || d.deal_id === dealId ? response.data : d)));
        setSelectedDeal(null);
        setIsDealModalOpen(false);
        showToast("Deal updated successfully", "success");
        fetchMetrics();
      }
    } catch (error) {
      console.error("Failed to save deal:", error);
      showToast(selectedDeal ? "Failed to update deal" : "Failed to create deal", "error");
    }
  };

  const handleDealDelete = async (dealId) => {
    try {
      const authToken = token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

      if (!authToken) {
        // Fallback to local delete
        setDeals((prev) => prev.filter((d) => d.id !== dealId));
        showToast("Deal deleted successfully", "success");
        fetchMetrics();
        return;
      }

      // Extract numeric ID from deal_id string
      let numericId = dealId;
      if (typeof dealId === "string" && dealId.startsWith("deal-")) {
        numericId = dealId.replace("deal-", "");
      }

      await axios.delete(`${API_BASE}/deals/${numericId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      setDeals((prev) => prev.filter((d) => d.id !== dealId));
      showToast("Deal deleted successfully", "success");
      fetchMetrics();
    } catch (error) {
      console.error("Failed to delete deal:", error);
      showToast("Failed to delete deal", "error");
    }
  };

  const handleViewModeChange = (event, newValue) => {
    setViewMode(newValue);
  };

  const handleDealStageUpdate = async (deal, newStage) => {
    try {
      const authToken = token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

      if (!authToken) {
        // Fallback to local update
        setDeals((prev) => prev.map((d) => (d.id === deal.id ? { ...d, stage: newStage } : d)));
        showToast("Deal stage updated", "success");
        fetchMetrics();
        return;
      }

      // Extract numeric ID from deal_id string
      let dealId = deal.id;
      if (typeof dealId === "string" && dealId.startsWith("deal-")) {
        dealId = dealId.replace("deal-", "");
      }

      const response = await axios.patch(
        `${API_BASE}/deals/${dealId}/stage`,
        { stage: newStage },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      // Update local state with response
      setDeals((prev) => prev.map((d) => (d.id === deal.id ? response.data : d)));
      showToast("Deal stage updated", "success");
      fetchMetrics();
    } catch (error) {
      console.error("Failed to update deal stage:", error);
      showToast("Failed to update deal stage", "error");
    }
  };

  const activeDealsCount = useMemo(() => deals.filter((d) => d.status === "active").length, [deals]);

  return (
    <Box sx={{ p: 3, backgroundColor: COLORS.neutral.gray50, minHeight: "100vh" }}>
      <PageTitle
        title={t("navigation.crm")}
        subtitle={t("navigation.crmDesc")}
        icon={<ReceiptLongIcon sx={{ fontSize: "2rem" }} />}
        color={COLORS.secondary.main}
      />

      {/* Metrics Dashboard */}
      <DealMetrics metrics={metrics} loading={loading} />

      {/* Action Bar */}
      <Card
        sx={{
          mb: 3,
          borderLeft: `4px solid ${COLORS.secondary.main}`,
          boxShadow: `0 2px 8px ${COLORS.neutral.gray300}`,
        }}
      >
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center" justifyContent="space-between">
            {/* Search and Filters */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ flex: 1, width: { xs: "100%", md: "auto" } }}>
              <TextField
                placeholder="Search deals, talent, companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                sx={{
                  minWidth: { xs: "100%", sm: "300px" },
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: COLORS.neutral.white,
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: COLORS.neutral.gray500 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: "150px" } }}>
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: "180px" } }}>
                <InputLabel>Stage</InputLabel>
                <Select value={stageFilter} label="Stage" onChange={(e) => setStageFilter(e.target.value)}>
                  <MenuItem value="all">All Stages</MenuItem>
                  {Object.values(DEAL_STAGES).map((stage) => (
                    <MenuItem key={stage} value={stage}>
                      {stage}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {/* Action Buttons */}
            {canCreateDeal && (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateDeal}
                  sx={{
                    background: `linear-gradient(135deg, ${COLORS.secondary.main} 0%, ${COLORS.secondary.dark} 100%)`,
                    "&:hover": {
                      background: `linear-gradient(135deg, ${COLORS.secondary.dark} 0%, ${COLORS.secondary.darker} 100%)`,
                      boxShadow: `0 4px 12px ${COLORS.secondary.main}50`,
                    },
                  }}
                >
                  New Deal
                </Button>
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* View Mode Tabs */}
      <Card
        sx={{
          mb: 3,
          borderLeft: `4px solid ${COLORS.info.main}`,
          boxShadow: `0 2px 8px ${COLORS.neutral.gray300}`,
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={viewMode}
            onChange={handleViewModeChange}
            aria-label="deal view mode tabs"
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 500,
                minHeight: 64,
              },
              "& .Mui-selected": {
                color: `${COLORS.info.main} !important`,
              },
              "& .MuiTabs-indicator": {
                backgroundColor: COLORS.info.main,
                height: 3,
              },
            }}
          >
            <Tab
              icon={<KanbanIcon />}
              iconPosition="start"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <span>Kanban</span>
                  {viewMode === VIEW_MODES.KANBAN && activeDealsCount > 0 && (
                    <Chip label={activeDealsCount} size="small" sx={{ height: 20, fontSize: "0.7rem" }} />
                  )}
                </Box>
              }
              value={VIEW_MODES.KANBAN}
            />
            <Tab icon={<ListIcon />} iconPosition="start" label="List View" value={VIEW_MODES.LIST} />
            <Tab icon={<TableIcon />} iconPosition="start" label="Table View" value={VIEW_MODES.TABLE} />
          </Tabs>
        </Box>

        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          {/* View Content */}
          {viewMode === VIEW_MODES.KANBAN && (
            <DealKanbanBoard
              deals={filteredDeals}
              onDealClick={handleDealClick}
              onDealStageUpdate={handleDealStageUpdate}
              loading={loading}
              canEdit={canEditDeal}
              userRole={userRole}
            />
          )}
          {viewMode === VIEW_MODES.LIST && (
            <DealTableView
              deals={filteredDeals}
              onDealClick={handleDealClick}
              viewMode="list"
              loading={loading}
              statusTab={statusTab}
              onStatusTabChange={setStatusTab}
              canEdit={canEditDeal}
              userRole={userRole}
            />
          )}
          {viewMode === VIEW_MODES.TABLE && (
            <DealTableView
              deals={filteredDeals}
              onDealClick={handleDealClick}
              viewMode="table"
              loading={loading}
              statusTab={statusTab}
              onStatusTabChange={setStatusTab}
              canEdit={canEditDeal}
              userRole={userRole}
            />
          )}
        </CardContent>
      </Card>

      {/* Deal Details Modal */}
      <DealDetailsModal
        open={isDealModalOpen}
        deal={selectedDeal}
        onClose={() => {
          setIsDealModalOpen(false);
          setSelectedDeal(null);
        }}
        onUpdate={handleDealUpdate}
        onDelete={handleDealDelete}
      />
    </Box>
  );
}

// Mock data generator for development
function generateMockDeals() {
  const stages = Object.values(DEAL_STAGES);
  const statuses = ["active", "pending", "closed"];
  const talentNames = [
    "Sarah Johnson",
    "Michael Chen",
    "Emily Rodriguez",
    "David Kim",
    "Jessica Martinez",
    "Robert Taylor",
    "Amanda White",
    "James Wilson",
  ];
  const companies = ["TechCorp", "InnovateLabs", "Digital Solutions", "Cloud Systems", "Data Analytics Inc"];
  const domains = ["Software Development", "Data Science", "AI & ML", "Web Development", "Mobile Apps"];

  return Array.from({ length: 24 }, (_, i) => ({
    id: `deal-${i + 1}`,
    dealTitle: `Deal ${i + 1}: ${domains[i % domains.length]} Project`,
    talentName: talentNames[i % talentNames.length],
    talentId: `talent-${i + 1}`,
    companyName: companies[i % companies.length],
    stage: stages[i % stages.length],
    status: statuses[i % statuses.length],
    value: Math.floor(Math.random() * 50000) + 10000,
    probability: Math.floor(Math.random() * 50) + 30,
    expectedCloseDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    description: `Engaging ${talentNames[i % talentNames.length]} for a ${domains[i % domains.length]} project.`,
    tags: [domains[i % domains.length], "High Priority"],
    notes: [],
    activities: [],
  }));
}

export default CRM;
