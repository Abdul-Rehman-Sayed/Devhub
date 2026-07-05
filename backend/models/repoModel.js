const mongoose = require("mongoose");
const { Schema } = mongoose;

const FileSchema = new Schema(
  {
    path: { type: String, required: true },
    content: { type: String, default: "" },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const RepositorySchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  content: [
    {
      type: String,
    },
  ],
  files: {
    type: [FileSchema],
    default: [],
  },
  sizeBytes: {
    type: Number,
    default: 0,
  },
  visibility: {
    type: Boolean,
    default: true,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  issues: [
    {
      type: Schema.Types.ObjectId,
      ref: "Issue",
    },
  ],
});

RepositorySchema.index({ owner: 1, name: 1 }, { unique: true });

const Repository = mongoose.model("Repository", RepositorySchema);
module.exports = Repository;
