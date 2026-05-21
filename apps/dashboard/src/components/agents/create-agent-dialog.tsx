import {
  AgentRuntimeProviderIdEnum,
  FeatureFlagsKeysEnum,
  type IIntegration,
  IntegrationKindEnum,
  slugify,
} from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowRightSLine, RiArrowRightUpLine, RiCloseLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/primitives/dialog';
import {
  SegmentedControl,
  SegmentedControlList,
  SegmentedControlTrigger,
} from '@/components/primitives/segmented-control';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { useCreateIntegration } from '@/hooks/use-create-integration';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useVerifyManagedCredentials } from '@/hooks/use-verify-managed-credentials';
import { QueryKeys } from '@/utils/query-keys';
import { BotIcon } from '../icons/bot';
import { Tag } from '../primitives/tag';
import {
  ConnectorIntegrationDropdown,
  type ConnectorIntegrationStatus,
} from './connectors/connector-integration-dropdown';
import { type ConnectorId, type ConnectorOption, getConnectorById } from './connectors/connector-options';
import {
  AGENT_TEMPLATES,
  type AgentTemplate,
  ConfigureCredentialsSection,
  type CreateAgentForm,
  type CreateAgentFormErrors,
  type CreateAgentMode,
  ExistingAgentFields,
  hasFormErrors,
  ScratchAgentFields,
  type VerifyStatus,
  validateCreateAgentForm,
} from './create-agent-fields';

const DOCS_AGENTS_LEARN_MORE_HREF = 'https://docs.novu.co';

export type { CreateAgentForm } from './create-agent-fields';

type CreateAgentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: CreateAgentForm) => Promise<void>;
  isSubmitting: boolean;
  initialName?: string;
  initialInstructions?: string;
};

const DEFAULT_CONNECTOR_ID: ConnectorId = 'claude';

function dropdownStatusFor(verify: VerifyStatus, hasIntegration: boolean): ConnectorIntegrationStatus {
  if (hasIntegration || verify === 'valid') return 'valid';
  if (verify === 'invalid') return 'missing';

  return 'idle';
}

export function CreateAgentDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  initialName,
  initialInstructions,
}: CreateAgentDialogProps) {
  const isManagedEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_MANAGED_AGENT_RUNTIME_ENABLED, false);
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const { integrations } = useFetchIntegrations();
  const verifyMutation = useVerifyManagedCredentials();
  const { mutateAsync: createIntegration, isPending: isSavingIntegration } = useCreateIntegration();

  const [connectorId, setConnectorId] = useState<ConnectorId>(DEFAULT_CONNECTOR_ID);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | undefined>(undefined);
  const [credentialsPanelVisible, setCredentialsPanelVisible] = useState(false);
  const [credentialsPanelExpanded, setCredentialsPanelExpanded] = useState(true);
  const [mode, setMode] = useState<CreateAgentMode>('create');
  const [name, setName] = useState(initialName ?? '');
  const [identifier, setIdentifier] = useState(initialName ? slugify(initialName) : '');
  const [instructions, setInstructions] = useState(initialInstructions ?? '');
  const [apiKey, setApiKey] = useState('');
  const [externalWorkspaceId, setExternalWorkspaceId] = useState('');
  const [integrationName, setIntegrationName] = useState('');
  const [externalAgentId, setExternalAgentId] = useState('');
  const [externalEnvironmentId, setExternalEnvironmentId] = useState('');
  const [errors, setErrors] = useState<CreateAgentFormErrors>({});
  const [isIdentifierTouched, setIsIdentifierTouched] = useState(false);
  const [templateOffset] = useState(0);
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle');
  const [verifyMessage, setVerifyMessage] = useState<string | undefined>(undefined);
  // Tracks the last apiKey we sent for verification so we can drop stale responses (the user may
  // edit the key faster than the request returns).
  const lastVerifiedKeyRef = useRef<string | null>(null);
  // Brief confirmation badge that flashes in the dropdown trigger right after a successful save.
  const [showSavedBadge, setShowSavedBadge] = useState(false);
  const savedBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Holds the integration id from "Save integration" until it appears in the fetched list, so the
  // auto-select effect does not overwrite it or reopen the credentials section during refetch.
  const pinnedIntegrationIdRef = useRef<string | null>(null);

  const visibleTemplates = AGENT_TEMPLATES.slice(templateOffset, templateOffset + 4);

  const selectedConnector = getConnectorById(connectorId);
  const isClaudeSelected = connectorId === 'claude';
  const showManagedOptions = isManagedEnabled;

  // Hide managed connectors when the feature flag is off — the dropdown still lists them visually,
  // but selecting a managed connector should be impossible. We achieve this by short-circuiting to
  // 'custom-scaffold' when managed is disabled.
  useEffect(() => {
    if (!open) return;
    if (showManagedOptions) return;
    if (selectedConnector?.runtime !== 'claude') return;

    setConnectorId('custom-scaffold');
  }, [open, showManagedOptions, selectedConnector?.runtime]);

  const matchingAnthropicIntegrations = useMemo(() => {
    if (!selectedConnector?.providerId) return [];

    return (integrations ?? []).filter(
      (i) => i.kind === IntegrationKindEnum.AGENT && i.providerId === selectedConnector.providerId
    );
  }, [integrations, selectedConnector?.providerId]);

  // Auto-select the first existing integration of the chosen provider on open / when the connector
  // changes / when integrations finish loading. If none exist, open the inline credentials section.
  // Skipped when the user is setting up new credentials (panel visible, no integration selected), so we
  // don't overwrite their choice with an existing integration.
  useEffect(() => {
    if (!open) return;
    if (isSubmitting) return;

    const pinnedId = pinnedIntegrationIdRef.current;
    if (pinnedId) {
      const pinnedExists = matchingAnthropicIntegrations.some((i) => i._id === pinnedId);
      if (pinnedExists) {
        pinnedIntegrationIdRef.current = null;
      } else if (selectedIntegrationId !== pinnedId) {
        setSelectedIntegrationId(pinnedId);
      }

      return;
    }

    if (credentialsPanelVisible && !selectedIntegrationId) return;
    if (!selectedConnector?.providerId) {
      setSelectedIntegrationId(undefined);

      return;
    }

    if (selectedIntegrationId) {
      const stillExists = matchingAnthropicIntegrations.some((i) => i._id === selectedIntegrationId);
      if (stillExists) return;
    }

    if (matchingAnthropicIntegrations.length > 0) {
      setSelectedIntegrationId(matchingAnthropicIntegrations[0]._id);
    } else {
      setSelectedIntegrationId(undefined);
      setCredentialsPanelVisible(true);
      setCredentialsPanelExpanded(true);
    }
  }, [
    open,
    isSubmitting,
    selectedConnector?.providerId,
    matchingAnthropicIntegrations,
    selectedIntegrationId,
    credentialsPanelVisible,
  ]);

  // Default integration name = "<Provider> <next-index>"
  useEffect(() => {
    if (!credentialsPanelVisible || !selectedConnector?.providerLabel) return;
    if (integrationName.trim()) return;

    const nextIndex = matchingAnthropicIntegrations.length + 1;
    setIntegrationName(`${selectedConnector.providerLabel} ${nextIndex}`);
  }, [
    credentialsPanelVisible,
    selectedConnector?.providerLabel,
    matchingAnthropicIntegrations.length,
    integrationName,
  ]);

  useEffect(() => {
    if (!open) return;

    setName(initialName ?? '');
    setIdentifier(initialName ? slugify(initialName) : '');
    setInstructions(initialInstructions ?? '');
    setIsIdentifierTouched(false);
    setErrors({});
  }, [open, initialName, initialInstructions]);

  const reset = useCallback(() => {
    setConnectorId(DEFAULT_CONNECTOR_ID);
    setSelectedIntegrationId(undefined);
    setCredentialsPanelVisible(false);
    setCredentialsPanelExpanded(true);
    setMode('create');
    setName('');
    setIdentifier('');
    setInstructions('');
    setApiKey('');
    setExternalWorkspaceId('');
    setIntegrationName('');
    setExternalAgentId('');
    setExternalEnvironmentId('');
    setErrors({});
    setIsIdentifierTouched(false);
    setVerifyStatus('idle');
    setVerifyMessage(undefined);
    lastVerifiedKeyRef.current = null;
    setShowSavedBadge(false);
    pinnedIntegrationIdRef.current = null;
    if (savedBadgeTimerRef.current) {
      clearTimeout(savedBadgeTimerRef.current);
      savedBadgeTimerRef.current = null;
    }
  }, []);

  const prevOpenRef = useRef(open);

  // Reset form state only after the dialog has closed — not while it is still visible (e.g. during
  // the exit animation or between successful submit and the parent setting `open` to false).
  useEffect(() => {
    if (prevOpenRef.current && !open) {
      reset();
    }

    prevOpenRef.current = open;
  }, [open, reset]);

  useEffect(() => {
    return () => {
      if (savedBadgeTimerRef.current) clearTimeout(savedBadgeTimerRef.current);
    };
  }, []);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const handleTemplateSelect = (template: AgentTemplate) => {
    setName(template.name);
    if (!isIdentifierTouched) {
      setIdentifier(slugify(template.name));
      setErrors((prev) => ({ ...prev, identifier: undefined }));
    }
    setInstructions(template.instructions);
    setErrors((prev) => ({ ...prev, name: undefined }));
  };

  const handleSelectConnector = (id: ConnectorId) => {
    setConnectorId(id);

    const next = getConnectorById(id);
    // Switching to a non-managed connector clears the credentials view.
    if (!next?.providerId) {
      setSelectedIntegrationId(undefined);
      setCredentialsPanelVisible(false);
      setApiKey('');
      setVerifyStatus('idle');
      setVerifyMessage(undefined);
    }
  };

  const handleSelectIntegration = (integration: { _id: string }) => {
    setSelectedIntegrationId(integration._id);
    setCredentialsPanelVisible(false);
    setApiKey('');
    setVerifyStatus('idle');
    setVerifyMessage(undefined);
    setErrors((prev) => ({ ...prev, apiKey: undefined, integrationName: undefined }));
  };

  const handleRequestSetupCredentials = (option: ConnectorOption) => {
    setSelectedIntegrationId(undefined);
    setCredentialsPanelVisible(true);
    setCredentialsPanelExpanded(true);

    if (option.providerLabel && !integrationName.trim()) {
      const nextIndex =
        (integrations ?? []).filter((i) => i.kind === IntegrationKindEnum.AGENT && i.providerId === option.providerId)
          .length + 1;
      setIntegrationName(`${option.providerLabel} ${nextIndex}`);
    }
  };

  const handleVerify = (keyToVerify: string) => {
    if (!selectedConnector?.providerId) return;
    const trimmedApiKey = keyToVerify.trim();
    const trimmedWorkspaceId = externalWorkspaceId.trim();
    if (!trimmedApiKey) return;
    if (verifyMutation.isPending) return;
    if (lastVerifiedKeyRef.current === trimmedApiKey && verifyStatus === 'valid') return;

    lastVerifiedKeyRef.current = trimmedApiKey;
    setVerifyStatus('verifying');
    setVerifyMessage(undefined);

    verifyMutation.mutate(
      {
        providerId: selectedConnector.providerId,
        apiKey: trimmedApiKey,
        externalWorkspaceId: trimmedWorkspaceId || undefined,
      },
      {
        onSuccess: () => {
          // Drop stale responses if the api-key changed during the request.
          if (lastVerifiedKeyRef.current !== keyToVerify) return;
          setVerifyStatus('valid');
          setVerifyMessage(undefined);
          setErrors((prev) => ({ ...prev, apiKey: undefined }));
        },
        onError: (err) => {
          if (lastVerifiedKeyRef.current !== keyToVerify) return;
          setVerifyStatus('invalid');
          setVerifyMessage(err instanceof Error ? err.message : 'Invalid');
        },
      }
    );
  };

  const handleApiKeyChange = (next: string) => {
    setApiKey(next);
    setVerifyStatus('idle');
    setVerifyMessage(undefined);
    lastVerifiedKeyRef.current = null;
    setErrors((prev) => ({ ...prev, apiKey: undefined }));
  };

  const handleSaveIntegration = async () => {
    if (!selectedConnector?.providerId) return;

    const trimmedApiKey = apiKey.trim();
    const trimmedName = integrationName.trim();
    const trimmedWorkspaceId = externalWorkspaceId.trim();

    if (!trimmedApiKey || !trimmedName) return;

    try {
      const { data: integration } = await createIntegration({
        active: true,
        kind: IntegrationKindEnum.AGENT,
        providerId: selectedConnector.providerId,
        credentials: {
          apiKey: trimmedApiKey,
          ...(trimmedWorkspaceId ? { externalWorkspaceId: trimmedWorkspaceId } : {}),
        },
        name: trimmedName,
      });

      const environmentId = currentEnvironment?._id;
      if (environmentId) {
        queryClient.setQueryData<IIntegration[]>([QueryKeys.fetchIntegrations, environmentId], (existing) => {
          const list = existing ?? [];
          if (list.some((item) => item._id === integration._id)) return list;

          return [...list, integration];
        });
      }

      pinnedIntegrationIdRef.current = integration._id;
      setCredentialsPanelVisible(true);
      setCredentialsPanelExpanded(false);
      setSelectedIntegrationId(integration._id);
      setApiKey('');
      setExternalWorkspaceId('');
      setVerifyStatus('idle');
      setVerifyMessage(undefined);
      lastVerifiedKeyRef.current = null;
      setShowSavedBadge(true);
      if (savedBadgeTimerRef.current) clearTimeout(savedBadgeTimerRef.current);
      savedBadgeTimerRef.current = setTimeout(() => setShowSavedBadge(false), 2500);
      showSuccessToast(`${trimmedName} is ready to use.`, 'Integration saved');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save integration.';
      showErrorToast(message, 'Save failed');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const runtime = selectedConnector?.runtime ?? 'scratch';
    const isExistingMode = runtime === 'claude' && mode === 'existing';

    const nextErrors = validateCreateAgentForm({
      name,
      identifier,
      instructions,
      apiKey,
      runtime,
      isExistingMode,
      externalAgentId,
      externalEnvironmentId,
      externalWorkspaceId,
      integrationId: selectedIntegrationId,
      integrationName,
    });

    if (hasFormErrors(nextErrors)) {
      setErrors(nextErrors);

      return;
    }

    setErrors({});

    const trimmedInstructions = instructions.trim();
    const trimmedName = name.trim();
    const trimmedIdentifier = identifier.trim();
    const trimmedApiKey = apiKey.trim();
    const trimmedIntegrationName = integrationName.trim();
    const trimmedExternalAgentId = externalAgentId.trim();
    const trimmedExternalEnvironmentId = externalEnvironmentId.trim();
    const trimmedExternalWorkspaceId = externalWorkspaceId.trim();

    try {
      await onSubmit({
        name: trimmedName,
        identifier: trimmedIdentifier,
        instructions: trimmedInstructions,
        apiKey: trimmedApiKey,
        runtime,
        isExistingMode,
        externalAgentId: trimmedExternalAgentId,
        externalEnvironmentId: trimmedExternalEnvironmentId,
        externalWorkspaceId: trimmedExternalWorkspaceId || undefined,
        integrationId: selectedIntegrationId,
        integrationName: trimmedIntegrationName || undefined,
      });
      // Parent closes the dialog in onSuccess — do not reset here while the modal is still open.
    } catch {
      // Caller surfaces a toast; keep the dialog open so the user can retry.
    }
  };

  const dropdownStatus = dropdownStatusFor(verifyStatus, Boolean(selectedIntegrationId));
  const showCredentialsSection = isClaudeSelected && credentialsPanelVisible;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="border-stroke-soft max-w-[600px] gap-0 overflow-hidden rounded-12 border p-0 shadow-xl sm:rounded-12 min-w-[400px]"
        hideCloseButton
      >
        <div className="bg-bg-weak flex flex-col gap-3 p-4">
          <div className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <DialogTitle className="text-text-strong text-[16px] font-medium leading-6 tracking-[-0.176px]">
                Add agent
              </DialogTitle>
              <DialogDescription className="text-text-soft text-label-xs leading-4">
                Give your agent a unified way to communicate with your users.{' '}
                <a
                  href={DOCS_AGENTS_LEARN_MORE_HREF}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-text-soft hover:text-text-sub inline-flex items-center gap-0.5 underline-offset-2 hover:underline"
                >
                  Learn more
                  <RiArrowRightUpLine className="size-3.5 shrink-0" aria-hidden />
                </a>
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <CompactButton size="md" variant="ghost" icon={RiCloseLine}>
                <span className="sr-only">Close</span>
              </CompactButton>
            </DialogClose>
          </div>
        </div>

        <div className="border-stroke-soft border-y" />

        <form onSubmit={handleSubmit}>
          <div className="bg-background flex max-h-[70vh] flex-col gap-5 overflow-y-auto p-4">
            <div className="flex flex-col gap-2">
              <span className="text-text-strong text-label-xs font-medium">Where do you want your agent?</span>
              <ConnectorIntegrationDropdown
                selectedConnectorId={connectorId}
                selectedIntegrationId={selectedIntegrationId}
                integrations={integrations}
                status={dropdownStatus}
                showStatusBadge={showSavedBadge}
                onSelectConnector={handleSelectConnector}
                onSelectIntegration={handleSelectIntegration}
                onRequestSetupCredentials={handleRequestSetupCredentials}
              />

              {showCredentialsSection && selectedConnector?.providerId ? (
                <ConfigureCredentialsSection
                  providerId={selectedConnector.providerId as AgentRuntimeProviderIdEnum}
                  providerLabel={selectedConnector.providerLabel ?? 'Provider'}
                  integrationName={integrationName}
                  apiKey={apiKey}
                  externalWorkspaceId={externalWorkspaceId}
                  errors={errors}
                  disabled={isSubmitting}
                  status={verifyStatus}
                  statusMessage={verifyMessage}
                  isSaving={isSavingIntegration}
                  expanded={credentialsPanelExpanded}
                  onExpandedChange={setCredentialsPanelExpanded}
                  onIntegrationNameChange={(next) => {
                    setIntegrationName(next);
                    setErrors((prev) => ({ ...prev, integrationName: undefined }));
                  }}
                  onApiKeyChange={handleApiKeyChange}
                  onExternalWorkspaceIdChange={(next) => {
                    setExternalWorkspaceId(next);
                    // Invalidate the previous verification so the user re-verifies after changing scope.
                    setVerifyStatus('idle');
                    setVerifyMessage(undefined);
                    lastVerifiedKeyRef.current = null;
                  }}
                  onVerify={handleVerify}
                  onSave={handleSaveIntegration}
                />
              ) : null}
            </div>

            {isClaudeSelected && (
              <SegmentedControl value={mode} onValueChange={(v) => setMode(v as CreateAgentMode)}>
                <SegmentedControlList className="rounded-[5px] bg-bg-muted p-px">
                  <SegmentedControlTrigger value="create" className="text-label-xs">
                    Create new agent
                  </SegmentedControlTrigger>
                  <SegmentedControlTrigger value="existing" className="text-label-xs">
                    Connect existing agent
                  </SegmentedControlTrigger>
                </SegmentedControlList>
              </SegmentedControl>
            )}

            {isClaudeSelected && mode === 'existing' ? (
              <ExistingAgentFields
                externalAgentId={externalAgentId}
                externalEnvironmentId={externalEnvironmentId}
                errors={errors}
                onExternalAgentIdChange={(next) => {
                  setExternalAgentId(next);
                  setErrors((prev) => ({ ...prev, externalAgentId: undefined }));
                }}
                onExternalEnvironmentIdChange={(next) => {
                  setExternalEnvironmentId(next);
                  setErrors((prev) => ({ ...prev, externalEnvironmentId: undefined }));
                }}
              />
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2.5">
                  <span className="text-text-sub text-label-xs font-medium">Start from a template</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {visibleTemplates.map((template) => (
                      <button
                        key={template.label}
                        type="button"
                        onClick={() => handleTemplateSelect(template)}
                        className="cursor-pointer rounded-full"
                      >
                        <Tag className="h-7 rounded-full" variant="stroke">
                          <BotIcon className="text-feature size-4 shrink-0" />
                          {template.label}
                        </Tag>
                      </button>
                    ))}
                  </div>
                </div>

                <ScratchAgentFields
                  name={name}
                  identifier={identifier}
                  instructions={instructions}
                  errors={errors}
                  isIdentifierTouched={isIdentifierTouched}
                  isClaudeSelected={isClaudeSelected}
                  onNameChange={(next) => {
                    setName(next);
                    setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  onIdentifierChange={(next) => {
                    setIdentifier(next);
                    setErrors((prev) => ({ ...prev, identifier: undefined }));
                  }}
                  onIdentifierTouched={() => setIsIdentifierTouched(true)}
                  onInstructionsChange={setInstructions}
                />
              </div>
            )}
          </div>

          <div className="bg-bg-weak border-stroke-soft flex items-center justify-end border-t px-4 py-3">
            <Button
              variant="secondary"
              mode="gradient"
              size="xs"
              type="submit"
              isLoading={isSubmitting}
              trailingIcon={RiArrowRightSLine}
            >
              Setup agent
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
