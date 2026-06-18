export function buildVercelProjectDashboardUrl(
  scopeSlug: string,
  projectName: string,
  section: 'deployments' | 'settings' = 'deployments'
): string {
  return `https://vercel.com/${scopeSlug}/${projectName}/${section}`;
}
