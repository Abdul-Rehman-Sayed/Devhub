const LIMITS = require("../config/uploadLimits");

const ALLOWED_EXTENSIONS = new Set([
  "txt", "md", "markdown", "rst", "log",
  "js", "jsx", "ts", "tsx", "mjs", "cjs", "json", "json5",
  "html", "htm", "css", "scss", "sass", "less", "vue", "svelte",
  "py", "rb", "php", "java", "kt", "kts", "scala", "groovy",
  "c", "h", "cpp", "hpp", "cc", "cxx", "cs", "go", "rs", "swift",
  "sql", "sh", "bash", "zsh", "ps1", "bat",
  "yml", "yaml", "xml", "toml", "ini", "cfg", "conf", "env",
  "r", "pl", "lua", "dart", "clj", "ex", "exs", "elm", "hs", "erl",
  "gitignore", "dockerfile", "makefile", "editorconfig",
]);

const ALLOWED_FILENAMES = new Set([
  ".gitignore", ".gitattributes", ".editorconfig", ".env.example",
  "dockerfile", "makefile", "readme", "license", "changelog", "procfile",
]);

function hasControlChars(str, allowWhitespace) {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 32) {
      if (allowWhitespace && (code === 9 || code === 10 || code === 13)) continue;
      return true;
    }
    if (code === 127) return true;
  }
  return false;
}

function normalizePath(rawPath) {
  if (typeof rawPath !== "string") return null;
  const p = rawPath.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!p || p.length > LIMITS.MAX_PATH_LENGTH) return null;
  if (hasControlChars(p, false)) return null;
  const segments = p.split("/");
  if (segments.some((seg) => seg === "" || seg === "." || seg === "..")) return null;
  return p;
}

function isAllowedFile(p) {
  const base = p.split("/").pop().toLowerCase();
  if (ALLOWED_FILENAMES.has(base)) return true;
  if (!base.includes(".")) return false;
  const ext = base.split(".").pop();
  return ALLOWED_EXTENSIONS.has(ext);
}

function validateFiles(rawFiles) {
  if (!Array.isArray(rawFiles) || rawFiles.length === 0) {
    return { error: "No files provided" };
  }
  if (rawFiles.length > LIMITS.MAX_FILES_PER_REPO) {
    return { error: `Too many files in one upload (max ${LIMITS.MAX_FILES_PER_REPO})` };
  }

  const byPath = new Map();
  for (const entry of rawFiles) {
    if (!entry || typeof entry !== "object") {
      return { error: "Invalid file entry" };
    }
    const p = normalizePath(entry.path);
    if (!p) {
      return { error: `Invalid file path: ${String(entry.path).slice(0, 80)}` };
    }
    if (!isAllowedFile(p)) {
      return { error: `File type not allowed: ${p}` };
    }
    const content = entry.content;
    if (typeof content !== "string") {
      return { error: `File content must be text: ${p}` };
    }
    if (hasControlChars(content, true)) {
      return { error: `Binary or non-text content is not allowed: ${p}` };
    }
    const size = Buffer.byteLength(content, "utf8");
    if (size > LIMITS.MAX_FILE_BYTES) {
      return { error: `File too large (max ${LIMITS.MAX_FILE_BYTES / 1024} KB): ${p}` };
    }
    byPath.set(p, { path: p, content, size });
  }

  return { files: [...byPath.values()] };
}

module.exports = {
  validateFiles,
  ALLOWED_EXTENSIONS,
  ALLOWED_FILENAMES,
};
