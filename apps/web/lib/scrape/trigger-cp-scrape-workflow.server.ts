/** Scrape profundo por CP en GitHub Actions (sin límite de tiempo de Vercel). */
export async function triggerPostalCodeScrapeWorkflow(
  postalCode: string
): Promise<boolean> {
  const token = process.env.GITHUB_WORKFLOW_TOKEN ?? process.env.GH_TOKEN;
  const repo =
    process.env.GITHUB_REPOSITORY?.trim() || "danielhdz4-ai/plataformadeinversion";
  if (!token?.trim()) return false;

  const cp = postalCode.replace(/\D/g, "").slice(0, 5);
  if (cp.length !== 5) return false;

  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) return false;

  const ref = process.env.GITHUB_WORKFLOW_REF?.trim() || "main";
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/scrape-postal-code-dispatch.yml/dispatches`,
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
        inputs: { postal_code: cp },
      }),
    }
  );

  if (res.status === 204) return true;
  const body = await res.text().catch(() => "");
  console.error("cp scrape workflow dispatch failed", res.status, body.slice(0, 400));
  return false;
}

export function shouldOffloadCpScrapeToActions(): boolean {
  if (process.env.CP_SCRAPE_USE_ACTIONS === "0") return false;
  if (process.env.CP_SCRAPE_USE_ACTIONS === "1") return true;
  return process.env.VERCEL === "1";
}