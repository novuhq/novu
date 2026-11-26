import { providers as novuProviders } from '@novu/shared';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IntegrationSettings } from '@/components/integrations/components/integration-settings';
import { IntegrationSheet } from '@/components/integrations/components/integration-sheet';
import { handleIntegrationError } from '@/components/integrations/components/utils/handle-integration-error';
import { cleanCredentials } from '@/components/integrations/components/utils/helpers';
import { IntegrationSettings as LegacyIntegrationSettings } from '@/components/integrations/legacy/integration-settings';
import { IntegrationSheet as LegacyIntegrationSheet } from '@/components/integrations/legacy/integration-sheet';
import type { IntegrationFormData } from '@/components/integrations/types';
import { useIsIntegrationStoreV2Enabled } from '@/components/integrations/use-integration-store-version';
import { Button } from '@/components/primitives/button';
import { showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useUpdateIntegration } from '@/hooks/use-update-integration';

export function IntegrationCredentialsSidebar({
  integrationId,
  isOpen,
  onClose,
  onSaveSuccess,
  agentOnboarding,
  agentIdentifier,
  testSubscriberId,
  submitLabel,
}: {
  integrationId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: () => void;
  agentOnboarding?: boolean;
  /**
   * Agent identifier for agent-onboarding flows. Threaded through to
   * provider-specific paste components so they can render agent-scoped UI
   * (e.g. the Telegram mobile setup QR code) inside the modal.
   */
  agentIdentifier?: string;
  /** Quickstart test subscriber for Telegram mobile `/start` deep links. */
  testSubscriberId?: string | null;
  submitLabel?: string;
}) {
  const { integrations } = useFetchIntegrations();
  const { mutateAsync: updateIntegration, isPending: isUpdating } = useUpdateIntegration();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formState, setFormState] = useState({ isValid: true, errors: {} as Record<string, unknown>, isDirty: false });
  const isIntegrationStoreV2Enabled = useIsIntegrationStoreV2Enabled();

  const integration = integrations?.find((i) => i._id === integrationId);
  const provider = novuProviders?.find((p) => p.id === integration?.providerId);

  useEffect(() => {
    if (!agentOnboarding) {
      return;
    }

    const hasAgentOnboardingParam = searchParams.get('agent_onboarding') === 'true';

    if ((isOpen && hasAgentOnboardingParam) || (!isOpen && !searchParams.has('agent_onboarding'))) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);

    if (isOpen) {
      nextSearchParams.set('agent_onboarding', 'true');
    } else {
      nextSearchParams.delete('agent_onboarding');
    }

    setSearchParams(nextSearchParams, { replace: true });
  }, [agentOnboarding, isOpen, searchParams, setSearchParams]);

  async function onSubmit(data: IntegrationFormData) {
    if (!integration) return;

    try {
      await updateIntegration({
        integrationId: integration._id,
        data: {
          name: data.name,
          identifier: data.identifier,
          active: data.active,
          primary: data.primary,
          credentials: cleanCredentials(data.credentials),
          check: data.check,
          configurations: data.configurations,
        },
      });

      showSuccessToast('Integration updated successfully');
      onSaveSuccess?.();
      onClose();
    } catch (error: unknown) {
      handleIntegrationError(error, 'update');
    }
  }

  if (!integration || !provider) return null;

  const Sheet = isIntegrationStoreV2Enabled ? IntegrationSheet : LegacyIntegrationSheet;
  const Settings = isIntegrationStoreV2Enabled ? IntegrationSettings : LegacyIntegrationSettings;

  return (
    <Sheet isOpened={isOpen} onClose={onClose} provider={provider} mode="update">
      <div className="scrollbar-custom flex-1 overflow-y-auto">
        <Settings
          provider={provider}
          integration={integration}
          onSubmit={onSubmit}
          mode="update"
          agentOnboarding={agentOnboarding}
          agentIdentifier={agentIdentifier}
          testSubscriberId={testSubscriberId}
          onFormStateChange={setFormState}
        />
      </div>

      <div className="bg-background flex justify-end gap-2 border-t p-3">
        <Button
          type="submit"
          form={`integration-configuration-form-${provider.id}`}
          isLoading={isUpdating}
          disabled={!formState.isValid}
        >
          {submitLabel ?? 'Save Changes'}
        </Button>
      </div>
    </Sheet>
  );
}
