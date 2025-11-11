import React from "react";
import { NavLink } from "react-router-dom";
import "./Sidebar.css";


function Sidebar() {
  return (
    <div className="sidebar">
      <h2>SoftScale</h2>
      <ul>
        <li>
          <NavLink to="/" className={({ isActive }) => isActive ? "active" : ""}>
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink to="/talent-match" className={({ isActive }) => isActive ? "active" : ""}>
            Talent Match
          </NavLink>
        </li>
        <li>
          <NavLink to="/proposal-generation" className={({ isActive }) => isActive ? "active" : ""}>
            Proposal Generation
          </NavLink>
        </li>
        <li><NavLink to="/sentiment-analysis">Sentiment Analysis</NavLink></li>
        <li><NavLink to="/price-prediction">Price Prediction</NavLink></li>
        <li><NavLink to="/crm">CRM</NavLink></li>
      </ul>
    </div>
  );
}

export default Sidebar;
