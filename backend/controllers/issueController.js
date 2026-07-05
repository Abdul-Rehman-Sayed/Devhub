const Issue = require("../models/issueModel");
const Repository = require("../models/repoModel");

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 5000;

function validateIssueFields(title, description) {
  if (title !== undefined && (!isNonEmptyString(title) || title.length > MAX_TITLE_LENGTH)) {
    return `Title is required (max ${MAX_TITLE_LENGTH} characters)`;
  }
  if (
    description !== undefined &&
    (!isNonEmptyString(description) || description.length > MAX_DESCRIPTION_LENGTH)
  ) {
    return `Description is required (max ${MAX_DESCRIPTION_LENGTH} characters)`;
  }
  return null;
}

function isRepoHidden(repository, userId) {
  if (!repository) return true;
  if (repository.visibility !== false) return false;
  return !userId || repository.owner.toString() !== userId.toString();
}

async function createIssue(req, res) {
  const { title, description } = req.body;
  const { id } = req.params;

  if (title === undefined || description === undefined) {
    return res.status(400).json({ error: "Title and description are required" });
  }
  const fieldError = validateIssueFields(title, description);
  if (fieldError) {
    return res.status(400).json({ error: fieldError });
  }

  try {
    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }
    if (isRepoHidden(repository, req.user)) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const issue = new Issue({
      title,
      description,
      repository: id,
      author: req.user,
    });
    await issue.save();

    await Repository.findByIdAndUpdate(id, { $push: { issues: issue._id } });

    res.status(201).json({
      message: "Issue created successfully!",
      issueId: issue._id,
    });
  } catch (error) {
    console.error("Error creating issue:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function updateIssueById(req, res) {
  const { id } = req.params;
  const { title, description, status } = req.body;
  try {
    const issue = req.issue || (await Issue.findById(id));
    if (!issue) {
      return res.status(404).json({ error: "Issue not found" });
    }

    const fieldError = validateIssueFields(title, description);
    if (fieldError) {
      return res.status(400).json({ error: fieldError });
    }
    if (title !== undefined) {
      issue.title = title;
    }
    if (description !== undefined) {
      issue.description = description;
    }
    if (status !== undefined) {
      if (!["open", "closed"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      issue.status = status;
    }

    await issue.save();
    res.status(200).json({ message: "Issue updated successfully!" });
  } catch (error) {
    console.error("Error updating issue:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function deleteIssueById(req, res) {
  const { id } = req.params;

  try {
    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ error: "Issue not found" });
    }
    await Issue.deleteOne({ _id: id });
    await Repository.findByIdAndUpdate(issue.repository, {
      $pull: { issues: id },
    });
    res.status(200).json({ message: "Issue deleted successfully!" });
  } catch (error) {
    console.error("Error deleting issue:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function getAllIssues(req, res) {
  const { id } = req.params;
  try {
    const repository = await Repository.findById(id);
    if (isRepoHidden(repository, req.user)) {
      return res.status(404).json({ error: "Repository not found" });
    }
    const issues = await Issue.find({ repository: id });
    res.status(200).json(issues);
  } catch (error) {
    console.error("Error fetching issues:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function getIssueById(req, res) {
  const { id } = req.params;
  try {
    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ error: "Issue not found" });
    }
    const repository = await Repository.findById(issue.repository);
    if (isRepoHidden(repository, req.user)) {
      return res.status(404).json({ error: "Issue not found" });
    }
    res.status(200).json(issue);
  } catch (error) {
    console.error("Error fetching issue:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

module.exports = {
  createIssue,
  updateIssueById,
  deleteIssueById,
  getAllIssues,
  getIssueById,
};
