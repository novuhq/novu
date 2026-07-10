import type { ISecretsManagerService } from './types';

const LOG_CONTEXT = 'AwsSecretsManagerService';

export class AwsSecretsManagerService implements ISecretsManagerService {
  constructor(
    private readonly secretName: string,
    private readonly region: string
  ) {}

  public async loadSecrets(): Promise<Record<string, string>> {
    // Lazy import so the AWS SDK is only loaded when a remote secret is actually
    // fetched; boots using the no-op provider never pull it in.
    const { GetSecretValueCommand, SecretsManagerClient } = await import('@aws-sdk/client-secrets-manager');

    const client = new SecretsManagerClient({ region: this.region });
    const data = await client.send(new GetSecretValueCommand({ SecretId: this.secretName }));

    let raw: string;
    if (data.SecretString) {
      raw = data.SecretString;
    } else if (data.SecretBinary) {
      raw = Buffer.from(data.SecretBinary as Uint8Array).toString('utf8');
    } else {
      console.warn(`[${LOG_CONTEXT}] AWS Secrets Manager returned no value for configured secret.`);

      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;

    // Hydrating in-memory (no .env round-trip) means no escaping: multi-line PEM
    // secrets keep their real newlines, so consumers can pass them straight to crypto APIs.
    return Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, value === undefined || value === null ? '' : String(value)])
    );
  }
}
