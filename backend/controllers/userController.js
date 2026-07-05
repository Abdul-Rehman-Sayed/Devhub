const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const Repository = require("../models/repoModel");
const { signToken, setAuthCookie, clearAuthCookie } = require("../utils/authTokens");

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 72;
const MAX_USERNAME_LENGTH = 39;
const MAX_EMAIL_LENGTH = 254;

function validatePassword(password) {
  if (!isNonEmptyString(password) || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters`;
  }
  return null;
}

function validateEmail(email) {
  if (!isNonEmptyString(email) || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    return "Invalid email address";
  }
  return null;
}

async function signup(req, res) {
  const { username, password, email } = req.body;

  if (!isNonEmptyString(username) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
    return res.status(400).json({ error: "Username, email, and password are required" });
  }
  if (username.length > MAX_USERNAME_LENGTH || !USERNAME_RE.test(username)) {
    return res.status(400).json({
      error: `Username must be 1-${MAX_USERNAME_LENGTH} characters (letters, numbers, ".", "_", "-") and start with a letter or number`,
    });
  }
  const emailError = validateEmail(email);
  if (emailError) {
    return res.status(400).json({ error: emailError });
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  try {
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(400).json({ error: "User already exists with that username or email" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      repositories: [],
      followedUsers: [],
      starRepos: [],
    });

    const savedUser = await newUser.save();

    const token = signToken(savedUser);
    setAuthCookie(res, token);

    res.status(201).json({ userId: savedUser._id });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "User already exists with that username or email" });
    }
    console.error("Error during signup:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  if (email.length > MAX_EMAIL_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return res.status(400).json({ error: "Invalid credentials!" });
  }

  try {
    const user = await User.findOne({ email }).select("+password +tokenVersion");
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials!" });
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    res.status(200).json({ userId: user._id });
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

function logout(req, res) {
  clearAuthCookie(res);
  res.status(200).json({ message: "Logged out" });
}

async function getAllUsers(req, res) {
  try {
    const users = await User.find({}).select("username");
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching all users:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function getUserProfile(req, res) {
  const { id } = req.params;
  const isSelf = req.user && req.user.toString() === id.toString();

  try {
    const repoMatch = isSelf ? {} : { visibility: { $ne: false } };

    const user = await User.findById(id)
      .select(isSelf ? "-password" : "-password -email")
      .populate({ path: "repositories", match: repoMatch })
      .populate("followedUsers", isSelf ? "username email" : "username")
      .populate({ path: "starRepos", match: repoMatch });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.repositories = (user.repositories || []).filter(Boolean);
    user.starRepos = (user.starRepos || []).filter(Boolean);

    res.status(200).json({ user });
  } catch (error) {
    console.error("Error fetching user profile:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function updateUserProfile(req, res) {
  const { id } = req.params;
  const { email, password, currentPassword } = req.body;

  if (!isNonEmptyString(currentPassword) || currentPassword.length > MAX_PASSWORD_LENGTH) {
    return res.status(400).json({ error: "Current password is required" });
  }

  try {
    const user = await User.findById(id).select("+password +tokenVersion");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(403).json({ error: "Current password is incorrect" });
    }

    if (email !== undefined) {
      const emailError = validateEmail(email);
      if (emailError) {
        return res.status(400).json({ error: emailError });
      }
      const emailTaken = await User.findOne({ email, _id: { $ne: id } }).select("_id");
      if (emailTaken) {
        return res.status(409).json({ error: "Email already in use" });
      }
      user.email = email;
    }
    if (password !== undefined) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    await user.save();

    if (password !== undefined) {
      setAuthCookie(res, signToken(user));
    }

    const updatedUserObj = user.toObject();
    delete updatedUserObj.password;
    delete updatedUserObj.tokenVersion;

    res.status(200).json({ user: updatedUserObj });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Email already in use" });
    }
    console.error("Error updating user profile:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function deleteUserProfile(req, res) {
  const { id } = req.params;

  try {
    const result = await User.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const Issue = require("../models/issueModel");
    const ownedRepos = await Repository.find({ owner: id }).select("_id");
    const repoIds = ownedRepos.map((r) => r._id);
    if (repoIds.length) {
      await Issue.deleteMany({ repository: { $in: repoIds } });
      await Repository.deleteMany({ owner: id });
      await User.updateMany(
        { starRepos: { $in: repoIds } },
        { $pull: { starRepos: { $in: repoIds } } }
      );
    }
    await User.updateMany(
      { followedUsers: id },
      { $pull: { followedUsers: id } }
    );

    clearAuthCookie(res);
    res.status(200).json({ message: "User profile deleted!" });
  } catch (error) {
    console.error("Error deleting user profile:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function toggleFollowUser(req, res) {
  const userId = req.user;
  const targetUserId = req.params.id;

  if (userId === targetUserId) {
    return res.status(400).json({ error: "You cannot follow yourself." });
  }
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const user = await User.findById(userId);
    const targetUser = await User.findById(targetUserId);

    if (!user || !targetUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const isFollowing = user.followedUsers.includes(targetUserId);

    if (isFollowing) {
      user.followedUsers.pull(targetUserId);
    } else {
      user.followedUsers.push(targetUserId);
    }

    await user.save();

    res.status(200).json({ 
      message: isFollowing ? "Unfollowed user successfully" : "Followed user successfully",
      followedUsers: user.followedUsers 
    });
  } catch (error) {
    console.error("Error toggling follow:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

async function toggleStarRepo(req, res) {
  const userId = req.user;
  const repoId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(repoId)) {
    return res.status(400).json({ error: "Invalid repository ID" });
  }

  try {
    const user = await User.findById(userId);
    const repo = await Repository.findById(repoId);

    if (!user || !repo) {
      return res.status(404).json({ error: "User or Repository not found." });
    }

    const isStarred = user.starRepos.includes(repoId);

    if (isStarred) {
      user.starRepos.pull(repoId);
    } else {
      user.starRepos.push(repoId);
    }

    await user.save();

    res.status(200).json({ 
      message: isStarred ? "Unstarred repository successfully" : "Starred repository successfully",
      starRepos: user.starRepos
    });
  } catch (error) {
    console.error("Error toggling star:", error.message);
    res.status(500).json({ error: "Server Error" });
  }
}

module.exports = {
  getAllUsers,
  signup,
  login,
  logout,
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  toggleFollowUser,
  toggleStarRepo,
};
