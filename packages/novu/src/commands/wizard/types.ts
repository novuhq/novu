export interface WizardCommandOptions {
  secretKey?: string;
  apiUrl: string;
  dashboardUrl: string;
  mcpUrl?: string;
  region: 'us' | 'eu' | 'local';
  model?: string;
  /**
   * Skip the Bootstrap 5s countdown and auto-pick the first detected MCP
   * client. Combine with `--ci` for fully unattended runs.
   */
  yes?: boolean;
  /**
   * Force the non-interactive logging UI: no Bootstrap countdown, no MCP
   * picker, no Ink TUI. Used in CI / piped-stdin shells.
   */
  ci?: boolean;
  /**
   * Default scope for the Wizard agent run.
   *
   * - `full` — Inbox + workflows + triggers + subscribers (the recommended path)
   * - `inbox` — Inbox component only
   * - `workflows` — workflows + triggers only (no Inbox UI)
   */
  goal?: 'full' | 'inbox' | 'workflows';
  skillsBranch?: string;
  /**
   * When true, the wizard surfaces per-phase and per-agent-todo durations
   * in the UI and logs a final timing summary. Useful when triaging slow
   * runs or comparing the cost of different models / goals.
   */
  debug?: boolean;
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
