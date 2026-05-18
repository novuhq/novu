import { slugify } from '@novu/shared';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import {
  type CreateAgentForm,
  type CreateAgentFormErrors,
  hasFormErrors,
  type RuntimeType,
  validateCreateAgentForm,
} from '@/components/agents/create-agent-fields';
import { AGENT_TEMPLATES } from '@/components/dispatch/dashboard/agent-templates';
import { ClaudeIcon } from '@/components/icons/claude';
import { Button } from '@/components/primitives/button';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { ExternalLink } from '@/components/shared/external-link';
import { useCreateAgentMutation } from '@/hooks/use-create-agent-mutation';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { ConnectAgentForm } from './connect-agent-form';
import type { ConnectSummary } from './connect-summary';
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

type ConnectAgentStepProps = {
  onAgentCreated: (agent: AgentResponse, summary: ConnectSummary) => void;
  onRuntimeChange?: (runtime: RuntimeType) => void;
  isManagedEnabled: boolean;
};

const DEFAULT_TEMPLATE = AGENT_TEMPLATES[0];

export function ConnectAgentStep({ onAgentCreated, onRuntimeChange, isManagedEnabled }: ConnectAgentStepProps) {
  const telemetry = useTelemetry();
  const { submit, isPending } = useCreateAgentMutation();

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
        onConnectorChange={setConnectorId}
        onTemplateChange={handleTemplateChange}
        onApiKeyChange={(next) => {
          setApiKey(next);
          setErrors((prev) => ({ ...prev, apiKey: undefined }));
        }}
        onExternalWorkspaceIdChange={setExternalWorkspaceId}
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
