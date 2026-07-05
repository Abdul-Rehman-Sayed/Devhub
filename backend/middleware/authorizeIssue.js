const Issue = require("../models/issueModel");
const Repository = require("../models/repoModel");

const authorizeIssue = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user;

  try {
    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ error: "Issue not found" });
    }

    const isAuthor = issue.author && issue.author.toString() === userId.toString();

    let isRepoOwner = false;
    if (issue.repository) {
      const repository = await Repository.findById(issue.repository);
      isRepoOwner =
        repository && repository.owner.toString() === userId.toString();
    }

    if (!isAuthor && !isRepoOwner) {
      return res.status(403).json({ error: "Access denied" });
    }

    req.issue = issue;
    next();
  } catch (err) {
    return res.status(500).json({ error: "Server Error" });
  }
};

module.exports = authorizeIssue;
