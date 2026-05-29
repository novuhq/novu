import { CreateApiKeyCredential } from './create-api-key-credential/create-api-key-credential.usecase';
import { CreateServiceAccount } from './create-service-account/create-service-account.usecase';
import { CreateSigningSecret } from './create-signing-secret/create-signing-secret.usecase';
import { DeleteServiceAccount } from './delete-service-account/delete-service-account.usecase';
import { EnableApiKeysV2 } from './enable-api-keys-v2/enable-api-keys-v2.usecase';
import { ListApiKeyCredentials } from './list-api-key-credentials/list-api-key-credentials.usecase';
import { ListServiceAccounts } from './list-service-accounts/list-service-accounts.usecase';
import { ListSigningSecrets } from './list-signing-secrets/list-signing-secrets.usecase';
import { RevokeApiKeyCredential } from './revoke-api-key-credential/revoke-api-key-credential.usecase';
import { RevokeSigningSecret } from './revoke-signing-secret/revoke-signing-secret.usecase';
import { RotateApiKeyCredential } from './rotate-api-key-credential/rotate-api-key-credential.usecase';

export const USE_CASES = [
  CreateServiceAccount,
  ListServiceAccounts,
  DeleteServiceAccount,
  CreateApiKeyCredential,
  ListApiKeyCredentials,
  RevokeApiKeyCredential,
  RotateApiKeyCredential,
  EnableApiKeysV2,
  ListSigningSecrets,
  CreateSigningSecret,
  RevokeSigningSecret,
];

export * from './create-api-key-credential/create-api-key-credential.command';
export * from './create-api-key-credential/create-api-key-credential.usecase';
export * from './create-service-account/create-service-account.command';
export * from './create-service-account/create-service-account.usecase';
export * from './create-signing-secret/create-signing-secret.command';
export * from './create-signing-secret/create-signing-secret.usecase';
export * from './delete-service-account/delete-service-account.command';
export * from './delete-service-account/delete-service-account.usecase';
export * from './enable-api-keys-v2/enable-api-keys-v2.command';
export * from './enable-api-keys-v2/enable-api-keys-v2.usecase';
export * from './list-api-key-credentials/list-api-key-credentials.command';
export * from './list-api-key-credentials/list-api-key-credentials.usecase';
export * from './list-service-accounts/list-service-accounts.command';
export * from './list-service-accounts/list-service-accounts.usecase';
export * from './list-signing-secrets/list-signing-secrets.command';
export * from './list-signing-secrets/list-signing-secrets.usecase';
export * from './revoke-api-key-credential/revoke-api-key-credential.command';
export * from './revoke-api-key-credential/revoke-api-key-credential.usecase';
export * from './revoke-signing-secret/revoke-signing-secret.command';
export * from './revoke-signing-secret/revoke-signing-secret.usecase';
export * from './rotate-api-key-credential/rotate-api-key-credential.command';
export * from './rotate-api-key-credential/rotate-api-key-credential.usecase';
