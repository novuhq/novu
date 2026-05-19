const DEFAULT_ENV = 'local';

const envFileFromNodeEnv = {
  production: '.env.production',
  test: '.env.test',
  ci: '.env.ci',
  local: '.env',
  dev: '.env.development',
} satisfies Record<string, string>;

/**
 * Get the path to the .env file for the current environment.
 * @param env The current environment.
 * @param configDir The config directory.
 * @returns The path to the .env file.
 */
export function getEnvFileNameForNodeEnv(nodeEnv?: string): string {
  return envFileFromNodeEnv[(nodeEnv || DEFAULT_ENV) as keyof typeof envFileFromNodeEnv];
}

/**
 * NODE_ENV values whose runs must never inherit a developer's generic local
 * `.env` override. The generic file is typically wired up through tooling like
 * 1Password Environments and tends to point at staging/dev credentials —
 * loading those during `pnpm test` or CI can mutate the wrong database. For
 * these environments we still allow an *explicit* `.env.<NODE_ENV>` override
 * (e.g. `.env.test`) because that is deliberately authored per-environment.
 */
const ISOLATED_NODE_ENVS = new Set<string>(['test', 'ci']);

/**
 * Resolve which dotenv file to load for a given app. Picks the first existing
 * candidate in priority order:
 *
 *   1. `<overrideDir>/.env.<NODE_ENV>` — explicit per-env override
 *   2. `<overrideDir>/.env`            — generic local override (skipped for
 *                                        `NODE_ENV=test|ci` so dev-pointed
 *                                        secrets can never leak into those
 *                                        runs and trash a real database)
 *   3. `<defaultDir>/.env.<NODE_ENV>`  — committed in-tree default
 *
 * Pure function: takes the path-join + existence-check primitives as inputs so
 * this module stays free of `node:fs` / `node:path` and can be safely imported
 * by browser bundles.
 */
export function resolveDotenvPath({
  overrideDir,
  defaultDir,
  nodeEnv,
  fileExists,
  join,
}: {
  overrideDir: string;
  defaultDir: string;
  nodeEnv: string | undefined;
  fileExists: (p: string) => boolean;
  join: (...segments: string[]) => string;
}): string | undefined {
  const envFile = getEnvFileNameForNodeEnv(nodeEnv);
  const isIsolated = ISOLATED_NODE_ENVS.has(nodeEnv ?? '');

  const candidates: string[] = [];
  // Explicit per-env override (e.g. .env.test). Always considered.
  candidates.push(join(overrideDir, envFile));
  // Generic local override (.env). Skipped for isolated runs; otherwise also
  // skipped if it's the same path we already pushed above (NODE_ENV=local).
  const genericOverride = join(overrideDir, '.env');
  if (!isIsolated && !candidates.includes(genericOverride)) {
    candidates.push(genericOverride);
  }
  // Committed default lives next to the source.
  candidates.push(join(defaultDir, envFile));

  return candidates.find((candidate) => fileExists(candidate));
}

/**
 * Converts all the values T of the object to typed template literals.
 * Use this type to convert the env object to a type that can be used to validate the env object.
 */
export type StringifyEnv<T extends Record<string, string | number | boolean | undefined>> = {
  [K in keyof T]: T[K] extends undefined ? string : `${T[K]}`;
};
