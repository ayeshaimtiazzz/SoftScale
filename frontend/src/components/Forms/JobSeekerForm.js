import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button, CircularProgress, Box, Alert } from "@mui/material";
import { ArrowForward } from "@mui/icons-material";
import "../../index.css";
import { extractErrorMessage } from "../../utils/errorHandler";
import { API_BASE } from "config";
import { DOMAINS, EXPERIENCE_LEVELS, GENDERS, JOB_TYPES_FORM } from "../../constants";
import { COLORS } from "../../constants/colors";
import { useToast } from "../../providers/ToastProvider";

const JobSeekerForm = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    full_name: "",
    gender: "",
    country: "",
    city: "",
    date_of_birth: "",
    phone_number: "",
    email: "",
    linkedin_url: "",
    education: [], // Array of { degree_name: "", university_name: "" }
    degree: "",
    graduation_year: "",
    university: "",
    skills: "",
    career_objective: "",
    domain: "",
    contact_info: "",
    expected_salary: "",
    job_type: "",
    experience_level: "",
    past_jobs: [], // Array of { company_name: "", description: "" }
    resume_file: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Debugging: Log education and past_jobs state on change
  useEffect(() => {
    console.log("Education state:", formData.education, "Type:", typeof formData.education);
    console.log("Past jobs state:", formData.past_jobs, "Type:", typeof formData.past_jobs);
  }, [formData.education, formData.past_jobs]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    // Clear field error when user starts typing/selecting
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: undefined });
    }
    if (name === "resume_file") {
      const file = files[0];
      if (file) {
        if (!["text/plain", "application/pdf"].includes(file.type)) {
          alert("Please select a .txt or .pdf file.");
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          alert("File size must be less than 5MB.");
          return;
        }
        console.log("File selected:", file.name, "Type:", file.type, "Size:", file.size);
        setFormData({ ...formData, [name]: file });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // Handle education changes
  const handleEducationChange = (index, field, value) => {
    const updatedEducation = [...formData.education];
    updatedEducation[index][field] = value;
    setFormData({ ...formData, education: updatedEducation });
  };

  // Add a new education entry
  const addEducation = () => {
    setFormData({
      ...formData,
      education: [...formData.education, { degree_name: "", university_name: "" }],
    });
  };

  // Remove an education entry
  const removeEducation = (index) => {
    const updatedEducation = formData.education.filter((_, i) => i !== index);
    setFormData({ ...formData, education: updatedEducation });
  };

  // Handle past job changes
  const handlePastJobChange = (index, field, value) => {
    const updatedPastJobs = [...formData.past_jobs];
    updatedPastJobs[index][field] = value;
    setFormData({ ...formData, past_jobs: updatedPastJobs });
  };

  // Add a new past job
  const addPastJob = () => {
    setFormData({
      ...formData,
      past_jobs: [...formData.past_jobs, { company_name: "", description: "" }],
    });
  };

  // Remove a past job
  const removePastJob = (index) => {
    const updatedPastJobs = formData.past_jobs.filter((_, i) => i !== index);
    setFormData({ ...formData, past_jobs: updatedPastJobs });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const user_id = currentUser.user_id;
    if (!user_id) {
      setError("User not found. Please log in again.");
      setLoading(false);
      return;
    }

    const dataToSend = new FormData();
    dataToSend.append("user_id", user_id);
    dataToSend.append("full_name", formData.full_name);
    dataToSend.append("gender", formData.gender);
    dataToSend.append("country", formData.country);
    dataToSend.append("city", formData.city);
    dataToSend.append("date_of_birth", formData.date_of_birth);
    dataToSend.append("phone_number", formData.phone_number);
    dataToSend.append("email", formData.email);
    dataToSend.append("linkedin_url", formData.linkedin_url);
    dataToSend.append("education", JSON.stringify(formData.education)); // Send as JSON string
    dataToSend.append("degree", formData.degree);
    dataToSend.append("graduation_year", formData.graduation_year ? parseInt(formData.graduation_year) : "");
    dataToSend.append("university", formData.university);
    dataToSend.append("skills", formData.skills);
    dataToSend.append("career_objective", formData.career_objective);
    dataToSend.append("domain", formData.domain);
    dataToSend.append("contact_info", formData.contact_info);
    dataToSend.append("expected_salary", formData.expected_salary ? parseFloat(formData.expected_salary) : "");
    dataToSend.append("job_type", formData.job_type);
    dataToSend.append("experience_level", formData.experience_level);
    dataToSend.append("past_jobs", JSON.stringify(formData.past_jobs));
    if (formData.resume_file) {
      dataToSend.append("resume_file", formData.resume_file);
    }

    try {
      const response = await axios.post(`${API_BASE}/create-job-seeker-profile`, dataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showToast("Job Seeker profile created successfully!", "success");
      navigate("/dashboard");
    } catch (err) {
      const msg = extractErrorMessage(err) || "Failed to create profile.";

      // Clear previous field errors
      setFieldErrors({});

      // Try to extract field-specific error from message
      const errorMsg = msg.toLowerCase();
      if (errorMsg.includes("job type") || errorMsg.includes("job_type")) {
        setFieldErrors({ job_type: "Please select a valid job type option." });
      } else if (errorMsg.includes("linkedin")) {
        setFieldErrors({ linkedin_url: "LinkedIn URL must be a valid URL (starting with http:// or https://) or left empty." });
      } else if (errorMsg.includes("email")) {
        setFieldErrors({ email: "Email is required or invalid." });
      } else if (errorMsg.includes("phone")) {
        setFieldErrors({ phone_number: "Phone number is required." });
      } else {
        // General error
        setError(msg);
      }

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
        <h2>Job Seeker Profile</h2>
        {error && <div style={{ color: "#cc3b3b", marginBottom: 12 }}>{error}</div>}
        <form onSubmit={handleSubmit} className="form-grid">
          <div>
            <input name="full_name" placeholder="Full Name" value={formData.full_name} onChange={handleChange} required />
          </div>
          <div>
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
          </div>
          <div>
            <input name="country" placeholder="Country" value={formData.country} onChange={handleChange} />
          </div>
          <div>
            <input name="city" placeholder="City" value={formData.city} onChange={handleChange} />
          </div>
          <div>
            <input name="date_of_birth" type="date" placeholder="Date of Birth" value={formData.date_of_birth} onChange={handleChange} />
          </div>
          <div>
            <input name="phone_number" placeholder="Phone Number" value={formData.phone_number} onChange={handleChange} required />
            {fieldErrors.phone_number && <Alert severity="error">{fieldErrors.phone_number}</Alert>}
          </div>
          <div>
            <input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
            {fieldErrors.email && <Alert severity="error">{fieldErrors.email}</Alert>}
          </div>
          <div>
            <input name="linkedin_url" placeholder="LinkedIn URL" value={formData.linkedin_url} onChange={handleChange} />
            {fieldErrors.linkedin_url && <Alert severity="error">{fieldErrors.linkedin_url}</Alert>}
          </div>
          <div className="form-grid-full">
            <label
              style={{
                display: "block",
                marginTop: 8,
                marginBottom: 6,
                color: "#333",
                fontSize: 14,
              }}
            >
              Education
            </label>
          </div>
          {Array.isArray(formData.education) &&
            formData.education.map((edu, index) => (
              <div
                key={index}
                className="form-grid-full"
                style={{
                  marginBottom: 10,
                  border: "1px solid #ccc",
                  padding: 10,
                  borderRadius: 8,
                }}
              >
                <input
                  placeholder="Degree Name"
                  value={edu.degree_name || ""}
                  onChange={(e) => handleEducationChange(index, "degree_name", e.target.value)}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    marginBottom: 8,
                  }}
                />
                <input
                  placeholder="University Name"
                  value={edu.university_name || ""}
                  onChange={(e) => handleEducationChange(index, "university_name", e.target.value)}
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
                  onClick={() => removeEducation(index)}
                  style={{
                    background: "#cc3b3b",
                    color: "#fff",
                    border: "none",
                    padding: 5,
                    borderRadius: 4,
                  }}
                >
                  Remove Education
                </button>
              </div>
            ))}
          <div className="form-grid-full">
            <button
              type="button"
              onClick={addEducation}
              style={{
                background: "#28a745",
                color: "#fff",
                border: "none",
                padding: 10,
                borderRadius: 8,
                marginTop: 8,
              }}
            >
              + Add Education
            </button>
          </div>
          <div>
            <input name="degree" placeholder="Degree" value={formData.degree} onChange={handleChange} />
          </div>
          <div>
            <input name="graduation_year" type="number" placeholder="Graduation Year" value={formData.graduation_year} onChange={handleChange} />
          </div>
          <div>
            <input name="university" placeholder="University" value={formData.university} onChange={handleChange} />
          </div>
          <div className="form-grid-full">
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
          </div>
          <div className="form-grid-full">
            <textarea
              name="career_objective"
              placeholder="Career Objective"
              value={formData.career_objective}
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
              <option value="">Select Domain</option>
              {DOMAINS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="form-grid-full">
            <textarea
              name="contact_info"
              placeholder="Contact Info"
              value={formData.contact_info}
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
          </div>
          <div>
            <input
              name="expected_salary"
              type="number"
              step="0.01"
              placeholder="Expected Salary"
              value={formData.expected_salary}
              onChange={handleChange}
            />
          </div>
          <div>
            <select
              name="job_type"
              value={formData.job_type}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: fieldErrors.job_type ? "1px solid #cc3b3b" : "1px solid #ccc",
                background: "#fff",
              }}
              required
            >
              <option value="">Select Job Type</option>
              {JOB_TYPES_FORM.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {fieldErrors.job_type && <Alert severity="error">{fieldErrors.job_type}</Alert>}
          </div>
          <div>
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
          </div>
          <div className="form-grid-full">
            <label
              style={{
                display: "block",
                marginTop: 8,
                marginBottom: 6,
                color: "#333",
                fontSize: 14,
              }}
            >
              Past Jobs
            </label>
          </div>
          {Array.isArray(formData.past_jobs) &&
            formData.past_jobs.map((job, index) => (
              <div
                key={index}
                className="form-grid-full"
                style={{
                  marginBottom: 10,
                  border: "1px solid #ccc",
                  padding: 10,
                  borderRadius: 8,
                }}
              >
                <input
                  placeholder="Company Name"
                  value={job.company_name || ""}
                  onChange={(e) => handlePastJobChange(index, "company_name", e.target.value)}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 8,
                    border: "1px solid #ccc",
                    marginBottom: 8,
                  }}
                />
                <input
                  placeholder="Job Description"
                  value={job.description || ""}
                  onChange={(e) => handlePastJobChange(index, "description", e.target.value)}
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
                  onClick={() => removePastJob(index)}
                  style={{
                    background: "#cc3b3b",
                    color: "#fff",
                    border: "none",
                    padding: 5,
                    borderRadius: 4,
                  }}
                >
                  Remove Job
                </button>
              </div>
            ))}
          <div className="form-grid-full">
            <button
              type="button"
              onClick={addPastJob}
              style={{
                background: "#28a745",
                color: "#fff",
                border: "none",
                padding: 10,
                borderRadius: 8,
                marginTop: 8,
              }}
            >
              + Add Past Job
            </button>
          </div>
          <div className="form-grid-full">
            <label className="form-label">Upload Resume (.txt or .pdf)</label>
            <input name="resume_file" type="file" accept=".txt,.pdf" onChange={handleChange} />
            {formData.resume_file && (
              <p style={{ marginTop: 5, fontSize: 12, color: "#28a745" }}>
                Selected file: {formData.resume_file.name} ({(formData.resume_file.size / 1024).toFixed(2)} KB)
              </p>
            )}
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
                {loading ? "Creating..." : "Create Job Seeker Profile"}
              </Button>
            </Box>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobSeekerForm;