import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../../index.css";
import { extractErrorMessage } from "../../utils/errorHandler";
import { API_BASE } from "config";
import { DOMAINS, EXPERIENCE_LEVELS, GENDERS, JOB_TYPES_FORM } from "../../constants";

const JobSeekerForm = () => {
  const navigate = useNavigate();
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

  // Debugging: Log education and past_jobs state on change
  useEffect(() => {
    console.log("Education state:", formData.education, "Type:", typeof formData.education);
    console.log("Past jobs state:", formData.past_jobs, "Type:", typeof formData.past_jobs);
  }, [formData.education, formData.past_jobs]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
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
      alert("Job Seeker profile created successfully!");
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
        <h2>Job Seeker Profile</h2>
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
          <input name="phone_number" placeholder="Phone Number" value={formData.phone_number} onChange={handleChange} required />
          <input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
          <input name="linkedin_url" placeholder="LinkedIn URL" value={formData.linkedin_url} onChange={handleChange} />
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
          {Array.isArray(formData.education) &&
            formData.education.map((edu, index) => (
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
          <input name="degree" placeholder="Degree" value={formData.degree} onChange={handleChange} />
          <input name="graduation_year" type="number" placeholder="Graduation Year" value={formData.graduation_year} onChange={handleChange} />
          <input name="university" placeholder="University" value={formData.university} onChange={handleChange} />
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
          <input
            name="expected_salary"
            type="number"
            step="0.01"
            placeholder="Expected Salary"
            value={formData.expected_salary}
            onChange={handleChange}
          />
          <select
            name="job_type"
            value={formData.job_type}
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
            <option value="">Select Job Type</option>
            {JOB_TYPES_FORM.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
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
          {Array.isArray(formData.past_jobs) &&
            formData.past_jobs.map((job, index) => (
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
              Selected file: {formData.resume_file.name} ({(formData.resume_file.size / 1024).toFixed(2)} KB)
            </p>
          )}
          <button type="submit" className="btn-primary" style={{ marginTop: 12 }} disabled={loading}>
            {loading ? "Creating..." : "Create Job Seeker Profile"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default JobSeekerForm;