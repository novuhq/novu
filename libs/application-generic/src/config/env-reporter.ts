interface EnvReporterOptions {
  errors: Partial<Record<string, Error>>;
}

/*
 * envalid's EnvMissingError carries the literal message "undefined", and EnvError messages
 * echo the raw value, which may be a secret — so only the failure kind is reported.
 */
function describeEnvError(error: Error | undefined): string {
  if (!error || error.name === 'EnvMissingError') {
    return 'missing (required)';
  }

  return 'invalid value';
}

/**
 * envalid reporter that throws instead of envalid's default `console.error` + `process.exit(1)`,
 * so a missing secret propagates to `runWithHydratedSecrets` and is flushed to New Relic before exit.
 */
export function createThrowingEnvReporter(serviceName: string) {
  return ({ errors }: EnvReporterOptions): void => {
    const problems = Object.entries(errors);

    if (problems.length === 0) {
      return;
    }

    throw new Error(
      `Invalid ${serviceName} environment:\n${problems
        .map(([key, error]) => `  ${key}: ${describeEnvError(error)}`)
        .join('\n')}`
    );
  };
}
