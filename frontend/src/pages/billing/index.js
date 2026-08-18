/**
 * Billing Page
 * Allows users to manage their subscription, payment methods, and view billing history
 */

import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Grid,
  Divider,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Stack,
} from "@mui/material";
import {
  CreditCard as CreditCardIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Receipt as ReceiptIcon,
  Star as StarIcon,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../providers/ToastProvider";
import { API_BASE } from "../../config";
import { API_ENDPOINTS, COLORS, STORAGE_KEYS } from "../../constants";
import PageTitle from "../../components/common/PageTitle";
import axios from "axios";
import "./styles.css";

const Billing = () => {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  // Subscription State
  const [subscription, setSubscription] = useState({
    plan_name: "Free",
    price: 0,
    billing_cycle: "monthly",
    status: "active",
  });

  // Payment Methods State
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [addPaymentDialogOpen, setAddPaymentDialogOpen] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    card_type: "",
    last_four: "",
    expiry_month: "",
    expiry_year: "",
    is_default: false,
  });

  // Billing History State
  const [billingHistory, setBillingHistory] = useState([]);

  useEffect(() => {
    fetchSubscription();
    fetchPaymentMethods();
    fetchBillingHistory();
  }, []);

  const fetchSubscription = async () => {
    try {
      const authToken = token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!authToken) return;

      const response = await axios.get(`${API_BASE}${API_ENDPOINTS.GET_SUBSCRIPTION}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.data) {
        setSubscription(response.data);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const authToken = token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!authToken) return;

      const response = await axios.get(`${API_BASE}${API_ENDPOINTS.GET_PAYMENT_METHODS}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.data) {
        setPaymentMethods(response.data);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    }
  };

  const fetchBillingHistory = async () => {
    try {
      const authToken = token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!authToken) return;

      const response = await axios.get(`${API_BASE}${API_ENDPOINTS.GET_BILLING_HISTORY}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.data) {
        setBillingHistory(response.data);
      }
    } catch (error) {
      console.error("Error fetching billing history:", error);
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!newPaymentMethod.card_type || !newPaymentMethod.last_four || !newPaymentMethod.expiry_month || !newPaymentMethod.expiry_year) {
      showToast("Please fill in all payment method fields", "error");
      return;
    }

    if (newPaymentMethod.last_four.length !== 4 || !/^\d+$/.test(newPaymentMethod.last_four)) {
      showToast("Last four digits must be exactly 4 numbers", "error");
      return;
    }

    setLoading(true);
    try {
      const authToken = token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      await axios.post(
        `${API_BASE}${API_ENDPOINTS.ADD_PAYMENT_METHOD}`,
        {
          card_type: newPaymentMethod.card_type,
          last_four: newPaymentMethod.last_four,
          expiry_month: parseInt(newPaymentMethod.expiry_month),
          expiry_year: parseInt(newPaymentMethod.expiry_year),
          is_default: newPaymentMethod.is_default,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      showToast("Payment method added successfully", "success");
      setAddPaymentDialogOpen(false);
      setNewPaymentMethod({
        card_type: "",
        last_four: "",
        expiry_month: "",
        expiry_year: "",
        is_default: false,
      });
      fetchPaymentMethods();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Failed to add payment method";
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId) => {
    if (!window.confirm("Are you sure you want to delete this payment method?")) {
      return;
    }

    setLoading(true);
    try {
      const authToken = token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      await axios.delete(`${API_BASE}${API_ENDPOINTS.DELETE_PAYMENT_METHOD}/${paymentMethodId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      showToast("Payment method deleted successfully", "success");
      fetchPaymentMethods();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Failed to delete payment method";
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradePlan = async (planName, price, billingCycle) => {
    setLoading(true);
    try {
      const authToken = token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      await axios.put(
        `${API_BASE}${API_ENDPOINTS.UPDATE_SUBSCRIPTION}`,
        {
          plan_name: planName,
          price: price,
          billing_cycle: billingCycle,
          features: [],
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      showToast(`Successfully upgraded to ${planName} plan`, "success");
      fetchSubscription();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Failed to update subscription";
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "paid":
      case "active":
        return COLORS.success.main;
      case "pending":
        return COLORS.accent.main;
      case "failed":
        return COLORS.secondary.main;
      default:
        return COLORS.neutral.gray500;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "paid":
      case "active":
        return <CheckCircleIcon sx={{ color: COLORS.success.main }} />;
      case "pending":
        return <CancelIcon sx={{ color: COLORS.accent.main }} />;
      case "failed":
        return <CancelIcon sx={{ color: COLORS.secondary.main }} />;
      default:
        return null;
    }
  };

  const subscriptionPlans = [
    { name: "Free", price: 0, features: ["Basic features", "Limited matches", "Community support"] },
    { name: "Professional", price: 29.99, features: ["All features", "Unlimited matches", "Priority support", "Advanced analytics"] },
    { name: "Enterprise", price: 99.99, features: ["All features", "Unlimited matches", "24/7 support", "Custom integrations", "Dedicated account manager"] },
  ];

  return (
    <Box sx={{ p: 3, backgroundColor: COLORS.neutral.gray50, minHeight: "100vh" }}>
      <Container maxWidth="lg">
        <PageTitle
          title="Billing & Subscription"
          subtitle="Manage your subscription plan, payment methods, and billing history"
          icon={<CreditCardIcon sx={{ fontSize: "2rem" }} />}
          color={COLORS.accent.main}
        />

      <Grid container spacing={3}>
        {/* Current Subscription */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              border: `1px solid ${COLORS.neutral.gray200}`,
              borderRadius: 2,
              p: 3,
              backgroundColor: COLORS.neutral.white,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={600} sx={{ color: COLORS.primary.dark }}>
                Current Subscription
              </Typography>
              <Chip
                label={subscription.status}
                color={subscription.status === "active" ? "success" : "default"}
                size="small"
              />
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Plan Name
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {subscription.plan_name}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Price
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  ${subscription.price.toFixed(2)}/{subscription.billing_cycle === "monthly" ? "mo" : "yr"}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" color="text.secondary">
                  Billing Cycle
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {subscription.billing_cycle.charAt(0).toUpperCase() + subscription.billing_cycle.slice(1)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Subscription Plans */}
        <Grid item xs={12}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: COLORS.primary.dark }}>
            Available Plans
          </Typography>
          <Grid container spacing={3}>
            {subscriptionPlans.map((plan) => (
              <Grid item xs={12} md={4} key={plan.name}>
                <Card
                  elevation={subscription.plan_name === plan.name ? 4 : 0}
                  sx={{
                    border: `2px solid ${subscription.plan_name === plan.name ? COLORS.primary.main : COLORS.neutral.gray200}`,
                    borderRadius: 2,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    backgroundColor: COLORS.neutral.white,
                    boxShadow: subscription.plan_name === plan.name
                      ? `0 4px 12px ${COLORS.primary.main}40`
                      : `0 2px 8px ${COLORS.neutral.gray300}`,
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: `0 8px 16px ${COLORS.neutral.gray300}`,
                    },
                  }}
                >
                  {subscription.plan_name === plan.name && (
                    <Chip
                      icon={<StarIcon />}
                      label="Current Plan"
                      color="primary"
                      sx={{ position: "absolute", top: 16, right: 16 }}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" fontWeight={700} sx={{ mb: 1, color: COLORS.primary.dark }}>
                      {plan.name}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} sx={{ mb: 2, color: COLORS.primary.main }}>
                      ${plan.price.toFixed(2)}
                      <Typography component="span" variant="body2" color="text.secondary">
                        /month
                      </Typography>
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ mb: 3 }}>
                      {plan.features.map((feature, idx) => (
                        <Typography key={idx} variant="body2" sx={{ mb: 1, display: "flex", alignItems: "center" }}>
                          <CheckCircleIcon sx={{ fontSize: 16, color: COLORS.success.main, mr: 1 }} />
                          {feature}
                        </Typography>
                      ))}
                    </Box>
                    {subscription.plan_name !== plan.name && (
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={() => handleUpgradePlan(plan.name, plan.price, "monthly")}
                        disabled={loading}
                        sx={{
                          bgcolor: COLORS.primary.main,
                          "&:hover": { bgcolor: COLORS.primary.dark },
                        }}
                      >
                        {plan.price === 0 ? "Select Free Plan" : plan.price < subscription.price ? "Downgrade" : "Upgrade"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Payment Methods */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              border: `1px solid ${COLORS.neutral.gray200}`,
              borderRadius: 2,
              p: 3,
              backgroundColor: COLORS.neutral.white,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight={600} sx={{ color: COLORS.primary.dark }}>
                Payment Methods
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setAddPaymentDialogOpen(true)}
                sx={{ borderColor: COLORS.primary.main, color: COLORS.primary.main }}
              >
                Add Payment Method
              </Button>
            </Stack>
            <Divider sx={{ my: 2 }} />
            {paymentMethods.length === 0 ? (
              <Alert severity="info">No payment methods added yet. Add one to get started.</Alert>
            ) : (
              <Grid container spacing={2}>
                {paymentMethods.map((method) => (
                  <Grid item xs={12} md={6} key={method.id}>
                    <Card
                      elevation={0}
                      sx={{
                        border: `1px solid ${method.is_default ? COLORS.primary.main : COLORS.neutral.gray200}`,
                        borderRadius: 2,
                        p: 2,
                        backgroundColor: COLORS.neutral.white,
                        boxShadow: `0 2px 8px ${COLORS.neutral.gray300}`,
                        transition: "border-color 0.2s, box-shadow 0.2s",
                        "&:hover": {
                          borderColor: COLORS.primary.main,
                          boxShadow: `0 4px 12px ${COLORS.neutral.gray300}`,
                        },
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                            <CreditCardIcon sx={{ color: COLORS.primary.main }} />
                            <Typography variant="h6" fontWeight={600}>
                              {method.card_type} •••• {method.last_four}
                            </Typography>
                            {method.is_default && (
                              <Chip label="Default" size="small" color="primary" />
                            )}
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            Expires {method.expiry_month}/{method.expiry_year}
                          </Typography>
                        </Box>
                        <IconButton
                          onClick={() => handleDeletePaymentMethod(method.id)}
                          disabled={loading}
                          sx={{ color: COLORS.secondary.main }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>

        {/* Billing History */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              border: `1px solid ${COLORS.neutral.gray200}`,
              borderRadius: 2,
              p: 3,
              backgroundColor: COLORS.neutral.white,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <ReceiptIcon sx={{ color: COLORS.primary.main }} />
              <Typography variant="h6" fontWeight={600} sx={{ color: COLORS.primary.dark }}>
                Billing History
              </Typography>
            </Stack>
            <Divider sx={{ my: 2 }} />
            {billingHistory.length === 0 ? (
              <Alert severity="info">No billing history available yet.</Alert>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice ID</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {billingHistory.map((invoice) => (
                      <TableRow key={invoice.invoice_id}>
                        <TableCell>#{invoice.invoice_id}</TableCell>
                        <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                        <TableCell>{invoice.description}</TableCell>
                        <TableCell align="right">${invoice.amount.toFixed(2)}</TableCell>
                        <TableCell align="center">
                          <Chip
                            icon={getStatusIcon(invoice.status)}
                            label={invoice.status}
                            size="small"
                            sx={{
                              bgcolor: `${getStatusColor(invoice.status)}20`,
                              color: getStatusColor(invoice.status),
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Add Payment Method Dialog */}
      <Dialog open={addPaymentDialogOpen} onClose={() => setAddPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Payment Method</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Card Type"
                value={newPaymentMethod.card_type}
                onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, card_type: e.target.value })}
              >
                <MenuItem value="Visa">Visa</MenuItem>
                <MenuItem value="Mastercard">Mastercard</MenuItem>
                <MenuItem value="American Express">American Express</MenuItem>
                <MenuItem value="Discover">Discover</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Last Four Digits"
                value={newPaymentMethod.last_four}
                onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, last_four: e.target.value })}
                inputProps={{ maxLength: 4 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="Expiry Month"
                value={newPaymentMethod.expiry_month}
                onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, expiry_month: e.target.value })}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <MenuItem key={month} value={month}>
                    {month.toString().padStart(2, "0")}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="Expiry Year"
                value={newPaymentMethod.expiry_year}
                onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, expiry_year: e.target.value })}
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setNewPaymentMethod({ ...newPaymentMethod, is_default: !newPaymentMethod.is_default })}
                sx={{
                  borderColor: newPaymentMethod.is_default ? COLORS.primary.main : COLORS.neutral.gray300,
                  color: newPaymentMethod.is_default ? COLORS.primary.main : COLORS.neutral.gray600,
                }}
              >
                {newPaymentMethod.is_default ? "Set as Default" : "Set as Default Payment Method"}
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddPaymentDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddPaymentMethod}
            variant="contained"
            disabled={loading}
            sx={{
              bgcolor: COLORS.primary.main,
              "&:hover": { bgcolor: COLORS.primary.dark },
            }}
          >
            Add Payment Method
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </Box>
  );
};

export default Billing;

