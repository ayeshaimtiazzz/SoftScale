import React from "react";
import { useNavigate } from "react-router-dom";
import "./TopCandidates.css"; // reuse same styles for consistent UI

// Hardcoded data for freelancers/job_seekers
const sampleJobs = [
  {
    title: "Frontend Developer",
    domain: "Web Development",
    skills: "React, TailwindCSS, REST APIs",
    budget: "$2,000 - $3,000",
  },
  {
    title: "Data Analyst",
    domain: "Data Science",
    skills: "Python, Pandas, PowerBI",
    budget: "$1,500 - $2,200",
  },
  {
    title: "Mobile App Designer",
    domain: "UI/UX",
    skills: "Figma, Flutter UI",
    budget: "$1,200",
  },
  {
    title: "Machine Learning Engineer",
    domain: "AI & ML",
    skills: "TensorFlow, Scikit-learn",
    budget: "$2,800",
  },
  {
    title: "Full Stack Developer",
    domain: "Software Engineering",
    skills: "Node.js, React, MongoDB",
    budget: "$2,500",
  },
];

const TopJobsProjects = ({ jobsProjects = [], isCompanyAdmin = false }) => {
  const navigate = useNavigate();

  // Determine data source: fetched (company) or hardcoded (freelancers/job_seekers)
  const dataToShow = (jobsProjects && jobsProjects.length > 0) ? jobsProjects : sampleJobs;

  const handleClick = (item) => {
    if (isCompanyAdmin && item.type && item.id) {
      // For company admins: Store selected post and navigate to talent match
      localStorage.setItem("selectedPost", JSON.stringify({ type: item.type, id: item.id, title: item.title }));
      navigate("/talent-match");
    }
    // For freelancers/job_seekers: No action (hardcoded, no click)
  };

  return (
    <div className="top-candidates">
      <h2>Jobs & Projects</h2>
      <div className="candidates-list">
        {dataToShow.map((item, index) => (
          <div
            className="candidate-card"
            key={index}
            onClick={() => handleClick(item)}
            style={{ cursor: isCompanyAdmin ? "pointer" : "default" }}
          >
            <div className="candidate-placeholder">
              {item.title.slice(0, 2).toUpperCase()}
            </div>
            <div className="candidate-info">
              <p className="candidate-name">{item.title}</p>
              <p className="candidate-skills">{item.skills || item.domain}</p> {/* Use skills for hardcoded, domain for fetched */}
            </div>
            <div className="candidate-match">
              <p className="match-percent">{item.domain || "General"}</p>
              <p className="status">{item.budget || "Click to find matches"}</p> {/* Budget for hardcoded, hint for company */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopJobsProjects;
