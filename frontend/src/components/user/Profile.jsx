import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./profile.css";
import Navbar from "../Navbar";
import HeatMapProfile from "./HeatMap";
import ConfirmModal from "../ConfirmModal";
import { useAuth } from "../../authContext";
import toast from "react-hot-toast";

const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
  backgroundColor: "var(--bg-primary)",
  color: "var(--text-primary)",
};

const Profile = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const [userDetails, setUserDetails] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const { setCurrentUser, authAxios } = useAuth();

  const [emailDraft, setEmailDraft] = useState("");
  const [passwordDraft, setPasswordDraft] = useState("");
  const [currentPasswordDraft, setCurrentPasswordDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!userId) return;
      try {
        const { data } = await authAxios.get(`/userProfile/${userId}`);
        setUserDetails(data.user);
        setEmailDraft(data.user?.email || "");
      } catch (err) {
        console.error("Cannot fetch user details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserDetails();
  }, [authAxios, userId]);

  const handleLogout = async () => {
    try {
      await authAxios.post("/logout");
    } catch (err) {
      console.error("Logout request failed:", err);
    }
    localStorage.removeItem("userId");
    setCurrentUser(null);
    navigate("/auth");
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const payload = {};
    if (emailDraft && emailDraft !== userDetails?.email) payload.email = emailDraft;
    if (passwordDraft) payload.password = passwordDraft;
    if (Object.keys(payload).length === 0) return toast.error("Nothing to update");
    if (!currentPasswordDraft) return toast.error("Enter your current password to save changes");
    payload.currentPassword = currentPasswordDraft;

    setSaving(true);
    try {
      const { data } = await authAxios.put(`/updateProfile/${userId}`, payload);
      setUserDetails((prev) => ({ ...prev, email: data.user?.email ?? prev.email }));
      setPasswordDraft("");
      setCurrentPasswordDraft("");
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await authAxios.delete(`/deleteProfile/${userId}`);
      localStorage.removeItem("userId");
      setCurrentUser(null);
      toast.success("Account deleted");
      navigate("/auth");
    } catch {
      toast.error("Failed to delete account");
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleUnfollow = async (targetId) => {
    try {
      await authAxios.post(`/toggleFollow/${targetId}`);
      setUserDetails((prev) => ({
        ...prev,
        followedUsers: (prev.followedUsers || []).filter(
          (u) => String(u._id ?? u) !== String(targetId)
        ),
      }));
      toast.success("Unfollowed user");
    } catch {
      toast.error("Failed to unfollow");
    }
  };

  const avatarLetter = userDetails?.username?.[0]?.toUpperCase() ?? "U";

  return (
    <>
      <Navbar />
      <div className="profile-wrapper">
        <aside className="profile-sidebar">
          <div className="profile-avatar">
            <div className="profile-avatar-placeholder">{avatarLetter}</div>
          </div>

          <div>
            <h2 className="profile-username">{userDetails?.username ?? "Loading..."}</h2>
            {userDetails?.email && (
              <p className="profile-handle">{userDetails.email}</p>
            )}
          </div>

          <div className="profile-stats">
            <span style={{ cursor: "pointer" }} onClick={() => setActiveTab("following")}>
              <strong>{userDetails?.followedUsers?.length || 0}</strong> following
            </span>
            <span style={{ cursor: "pointer" }} onClick={() => setActiveTab("starred")}>
              <strong>{userDetails?.starRepos?.length || 0}</strong> starred
            </span>
          </div>

          <button className="profile-logout-btn" onClick={handleLogout}>
            Sign out
          </button>
        </aside>

        <main className="profile-main">
          <div className="profile-tab-bar">
            <button
              className={`profile-tab ${activeTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              className={`profile-tab ${activeTab === "starred" ? "active" : ""}`}
              onClick={() => setActiveTab("starred")}
            >
              Starred
            </button>
            <button
              className={`profile-tab ${activeTab === "following" ? "active" : ""}`}
              onClick={() => setActiveTab("following")}
            >
              Following
            </button>
            <button
              className={`profile-tab ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              Settings
            </button>
          </div>

          {activeTab === "overview" && (
            <div className="heatmap-section">
              <p className="heatmap-title">Contribution activity (sample data)</p>
              <HeatMapProfile />
            </div>
          )}

          {activeTab === "starred" && (
            <div className="profile-repos-grid">
              {loading ? (
                <div style={{ color: "var(--text-muted)", gridColumn: "1 / -1" }}>Loading...</div>
              ) : !userDetails?.starRepos?.length ? (
                <div style={{ color: "var(--text-muted)", gridColumn: "1 / -1" }}>No starred repositories.</div>
              ) : (
                userDetails.starRepos.map((repo) => (
                  <div key={repo._id} className="profile-repo-card" onClick={() => navigate(`/repo/${repo._id}`)}>
                    <div className="profile-repo-name">{repo.name}</div>
                    <div className="profile-repo-desc">{repo.description || "No description"}</div>
                    <div className="profile-repo-visibility">
                      {repo.visibility ? "Public" : "Private"}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "following" && (
            <div className="profile-follow-list">
              {loading ? (
                <div style={{ color: "var(--text-muted)" }}>Loading...</div>
              ) : !userDetails?.followedUsers?.length ? (
                <div style={{ color: "var(--text-muted)" }}>You are not following anyone.</div>
              ) : (
                userDetails.followedUsers.map((u) => (
                  <div key={u._id} className="profile-follow-item">
                    <div className="profile-follow-user">
                      <div className="profile-follow-avatar">{u.username?.[0]?.toUpperCase() ?? "U"}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="profile-follow-name">{u.username || "Unknown user"}</div>
                        {u.email && <div className="profile-follow-email">{u.email}</div>}
                      </div>
                    </div>
                    <button className="profile-unfollow-btn" onClick={() => handleUnfollow(u._id)}>
                      Unfollow
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <form
                onSubmit={handleSaveProfile}
                style={{ display: "flex", flexDirection: "column", gap: "16px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "20px" }}
              >
                <h3 style={{ fontSize: "15px", fontWeight: 600 }}>Edit profile</h3>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Email</label>
                  <input
                    type="email"
                    value={emailDraft}
                    onChange={(e) => setEmailDraft(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>New password</label>
                  <input
                    type="password"
                    value={passwordDraft}
                    onChange={(e) => setPasswordDraft(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    autoComplete="new-password"
                    style={inputStyle}
                  />
                  <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>
                    Minimum 6 characters.
                  </p>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>Current password</label>
                  <input
                    type="password"
                    value={currentPasswordDraft}
                    onChange={(e) => setCurrentPasswordDraft(e.target.value)}
                    placeholder="Required to save changes"
                    autoComplete="current-password"
                    style={inputStyle}
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ alignSelf: "flex-start", padding: "8px 16px", backgroundColor: "var(--accent-green-dark)", color: "white", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: 600 }}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </form>

              <div style={{ backgroundColor: "var(--bg-secondary)", border: "1px solid var(--danger)", borderRadius: "var(--radius-md)", padding: "20px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--danger)" }}>Danger zone</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "8px 0 16px" }}>
                  Deleting your account is permanent and cannot be undone.
                </p>
                <button className="profile-logout-btn" style={{ width: "auto", padding: "0 16px", marginTop: 0 }} onClick={() => setShowDeleteConfirm(true)}>
                  Delete account
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete account"
        message="Your account, repositories, and issues will be permanently removed. This cannot be undone."
        confirmText="Delete account"
        danger
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};

export default Profile;
