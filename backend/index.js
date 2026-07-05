const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const helmet = require("helmet");
const mainRouter = require("./routes/main.router.js");
const createRateLimiter = require("./middleware/rateLimiter.js");

const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");

const { initRepo } = require("./controllers/init");
const { addRepo } = require("./controllers/add");
const { commitRepo } = require("./controllers/commit");
const { pullRepo } = require("./controllers/pull");
const { pushRepo } = require("./controllers/push");
const { revertRepo } = require("./controllers/revert");

dotenv.config();

yargs(hideBin(process.argv))
  .command("start", "Starts the server", {}, startServer)
  .command("init", "Initialise a new repository", {}, initRepo)
  .command(
    "add <file>",
    "Add a file to the repository",
    (yargs) => {
      yargs.positional("file", {
        describe: "File to add to the staging area",
        type: "string",
      });
    },
    (argv) => {
      addRepo(argv.file);
    },
  )
  .command(
    "commit <message>",
    "Commit the staged file",
    (yargs) => {
      yargs.positional("message", {
        describe: "Commit message",
        type: "string",
      });
    },
    (argv) => {
      commitRepo(argv.message);
    },
  )
  .command("push", "Push commits to S3", {}, pushRepo)
  .command("pull", "Pull commits from S3", {}, pullRepo)
  .command(
    "revert <commitID>",
    "Revert to a specific commit",
    (yargs) => {
      yargs.positional("commitID", {
        describe: "Commit ID to revert to",
        type: "string",
      });
    },
    (argv) => {
      revertRepo(argv.commitID);
    },
  )
  .demandCommand(1, "You need atleast one command")
  .help().argv;

function startServer() {
  const app = express();
  const port = process.env.PORT || 3002;

  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());

  app.use(createRateLimiter({ windowMs: 15 * 60 * 1000, max: 300 }));

  const allowedOrigins = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL]
    : ["http://localhost:5173"];

  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use("/", mainRouter);

  app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error("Unhandled error:", err);
    const message = status === 400 ? "Invalid request body" : "Server Error";
    res.status(status).json({ error: message });
  });

  const mongoURI = process.env.MONGO_URI;
  if (!mongoURI) {
    console.error("MONGO_URI is not set. Check your .env file.");
    process.exit(1);
  }
  if (!process.env.JWT_SECRET_KEY) {
    console.error("JWT_SECRET_KEY is not set. Check your .env file.");
    process.exit(1);
  }

  mongoose
    .connect(mongoURI)
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.log("Unable to connect to DB: ", err));

  app.listen(port, () => {
    console.log(`Server is running on ${port}`);
  });
}
