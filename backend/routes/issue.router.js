const express = require("express");
const issueController = require("../controllers/issueController.js");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuth = require("../middleware/optionalAuthMiddleware");
const authorizeIssue = require("../middleware/authorizeIssue");

const issueRouter = express.Router();

issueRouter.get("/repo/:id/issues", optionalAuth, issueController.getAllIssues);
issueRouter.get("/issue/:id", optionalAuth, issueController.getIssueById);
issueRouter.post("/repo/:id/issue/create", authMiddleware, issueController.createIssue);
issueRouter.put("/issue/update/:id", authMiddleware, authorizeIssue, issueController.updateIssueById);
issueRouter.delete("/issue/delete/:id", authMiddleware, authorizeIssue, issueController.deleteIssueById);

module.exports = issueRouter;
