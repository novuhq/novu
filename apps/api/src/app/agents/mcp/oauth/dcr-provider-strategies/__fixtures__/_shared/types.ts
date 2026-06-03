export type DcrFixtureManifest = {
  mcpUrl: string;
  issuer: string;
  registrationEndpoint?: string;
  tokenEndpoint?: string;
};

export type DcrFixtureSet = {
  manifest: DcrFixtureManifest;
  prm: Record<string, unknown>;
  asMetadata: Record<string, unknown>;
  dcrRegisterResponse?: Record<string, unknown>;
  tokenExchangeResponse?: Record<string, unknown>;
};
