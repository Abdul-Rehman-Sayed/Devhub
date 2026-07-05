const fs = require("fs").promises;
const path = require("path");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3, S3_BUCKET } = require("../config/aws-config");

async function pushRepo() {
  const repoPath = path.resolve(process.cwd(), ".apnaGit");
  const commitsPath = path.join(repoPath, "commits");

  try {
    const commitDirs = await fs.readdir(commitsPath);
    for (const commitDir of commitDirs) {
      const commitPath = path.join(commitsPath, commitDir);
      const files = await fs.readdir(commitPath);

      for (const file of files) {
        const filePath = path.join(commitPath, file);
        const fileContent = await fs.readFile(filePath);
        await s3.send(
          new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: `commits/${commitDir}/${file}`,
            Body: fileContent,
          })
        );
      }
    }
    console.log("All commits pushed to S3");
  } catch (error) {
    console.error("Error pushing to S3: ", error);
  }
}

module.exports = { pushRepo };
