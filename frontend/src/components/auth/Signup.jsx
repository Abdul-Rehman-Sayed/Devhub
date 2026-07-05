import React, { useState } from "react";
import { useAuth } from "../../authContext";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import "./auth.css";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setCurrentUser, authAxios } = useAuth();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { data } = await authAxios.post("/signup", {
        email,
        password,
        username,
      });
      localStorage.setItem("userId", data.userId);
      setCurrentUser(data.userId);
      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-logo-wrap">
        <Link to="/">
          <img className="auth-logo" src="/favicon.png" alt="Logo" />
        </Link>
      </div>

      <div className="auth-container">
        <h1 className="auth-title">Create your account</h1>

        <div className="auth-box">
          <div className="auth-field">
            <label className="auth-label" htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              className="auth-input"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              className="auth-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">Password</label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                name="password"
                className="auth-input"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: "58px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--accent-blue, #58a6ff)", cursor: "pointer", fontSize: "12px", padding: 0 }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            className="auth-submit-btn"
            disabled={loading}
            onClick={handleSignup}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </div>

        <div className="auth-footer-box">
          Already have an account? <Link to="/auth">Sign in</Link>
        </div>

        <div style={{ textAlign: "center", marginTop: "12px" }}>
          <Link to="/" style={{ color: "var(--text-muted)", fontSize: "13px" }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;