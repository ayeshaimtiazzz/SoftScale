import React, { useState, useRef, useEffect } from "react";
import "./Header.css";
import { useNavigate } from "react-router-dom";

function Header() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  let user = { name: "User", role: "", profilePic: "" };
  try {
    const cu = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (cu) {
      user.name = cu.name || (cu.email ? cu.email.split("@")[0] : "User");
      user.role = cu.role ? cu.role.charAt(0).toUpperCase() + cu.role.slice(1) : "";
      user.profilePic = cu.profilePic || "";
    }
  } catch (e) {
    console.warn("Error reading currentUser:", e);
  }

  const getInitials = (name) => (name ? name.charAt(0).toUpperCase() : "U");

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="header">
      {/* Search bar */}
      <div className="search-container">
        <input type="text" placeholder="Search candidates or clients..." />
      </div>

      {/* Profile Section */}
      <div
        className="profile-container"
        ref={dropdownRef}
        onClick={() => setDropdownOpen(!dropdownOpen)}
      >
        <div className="profile-info">
          {user.profilePic ? (
            <img src={user.profilePic} alt="Profile" className="profile-img" />
          ) : (
            <div className="profile-placeholder profile-placeholder-pink">
              {getInitials(user.name)}
            </div>
          )}

          <div className="profile-text">
            <span className="profile-name">{user.name}</span>
            <span className="profile-role">{user.role}</span>
          </div>
        </div>

        {dropdownOpen && (
          <ul className="profile-dropdown">
            <li>My Account</li>
            <li>Profile</li>
            <li>Billing</li>
            <li
              onClick={() => {
                localStorage.removeItem("authToken");
                localStorage.removeItem("currentUser");
                localStorage.removeItem("profileCreated");
                window.location.href = "/login";
              }}
            >
              Logout
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}

export default Header;
