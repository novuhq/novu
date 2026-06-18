import type { ConnectCommandInput } from './resolve-options';

export function isCustomCodeReuseMode(input: ConnectCommandInput): boolean {
  return input.runtime === 'custom-code' || Boolean(input.agentIdentifier?.trim());
}

export function validateCustomCodeConnectFlags(input: ConnectCommandInput): string | null {
  if (input.runtime !== 'custom-code') {
    return null;
  }

  if (input.keyless) {
    return 'Cannot use --runtime custom-code with --keyless. Pass --secret-key to target your existing self-hosted agent environment.';
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
      return `Cannot use ${flag} with --runtime custom-code. Custom-code connect reuses an existing self-hosted agent.`;
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
  const isCustomCodeReuse = isCustomCodeReuseMode(input);

  if (!isCustomCodeReuse && !prompt) {
    return 'Non-interactive mode requires a prompt (positional <prompt> or --prompt).\n(run `novu connect --help` for the non-interactive contract and examples)';
  }

  if (input.runtime === 'custom-code' && !input.agentIdentifier?.trim()) {
    return 'Non-interactive mode with --runtime custom-code requires --agent-identifier.\n(run `novu connect --help` for the non-interactive contract and examples)';
  }

  if (!channel) {
    return 'Non-interactive mode requires --channel <slack|email|telegram|skip> (or <whatsapp|teams> without --keyless).\n(run `novu connect --help` for the non-interactive contract and examples)';
  }

  return null;
}
