import React, { useState, useEffect } from "react";  // Added useEffect for debugging
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../../index.css";
import { extractErrorMessage } from "../../utils/errorHandler";
import { API_BASE } from "config";
import { DOMAINS, EXPERIENCE_LEVELS, GENDERS, WORK_MODES } from "../../constants";

const AVAILABILITIES = ["full-time", "part-time", "freelance", "not available"];

const FreelancerForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: "",
    gender: "",
    country: "",
    city: "",
    date_of_birth: "",
    email: "",
    phone_number: "",
    linkedin_url: "",
    degree: "",
    graduation_year: "",
    experience_year: "",
    experience_level: "",
    professional_summary: "",
    certifications: "",
    portfolio: "",
    skills: "",
    domain: "",
    work_preference: "",
    availability: "",
    hourly_rate: "",
    projects: [], // MUST be an empty array
    resume_file: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Debugging: Log projects state on change
  useEffect(() => {
    console.log("Projects state:", formData.projects, "Type:", typeof formData.projects);
  }, [formData.projects]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "resume_file") {
      const file = files[0];
      if (file) {
        // Basic validation
        if (!["text/plain", "application/pdf"].includes(file.type)) {
          alert("Please select a .txt or .pdf file.");
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          // 5MB limit
          alert("File size must be less than 5MB.");
          return;
        }
        console.log("File selected:", file.name, "Type:", file.type, "Size:", file.size); // Debug log
        setFormData({ ...formData, [name]: file });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  // Handle project changes
  const handleProjectChange = (index, field, value) => {
    const updatedProjects = [...formData.projects];
    updatedProjects[index][field] = value;
    setFormData({ ...formData, projects: updatedProjects });
  };

  // Add a new project
  const addProject = () => {
    setFormData({
      ...formData,
      projects: [...formData.projects, { project_name: "", description: "" }],
    });
  };

  // Remove a project
  const removeProject = (index) => {
    const updatedProjects = formData.projects.filter((_, i) => i !== index);
    setFormData({ ...formData, projects: updatedProjects });
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

    // Validate file type
    if (formData.resume_file && !["text/plain", "application/pdf"].includes(formData.resume_file.type)) {
      setError("Resume must be a .txt or .pdf file.");
      setLoading(false);
      return;
    }

    // Prepare data: projects is already an array, send as JSON string
    const dataToSend = new FormData();
    dataToSend.append("user_id", user_id);
    dataToSend.append("full_name", formData.full_name);
    dataToSend.append("gender", formData.gender);
    dataToSend.append("country", formData.country);
    dataToSend.append("city", formData.city);
    dataToSend.append("date_of_birth", formData.date_of_birth);
    dataToSend.append("email", formData.email);
    dataToSend.append("phone_number", formData.phone_number);
    dataToSend.append("linkedin_url", formData.linkedin_url);
    dataToSend.append("degree", formData.degree);
    dataToSend.append("graduation_year", formData.graduation_year ? parseInt(formData.graduation_year) : "");
    dataToSend.append("experience_year", formData.experience_year ? parseInt(formData.experience_year) : "");
    dataToSend.append("experience_level", formData.experience_level);
    dataToSend.append("professional_summary", formData.professional_summary);
    dataToSend.append("certifications", formData.certifications);
    dataToSend.append("portfolio", formData.portfolio);
    dataToSend.append("skills", formData.skills);
    dataToSend.append("domain", formData.domain);
    dataToSend.append("work_preference", formData.work_preference);
    dataToSend.append("availability", formData.availability);
    dataToSend.append("hourly_rate", formData.hourly_rate ? parseFloat(formData.hourly_rate) : "");
    dataToSend.append("projects", JSON.stringify(formData.projects)); // Send as JSON string
    if (formData.resume_file) {
      dataToSend.append("resume_file", formData.resume_file);
    }

    try {
      const response = await axios.post(`${API_BASE}/create-freelancer-profile`, dataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Freelancer profile created successfully!");
      navigate("/dashboard");
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
        <h2>Freelancer Profile</h2>
        {error && <div style={{ color: "#cc3b3b", marginBottom: 12 }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <input name="full_name" placeholder="Full Name" value={formData.full_name} onChange={handleChange} required />
          <select
            name="gender"
            value={formData.gender}
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
            <option value="">Select Gender</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <input name="country" placeholder="Country" value={formData.country} onChange={handleChange} />
          <input name="city" placeholder="City" value={formData.city} onChange={handleChange} />
          <input name="date_of_birth" type="date" placeholder="Date of Birth" value={formData.date_of_birth} onChange={handleChange} />
          <input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
          <input name="phone_number" placeholder="Phone Number" value={formData.phone_number} onChange={handleChange} required />
          <input name="linkedin_url" placeholder="LinkedIn URL" value={formData.linkedin_url} onChange={handleChange} />
          <input name="degree" placeholder="Degree" value={formData.degree} onChange={handleChange} />
          <input name="graduation_year" type="number" placeholder="Graduation Year" value={formData.graduation_year} onChange={handleChange} />
          <input name="experience_year" type="number" placeholder="Experience (years)" value={formData.experience_year} onChange={handleChange} />
          <select
            name="experience_level"
            value={formData.experience_level}
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
            <option value="">Select Experience Level</option>
            {EXPERIENCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <textarea
            name="professional_summary"
            placeholder="Professional Summary"
            value={formData.professional_summary}
            onChange={handleChange}
            rows={4}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
              marginTop: 8,
            }}
          />
          <textarea
            name="certifications"
            placeholder="Certifications"
            value={formData.certifications}
            onChange={handleChange}
            rows={3}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
              marginTop: 8,
            }}
          />
          <textarea
            name="portfolio"
            placeholder="Portfolio"
            value={formData.portfolio}
            onChange={handleChange}
            rows={3}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
              marginTop: 8,
            }}
          />
          <textarea
            name="skills"
            placeholder="Skills (comma separated)"
            value={formData.skills}
            onChange={handleChange}
            rows={3}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
              marginTop: 8,
            }}
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
            Domain
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
            <option value="">Select Domain</option>
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            name="work_preference"
            value={formData.work_preference}
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
            <option value="">Select Work Preference</option>
            {WORK_MODES.map((pref) => (
              <option key={pref} value={pref}>
                {pref}
              </option>
            ))}
          </select>
          <select
            name="availability"
            value={formData.availability}
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
            <option value="">Select Availability</option>
            {AVAILABILITIES.map((avail) => (
              <option key={avail} value={avail}>
                {avail}
              </option>
            ))}
          </select>
          <input name="hourly_rate" type="number" step="0.01" placeholder="Hourly Rate ($)" value={formData.hourly_rate} onChange={handleChange} />
          <label
            style={{
              display: "block",
              marginTop: 8,
              marginBottom: 6,
              color: "#333",
              fontSize: 14,
            }}
          >
            Projects
          </label>
          {Array.isArray(formData.projects) &&
            formData.projects.map((project, index) => (
              <div
                key={index}
                style={{
                  marginBottom: 10,
                  border: "1px solid #ccc",
                  padding: 10,
                  borderRadius: 8,
                }}
              >
                <input
                  placeholder="Project Name"
                  value={project.project_name || ""}
                  onChange={(e) => handleProjectChange(index, "project_name", e.target.value)}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    marginBottom: 8,
                  }}
                />
                <input
                  placeholder="Project Description"
                  value={project.description || ""}
                  onChange={(e) => handleProjectChange(index, "description", e.target.value)}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    marginBottom: 8,
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeProject(index)}
                  style={{
                    background: "#cc3b3b",
                    color: "#fff",
                    border: "none",
                    padding: 5,
                    borderRadius: 4,
                  }}
                >
                  Remove Project
                </button>
              </div>
            ))}
          <button
            type="button"
            onClick={addProject}
            style={{
              background: "#28a745",
              color: "#fff",
              border: "none",
              padding: 10,
              borderRadius: 8,
              marginTop: 8,
            }}
          >
            + Add Project
          </button>
          <label
            style={{
              display: "block",
              marginTop: 8,
              marginBottom: 6,
              color: "#333",
              fontSize: 14,
            }}
          >
            Upload Resume (.txt or .pdf)
          </label>
          <input
            name="resume_file"
            type="file"
            accept=".txt,.pdf"
            onChange={handleChange}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
              marginTop: 8,
            }}
          />
          {formData.resume_file && (
            <p style={{ marginTop: 5, fontSize: 12, color: "#28a745" }}>
              Selected file: {formData.resume_file.name}({(formData.resume_file.size / 1024).toFixed(2)} KB)
            </p>
          )}
          <button type="submit" className="btn-primary" style={{ marginTop: 12 }} disabled={loading}>
            {loading ? "Creating..." : "Create Freelancer Profile"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FreelancerForm;
