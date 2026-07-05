import React from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../authContext";
import "./landing.css";

const features = [
  {
    title: "Repositories",
    text: "Create public or private repositories and manage them in one place.",
  },
  {
    title: "Issues",
    text: "Open, track, and close issues to keep your work organized.",
  },
  {
    title: "Stars and follows",
    text: "Star the repositories you like and follow other developers.",
  },
];

const Landing = () => {
  const { currentUser } = useAuth();

  if (currentUser) return <Navigate to="/dashboard" replace />;

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-brand">
          <img className="landing-logo" src="/favicon.png" alt="Devhub" />
          <span className="landing-brand-name">Devhub</span>
        </div>
        <div className="landing-header-actions">
          <Link to="/auth" className="landing-btn landing-btn-ghost">
            Sign in
          </Link>
          <Link to="/signup" className="landing-btn landing-btn-primary">
            Sign up
          </Link>
        </div>
      </header>

      <main className="landing-hero">
        <h1 className="landing-title">Where developers build together</h1>
        <p className="landing-subtitle">
          Devhub is a lightweight home for your code, your issues, and the
          developers you follow.
        </p>
        <div className="landing-cta">
          <Link
            to="/signup"
            className="landing-btn landing-btn-primary landing-btn-lg"
          >
            Get started
          </Link>
          <Link
            to="/auth"
            className="landing-btn landing-btn-ghost landing-btn-lg"
          >
            Sign in
          </Link>
        </div>

        <div className="landing-features">
          {features.map((f) => (
            <div className="landing-feature" key={f.title}>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-text">{f.text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="landing-footer">
        <span>Devhub</span>
      </footer>
    </div>
  );
};

export default Landing;
