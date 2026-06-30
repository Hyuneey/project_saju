import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const ignoredDirectories = new Set([".git", ".next", "coverage", "dist", "node_modules", ".turbo"]);
const checkedExtensions = new Set([
  ".css",
  ".editorconfig",
  ".gitattributes",
  ".gitignore",
  ".json",
  ".md",
  ".mjs",
  ".ps1",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml"
]);

const invalidFiles = [];

for await (const filePath of walk(repoRoot)) {
  if (!shouldCheck(filePath)) {
    continue;
  }

  const contents = await readFile(filePath, "utf8");
  if (contents.includes("\uFFFD")) {
    invalidFiles.push(path.relative(repoRoot, filePath));
  }
}

if (invalidFiles.length > 0) {
  console.error("Files contain Unicode replacement characters, which usually indicates broken UTF-8:");
  for (const file of invalidFiles) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

async function* walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        yield* walk(entryPath);
      }
      continue;
    }

    if (entry.isFile()) {
      yield entryPath;
    }
  }
}

function shouldCheck(filePath) {
  const basename = path.basename(filePath);
  const extension = path.extname(filePath);
  return checkedExtensions.has(extension) || checkedExtensions.has(basename);
}
