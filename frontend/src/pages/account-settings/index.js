/**
 * Account Settings Page
 * Allows users to manage their account information, security settings, and preferences
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
  Tab,
  Tabs,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
} from "@mui/material";
import {
  Person as PersonIcon,
  Lock as LockIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../providers/ToastProvider";
import { API_BASE } from "../../config";
import { API_ENDPOINTS, COLORS, STORAGE_KEYS } from "../../constants";
import PageTitle from "../../components/common/PageTitle";
import axios from "axios";
import "./styles.css";

const AccountSettings = () => {
  const location = useLocation();
  const { user, token } = useAuth();
  const { showToast } = useToast();
  // Set default tab from navigation state, default to 0 (Personal Info)
  const [activeTab, setActiveTab] = useState(location.state?.defaultTab ?? 0);
  const [loading, setLoading] = useState(false);

  // Personal Information State
  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    email: "",
  });

  // Password Change State
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Notification Preferences State
  const [notifications, setNotifications] = useState({
    email_notifications: true,
    push_notifications: true,
    billing_alerts: true,
    marketing_emails: false,
  });

  useEffect(() => {
    fetchUserDetails();
    fetchNotificationPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserDetails = async () => {
    try {
      const authToken = token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!authToken) return;

      const response = await axios.get(`${API_BASE}${API_ENDPOINTS.GET_USER_DETAILS}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.data) {
        setPersonalInfo({
          name: response.data.name || "",
          email: response.data.email || "",
        });
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const fetchNotificationPreferences = async () => {
    try {
      const authToken = token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!authToken) return;

      const response = await axios.get(`${API_BASE}${API_ENDPOINTS.GET_NOTIFICATION_PREFERENCES}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.data) {
        setNotifications(response.data);
      }
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
    }
  };

  const handlePersonalInfoUpdate = async () => {
    if (!personalInfo.name.trim() || !personalInfo.email.trim()) {
      showToast("Please fill in all fields", "error");
      return;
    }

    setLoading(true);
    try {
      const authToken = token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const response = await axios.put(
        `${API_BASE}${API_ENDPOINTS.UPDATE_USER_DETAILS}`,
        {
          name: personalInfo.name,
          email: personalInfo.email,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      // Update state with response data to keep it in sync
      if (response.data) {
        setPersonalInfo({
          name: response.data.name || personalInfo.name,
          email: response.data.email || personalInfo.email,
        });
      }

      showToast("Personal information updated successfully", "success");
      
      // Update localStorage if needed
      const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || "{}");
      if (currentUser && response.data) {
        currentUser.name = response.data.name;
        currentUser.email = response.data.email;
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Failed to update personal information";
      showToast(errorMsg, "error");
      // Don't update state on error - keep user's input
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      showToast("Please fill in all password fields", "error");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast("New passwords do not match", "error");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showToast("Password must be at least 8 characters long", "error");
      return;
    }

    setLoading(true);
    try {
      const authToken = token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      await axios.post(
        `${API_BASE}${API_ENDPOINTS.CHANGE_PASSWORD}`,
        {
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      showToast("Password changed successfully", "success");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Failed to change password";
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = async () => {
    setLoading(true);
    try {
      const authToken = token || localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      await axios.put(
        `${API_BASE}${API_ENDPOINTS.UPDATE_NOTIFICATION_PREFERENCES}`,
        notifications,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      showToast("Notification preferences updated successfully", "success");
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Failed to update notification preferences";
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  // Memoize handlers to prevent unnecessary re-renders
  const handleNameChange = useCallback((e) => {
    setPersonalInfo((prev) => ({ ...prev, name: e.target.value }));
  }, []);

  const handleEmailChange = useCallback((e) => {
    setPersonalInfo((prev) => ({ ...prev, email: e.target.value }));
  }, []);

  const handleCurrentPasswordChange = useCallback((e) => {
    setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }));
  }, []);

  const handleNewPasswordChange = useCallback((e) => {
    setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }));
  }, []);

  const handleConfirmPasswordChange = useCallback((e) => {
    setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }));
  }, []);

  const handleTogglePasswordVisibility = useCallback((field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  }, []);

  const handleNotificationChange = useCallback((field) => (e) => {
    setNotifications((prev) => ({ ...prev, [field]: e.target.checked }));
  }, []);

  // TabPanel component - memoized to prevent recreation
  const TabPanel = useMemo(() => {
    const TabPanelComponent = ({ children, value, index, ...other }) => (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`settings-tabpanel-${index}`}
        aria-labelledby={`settings-tab-${index}`}
        {...other}
        style={{ marginTop: 24 }}
      >
        {value === index && <Box>{children}</Box>}
      </div>
    );
    TabPanelComponent.displayName = "TabPanel";
    return TabPanelComponent;
  }, []);

  return (
    <Box sx={{ p: 3, backgroundColor: COLORS.neutral.gray50, minHeight: "100vh" }}>
      <Container maxWidth="lg">
        <PageTitle
          title="Account Settings"
          subtitle="Manage your account information, security settings, and preferences"
          icon={<PersonIcon sx={{ fontSize: "2rem" }} />}
          color={COLORS.primary.main}
        />

      <Paper 
        elevation={0} 
        sx={{ 
          border: `1px solid ${COLORS.neutral.gray200}`, 
          borderRadius: 2,
          backgroundColor: COLORS.neutral.white,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            borderBottom: `1px solid ${COLORS.neutral.gray200}`,
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 500,
              minHeight: 64,
            },
          }}
        >
          <Tab icon={<PersonIcon />} iconPosition="start" label="Personal Information" />
          <Tab icon={<LockIcon />} iconPosition="start" label="Security" />
          <Tab icon={<NotificationsIcon />} iconPosition="start" label="Notifications" />
        </Tabs>

        {/* Personal Information Tab */}
        <TabPanel value={activeTab} index={0}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: COLORS.primary.dark }}>
              Personal Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={personalInfo.name}
                  onChange={handleNameChange}
                  variant="outlined"
                  disabled={loading}
                  autoComplete="name"
                  key="name-field"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={personalInfo.email}
                  onChange={handleEmailChange}
                  variant="outlined"
                  disabled={loading}
                  autoComplete="email"
                  key="email-field"
                />
              </Grid>
            </Grid>
            <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                onClick={handlePersonalInfoUpdate}
                disabled={loading}
                sx={{
                  bgcolor: COLORS.primary.main,
                  "&:hover": { bgcolor: COLORS.primary.dark },
                }}
              >
                Save Changes
              </Button>
            </Box>
          </CardContent>
        </TabPanel>

        {/* Security Tab */}
        <TabPanel value={activeTab} index={1}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: COLORS.primary.dark }}>
              Change Password
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              Your password must be at least 8 characters long and contain a mix of letters and numbers.
            </Alert>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Current Password"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={handleCurrentPasswordChange}
                  variant="outlined"
                  disabled={loading}
                  key="current-password-field"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton 
                          onClick={() => handleTogglePasswordVisibility("current")}
                          edge="end"
                        >
                          {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="New Password"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={handleNewPasswordChange}
                  variant="outlined"
                  disabled={loading}
                  key="new-password-field"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton 
                          onClick={() => handleTogglePasswordVisibility("new")}
                          edge="end"
                        >
                          {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  variant="outlined"
                  disabled={loading}
                  key="confirm-password-field"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton 
                          onClick={() => handleTogglePasswordVisibility("confirm")}
                          edge="end"
                        >
                          {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
            <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                onClick={handlePasswordChange}
                disabled={loading}
                sx={{
                  bgcolor: COLORS.primary.main,
                  "&:hover": { bgcolor: COLORS.primary.dark },
                }}
              >
                Update Password
              </Button>
            </Box>
          </CardContent>
        </TabPanel>

        {/* Notifications Tab */}
        <TabPanel value={activeTab} index={2}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3, color: COLORS.primary.dark }}>
              Notification Preferences
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
              Choose how you want to be notified about updates and activities.
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.email_notifications}
                    onChange={handleNotificationChange("email_notifications")}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={500}>
                      Email Notifications
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Receive email updates about your account activity
                    </Typography>
                  </Box>
                }
              />
              <Divider />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.push_notifications}
                    onChange={handleNotificationChange("push_notifications")}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={500}>
                      Push Notifications
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Receive push notifications in your browser
                    </Typography>
                  </Box>
                }
              />
              <Divider />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.billing_alerts}
                    onChange={handleNotificationChange("billing_alerts")}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={500}>
                      Billing Alerts
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Get notified about billing and payment updates
                    </Typography>
                  </Box>
                }
              />
              <Divider />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.marketing_emails}
                    onChange={handleNotificationChange("marketing_emails")}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={500}>
                      Marketing Emails
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Receive promotional emails and product updates
                    </Typography>
                  </Box>
                }
              />
            </Box>
            <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                onClick={handleNotificationUpdate}
                disabled={loading}
                sx={{
                  bgcolor: COLORS.primary.main,
                  "&:hover": { bgcolor: COLORS.primary.dark },
                }}
              >
                Save Preferences
              </Button>
            </Box>
          </CardContent>
        </TabPanel>
      </Paper>
      </Container>
    </Box>
  );
};

export default AccountSettings;

