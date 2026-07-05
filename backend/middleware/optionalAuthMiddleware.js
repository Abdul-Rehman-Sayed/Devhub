const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { extractToken } = require("./authMiddleware");

const optionalAuthMiddleware = async (req, res, next) => {
  const token = extractToken(req);

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY, { algorithms: ["HS256"] });
      const user = await User.findById(decoded.id).select("+tokenVersion");
      if (user && (decoded.tv || 0) === (user.tokenVersion || 0)) {
        req.user = decoded.id;
      }
    } catch (err) {
      void err;
    }
  }

  next();
};

module.exports = optionalAuthMiddleware;
