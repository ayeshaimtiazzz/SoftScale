import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button, CircularProgress, Box } from "@mui/material";
import { ArrowForward } from "@mui/icons-material";
import "../../index.css";
import { extractErrorMessage } from "../../utils/errorHandler";
import { API_BASE } from "config";
import { DOMAINS } from "../../constants";
import { COLORS } from "../../constants/colors";
import { useToast } from "../../providers/ToastProvider";

const CompanyForm = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    company_name: "",
    company_description: "",
    country: "",
    city: "",
    company_size: "",
    domain: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Get user_id from localStorage
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const user_id = currentUser.user_id;
    if (!user_id) {
      setError("User not found. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/create-company-profile`, {
        user_id,
        ...formData,
      });
      showToast("Company profile created successfully!", "success");
      navigate("/dashboard"); // Adjust route as needed
    } catch (err) {
      const msg = extractErrorMessage(err) || "Failed to create profile.";
      setError(msg);
      showToast(msg, "error");
      // Note: formData is preserved on error - fields are not cleared
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h1 className="heading">SoftScale</h1>
      <div className="form-box">
        <h2>Company Admin Profile</h2>
        {error && <div style={{ color: "#cc3b3b", marginBottom: 12 }}>{error}</div>}
        <form onSubmit={handleSubmit} className="form-grid">
          <div>
            <input name="company_name" placeholder="Company Name" value={formData.company_name} onChange={handleChange} required />
          </div>
          <div className="form-grid-full">
            <textarea
              name="company_description"
              placeholder="Company Description"
              value={formData.company_description}
              onChange={handleChange}
              rows={4}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ccc",
                marginTop: 8,
              }}
              required
            />
          </div>
          <div>
            <select
              name="domain"
              value={formData.domain}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ccc",
                background: "#fff",
              }}
              required
            >
              <option value="">Select domain</option>
              {DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <input name="country" placeholder="Country" value={formData.country} onChange={handleChange} />
          </div>
          <div>
            <input name="city" placeholder="City" value={formData.city} onChange={handleChange} />
          </div>
          <div>
            <input name="company_size" placeholder="Company Size (e.g., 50-200)" value={formData.company_size} onChange={handleChange} />
          </div>
          <div className="form-grid-full">
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                endIcon={loading ? <CircularProgress size={20} /> : <ArrowForward />}
                sx={{
                  background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.dark} 100%)`,
                  px: 4,
                  py: 1.5,
                  fontSize: "15px",
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                  boxShadow: "0 4px 14px rgba(30, 41, 59, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)",
                  "&:hover": {
                    boxShadow: "0 8px 28px rgba(30, 41, 59, 0.5), 0 4px 8px rgba(0, 0, 0, 0.15)",
                    transform: "translateY(-2px) scale(1.02)",
                    background: `linear-gradient(135deg, ${COLORS.primary.dark} 0%, ${COLORS.primary.darker} 100%)`,
                  },
                  "&:active": {
                    transform: "translateY(0) scale(0.98)",
                  },
                  "&:disabled": {
                    background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.dark} 100%)`,
                  },
                }}
              >
                {loading ? "Creating..." : "Create Company"}
              </Button>
            </Box>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyForm;
