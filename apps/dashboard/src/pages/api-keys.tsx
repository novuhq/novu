import { FeatureFlagsKeysEnum, IApiKey, PermissionsEnum } from '@novu/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiAddLine, RiDeleteBin2Line, RiEyeLine, RiEyeOffLine, RiLoopRightFill } from 'react-icons/ri';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { PageMeta } from '@/components/page-meta';
import { Card, CardContent, CardHeader } from '@/components/primitives/card';
import { CopyButton } from '@/components/primitives/copy-button';
import { Form } from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { Skeleton } from '@/components/primitives/skeleton';
import { ExternalLink } from '@/components/shared/external-link';
import { useEnvironment } from '@/context/environment/hooks';
import { getRegionConfig, useRegion } from '@/context/region';
import { apiHostnameManager } from '@/utils/api-hostname-manager';
import { DashboardLayout } from '../components/dashboard-layout';
import { Button } from '../components/primitives/button';
import { Container } from '../components/primitives/container';
import { HelpTooltipIndicator } from '../components/primitives/help-tooltip-indicator';
import { showErrorToast, showSuccessToast } from '../components/primitives/sonner-helpers';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/primitives/tooltip';
import { RegenerateApiKeysDialog } from '../components/regenerate-api-keys-dialog';
import { IS_SELF_HOSTED } from '../config';
import { useFeatureFlag } from '../hooks/use-feature-flag';
import { useCreateApiKey, useDeleteApiKey, useFetchApiKeys, useRegenerateApiKeys } from '../hooks/use-fetch-api-keys';
import { useHasPermission } from '../hooks/use-has-permission';

const MAX_SECRET_KEYS = 2;

// Convert https:// to wss:// for WebSocket URLs
const getWebSocketUrl = (url: string) => {
  if (!url) return url;
  return url.replace(/^https:\/\//, 'wss://');
};

interface ApiKeysFormData {
  apiKey: string;
  environmentId: string;
  identifier: string;
}

export function ApiKeysPage() {
  const apiKeysQuery = useFetchApiKeys();
  const { currentEnvironment } = useEnvironment();
  const { selectedRegion } = useRegion();
  const apiKeys = apiKeysQuery.data?.data;
  const isLoading = apiKeysQuery.isLoading;
  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = useState(false);
  const [keyPendingDeletion, setKeyPendingDeletion] = useState<IApiKey | null>(null);
  const regenerateApiKeysMutation = useRegenerateApiKeys();
  const createApiKeyMutation = useCreateApiKey();
  const deleteApiKeyMutation = useDeleteApiKey();
  const has = useHasPermission();
  const canRegenerateApiKeys = has({ permission: PermissionsEnum.API_KEY_WRITE });
  const isMultipleSecretKeysAllowed = useFeatureFlag(FeatureFlagsKeysEnum.IS_MULTIPLE_SECRET_KEYS_ALLOWED);
  const hasMaxSecretKeys = (apiKeys?.length ?? 0) >= MAX_SECRET_KEYS;

  const form = useForm<ApiKeysFormData>({
    values: {
      apiKey: apiKeys?.[0]?.key ?? '',
      environmentId: currentEnvironment?._id ?? '',
      identifier: currentEnvironment?.identifier ?? '',
    },
  });

  const handleRegenerateKeys = async () => {
    try {
      await regenerateApiKeysMutation.mutateAsync();
      showSuccessToast('API keys regenerated successfully');
      setIsRegenerateDialogOpen(false);
    } catch (e: any) {
      const message = e?.message || 'Failed to regenerate API keys';
      showErrorToast(message);
    }
  };

  const handleCreateKey = async () => {
    try {
      await createApiKeyMutation.mutateAsync();
      showSuccessToast('New secret key generated');
    } catch (e: any) {
      const message = e?.message || 'Failed to generate a new secret key';
      showErrorToast(message);
    }
  };

  const handleDeleteKey = async () => {
    if (!keyPendingDeletion?.hash) return;

    try {
      await deleteApiKeyMutation.mutateAsync({ hash: keyPendingDeletion.hash });
      showSuccessToast('Secret key deleted');
      setKeyPendingDeletion(null);
    } catch (e: any) {
      const message = e?.message || 'Failed to delete the secret key';
      showErrorToast(message);
    }
  };

  if (!currentEnvironment) {
    return null;
  }

  // Use dynamic region from region selector
  const region = getRegionConfig(selectedRegion)?.name || selectedRegion.toUpperCase();

  return (
    <>
      <PageMeta title={`API Keys for ${currentEnvironment?.name} environment`} />
      <DashboardLayout headerStartItems={<h1 className="text-foreground-950">API Keys</h1>}>
        <Container className="flex w-full max-w-[800px] flex-col gap-6">
          <Form {...form}>
            <Card className="w-full overflow-hidden shadow-none">
              <CardHeader>
                {'<Inbox />'}
                <p className="text-foreground-500 mt-1 text-xs font-normal">
                  {'Use the public application identifier in Novu <Inbox />. '}
                  <ExternalLink href="https://docs.novu.co/platform/inbox/overview" className="text-foreground-500">
                    Learn more
                  </ExternalLink>
                </p>
              </CardHeader>
              <CardContent className="rounded-b-xl border-t bg-neutral-50 bg-white p-4">
                <div className="space-y-4">
                  <SettingField
                    label="Application Identifier"
                    tooltip={`This is unique for the ${currentEnvironment.name} environment.`}
                    value={form.getValues('identifier')}
                    isLoading={isLoading}
                  />
                </div>
              </CardContent>
            </Card>
            <Card className="w-full overflow-hidden shadow-none">
              <CardHeader>
                Secret Keys
                <p className="text-foreground-500 mt-1 text-xs font-normal">
                  {'Use the secret key to authenticate your SDK requests. Keep it secure and never share it publicly. '}
                  <ExternalLink href="https://docs.novu.co/platform/sdks/overview" className="text-foreground-500">
                    Learn more
                  </ExternalLink>
                </p>
              </CardHeader>

              <CardContent className="rounded-b-xl border-t bg-neutral-50 bg-white p-4">
                {isMultipleSecretKeysAllowed ? (
                  <div className="space-y-4">
                    {isLoading && <SettingField label="Secret Key" secret isLoading />}
                    {!isLoading &&
                      apiKeys?.map((apiKey, index) => (
                        <SettingField
                          key={apiKey.hash ?? apiKey.key}
                          label={index === 0 ? 'Secret Key' : 'Secret Key (new)'}
                          tooltip="Keep it secure and never share it publicly"
                          value={apiKey.key}
                          secret
                          showRegenerateButton={canRegenerateApiKeys && index === 0}
                          onRegenerateClick={() => setIsRegenerateDialogOpen(true)}
                          isRegenerateLoading={regenerateApiKeysMutation.isPending}
                          showDeleteButton={canRegenerateApiKeys && (apiKeys?.length ?? 0) > 1}
                          onDeleteClick={() => setKeyPendingDeletion(apiKey)}
                          isDeleteLoading={deleteApiKeyMutation.isPending && keyPendingDeletion?.hash === apiKey.hash}
                        />
                      ))}
                    {canRegenerateApiKeys && (
                      <div className="flex items-center justify-between gap-3 border-t border-neutral-100 pt-3">
                        <p className="text-foreground-500 text-xs">
                          Key rotation: generate a new key, switch your apps to it, then delete the old key.
                        </p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                size="xs"
                                variant="secondary"
                                mode="outline"
                                leadingIcon={RiAddLine}
                                onClick={handleCreateKey}
                                disabled={isLoading || hasMaxSecretKeys}
                                isLoading={createApiKeyMutation.isPending}
                              >
                                Generate new key
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            {hasMaxSecretKeys
                              ? `You can have up to ${MAX_SECRET_KEYS} secret keys. Delete a key to generate a new one.`
                              : 'Generate an additional secret key for a rolling rotation'}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <SettingField
                      label="Secret Key"
                      tooltip="Keep it secure and never share it publicly"
                      value={form.getValues('apiKey')}
                      secret
                      isLoading={isLoading}
                      showRegenerateButton={canRegenerateApiKeys}
                      onRegenerateClick={() => setIsRegenerateDialogOpen(true)}
                      isRegenerateLoading={regenerateApiKeysMutation.isPending}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="w-full overflow-hidden shadow-none">
              <CardHeader>
                API URLs
                <p className="text-foreground-500 mt-1 text-xs font-normal">
                  {IS_SELF_HOSTED
                    ? 'API and WebSocket endpoints for your self-hosted Novu instance. '
                    : `API and WebSocket URLs for Novu Cloud in the ${region} region. `}
                  <ExternalLink href="https://docs.novu.co/api-reference/overview" className="text-foreground-500">
                    Learn more
                  </ExternalLink>
                </p>
              </CardHeader>
              <CardContent className="rounded-b-xl border-t bg-neutral-50 bg-white p-4">
                <div className="space-y-4">
                  <SettingField
                    label="API Hostname"
                    tooltip={
                      IS_SELF_HOSTED ? 'Your self-hosted Novu API endpoint' : `For Novu Cloud in the ${region} region`
                    }
                    value={apiHostnameManager.getHostname()}
                  />
                  <SettingField
                    label="WebSocket Hostname"
                    tooltip={
                      IS_SELF_HOSTED
                        ? 'Your self-hosted Novu WebSocket endpoint'
                        : `WebSocket endpoint for Novu Cloud in the ${region} region`
                    }
                    value={getWebSocketUrl(apiHostnameManager.getWebSocketHostname())}
                  />
                </div>
              </CardContent>
            </Card>
          </Form>
        </Container>
      </DashboardLayout>
      <RegenerateApiKeysDialog
        environment={currentEnvironment}
        open={isRegenerateDialogOpen}
        onOpenChange={setIsRegenerateDialogOpen}
        onConfirm={handleRegenerateKeys}
        isLoading={regenerateApiKeysMutation.isPending}
      />
      <ConfirmationModal
        open={!!keyPendingDeletion}
        onOpenChange={(open) => {
          if (!open) {
            setKeyPendingDeletion(null);
          }
        }}
        onConfirm={handleDeleteKey}
        title="Delete secret key"
        description={
          <span>
            The secret key ending in <span className="font-mono">…{keyPendingDeletion?.key?.slice(-4)}</span> will stop
            working within about a minute. Make sure none of your applications still use it before deleting.
          </span>
        }
        confirmButtonText="Delete key"
        confirmButtonVariant="error"
        isLoading={deleteApiKeyMutation.isPending}
      />
    </>
  );
}

interface SettingFieldProps {
  label: string;
  tooltip?: string;
  value?: string;
  secret?: boolean;
  isLoading?: boolean;
  readOnly?: boolean;
  showRegenerateButton?: boolean;
  onRegenerateClick?: () => void;
  isRegenerateLoading?: boolean;
  showDeleteButton?: boolean;
  onDeleteClick?: () => void;
  isDeleteLoading?: boolean;
}

function SettingField({
  label,
  tooltip,
  value,
  secret = false,
  isLoading = false,
  readOnly = true,
  showRegenerateButton = false,
  onRegenerateClick,
  isRegenerateLoading,
  showDeleteButton = false,
  onDeleteClick,
  isDeleteLoading,
}: SettingFieldProps) {
  const [showSecret, setShowSecret] = useState(false);

  const toggleSecretVisibility = () => {
    setShowSecret(!showSecret);
  };

  const maskSecret = (secret: string) => {
    return `${'•'.repeat(28)}${secret.slice(-4)}`;
  };

  return (
    <div className="grid grid-cols-[1fr_400px] items-center gap-3">
      <label className="text-foreground-600 font-medium\\ inline-flex items-center gap-1 text-xs">
        {label}
        {tooltip && <HelpTooltipIndicator text={tooltip} />}
      </label>
      <div className="flex items-center gap-2">
        {isLoading ? (
          <>
            <Skeleton className="h-[38px] flex-1 rounded-lg" />
            {secret && <Skeleton className="h-[38px] w-[38px] rounded-lg" />}
            {showRegenerateButton && <Skeleton className="h-[38px] w-[38px] rounded-lg" />}
            {showDeleteButton && <Skeleton className="h-[38px] w-[38px] rounded-lg" />}
          </>
        ) : (
          <>
            <Input
              className="cursor-default font-mono text-neutral-500!"
              value={secret ? (showSecret ? value : maskSecret(value ?? '')) : value}
              readOnly={readOnly}
              trailingNode={<CopyButton valueToCopy={value ?? ''} />}
              inlineTrailingNode={
                secret && (
                  <button type="button" onClick={toggleSecretVisibility}>
                    {showSecret ? (
                      <RiEyeOffLine className="text-text-sub group-has-[disabled]:text-text-disabled" />
                    ) : (
                      <RiEyeLine className="text-text-sub group-has-[disabled]:text-text-disabled" />
                    )}
                  </button>
                )
              }
            />
            {showRegenerateButton && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="md"
                    variant="secondary"
                    mode="outline"
                    onClick={onRegenerateClick}
                    disabled={isRegenerateLoading}
                    className="h-[38px] min-w-[38px] p-0"
                  >
                    <RiLoopRightFill className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Regenerate API Key</TooltipContent>
              </Tooltip>
            )}
            {showDeleteButton && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="md"
                    variant="secondary"
                    mode="outline"
                    onClick={onDeleteClick}
                    disabled={isDeleteLoading}
                    className="h-[38px] min-w-[38px] p-0"
                  >
                    <RiDeleteBin2Line className="text-destructive h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete API Key</TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </div>
    </div>
  );
}
