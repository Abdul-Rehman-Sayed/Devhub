const mongoose = require("mongoose");
const Repository = require("../models/repoModel");
const User = require("../models/userModel");
const Issue = require("../models/issueModel");
const LIMITS = require("../config/uploadLimits");
const { validateFiles } = require("../utils/fileValidation");

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
const OWNER_FIELDS = "username";

async function isDbOverGlobalLimit() {
  try {
    const stats = await mongoose.connection.db.stats();
    const used = Math.max(stats.storageSize || 0, stats.dataSize || 0);
    return used >= LIMITS.GLOBAL_DB_LIMIT_BYTES;
  } catch (err) {
    console.error("Could not read DB stats:", err.message);
    return false;
  }
}

async function userBytesExcludingRepo(userId, repoId) {
  const rows = await Repository.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
        _id: { $ne: new mongoose.Types.ObjectId(repoId) },
      },
    },
    { $group: { _id: null, total: { $sum: "$sizeBytes" } } },
  ]);
  return rows.length ? rows[0].total : 0;
}

function isHidden(repository, userId) {
  if (repository.visibility !== false) return false;
  const ownerId = repository.owner?._id ?? repository.owner;
  return !userId || ownerId.toString() !== userId.toString();
}

async function createRepository(req, res) {
  const { name, description, visibility } = req.body;
  const owner = req.user;

  try {
    if (!isNonEmptyString(name) || name.length > LIMITS.MAX_NAME_LENGTH) {
      return res.status(400).json({
        error: `Repository name is required (max ${LIMITS.MAX_NAME_LENGTH} characters)`,
      });
    }
    if (
      description !== undefined &&
      (typeof description !== "string" || description.length > LIMITS.MAX_DESCRIPTION_LENGTH)
    ) {
      return res.status(400).json({
        error: `Description too long (max ${LIMITS.MAX_DESCRIPTION_LENGTH} characters)`,
      });
    }
    if (!mongoose.Types.ObjectId.isValid(owner)) {
      return res.status(400).json({ error: "Invalid owner ID" });
    }

    const repoCount = await Repository.countDocuments({ owner });
    if (repoCount >= LIMITS.MAX_REPOS_PER_USER) {
      return res
        .status(400)
        .json({ error: `Repository limit reached (max ${LIMITS.MAX_REPOS_PER_USER} per account)` });
    }

    const newRepository = new Repository({
      owner,
      name,
      content: [],
      description: isNonEmptyString(description) ? description : undefined,
      visibility: typeof visibility === "boolean" ? visibility : true,
    });

    const savedRepository = await newRepository.save();

    await User.findByIdAndUpdate(owner, {
      $addToSet: { repositories: savedRepository._id },
    });

    res.status(201).json({
      message: "Repository created successfully!",
      repositoryId: savedRepository._id,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ error: "You already have a repository with that name" });
    }
    console.error("Error during repository creation:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function getAllRepositories(req, res) {
  try {
    const repositories = await Repository.find({ visibility: { $ne: false } })
      .populate("owner", OWNER_FIELDS)
      .populate("issues");
    res.status(200).json(repositories);
  } catch (error) {
    console.error("Error fetching all repositories:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function fetchRepositoriesById(req, res) {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }
    const repository = await Repository.findById(id)
      .populate("owner", OWNER_FIELDS)
      .populate("issues");
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }
    if (isHidden(repository, req.user)) {
      return res.status(404).json({ error: "Repository not found" });
    }
    res.status(200).json(repository);
  } catch (error) {
    console.error("Error fetching repository by ID:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function fetchRepositoryByName(req, res) {
  const { name } = req.params;
  try {
    if (!isNonEmptyString(name)) {
      return res.status(400).json({ error: "Repository name is required" });
    }
    const repositories = await Repository.find({ name })
      .populate("owner", OWNER_FIELDS)
      .populate("issues");

    const visible = repositories.filter((r) => !isHidden(r, req.user));
    if (visible.length === 0) {
      return res.status(404).json({ error: "Repository not found" });
    }
    res.status(200).json(visible);
  } catch (error) {
    console.error("Error fetching repository by name:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function fetchRepositoryForCurrentUser(req, res) {
  const { userID } = req.params;
  const isSelf = req.user && req.user.toString() === userID.toString();

  try {
    if (!mongoose.Types.ObjectId.isValid(userID)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }
    const filter = isSelf
      ? { owner: userID }
      : { owner: userID, visibility: { $ne: false } };

    const repositories = await Repository.find(filter)
      .populate("owner", OWNER_FIELDS)
      .populate("issues");

    res.status(200).json(repositories);
  } catch (error) {
    console.error("Error fetching repositories for current user:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function updateRepositoryById(req, res) {
  const { id } = req.params;
  const { description } = req.body;

  try {
    const repository = await Repository.findById(id);

    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }
    if (description !== undefined) {
      if (typeof description !== "string" || description.length > LIMITS.MAX_DESCRIPTION_LENGTH) {
        return res.status(400).json({
          error: `Invalid description (max ${LIMITS.MAX_DESCRIPTION_LENGTH} characters)`,
        });
      }
      repository.description = description;
    }

    await repository.save();
    res.status(200).json({
      message: "Repository updated successfully!",
      repositoryId: repository._id,
    });
  } catch (error) {
    console.error("Error updating repository by ID:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function toggleVisibilityById(req, res) {
  const { id } = req.params;

  try {
    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }
    repository.visibility = !repository.visibility;
    await repository.save();
    res.status(200).json({
      message: "Repository visibility toggled successfully!",
      repositoryId: repository._id,
      newVisibility: repository.visibility,
    });
  } catch (error) {
    console.error("Error toggling repository visibility:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function deleteRepositoryById(req, res) {
  const { id } = req.params;

  try {
    const result = await Repository.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Repository not found" });
    }

    await Issue.deleteMany({ repository: id });
    await User.updateMany(
      { $or: [{ repositories: id }, { starRepos: id }] },
      { $pull: { repositories: id, starRepos: id } }
    );

    res.status(200).json({
      message: "Repository deleted successfully!",
    });
  } catch (error) {
    console.error("Error deleting repository by ID:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function uploadFiles(req, res) {
  const { id } = req.params;
  const { files, mode } = req.body;

  try {
    if (await isDbOverGlobalLimit()) {
      return res
        .status(507)
        .json({ error: "Storage is full. Uploads are temporarily disabled." });
    }

    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }

    const result = validateFiles(files);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    const existing = new Map(
      (repository.files || []).map((f) => [
        f.path,
        { path: f.path, content: f.content, size: f.size },
      ])
    );
    if (mode === "replace") existing.clear();
    for (const f of result.files) existing.set(f.path, f);
    const merged = [...existing.values()];

    if (merged.length > LIMITS.MAX_FILES_PER_REPO) {
      return res
        .status(400)
        .json({ error: `Too many files (max ${LIMITS.MAX_FILES_PER_REPO} per repository)` });
    }

    const repoBytes = merged.reduce((sum, f) => sum + f.size, 0);
    if (repoBytes > LIMITS.MAX_REPO_BYTES) {
      return res.status(400).json({
        error: `Repository exceeds size limit (max ${LIMITS.MAX_REPO_BYTES / 1024} KB)`,
      });
    }

    const otherBytes = await userBytesExcludingRepo(req.user, id);
    if (otherBytes + repoBytes > LIMITS.MAX_USER_BYTES) {
      return res.status(400).json({
        error: `Account storage limit reached (max ${LIMITS.MAX_USER_BYTES / (1024 * 1024)} MB)`,
      });
    }

    repository.files = merged;
    repository.sizeBytes = repoBytes;
    await repository.save();

    res.status(200).json({
      message: "Files uploaded successfully",
      fileCount: merged.length,
      repoBytes,
    });
  } catch (error) {
    console.error("Error uploading files:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function listFiles(req, res) {
  const { id } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }
    const repository = await Repository.findById(id).select(
      "files.path files.size sizeBytes visibility owner"
    );
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }
    if (isHidden(repository, req.user)) {
      return res.status(404).json({ error: "Repository not found" });
    }
    const files = (repository.files || []).map((f) => ({
      path: f.path,
      size: f.size,
    }));
    res.status(200).json({ files, sizeBytes: repository.sizeBytes || 0 });
  } catch (error) {
    console.error("Error listing files:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function getFile(req, res) {
  const { id } = req.params;
  const filePath = req.query.path;
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid repository ID" });
    }
    if (!isNonEmptyString(filePath)) {
      return res.status(400).json({ error: "File path is required" });
    }
    const repository = await Repository.findById(id).select(
      "files visibility owner"
    );
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }
    if (isHidden(repository, req.user)) {
      return res.status(404).json({ error: "Repository not found" });
    }
    const file = (repository.files || []).find((f) => f.path === filePath);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }
    res.status(200).json({ path: file.path, content: file.content, size: file.size });
  } catch (error) {
    console.error("Error fetching file:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function deleteFile(req, res) {
  const { id } = req.params;
  const filePath = req.query.path;
  try {
    if (!isNonEmptyString(filePath)) {
      return res.status(400).json({ error: "File path is required" });
    }
    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found" });
    }
    const before = (repository.files || []).length;
    repository.files = (repository.files || []).filter((f) => f.path !== filePath);
    if (repository.files.length === before) {
      return res.status(404).json({ error: "File not found" });
    }
    repository.sizeBytes = repository.files.reduce((sum, f) => sum + f.size, 0);
    await repository.save();
    res.status(200).json({
      message: "File deleted successfully",
      fileCount: repository.files.length,
    });
  } catch (error) {
    console.error("Error deleting file:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

module.exports = {
  createRepository,
  getAllRepositories,
  fetchRepositoriesById,
  fetchRepositoryByName,
  fetchRepositoryForCurrentUser,
  updateRepositoryById,
  toggleVisibilityById,
  deleteRepositoryById,
  uploadFiles,
  listFiles,
  getFile,
  deleteFile,
};
