import type { ConnectCommandInput } from './resolve-options';

function resolveConnectMode(input: ConnectCommandInput): string | undefined {
  if (input.chatSdk || input.brain === 'chat-sdk') {
    return 'chat-sdk';
  }

  return input.runtime;
}

export function isCustomCodeReuseMode(input: ConnectCommandInput): boolean {
  return input.runtime === 'custom-code' || Boolean(input.agentIdentifier?.trim());
}

export function validateCustomCodeConnectFlags(input: ConnectCommandInput): string | null {
  if (!isCustomCodeReuseMode(input)) {
    return null;
  }

  if (input.keyless) {
    return 'Cannot use self-hosted reuse mode (--runtime custom-code or --agent-identifier) with --keyless. Pass --secret-key to target your existing self-hosted agent environment.';
  }

  const managedOnlyFlags: Array<[keyof ConnectCommandInput, string]> = [
    ['anthropicApiKey', '--anthropic-api-key'],
    ['awsClaudeApiKey', '--aws-claude-api-key'],
    ['awsClaudeRegion', '--aws-claude-region'],
    ['awsClaudeWorkspaceId', '--aws-claude-workspace-id'],
    ['agentIntegrationId', '--agent-integration-id'],
  ];

  for (const [field, flag] of managedOnlyFlags) {
    if (input[field]) {
      return `Cannot use ${flag} with self-hosted reuse mode. Custom-code connect reuses an existing self-hosted agent.`;
    }
  }

  return null;
}

export function validateConnectCiInput(
  input: ConnectCommandInput,
  positionalPrompt: string | undefined
): string | null {
  const channel = input.skipSlack ? 'skip' : input.channel;
  const prompt = (positionalPrompt ?? input.prompt)?.trim();
  const connectMode = resolveConnectMode(input);
  const isCustomCodeReuse = isCustomCodeReuseMode(input);
  const isChatSdk = connectMode === 'chat-sdk';

  if (!isCustomCodeReuse && !isChatSdk && !prompt) {
    return 'Non-interactive mode requires a prompt (positional <prompt> or --prompt), unless --runtime chat-sdk or --agent-identifier.\n(run `novu connect --help` for the non-interactive contract and examples)';
  }

  if (input.runtime === 'custom-code' && !input.agentIdentifier?.trim()) {
    return 'Non-interactive mode with --runtime custom-code requires --agent-identifier.\n(run `novu connect --help` for the non-interactive contract and examples)';
  }

  if (!channel) {
    return 'Non-interactive mode requires --channel <slack|email|telegram|skip> (or <whatsapp|teams> without --keyless).\n(run `novu connect --help` for the non-interactive contract and examples)';
  }

  return null;
}
