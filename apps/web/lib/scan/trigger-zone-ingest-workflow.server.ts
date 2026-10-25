/** Dispara workflow `scan-zone-ingest.yml` (ingest largo fuera de Vercel). */
export async function triggerScanZoneIngestWorkflow(scanId: string): Promise<boolean> {
  const token = process.env.GITHUB_WORKFLOW_TOKEN ?? process.env.GH_TOKEN;
  const repo =
    process.env.GITHUB_REPOSITORY?.trim() || "danielhdz4-ai/plataformadeinversion";
  if (!token?.trim()) return false;

  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) return false;

  const ref = process.env.GITHUB_WORKFLOW_REF?.trim() || "main";
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/scan-zone-ingest.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref,
        inputs: { scan_id: scanId },
      }),
    }
  );

  if (res.status === 204) return true;
  const body = await res.text().catch(() => "");
  console.error("github workflow dispatch failed", res.status, body.slice(0, 400));
  return false;
}

export function shouldOffloadScanIngestToActions(): boolean {
  if (process.env.SCAN_INGEST_USE_ACTIONS === "0") return false;
  if (process.env.SCAN_INGEST_USE_ACTIONS === "1") return true;
  return process.env.VERCEL === "1";
}
