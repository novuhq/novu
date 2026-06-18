type VercelProjectTarget = {
  alias?: string[];
  meta?: { branchAlias?: string };
  automaticAliases?: string[];
};

type VercelProjectTargets = {
  production?: VercelProjectTarget;
  development?: VercelProjectTarget;
};

export function resolveVercelProjectAlias(
  targets: VercelProjectTargets | undefined,
  environmentName: string
): string | undefined {
  const vercelTarget = environmentName.toLowerCase() === 'production' ? targets?.production : targets?.development;
  const alias = vercelTarget?.alias?.sort((a, b) => a.length - b.length)[0];
  const bridgeAlias = alias || vercelTarget?.meta?.branchAlias || vercelTarget?.automaticAliases?.[0];

  return bridgeAlias;
}

export function buildNovuBridgeUrl(host: string): string {
  return `https://${host}/api/novu`;
}
