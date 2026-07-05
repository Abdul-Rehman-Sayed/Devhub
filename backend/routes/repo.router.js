const express = require("express");
const repoController = require("../controllers/repoController");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuth = require("../middleware/optionalAuthMiddleware");
const authorizeMiddleware = require("../middleware/authorizeMiddlware");

const repoRouter = express.Router();

repoRouter.get("/repo/all", repoController.getAllRepositories);
repoRouter.get("/repo/name/:name", optionalAuth, repoController.fetchRepositoryByName);
repoRouter.get("/repo/user/:userID", optionalAuth, repoController.fetchRepositoryForCurrentUser);
repoRouter.get("/repo/:id/files", optionalAuth, repoController.listFiles);
repoRouter.get("/repo/:id/file", optionalAuth, repoController.getFile);
repoRouter.get("/repo/:id", optionalAuth, repoController.fetchRepositoriesById);

repoRouter.post("/repo/create", authMiddleware, repoController.createRepository);
repoRouter.post("/repo/:id/files", authMiddleware, authorizeMiddleware, repoController.uploadFiles);
repoRouter.delete("/repo/:id/file", authMiddleware, authorizeMiddleware, repoController.deleteFile);
repoRouter.put("/repo/update/:id", authMiddleware, authorizeMiddleware, repoController.updateRepositoryById);
repoRouter.delete("/repo/delete/:id", authMiddleware, authorizeMiddleware, repoController.deleteRepositoryById);
repoRouter.patch("/repo/toggle/:id", authMiddleware, authorizeMiddleware, repoController.toggleVisibilityById);

module.exports = repoRouter;
