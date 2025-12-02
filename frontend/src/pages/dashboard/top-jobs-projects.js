import React from "react";
import { useNavigate } from "react-router-dom";
import "../../components/TopCandidates.css"; // reuse same styles for consistent UI
import { SAMPLE_JOBS } from "../../constants";

const TopJobsProjects = ({ jobsProjects = [], isCompanyAdmin = false }) => {
  const navigate = useNavigate();

  // Determine data source: fetched (company) or hardcoded (freelancers/job_seekers)
  const dataToShow =
    jobsProjects && jobsProjects.length > 0 ? jobsProjects : SAMPLE_JOBS;

  const handleClick = (item) => {
    if (isCompanyAdmin && item.type && item.id) {
      // For company admins: Store selected post and navigate to talent match
      localStorage.setItem(
        "selectedPost",
        JSON.stringify({ type: item.type, id: item.id, title: item.title })
      );
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
              <p className="candidate-skills">
                {item.skills || item.domain}
              </p>
            </div>
            <div className="candidate-match">
              <p className="match-percent">{item.domain || "General"}</p>
              <p className="status">
                {item.budget || "Click to find matches"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopJobsProjects;


