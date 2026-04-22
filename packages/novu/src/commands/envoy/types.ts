export interface EnvoyCommandOptions {
  secretKey?: string;
  apiUrl: string;
  dashboardUrl: string;
  region: 'us' | 'eu';
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
  region: 'us' | 'eu';
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

export type ProjectFramework = 'nextjs-app' | 'nextjs-pages' | 'react-vite' | 'remix' | 'unknown';

export interface UserIntent {
  summary: string;
  goal: 'inbox' | 'email' | 'mixed' | 'other';
  preferDashboardWorkflows: boolean;
  notes: string;
}
