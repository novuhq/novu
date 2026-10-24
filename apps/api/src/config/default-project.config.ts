export interface DefaultProjectConfig {
  name: string;
  id: string;
  apiKey: string;
}

const MONGO_ID_PATTERN = /^[a-f\d]{24}$/i;

export function getDefaultProjectConfig(
  env: Readonly<Record<string, unknown>> = process.env
): DefaultProjectConfig | undefined {
  const getString = (key: string) => (typeof env[key] === 'string' ? env[key].trim() : undefined);
  const name = getString('NOVU_DEFAULT_PROJECT_NAME');
  const id = getString('NOVU_DEFAULT_PROJECT_ID');
  const apiKey = getString('NOVU_DEFAULT_API_KEY');

  if (!name && !id && !apiKey) return undefined;

  if (!name || !id || !apiKey) {
    throw new Error(
      'NOVU_DEFAULT_PROJECT_NAME, NOVU_DEFAULT_PROJECT_ID, and NOVU_DEFAULT_API_KEY must be set together'
    );
  }

  if (!MONGO_ID_PATTERN.test(id)) {
    throw new Error('NOVU_DEFAULT_PROJECT_ID must be a 24-character MongoDB ObjectId');
  }

  return { name, id, apiKey };
}
