const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

function extractToken(req) {
    if (req.cookies && req.cookies.token) return req.cookies.token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.split(" ")[1];
    }
    return null;
}

const authMiddleware = async (req, res, next) => {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({ error: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY, { algorithms: ["HS256"] });

        const user = await User.findById(decoded.id).select("+tokenVersion");
        if (!user || (decoded.tv || 0) !== (user.tokenVersion || 0)) {
            return res.status(401).json({ error: "Invalid or expired token" });
        }

        req.user = decoded.id;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};

module.exports = authMiddleware;
module.exports.extractToken = extractToken;
