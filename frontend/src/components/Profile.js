import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import './Profile.css'; // Import the new CSS
import { API_BASE } from "../config";

const Profile = () => {
  const location = useLocation();
  const { item, role } = location.state || {}; // Correctly destructure item and role
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Determine id and type from item and role
  const id = item?.id; // Extract id from item
  let type = "";
  if (role === "company" || role === "company_admin") {
    type = "candidate";
  } else if (role === "freelancer") {
    type = item?.title ? "project" : "job"; // Heuristic: if title exists, it's a project; else job
  } else if (role === "jobseeker") {
    type = "job";
  }

  useEffect(() => {
    console.log("Location state:", location.state); // Debugging: Check what's passed
    console.log("Extracted id:", id, "type:", type); // Debugging: Check extracted values
    if (!id || !type) {
      setError("No ID or type provided.");
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/profile/${id}?type=${type}`, {
          headers: {
            "Content-Type": "application/json",
            ...(localStorage.getItem("authToken")
              ? { Authorization: `Bearer ${localStorage.getItem("authToken")}` }
              : {}),
          },
        });
        console.log("API Response:", response.data); // Debugging: Check response
        setProfileData(response.data);
      } catch (err) {
        console.error("API Error:", err.response || err); // Debugging: Log full error
        setError("Failed to load profile data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id, type]);

  // Recursive function to render profile data (handles nesting like company_info)
  const renderProfileSection = (data, prefix = "", isCompanyInfo = false) => {
    if (!data || typeof data !== 'object') return null;

    return Object.entries(data).map(([key, value]) => {
      // Skip rendering company_info here; it's handled separately
      if (key === "company_info") return null;

      // Format key: Replace underscores with spaces, capitalize words
      const formattedKey = key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

      // Handle nested objects (e.g., JSON fields like education or projects)
      if (typeof value === 'object' && value !== null) {
        return (
          <div key={key} className="profile-subsection">
            <h4>{formattedKey}</h4>
            <div className="profile-nested">
              {Array.isArray(value) ? (
                <ul>
                  {value.map((item, idx) => (
                    <li key={idx}>{typeof item === 'object' ? JSON.stringify(item, null, 2) : item}</li>
                  ))}
                </ul>
              ) : (
                renderProfileSection(value, `${formattedKey} `, false)
              )}
            </div>
          </div>
        );
      }

      // Render simple key-value pairs
      return (
        <div key={key} className="profile-field">
          <strong>{prefix + formattedKey}:</strong> <span>{value !== null && value !== undefined ? value : "N/A"}</span>
        </div>
      );
    });
  };

  // Determine title based on type
  const getTitle = () => {
    switch (type) {
      case "candidate":
        return "Candidate Profile";
      case "job":
        return "Job Details";
      case "project":
        return "Project Details";
      case "freelancer":
        return "Freelancer Profile";
      default:
        return "Profile Details";
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <h1>{getTitle()}</h1>
      {profileData ? (
        <div className="profile-content">
          {/* Main Profile Section */}
          <div className="profile-section">
            <h2>Details</h2>
            {renderProfileSection(profileData)}
          </div>

          {/* Company Information Section (only for jobs/projects) */}
          {profileData.company_info && (
            <div className="profile-section">
              <h2>Company Information</h2>
              {renderProfileSection(profileData.company_info, "", true)}
            </div>
          )}
        </div>
      ) : (
        <p>No data available.</p>
      )}
    </div>
  );
};

export default Profile;
