import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../authContext";
import Navbar from "../Navbar";
import toast from "react-hot-toast";

const CreateRepo = () => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState(true);
  const [loading, setLoading] = useState(false);
  const { authAxios } = useAuth();
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name) return toast.error("Repository name is required.");

    setLoading(true);
    const userId = localStorage.getItem("userId");

    try {
      await authAxios.post("/repo/create", {
        owner: userId,
        name,
        description,
        visibility,
        content: [],
        issues: []
      });
      toast.success("Repository created successfully!");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to create repository");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div style={{ maxWidth: "600px", margin: "40px auto", padding: "20px", backgroundColor: "var(--bg-secondary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }}>
        <h2 style={{ marginBottom: "20px" }}>Create a new repository</h2>
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Repository name *</label>
            <input 
              style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. hello-world"
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>Description (optional)</label>
            <input 
              style={{ width: "100%", padding: "10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
              type="text" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={visibility}
                onChange={(e) => setVisibility(e.target.checked)}
              />
              Public repository
            </label>
            <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px", marginLeft: "20px" }}>
              Anyone on the internet can see this repository.
            </p>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ marginTop: "10px", padding: "10px", backgroundColor: "var(--accent-green-dark)", color: "white", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", fontWeight: "600" }}
          >
            {loading ? "Creating..." : "Create repository"}
          </button>
        </form>
      </div>
    </>
  );
};

export default CreateRepo;
