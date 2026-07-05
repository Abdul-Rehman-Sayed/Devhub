const fs = require("fs");
const path = require("path");
const { promisify } = require("util");

const readdir = promisify(fs.readdir);
const copyFile = promisify(fs.copyFile);

async function revertRepo(commitID) {
  const repoPath = path.resolve(process.cwd(), ".apnaGit");
  const commitsPath = path.join(repoPath, "commits");
  try {
    if (typeof commitID !== "string" || !/^[0-9a-fA-F-]{36}$/.test(commitID)) {
      console.error("Invalid commit ID");
      return;
    }
    const commitDir = path.join(commitsPath, commitID);
    const files = await readdir(commitDir);
    const parentDir = path.resolve(repoPath, "..");

    for (const file of files) {
      if (file === "commit.json") continue;
      const dest = path.resolve(parentDir, path.basename(file));
      await copyFile(path.join(commitDir, file), dest);
    }
    console.log(`Commit ${commitID} reverted successfully`);
  } catch (error) {
    console.error("Unable to revert:", error);
  }
}

module.exports = { revertRepo };