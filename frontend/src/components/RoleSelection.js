import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "../index.css";

const RoleSelection = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get user_id from route param (passed from signup)
  const { userId } = useParams();

  const API_BASE = "http://127.0.0.1:8000";

  const handleRoleSelect = async (role) => {
    setLoading(true);
    setError("");

    try {
      await axios.post(`${API_BASE}/set-role`, {
        user_id: parseInt(userId),
        role,
      });

      // Redirect user to their dashboard or next step
      if (role === "freelancer") navigate("/freelancer-form");
      else if (role === "job_seeker") navigate("/jobseeker-form");
      else if (role === "company_admin") navigate("/company-form");
    } catch (err) {
      const msg =
        err.response?.data?.detail || "Failed to set role. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h1 className="heading">SoftScale</h1>
      <div className="form-box">
        <h2>Select Your Role</h2>
        <p>Please choose how you want to use SoftScale.</p>

        {error && <div style={{ color: "#cc3b3b", marginBottom: 12 }}>{error}</div>}

        <div className="role-buttons" style={{ marginTop: 20 }}>
          <button
            className="btn-primary"
            onClick={() => handleRoleSelect("freelancer")}
            disabled={loading}
            style={{ marginBottom: 12 }}
          >
            {loading ? "Processing..." : "Continue as Freelancer"}
          </button>

          <button
            className="btn-primary"
            onClick={() => handleRoleSelect("job_seeker")}
            disabled={loading}
            style={{ marginBottom: 12 }}
          >
            {loading ? "Processing..." : "Continue as Job Seeker"}
          </button>

          <button
            className="btn-primary"
            onClick={() => handleRoleSelect("company_admin")}
            disabled={loading}
            style={{ marginBottom: 0 }}
          >
            {loading ? "Processing..." : "Continue as Company Admin"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
