/**
 * Push main usando GH_TOKEN de .env.local (cuenta danielhdz4-ai).
 * Repo canónico: danielhdz4-ai/plataformadeinversion (override GITHUB_REPOSITORY).
 */
import { spawnSync } from "node:child_process";
import {
  authenticatedRemoteUrl,
  readGithubToken,
  repoRoot,
  resolveGithubRepo,
} from "./lib/github-remote.mjs";

const token = readGithubToken();
if (!token) {
  console.error("Missing GH_TOKEN in .env.local");
  process.exit(1);
}

const repo = resolveGithubRepo();
console.log(`push HEAD -> main en ${repo}`);
const r = spawnSync("git", ["push", authenticatedRemoteUrl(token, repo), "HEAD:main"], {
  cwd: repoRoot,
  stdio: "inherit",
  shell: false,
});
process.exit(r.status ?? 1);
