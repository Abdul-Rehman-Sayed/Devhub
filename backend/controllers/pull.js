const fs = require("fs").promises;
const path = require("path");
const { ListObjectsV2Command, GetObjectCommand } = require("@aws-sdk/client-s3");
const { s3, S3_BUCKET } = require("../config/aws-config");

async function pullRepo() {
  const repoPath = path.resolve(process.cwd(), ".apnaGit");
  const commitsPath = path.join(repoPath, "commits");
  try {
    const data = await s3.send(
      new ListObjectsV2Command({
        Bucket: S3_BUCKET,
        Prefix: "commits/",
      })
    );

    const objects = data.Contents || [];
    for (const object of objects) {
      const key = object.Key;
      if (!key || key.endsWith("/")) continue;

      const destPath = path.resolve(repoPath, key);
      if (destPath !== repoPath && !destPath.startsWith(repoPath + path.sep)) {
        console.warn(`Skipping unsafe object key: ${key}`);
        continue;
      }

      await fs.mkdir(path.dirname(destPath), { recursive: true });
      const response = await s3.send(
        new GetObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
        })
      );
      const bytes = await response.Body.transformToByteArray();
      await fs.writeFile(destPath, Buffer.from(bytes));
    }
    console.log("All commits pulled from s3");
  } catch (error) {
    console.log("Unable to pull: ", error);
  }
}
module.exports = { pullRepo };
