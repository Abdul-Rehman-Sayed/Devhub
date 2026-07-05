import React from "react";
import { Link } from "react-router-dom";
import "./navbar.css";

const Navbar = () => {
  return (
    <nav className="navbar">
      <Link to="/dashboard" className="navbar-brand">
        <img
          className="navbar-logo"
          src="/favicon.png"
          alt="Logo"
        />
        <span className="navbar-title">Devhub</span>
      </Link>

      <div className="navbar-links">
        <Link to="/create" className="navbar-link navbar-link-primary">
          <span className="navbar-link-text">New Repository</span>
        </Link>
        <Link to="/profile" className="navbar-link">
          <span className="navbar-link-text">Profile</span>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;