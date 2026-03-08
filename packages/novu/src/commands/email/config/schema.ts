export type NovuConfig = {
  outDir?: string;
  apiUrl?: string;
  aliases?: Record<string, string>;
};

export function validateConfig(config: unknown): NovuConfig {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid config: must be an object');
  }

  const novuConfig = config as Partial<NovuConfig>;
  const errors: string[] = [];

  if (novuConfig.outDir !== undefined && typeof novuConfig.outDir !== 'string') {
    errors.push('outDir must be a string');
  }

  if (novuConfig.apiUrl !== undefined && typeof novuConfig.apiUrl !== 'string') {
    errors.push('apiUrl must be a string');
  }

  if (novuConfig.aliases !== undefined) {
    if (typeof novuConfig.aliases !== 'object' || novuConfig.aliases === null) {
      errors.push('aliases must be an object');
    } else {
      for (const [alias, target] of Object.entries(novuConfig.aliases)) {
        if (typeof target !== 'string') {
          errors.push(`aliases['${alias}'] must be a string`);
          continue;
        }

        if (target.trim().length === 0) {
          errors.push(`aliases['${alias}'] cannot be empty`);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation errors:\n  • ${errors.join('\n  • ')}`);
  }

  return novuConfig as NovuConfig;
}
