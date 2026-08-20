import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mediaSource = path.join(repoRoot, "media");
const distPublic = path.resolve(repoRoot, "dist");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`[copy-media] source missing, skipping: ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

copyDir(mediaSource, path.join(distPublic, "media"));
copyDir(path.join(mediaSource, "resources"), path.join(distPublic, "resources"));
console.log(`[copy-media] copied "${mediaSource}" -> "${distPublic}"`);