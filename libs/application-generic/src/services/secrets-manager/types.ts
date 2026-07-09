export interface ISecretsManagerService {
  loadSecrets: () => Promise<Record<string, string>>;
}
