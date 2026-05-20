import { type IIntegration, IntegrationKindEnum, slugify } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { type ConnectorIntegrationStatus } from '@/components/agents/connectors/connector-integration-dropdown';
import { type ConnectorOption } from '@/components/agents/connectors/connector-options';
import {
  type CreateAgentForm,
  type CreateAgentFormErrors,
  hasFormErrors,
  type RuntimeType,
  type VerifyStatus,
  validateCreateAgentForm,
} from '@/components/agents/create-agent-fields';
import { AGENT_TEMPLATES } from '@/components/connect/dashboard/agent-templates';
import { ClaudeIcon } from '@/components/icons/claude';
import { Button } from '@/components/primitives/button';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { ExternalLink } from '@/components/shared/external-link';
import { useEnvironment } from '@/context/environment/hooks';
import { useCreateAgentMutation } from '@/hooks/use-create-agent-mutation';
import { useCreateIntegration } from '@/hooks/use-create-integration';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useTelemetry } from '@/hooks/use-telemetry';
import { useVerifyManagedCredentials } from '@/hooks/use-verify-managed-credentials';
import { QueryKeys } from '@/utils/query-keys';
import { TelemetryEvent } from '@/utils/telemetry';
import { ConnectAgentForm } from './connect-agent-form';
import { type ConnectSummary } from './connect-summary';
import { CONNECTOR_OPTIONS, type ConnectorId, getConnectorById } from './connector-options';
import type { TemplateSelection } from './template-dropdown';

export type { ConnectSummary } from './connect-summary';

const DOCS_AGENTS_LEARN_MORE_HREF = 'https://docs.novu.co/agents/overview';

const DEFAULT_CONNECTOR: ConnectorId = 'claude';

function resolveRuntime(connectorId: ConnectorId): RuntimeType {
  const runtime = getConnectorById(connectorId)?.runtime;

  return runtime ?? 'scratch';
}

function pickInitialConnector(isManagedEnabled: boolean): ConnectorId {
  if (isManagedEnabled) return DEFAULT_CONNECTOR;

  const fallback = CONNECTOR_OPTIONS.find((o) => !o.comingSoon && o.runtime === 'scratch');

  return (fallback?.id ?? 'custom-scaffold') as ConnectorId;
}

function dropdownStatusFor(verify: VerifyStatus, hasIntegration: boolean): ConnectorIntegrationStatus {
  if (hasIntegration || verify === 'valid') return 'valid';
  if (verify === 'invalid') return 'missing';

  return 'idle';
}

type ConnectAgentStepProps = {
  onAgentCreated: (agent: AgentResponse, summary: ConnectSummary) => void;
  onRuntimeChange?: (runtime: RuntimeType) => void;
  isManagedEnabled: boolean;
};

const DEFAULT_TEMPLATE = AGENT_TEMPLATES[0];

export function ConnectAgentStep({ onAgentCreated, onRuntimeChange, isManagedEnabled }: ConnectAgentStepProps) {
  const telemetry = useTelemetry();
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();
  const { submit, isPending } = useCreateAgentMutation();
  const { integrations } = useFetchIntegrations();
  const verifyMutation = useVerifyManagedCredentials();
  const { mutateAsync: createIntegration, isPending: isSavingIntegration } = useCreateIntegration();

  const [connectorId, setConnectorId] = useState<ConnectorId>(() => pickInitialConnector(isManagedEnabled));
  const [templateSelection, setTemplateSelection] = useState<TemplateSelection>({
    kind: 'template',
    template: DEFAULT_TEMPLATE,
  });

  const [name, setName] = useState(DEFAULT_TEMPLATE.name);
  const [identifier, setIdentifier] = useState(slugify(DEFAULT_TEMPLATE.name));
  const [instructions, setInstructions] = useState(DEFAULT_TEMPLATE.instructions);
  const [apiKey, setApiKey] = useState('');
  const [externalWorkspaceId, setExternalWorkspaceId] = useState('');
  const [externalAgentId, setExternalAgentId] = useState('');
  const [externalEnvironmentId, setExternalEnvironmentId] = useState('');
  const [isIdentifierTouched, setIsIdentifierTouched] = useState(false);
  const [errors, setErrors] = useState<CreateAgentFormErrors>({});

  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | undefined>(undefined);
  const [credentialsPanelVisible, setCredentialsPanelVisible] = useState(false);
  const [credentialsPanelExpanded, setCredentialsPanelExpanded] = useState(true);
  const [integrationName, setIntegrationName] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle');
  const [verifyMessage, setVerifyMessage] = useState<string | undefined>(undefined);
  const [showSavedBadge, setShowSavedBadge] = useState(false);
  // Tracks the last apiKey we sent for verification so we can drop stale responses.
  const lastVerifiedKeyRef = useRef<string | null>(null);
  const savedBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Holds the integration id from "Save integration" until it appears in the fetched list, so the
  // auto-select effect does not overwrite it or reopen the credentials section during refetch.
  const pinnedIntegrationIdRef = useRef<string | null>(null);

  const runtime = useMemo(() => resolveRuntime(connectorId), [connectorId]);
  const isClaudeSelected = runtime === 'claude';
  const isExistingMode = isClaudeSelected && templateSelection.kind === 'existing';
  const isScratchMode = templateSelection.kind === 'scratch';
  const showExistingOption = isClaudeSelected;
  const existingOptionIcon = isClaudeSelected ? (
    <div className="bg-primary-base/10 text-primary-base flex size-4 items-center justify-center rounded-full">
      <ClaudeIcon className="size-3" />
    </div>
  ) : undefined;

  const selectedConnector = getConnectorById(connectorId);

  const matchingAnthropicIntegrations = useMemo(() => {
    if (!selectedConnector?.providerId) return [];

    return (integrations ?? []).filter(
      (i) => i.kind === IntegrationKindEnum.AGENT && i.providerId === selectedConnector.providerId
    );
  }, [integrations, selectedConnector?.providerId]);

  useEffect(() => {
    onRuntimeChange?.(runtime);
  }, [runtime, onRuntimeChange]);

  // When the connector changes away from a managed runtime, the "Use an existing agent" mode is
  // no longer reachable — collapse back to scratch so the form fields stay consistent.
  useEffect(() => {
    if (!showExistingOption && templateSelection.kind === 'existing') {
      setTemplateSelection({ kind: 'scratch' });
    }
  }, [showExistingOption, templateSelection.kind]);

  // Auto-select the first existing integration of the chosen provider on mount / when the connector
  // changes / when integrations finish loading. If none exist, open the inline credentials section.
  // We intentionally wait for `integrations` to be defined — on the onboarding entry-point the list
  // hasn't been fetched yet, so treating `undefined` as "no integrations" would prematurely open the
  // credentials panel and then block the auto-select once data arrives.
  useEffect(() => {
    if (isPending) return;
    if (integrations === undefined) return;

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
      setCredentialsPanelVisible(false);
    } else {
      setSelectedIntegrationId(undefined);
      setCredentialsPanelVisible(true);
      setCredentialsPanelExpanded(true);
    }
  }, [
    isPending,
    integrations,
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
    return () => {
      if (savedBadgeTimerRef.current) clearTimeout(savedBadgeTimerRef.current);
    };
  }, []);

  const handleConnectorChange = useCallback((id: ConnectorId) => {
    setConnectorId(id);

    const next = getConnectorById(id);
    if (!next?.providerId) {
      setSelectedIntegrationId(undefined);
      setCredentialsPanelVisible(false);
      setApiKey('');
      setVerifyStatus('idle');
      setVerifyMessage(undefined);
    }
  }, []);

  const handleTemplateChange = (next: TemplateSelection) => {
    setTemplateSelection(next);

    if (next.kind === 'template') {
      setName(next.template.name);
      if (!isIdentifierTouched) {
        setIdentifier(slugify(next.template.name));
        setErrors((prev) => ({ ...prev, identifier: undefined }));
      }
      setInstructions(next.template.instructions);
      setErrors((prev) => ({ ...prev, name: undefined }));
      setExternalAgentId('');
      setExternalEnvironmentId('');
    } else if (next.kind === 'scratch') {
      setName('');
      setIdentifier('');
      setInstructions('');
      setExternalAgentId('');
      setExternalEnvironmentId('');
    } else if (next.kind === 'existing') {
      setName('');
      setIdentifier('');
      setInstructions('');
      setExternalAgentId('');
      setExternalEnvironmentId('');
    }
  };

  const handleSelectIntegration = useCallback((integration: IIntegration) => {
    setSelectedIntegrationId(integration._id);
    setCredentialsPanelVisible(false);
    setApiKey('');
    setVerifyStatus('idle');
    setVerifyMessage(undefined);
    setErrors((prev) => ({ ...prev, apiKey: undefined, integrationName: undefined }));
  }, []);

  const handleRequestSetupCredentials = useCallback(
    (option: ConnectorOption) => {
      setSelectedIntegrationId(undefined);
      setCredentialsPanelVisible(true);
      setCredentialsPanelExpanded(true);
      setVerifyStatus('idle');
      setVerifyMessage(undefined);
      lastVerifiedKeyRef.current = null;

      if (option.providerLabel && !integrationName.trim()) {
        const nextIndex =
          (integrations ?? []).filter((i) => i.kind === IntegrationKindEnum.AGENT && i.providerId === option.providerId)
            .length + 1;
        setIntegrationName(`${option.providerLabel} ${nextIndex}`);
      }
    },
    [integrations, integrationName]
  );

  const handleApiKeyChange = useCallback((next: string) => {
    setApiKey(next);
    setVerifyStatus('idle');
    setVerifyMessage(undefined);
    setErrors((prev) => ({ ...prev, apiKey: undefined }));
  }, []);

  const handleExternalWorkspaceIdChange = useCallback((next: string) => {
    setExternalWorkspaceId(next);
    setVerifyStatus('idle');
    setVerifyMessage(undefined);
    lastVerifiedKeyRef.current = null;
  }, []);

  const handleVerify = useCallback(
    (keyToVerify: string) => {
      if (!selectedConnector?.providerId) return;
      if (verifyMutation.isPending) return;
      if (lastVerifiedKeyRef.current === keyToVerify && verifyStatus === 'valid') return;

      lastVerifiedKeyRef.current = keyToVerify;
      setVerifyStatus('verifying');
      setVerifyMessage(undefined);

      verifyMutation.mutate(
        {
          providerId: selectedConnector.providerId,
          apiKey: keyToVerify,
          externalWorkspaceId: externalWorkspaceId || undefined,
        },
        {
          onSuccess: () => {
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
    },
    [selectedConnector?.providerId, externalWorkspaceId, verifyMutation, verifyStatus]
  );

  const handleSaveIntegration = useCallback(async () => {
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
  }, [
    selectedConnector?.providerId,
    apiKey,
    integrationName,
    externalWorkspaceId,
    createIntegration,
    currentEnvironment?._id,
    queryClient,
  ]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const form: CreateAgentForm = {
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
    };

    const nextErrors = validateCreateAgentForm(form);

    if (hasFormErrors(nextErrors)) {
      setErrors(nextErrors);

      return;
    }

    setErrors({});

    telemetry(TelemetryEvent.ONBOARDING_CONNECT_AGENT_SUBMITTED, {
      runtime,
      connectorId,
      templateKind: templateSelection.kind,
      templateLabel: templateSelection.kind === 'template' ? templateSelection.template.label : undefined,
      isExistingMode,
    });

    const summary: ConnectSummary = {
      connectorId,
      templateSelection,
      name,
      identifier,
      instructions,
      apiKey,
      externalAgentId,
      externalEnvironmentId,
      externalWorkspaceId,
      selectedIntegrationId,
      integrationName,
    };

    await submit(
      {
        name: name.trim(),
        identifier: identifier.trim(),
        instructions: instructions.trim(),
        apiKey: apiKey.trim(),
        runtime,
        isExistingMode,
        externalAgentId: externalAgentId.trim(),
        externalEnvironmentId: externalEnvironmentId.trim(),
        externalWorkspaceId: externalWorkspaceId.trim() || undefined,
        integrationId: selectedIntegrationId,
        integrationName: integrationName.trim() || undefined,
      },
      {
        onSuccess: (agent) => onAgentCreated(agent, summary),
        onError: (err) => {
          const message = err instanceof NovuApiError ? err.message : 'Could not create agent.';
          showErrorToast(message, 'Create failed');
        },
      }
    );
  };

  const dropdownStatus = dropdownStatusFor(verifyStatus, Boolean(selectedIntegrationId));

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-10 py-6 pb-3 pl-8 pr-3 md:pr-6">
      <div
        className="absolute bottom-0 left-[22px] top-0 w-px"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, #E1E4EA 10%, #E1E4EA 90%, transparent 100%)',
        }}
      />

      <ConnectAgentForm
        connectorId={connectorId}
        isClaudeSelected={isClaudeSelected}
        apiKey={apiKey}
        externalWorkspaceId={externalWorkspaceId}
        templateSelection={templateSelection}
        isExistingMode={isExistingMode}
        isScratchMode={isScratchMode}
        showExistingOption={showExistingOption}
        existingOptionIcon={existingOptionIcon}
        name={name}
        identifier={identifier}
        instructions={instructions}
        isIdentifierTouched={isIdentifierTouched}
        externalAgentId={externalAgentId}
        externalEnvironmentId={externalEnvironmentId}
        errors={errors}
        disabled={isPending}
        integrations={integrations}
        selectedIntegrationId={selectedIntegrationId}
        dropdownStatus={dropdownStatus}
        showSavedBadge={showSavedBadge}
        credentialsPanelVisible={credentialsPanelVisible}
        credentialsPanelExpanded={credentialsPanelExpanded}
        integrationName={integrationName}
        verifyStatus={verifyStatus}
        verifyMessage={verifyMessage}
        isSavingIntegration={isSavingIntegration}
        onConnectorChange={handleConnectorChange}
        onTemplateChange={handleTemplateChange}
        onApiKeyChange={handleApiKeyChange}
        onExternalWorkspaceIdChange={handleExternalWorkspaceIdChange}
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
        onExternalAgentIdChange={(next) => {
          setExternalAgentId(next);
          setErrors((prev) => ({ ...prev, externalAgentId: undefined }));
        }}
        onExternalEnvironmentIdChange={(next) => {
          setExternalEnvironmentId(next);
          setErrors((prev) => ({ ...prev, externalEnvironmentId: undefined }));
        }}
        onSelectIntegration={handleSelectIntegration}
        onRequestSetupCredentials={handleRequestSetupCredentials}
        onCredentialsExpandedChange={setCredentialsPanelExpanded}
        onIntegrationNameChange={(next) => {
          setIntegrationName(next);
          setErrors((prev) => ({ ...prev, integrationName: undefined }));
        }}
        onVerify={handleVerify}
        onSaveIntegration={handleSaveIntegration}
      />

      <div className="flex flex-col gap-2 pl-6">
        <Button
          type="submit"
          variant="secondary"
          mode="gradient"
          size="xs"
          className="w-fit gap-1"
          isLoading={isPending}
          trailingIcon={RiArrowRightSLine}
        >
          Setup agent
        </Button>
        <p className="text-text-soft text-label-xs leading-4">
          The agent will be created and deployed to the selected connector based on the template or prompt
        </p>
        <ExternalLink href={DOCS_AGENTS_LEARN_MORE_HREF} variant="documentation">
          Learn more in docs
        </ExternalLink>
      </div>
    </form>
  );
}
