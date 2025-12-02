import React from "react";
import "../../components/TopCandidates.css";
import { SAMPLE_CANDIDATES } from "../../constants";

const candidates = SAMPLE_CANDIDATES;

const getInitials = (name) => {
  const parts = name.split(" ");
  return parts[0][0] + (parts[1] ? parts[1][0] : "");
};

const TopCandidates = () => {
  return (
    <div className="top-candidates">
      <h2>Top Candidates</h2>
      <div className="candidates-list">
        {candidates.map((candidate, index) => (
          <div className="candidate-card" key={index}>
            {candidate.profilePic ? (
              <img
                src={candidate.profilePic}
                alt={candidate.name}
                className="candidate-img"
              />
            ) : (
              <div className="candidate-placeholder">
                {getInitials(candidate.name)}
              </div>
            )}
            <div className="candidate-info">
              <p className="candidate-name">{candidate.name}</p>
              <p className="candidate-skills">{candidate.skills}</p>
            </div>
            <div className="candidate-match">
              <p className="match-percent">{candidate.match}% Match</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TopCandidates;


