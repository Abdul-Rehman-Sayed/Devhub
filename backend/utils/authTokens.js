const jwt = require("jsonwebtoken");

const TOKEN_TTL_MS = 60 * 60 * 1000;

function signToken(user) {
  return jwt.sign(
    { id: user._id, tv: user.tokenVersion || 0 },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "1h", algorithm: "HS256" }
  );
}

function cookieOptions() {
  const sameSite = process.env.COOKIE_SAMESITE || "lax";
  return {
    httpOnly: true,
    sameSite,
    secure: sameSite === "none" || process.env.NODE_ENV === "production",
    maxAge: TOKEN_TTL_MS,
    path: "/",
  };
}

function setAuthCookie(res, token) {
  res.cookie("token", token, cookieOptions());
}

function clearAuthCookie(res) {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie("token", opts);
}

module.exports = { signToken, setAuthCookie, clearAuthCookie };
