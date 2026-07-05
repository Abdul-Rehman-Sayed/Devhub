import React, { useState, useEffect } from "react";
import { useAuth } from "../../authContext";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";
import Navbar from "../Navbar";

const Dashboard = () => {
  const [repositories, setRepositories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestedRepositories, setSuggestedRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { authAxios } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem("userId");

    const fetchRepositories = async () => {
      try {
        const { data } = await authAxios.get(`/repo/user/${userId}`);
        setRepositories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching repositories:", err);
      }
    };

    const fetchSuggestedRepositories = async () => {
      try {
        const { data } = await authAxios.get(`/repo/all`);
        setSuggestedRepositories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching suggested repositories:", err);
      }
    };

    Promise.all([fetchRepositories(), fetchSuggestedRepositories()]).finally(() => {
      setLoading(false);
    });
  }, [authAxios]);

  const searchResults = searchQuery.trim() === ""
    ? repositories
    : repositories.filter((repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <>
      <Navbar />
      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <p className="dashboard-section-title">Suggested</p>
          {loading ? (
             <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>
          ) : suggestedRepositories.slice(0, 8).map((repo) => (
            <div className="repo-card" key={repo._id} onClick={() => navigate(`/repo/${repo._id}`)}>
              <div className="repo-card-name">{repo.name}</div>
              {repo.description && (
                <div className="repo-card-desc">{repo.description}</div>
              )}
            </div>
          ))}
        </aside>

        <main className="dashboard-main">
          <div className="dashboard-main-header">
            <h2 className="dashboard-heading">Your Repositories</h2>
            <div className="search-input-wrapper">
              <svg className="search-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
              </svg>
              <input
                className="search-input"
                type="text"
                value={searchQuery}
                placeholder="Find a repository..."
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="repo-list">
            {loading ? (
              <div className="repo-list-empty">Loading repositories...</div>
            ) : searchResults.length === 0 ? (
              <div className="repo-list-empty">
                {searchQuery ? "No repositories match your search." : "No repositories yet."}
              </div>
            ) : (
              searchResults.map((repo) => (
                <div className="repo-list-item" key={repo._id} onClick={() => navigate(`/repo/${repo._id}`)}>
                  <span className="repo-list-name">{repo.name}</span>
                  {repo.description && (
                    <span className="repo-list-desc">{repo.description}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </>
  );
};

export default Dashboard;