import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../index.css";
import { extractErrorMessage } from "../utils/errorHandler";
import { API_BASE } from "../config";

const DOMAINS = [
  "Healthcare",
  "Information Technology",
  "Software",
  "SaaS",
  "Finance",
  "Education",
  "E-commerce",
  "Marketing",
  "Manufacturing",
  "Retail",
  "Hospitality",
  "Transportation",
  "Telecommunications",
  "Real Estate",
  "Energy",
  "Energy & Utilities",
  "Automotive",
  "Agriculture",
  "Pharmaceuticals",
  "Media",
  "Media & Entertainment",
  "Entertainment",
  "Government",
  "Non-profit",
  "Legal",
  "Other",
  "Research & Development",
  "Cloud Computing",
  "Software Development",
  "Data Science",
  "Automation",
  "Web Development",
  "Mobile Apps",
  "AI & ML",
  "AI",
  "Cybersecurity",
];

const CompanyForm = () => {
  const navigate = useNavigate();
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
      alert("Company profile created successfully!");
      navigate("/dashboard"); // Adjust route as needed
    } catch (err) {
      const msg = extractErrorMessage(err) || "Failed to create profile.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h1 className="heading">SoftScale</h1>
      <div className="form-box">
        <h2>Company Admin Profile</h2>
        {error && (
          <div style={{ color: "#cc3b3b", marginBottom: 12 }}>{error}</div>
        )}
        <form onSubmit={handleSubmit}>
          <input
            name="company_name"
            placeholder="Company Name"
            value={formData.company_name}
            onChange={handleChange}
            required
          />
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
          <label
            style={{
              display: "block",
              marginTop: 8,
              marginBottom: 6,
              color: "#333",
              fontSize: 14,
            }}
          >
            Company Domain
          </label>
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
          <input
            name="country"
            placeholder="Country"
            value={formData.country}
            onChange={handleChange}
          />
          <input
            name="city"
            placeholder="City"
            value={formData.city}
            onChange={handleChange}
          />
          <input
            name="company_size"
            placeholder="Company Size (e.g., 50-200)"
            value={formData.company_size}
            onChange={handleChange}
          />
          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: 12 }}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Company"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompanyForm;
