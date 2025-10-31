import React from "react";
import "./TopCandidates.css";

const candidates = [
  {
    name: "Sarah Williams",
    skills: "React, TypeScript, Node.js",
    match: 95,
    profilePic: ""
  },
  {
    name: "Michael Chen",
    skills: "Python, ML, TensorFlow",
    match: 92,
    profilePic: ""
  },
  {
    name: "Emily Rodriguez",
    skills: "UI/UX, Figma, React",
    match: 89,
    profilePic: ""
  },
  {
    name: "David Kim",
    skills: "DevOps, AWS, Docker",
    match: 87,
    profilePic: ""
  },
  {
    name: "Lisa Johnson",
    skills: "Product, Agile, Strategy",
    match: 84,
    profilePic: ""
  },
];

const getInitials = (name) => {
  const parts = name.split(" ");
  return parts[0][0] + (parts[1] ? parts[1][0] : "");
};

function TopCandidates() {
  return (
    <div className="top-candidates">
      <h2>Top Candidates</h2>
      <div className="candidates-list">
        {candidates.map((candidate, index) => (
          <div className="candidate-card" key={index}>
            {candidate.profilePic ? (
              <img src={candidate.profilePic} alt={candidate.name} className="candidate-img" />
            ) : (
              <div className="candidate-placeholder">{getInitials(candidate.name)}</div>
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
}

export default TopCandidates;