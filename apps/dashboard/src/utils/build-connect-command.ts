function maskSecretKey(key: string): string {
  return `nv-${'•'.repeat(16)}${key.slice(-4)}`;
}

type BuildConnectCommandInput = {
  agentIdentifier: string;
  secretKey: string;
  masked?: boolean;
};

export function buildConnectCommand(input: BuildConnectCommandInput): { display: string; copy: string } {
  const key = input.masked ? maskSecretKey(input.secretKey) : input.secretKey;
  const parts = [
    'npx novu connect',
    '--runtime custom-code',
    `--agent-identifier ${input.agentIdentifier}`,
    `-s ${key}`,
  ];

  const command = parts.join(' ');

  return {
    display: command,
    copy: command,
  };
}

export function buildConnectCommandVariants(input: { agentIdentifier: string; secretKey: string }) {
  const copy = buildConnectCommand({ ...input, masked: false }).copy;

  return {
    display: buildConnectCommand({ ...input, masked: true }).display,
    copy,
  };
}
