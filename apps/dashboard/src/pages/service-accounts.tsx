import { PermissionsEnum, ServiceAccountScopeEnum, SigningSecretTypeEnum } from '@novu/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/page-meta';
import { Button } from '@/components/primitives/button';
import { Card, CardContent, CardHeader } from '@/components/primitives/card';
import { CopyButton } from '@/components/primitives/copy-button';
import { Input } from '@/components/primitives/input';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Container } from '@/components/primitives/container';
import { useEnvironment } from '@/context/environment/hooks';
import {
  useApiKeyCredentials,
  useCreateApiKeyCredential,
  useCreateServiceAccount,
  useCreateSigningSecret,
  useDeleteServiceAccount,
  useEnableApiKeysV2,
  useRevokeApiKeyCredential,
  useServiceAccounts,
  useSigningSecrets,
} from '@/hooks/use-service-accounts';
import { useHasPermission } from '@/hooks/use-has-permission';
import { ROUTES } from '@/utils/routes';

export function ServiceAccountsPage() {
  const { currentEnvironment } = useEnvironment();
  const has = useHasPermission();
  const canWrite = has({ permission: PermissionsEnum.API_KEY_WRITE });

  const serviceAccountsQuery = useServiceAccounts();
  const signingSecretsQuery = useSigningSecrets();
  const enableV2Mutation = useEnableApiKeysV2();
  const createServiceAccountMutation = useCreateServiceAccount();
  const createSigningSecretMutation = useCreateSigningSecret();

  const [selectedServiceAccountId, setSelectedServiceAccountId] = useState<string>('');
  const [newAccountName, setNewAccountName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [createdSigningSecret, setCreatedSigningSecret] = useState<string | null>(null);

  const apiKeysQuery = useApiKeyCredentials(selectedServiceAccountId);
  const createApiKeyMutation = useCreateApiKeyCredential(selectedServiceAccountId);
  const revokeApiKeyMutation = useRevokeApiKeyCredential(selectedServiceAccountId);
  const deleteServiceAccountMutation = useDeleteServiceAccount();

  const serviceAccounts = serviceAccountsQuery.data ?? [];

  if (!currentEnvironment) {
    return null;
  }

  async function handleEnableV2() {
    try {
      await enableV2Mutation.mutateAsync();
      showSuccessToast('API Keys v2 enabled. Signing secrets seeded from your legacy key.');
    } catch (error: unknown) {
      showErrorToast(error instanceof Error ? error.message : 'Failed to enable API Keys v2');
    }
  }

  async function handleCreateServiceAccount() {
    if (!newAccountName.trim()) {
      return;
    }

    try {
      const account = await createServiceAccountMutation.mutateAsync({
        name: newAccountName.trim(),
        scope: ServiceAccountScopeEnum.ENVIRONMENT,
        environmentId: currentEnvironment._id,
      });
      setNewAccountName('');
      setSelectedServiceAccountId(account._id);
      showSuccessToast('Service account created');
    } catch (error: unknown) {
      showErrorToast(error instanceof Error ? error.message : 'Failed to create service account');
    }
  }

  async function handleCreateApiKey() {
    try {
      const result = await createApiKeyMutation.mutateAsync({ name: 'API Key' });
      setCreatedKey(result.key);
      showSuccessToast('API key created — copy it now, it will not be shown again');
    } catch (error: unknown) {
      showErrorToast(error instanceof Error ? error.message : 'Failed to create API key');
    }
  }

  return (
    <>
      <PageMeta title="Service Accounts & API Keys v2" />
      <DashboardLayout headerStartItems={<h1 className="text-foreground-950">Service Accounts</h1>}>
        <Container className="flex w-full max-w-[900px] flex-col gap-6">
          <Card>
            <CardHeader>
              <p className="text-sm text-foreground-600">
                Migrate to API Keys v2 for multiple rotatable keys and decoupled signing secrets. Your legacy key keeps
                working until you revoke it.{' '}
                <Link to={ROUTES.API_KEYS.replace(':environmentSlug', currentEnvironment.slug)} className="underline">
                  View legacy API keys
                </Link>
              </p>
            </CardHeader>
            <CardContent>
              <Button variant="secondary" disabled={!canWrite || enableV2Mutation.isPending} onClick={handleEnableV2}>
                Enable API Keys v2 for this environment
              </Button>
            </CardContent>
          </Card>

          {canWrite && (
            <Card>
              <CardHeader>
                <h2 className="font-medium">Create environment-scoped service account</h2>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Input
                  placeholder="e.g. CI deploy bot"
                  value={newAccountName}
                  onChange={(event) => setNewAccountName(event.target.value)}
                />
                <Button disabled={createServiceAccountMutation.isPending} onClick={handleCreateServiceAccount}>
                  Create
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <h2 className="font-medium">Service accounts</h2>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {serviceAccounts.map((account) => (
                <div key={account._id} className="flex items-center justify-between rounded border p-3">
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => setSelectedServiceAccountId(account._id)}
                  >
                    <div className="font-medium">{account.name}</div>
                    <div className="text-xs text-foreground-500">
                      {account.scope} · {account._id}
                    </div>
                  </button>
                  {canWrite && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteServiceAccountMutation.mutate(account._id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {selectedServiceAccountId && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <h2 className="font-medium">API keys</h2>
                {canWrite && (
                  <Button size="sm" disabled={createApiKeyMutation.isPending} onClick={handleCreateApiKey}>
                    Create key
                  </Button>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {createdKey && (
                  <div className="flex items-center gap-2 rounded bg-foreground-50 p-3">
                    <code className="flex-1 break-all text-xs">{createdKey}</code>
                    <CopyButton valueToCopy={createdKey} />
                  </div>
                )}
                {(apiKeysQuery.data ?? []).map((key) => (
                  <div key={key._id} className="flex items-center justify-between rounded border p-3">
                    <div>
                      <div className="font-mono text-sm">
                        {key.keyPrefix}_...{key.last4}
                      </div>
                      <div className="text-xs text-foreground-500">
                        {key.name ?? 'Unnamed'} {key.revokedAt ? '(revoked)' : ''}
                      </div>
                    </div>
                    {canWrite && !key.revokedAt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeApiKeyMutation.mutate(key._id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h2 className="font-medium">Signing secrets</h2>
              {canWrite && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      const result = await createSigningSecretMutation.mutateAsync(
                        SigningSecretTypeEnum.SUBSCRIBER
                      );
                      setCreatedSigningSecret(result.secret);
                    }}
                  >
                    New subscriber secret
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      const result = await createSigningSecretMutation.mutateAsync(SigningSecretTypeEnum.BRIDGE);
                      setCreatedSigningSecret(result.secret);
                    }}
                  >
                    New bridge secret
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {createdSigningSecret && (
                <div className="flex items-center gap-2 rounded bg-foreground-50 p-3">
                  <code className="flex-1 break-all text-xs">{createdSigningSecret}</code>
                  <CopyButton valueToCopy={createdSigningSecret} />
                </div>
              )}
              {(signingSecretsQuery.data ?? []).map((secret) => (
                <div key={secret._id} className="rounded border p-3 text-sm">
                  <span className="font-medium">{secret.type}</span> · {secret.status} · {secret._id}
                </div>
              ))}
            </CardContent>
          </Card>
        </Container>
      </DashboardLayout>
    </>
  );
}
