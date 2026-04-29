export interface WizardCommandOptions {
  secretKey?: string;
  apiUrl: string;
  dashboardUrl: string;
  mcpUrl?: string;
  region: 'us' | 'eu' | 'local';
  model?: string;
  yes?: boolean;
  print?: boolean;
  skillsBranch?: string;
}

export interface ResolvedAuth {
  secretKey: string;
  environmentId: string;
  environmentSlug?: string | null;
  environmentName?: string | null;
  organizationId?: string | null;
  apiUrl: string;
  dashboardUrl: string;
  region: 'us' | 'eu' | 'local';
  source: 'cli-flag' | 'env' | 'browser';
}

export interface ProjectContext {
  cwd: string;
  packageJsonPath: string | null;
  framework: ProjectFramework;
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun';
  hasTypeScript: boolean;
  installedNovuPackages: string[];
  hasFrameworkRoute: boolean;
  frameworkRoutePath: string | null;
}

export type ProjectFramework = 'nextjs-app' | 'nextjs-pages' | 'react-vite' | 'remix' | 'react' | 'unknown';

export interface UserIntent {
  summary: string;
  goal: 'integrate-novu' | 'inbox' | 'transactional';
  preferDashboardWorkflows: boolean;
  notes: string;
}
