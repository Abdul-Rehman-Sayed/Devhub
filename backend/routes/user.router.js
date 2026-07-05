const express = require("express");
const userController = require("../controllers/userController.js");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuth = require("../middleware/optionalAuthMiddleware");
const authorizeSelf = require("../middleware/authorizeSelf");
const createRateLimiter = require("../middleware/rateLimiter");

const userRouter = express.Router();

const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });

userRouter.post("/signup", authLimiter, userController.signup);
userRouter.post("/login", authLimiter, userController.login);
userRouter.post("/logout", userController.logout);
userRouter.get("/allUsers", authMiddleware, userController.getAllUsers);
userRouter.get("/userProfile/:id", optionalAuth, userController.getUserProfile);
userRouter.put("/updateProfile/:id", authMiddleware, authorizeSelf, userController.updateUserProfile);
userRouter.delete("/deleteProfile/:id", authMiddleware, authorizeSelf, userController.deleteUserProfile);
userRouter.post("/toggleFollow/:id", authMiddleware, userController.toggleFollowUser);
userRouter.post("/toggleStar/:id", authMiddleware, userController.toggleStarRepo);

module.exports = userRouter;
