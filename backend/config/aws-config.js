const { S3Client } = require("@aws-sdk/client-s3");
require("dotenv").config();

const credentials =
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined;

const s3 = new S3Client({
  region: "ap-south-1",
  credentials,
});

const S3_BUCKET = process.env.S3_BUCKET;

module.exports = { s3, S3_BUCKET };
