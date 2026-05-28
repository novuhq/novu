import type { ValidateCredentialsInput } from '../i-agent-runtime-provider';

export type ResolvedAwsAnthropicCredentials = {
  region: string;
  workspaceId: string;
  apiKey: string;
};

export function toValidateCredentialsInput(credentials: Record<string, unknown>): ValidateCredentialsInput {
  const apiKey = typeof credentials.apiKey === 'string' ? credentials.apiKey.trim() : undefined;
  const region = typeof credentials.region === 'string' ? credentials.region.trim() : undefined;
  const externalWorkspaceId =
    typeof credentials.externalWorkspaceId === 'string' ? credentials.externalWorkspaceId.trim() : undefined;

  return {
    apiKey: apiKey || undefined,
    region: region || undefined,
    externalWorkspaceId: externalWorkspaceId || undefined,
  };
}

export function resolveAwsAnthropicCredentials(
  credentials: Record<string, unknown>
): ResolvedAwsAnthropicCredentials | null {
  const region = (credentials.region as string | undefined)?.trim();
  const workspaceId = (credentials.externalWorkspaceId as string | undefined)?.trim();
  const apiKey = (credentials.apiKey as string | undefined)?.trim();

  if (!region || !workspaceId || !apiKey) {
    return null;
  }

  return { region, workspaceId, apiKey };
}

export function toThalamusAwsAnthropicCredentials(credentials: ResolvedAwsAnthropicCredentials): {
  awsRegion: string;
  awsWorkspaceId: string;
  apiKey: string;
} {
  return {
    awsRegion: credentials.region,
    awsWorkspaceId: credentials.workspaceId,
    apiKey: credentials.apiKey,
  };
}
