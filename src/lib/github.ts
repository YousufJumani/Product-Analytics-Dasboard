/**
 * GitHub Integration Library
 *
 * CONCEPT — GitHub as a developer velocity data source:
 *  We use the GitHub REST API (no GraphQL, simpler auth) to pull:
 *  - Repository commit frequency → developer productivity proxy
 *  - Open/merged PR counts → code review health
 *  - Contributor stats → team engagement
 *
 * WHY THIS MATTERS for a SaaS dashboard:
 *  Correlation between development velocity and growth metrics is a real
 *  business insight. Founders want to see "when we shipped faster, did MRR grow?"
 *
 * AUTH: We use a GitHub Personal Access Token (PAT) with repo:read scope
 * stored server-side in env. Never expose this to the client.
 *
 * RATE LIMITING: GitHub REST allows 5000 req/hour for authenticated requests.
 * We cache GitHub responses aggressively (1 hour TTL) since commit data
 * doesn't change second-to-second.
 */

const GITHUB_BASE = "https://api.github.com";

const withRevalidate = (init: RequestInit, revalidate = 3600): NextFetchInit => ({
  ...init,
  next: { revalidate },
});

function githubHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export interface RepoStats {
  name: string;
  stars: number;
  forks: number;
  openIssues: number;
  language: string | null;
  updatedAt: string;
}

export interface CommitActivity {
  week: number; // Unix timestamp of week start
  total: number;
  days: number[];
}

/**
 * Fetch basic stats for all repos in an org.
 */
export async function fetchOrgRepos(orgSlug: string): Promise<RepoStats[]> {
  const url = `${GITHUB_BASE}/orgs/${orgSlug}/repos?per_page=10&sort=updated&type=public`;
  const res = await fetch(
    url,
    withRevalidate({ headers: githubHeaders() }, 3600)
  );

  if (!res.ok) {
    // Fall back to user repos if org fails (for demo with personal tokens)
    const userRes = await fetch(
      `${GITHUB_BASE}/user/repos?per_page=10&sort=updated`,
      withRevalidate({ headers: githubHeaders() }, 3600)
    );
    if (!userRes.ok) return [];
    const repos = await userRes.json();
    return mapRepos(repos);
  }

  const repos = await res.json();
  return mapRepos(repos);
}

function mapRepos(repos: Record<string, unknown>[]): RepoStats[] {
  return repos.map((r) => ({
    name: r.name as string,
    stars: (r.stargazers_count as number) ?? 0,
    forks: (r.forks_count as number) ?? 0,
    openIssues: (r.open_issues_count as number) ?? 0,
    language: (r.language as string | null) ?? null,
    updatedAt: r.updated_at as string,
  }));
}

/**
 * Fetch weekly commit activity for a repo.
 * Returns last 52 weeks. We slice to last 12 for the dashboard.
 */
export async function fetchRepoCommitActivity(
  owner: string,
  repo: string
): Promise<CommitActivity[]> {
  const url = `${GITHUB_BASE}/repos/${owner}/${repo}/stats/commit_activity`;
  const res = await fetch(
    url,
    withRevalidate({ headers: githubHeaders() }, 3600)
  );

  if (!res.ok || res.status === 202) {
    // 202 = GitHub is computing stats, return empty and retry next sync
    return [];
  }

  const weeks: CommitActivity[] = await res.json();
  return weeks.slice(-12); // Last 12 weeks
}

/**
 * Get PR counts for a repo over last 30 days.
 */
export async function fetchRepoPRStats(
  owner: string,
  repo: string
): Promise<{ open: number; closed: number; merged: number }> {
  const [openRes, closedRes] = await Promise.all([
    fetch(`${GITHUB_BASE}/repos/${owner}/${repo}/pulls?state=open&per_page=100`, {
      ...withRevalidate({ headers: githubHeaders() }, 3600),
    }),
    fetch(`${GITHUB_BASE}/repos/${owner}/${repo}/pulls?state=closed&per_page=100`, {
      ...withRevalidate({ headers: githubHeaders() }, 3600),
    }),
  ]);

  const openPRs = openRes.ok ? ((await openRes.json()) as unknown[]).length : 0;
  const closedPRsData = closedRes.ok ? ((await closedRes.json()) as Record<string, unknown>[]) : [];

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentClosed = closedPRsData.filter(
    (pr) => pr.merged_at && new Date(pr.merged_at as string) > thirtyDaysAgo
  );

  return {
    open: openPRs,
    closed: closedPRsData.length,
    merged: recentClosed.length,
  };
}
