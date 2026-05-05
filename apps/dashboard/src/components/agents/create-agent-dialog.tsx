import { SLUG_IDENTIFIER_REGEX, slugIdentifierFormatMessage, slugify } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import type { FormEvent, ReactNode } from 'react';
import { useId, useMemo, useState } from 'react';
import {
  RiArrowRightSLine,
  RiCheckLine,
  RiCloseLine,
  RiExternalLinkLine,
  RiInformationFill,
  RiLockLine,
} from 'react-icons/ri';
import {
  AGENT_TOOL_NAMES,
  type AgentRuntime,
  type AgentToolName,
  type CreateAgentBody,
  getClaudeAgentCredentials,
  getClaudeAgentCredentialsQueryKey,
} from '@/api/agents';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { Checkbox } from '@/components/primitives/checkbox';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/primitives/dialog';
import { Hint, HintIcon } from '@/components/primitives/hint';
import { Input } from '@/components/primitives/input';
import { SecretInput } from '@/components/primitives/secret-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { Textarea } from '@/components/primitives/textarea';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { cn } from '@/utils/ui';

const DOCS_AGENTS_LEARN_MORE_HREF = 'https://docs.novu.co';

const TOOL_LABELS: Record<AgentToolName, { label: string; description: string }> = {
  bash: { label: 'Bash', description: 'Run shell commands.' },
  read: { label: 'Read', description: 'Read files in the agent sandbox.' },
  write: { label: 'Write', description: 'Write files in the agent sandbox.' },
  edit: { label: 'Edit', description: 'Edit files via string replacement.' },
  glob: { label: 'Glob', description: 'Find files by pattern.' },
  grep: { label: 'Grep', description: 'Search file contents.' },
  web_fetch: { label: 'Web fetch', description: 'Fetch a URL.' },
  web_search: { label: 'Web search', description: 'Search the public web.' },
};

type SetupMode = 'create' | 'existing';

type CreateAgentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: CreateAgentBody) => Promise<void>;
  isSubmitting: boolean;
  isClaudeManagedAgentsEnabled?: boolean;
};

type FormErrors = {
  name?: string;
  identifier?: string;
  apiKey?: string;
  system?: string;
  claudeAgentId?: string;
  claudeEnvironmentId?: string;
};

function RequiredFieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-text-strong flex items-center gap-px text-label-xs font-medium">
      <span>{children}</span>
      <span className="text-primary-base text-label-sm leading-5 tracking-tight" aria-hidden>
        *
      </span>
    </label>
  );
}

function SegmentedToggle({
  value,
  onChange,
  options,
}: {
  value: SetupMode;
  onChange: (next: SetupMode) => void;
  options: Array<{ value: SetupMode; label: string }>;
}) {
  return (
    <div className="border-stroke-soft inline-flex w-full rounded-md border p-0.5">
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 rounded text-label-xs font-medium transition-colors',
              'px-2 py-1.5',
              isActive
                ? 'bg-bg-white text-text-strong shadow-xs'
                : 'text-text-soft hover:text-text-strong cursor-pointer'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function CreateAgentDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  isClaudeManagedAgentsEnabled = false,
}: CreateAgentDialogProps) {
  const formId = useId();
  const nameId = `${formId}-name`;
  const identifierId = `${formId}-identifier`;
  const descriptionId = `${formId}-description`;
  const runtimeId = `${formId}-runtime`;
  const apiKeyFieldId = `${formId}-api-key`;
  const systemFieldId = `${formId}-system`;
  const claudeAgentIdFieldId = `${formId}-claude-agent-id`;
  const claudeEnvironmentIdFieldId = `${formId}-claude-environment-id`;
  const vaultIdsFieldId = `${formId}-vault-ids`;

  const { currentEnvironment } = useEnvironment();

  const credentialsQuery = useQuery({
    queryKey: getClaudeAgentCredentialsQueryKey(currentEnvironment?._id),
    queryFn: () => getClaudeAgentCredentials(requireEnvironment(currentEnvironment, 'No environment selected')),
    enabled: Boolean(currentEnvironment) && isClaudeManagedAgentsEnabled && open,
  });

  const hasSavedApiKey = credentialsQuery.data?.configured ?? false;

  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [description, setDescription] = useState('');
  const [runtime, setRuntime] = useState<AgentRuntime>('bridge');
  const [setupMode, setSetupMode] = useState<SetupMode>('create');
  const [apiKey, setApiKey] = useState('');
  const [forceApiKeyEntry, setForceApiKeyEntry] = useState(false);
  const [system, setSystem] = useState('');
  const [disabledTools, setDisabledTools] = useState<Set<AgentToolName>>(() => new Set());
  const [claudeAgentId, setClaudeAgentId] = useState('');
  const [claudeEnvironmentId, setClaudeEnvironmentId] = useState('');
  const [vaultIdsInput, setVaultIdsInput] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isIdentifierTouched, setIsIdentifierTouched] = useState(false);

  const showApiKeyField = !hasSavedApiKey || forceApiKeyEntry;

  const reset = () => {
    setName('');
    setIdentifier('');
    setDescription('');
    setRuntime('bridge');
    setSetupMode('create');
    setApiKey('');
    setForceApiKeyEntry(false);
    setSystem('');
    setDisabledTools(new Set());
    setClaudeAgentId('');
    setClaudeEnvironmentId('');
    setVaultIdsInput('');
    setErrors({});
    setIsIdentifierTouched(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset();
    }

    onOpenChange(next);
  };

  const toggleTool = (tool: AgentToolName) => {
    setDisabledTools((prev) => {
      const next = new Set(prev);
      if (next.has(tool)) {
        next.delete(tool);
      } else {
        next.add(tool);
      }

      return next;
    });
  };

  const submitLabel = useMemo(() => {
    if (runtime === 'claude_managed' && setupMode === 'create') {
      return 'Create agent';
    }

    if (runtime === 'claude_managed' && setupMode === 'existing') {
      return 'Connect agent';
    }

    return 'Setup agent';
  }, [runtime, setupMode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedIdentifier = identifier.trim();
    const trimmedApiKey = apiKey.trim();
    const trimmedSystem = system.trim();
    const nextErrors: FormErrors = {};

    if (!trimmedName) {
      nextErrors.name = 'Name is required.';
    }

    if (!trimmedIdentifier) {
      nextErrors.identifier = 'Identifier is required.';
    } else if (!SLUG_IDENTIFIER_REGEX.test(trimmedIdentifier)) {
      nextErrors.identifier = slugIdentifierFormatMessage('identifier');
    }

    if (runtime === 'claude_managed') {
      if (setupMode === 'create') {
        if (!hasSavedApiKey && !trimmedApiKey) {
          nextErrors.apiKey = 'Anthropic API key is required.';
        }

        if (!trimmedSystem) {
          nextErrors.system = 'System prompt is required.';
        }
      } else {
        if (!claudeAgentId.trim()) {
          nextErrors.claudeAgentId = 'Anthropic agent ID is required.';
        }

        if (!claudeEnvironmentId.trim()) {
          nextErrors.claudeEnvironmentId = 'Anthropic environment ID is required.';
        }
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);

      return;
    }

    setErrors({});

    const body: CreateAgentBody = {
      name: trimmedName,
      identifier: trimmedIdentifier,
      runtime,
    };

    const trimmedDescription = description.trim();

    if (trimmedDescription) {
      body.description = trimmedDescription;
    }

    if (runtime === 'claude_managed') {
      if (setupMode === 'create') {
        const toolToggles = Array.from(disabledTools).map((tool) => ({ name: tool, enabled: false }));
        body.managedRuntime = {
          mode: 'create',
          system: trimmedSystem,
          ...(trimmedApiKey ? { apiKey: trimmedApiKey } : {}),
          ...(toolToggles.length ? { tools: toolToggles } : {}),
        };
      } else {
        const vaultIds = vaultIdsInput
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);

        body.managedRuntime = {
          mode: 'existing',
          provider: 'anthropic',
          agentId: claudeAgentId.trim(),
          environmentId: claudeEnvironmentId.trim(),
          ...(vaultIds.length ? { vaultIds } : {}),
        };
      }
    }

    await onSubmit(body);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="border-stroke-soft max-w-[480px] gap-0 overflow-hidden rounded-12 border p-0 shadow-xl sm:rounded-12"
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
                  <RiExternalLinkLine className="size-3.5 shrink-0" aria-hidden />
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

        <form onSubmit={handleSubmit}>
          <div className="border-stroke-soft bg-background border-y max-h-[70vh] overflow-y-auto">
            <div className="flex flex-col gap-5 p-4">
              <div className="flex flex-col gap-2">
                <RequiredFieldLabel htmlFor={nameId}>Agent name</RequiredFieldLabel>
                <Input
                  id={nameId}
                  size="2xs"
                  value={name}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setName(nextName);
                    setErrors((prev) => ({ ...prev, name: undefined }));

                    if (!isIdentifierTouched) {
                      setIdentifier(slugify(nextName));
                      setErrors((prev) => ({ ...prev, identifier: undefined }));
                    }
                  }}
                  placeholder="e.g. Wine Sommelier Agent"
                  hasError={Boolean(errors.name)}
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? `${nameId}-error` : undefined}
                />
                {errors.name ? (
                  <p id={`${nameId}-error`} className="text-error-base text-label-xs" role="alert">
                    {errors.name}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1">
                <RequiredFieldLabel htmlFor={identifierId}>Identifier</RequiredFieldLabel>
                <Input
                  id={identifierId}
                  size="2xs"
                  className="font-mono"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setIsIdentifierTouched(true);
                    setErrors((prev) => ({ ...prev, identifier: undefined }));
                  }}
                  placeholder="e.g. wine-sommelier-agent"
                  hasError={Boolean(errors.identifier)}
                  aria-invalid={errors.identifier ? true : undefined}
                  aria-describedby={
                    errors.identifier ? `${identifierId}-hint ${identifierId}-error` : `${identifierId}-hint`
                  }
                />
                <Hint id={`${identifierId}-hint`} className="text-text-soft text-paragraph-xs leading-4">
                  <HintIcon as={RiInformationFill} />
                  Used in code and APIs. Must be unique. Letters, numbers, hyphens, underscores, and dots only (no
                  spaces).
                </Hint>
                {errors.identifier ? (
                  <p id={`${identifierId}-error`} className="text-error-base text-label-xs" role="alert">
                    {errors.identifier}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor={descriptionId} className="text-text-strong text-label-xs font-medium">
                  Description
                </label>
                <Textarea
                  id={descriptionId}
                  placeholder="What does this agent do..."
                  maxLength={200}
                  showCounter
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-24 text-sm"
                />
              </div>

              {isClaudeManagedAgentsEnabled ? (
                <div className="flex flex-col gap-1">
                  <label htmlFor={runtimeId} className="text-text-strong text-label-xs font-medium">
                    Runtime
                  </label>
                  <Select value={runtime} onValueChange={(value) => setRuntime(value as AgentRuntime)}>
                    <SelectTrigger id={runtimeId} size="2xs" className="shadow-xs h-auto min-h-8 py-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bridge" className="text-label-xs">
                        Bring your own code (Bridge)
                      </SelectItem>
                      <SelectItem value="claude_managed" className="text-label-xs">
                        Claude Managed Agent
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Hint className="text-text-soft text-paragraph-xs leading-4">
                    <HintIcon as={RiInformationFill} />
                    Novu hosts the loop on Anthropic Managed Agents. We can either provision a new agent for you or
                    reference one you already created.
                  </Hint>
                </div>
              ) : null}

              {isClaudeManagedAgentsEnabled && runtime === 'claude_managed' ? (
                <div className="border-stroke-soft bg-bg-weak flex flex-col gap-4 rounded-md border p-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-text-strong text-label-xs font-medium">Setup mode</span>
                    <SegmentedToggle
                      value={setupMode}
                      onChange={(mode) => {
                        setSetupMode(mode);
                        setErrors({});
                      }}
                      options={[
                        { value: 'create', label: 'Create new' },
                        { value: 'existing', label: 'Use existing IDs' },
                      ]}
                    />
                  </div>

                  {setupMode === 'create' ? (
                    <>
                      <div className="flex flex-col gap-1">
                        {showApiKeyField ? (
                          <>
                            <RequiredFieldLabel htmlFor={apiKeyFieldId}>Anthropic API key</RequiredFieldLabel>
                            <SecretInput
                              id={apiKeyFieldId}
                              size="2xs"
                              value={apiKey}
                              onChange={(value) => {
                                setApiKey(value);
                                setErrors((prev) => ({ ...prev, apiKey: undefined }));
                              }}
                              placeholder="sk-ant-..."
                              hasError={Boolean(errors.apiKey)}
                              aria-invalid={errors.apiKey ? true : undefined}
                            />
                            <Hint className="text-text-soft text-paragraph-xs leading-4">
                              <HintIcon as={RiLockLine} />
                              Stored as an encrypted environment secret. Used only to create sessions for this
                              environment.
                            </Hint>
                            {errors.apiKey ? (
                              <p className="text-error-base text-label-xs" role="alert">
                                {errors.apiKey}
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <div className="border-stroke-soft bg-bg-white flex items-center justify-between gap-2 rounded-md border p-2">
                            <span className="text-text-sub flex items-center gap-1.5 text-label-xs">
                              <RiCheckLine className="text-success-base size-4 shrink-0" aria-hidden />
                              Using saved Anthropic API key
                            </span>
                            <button
                              type="button"
                              className="text-text-soft hover:text-text-strong text-label-xs underline-offset-2 hover:underline"
                              onClick={() => setForceApiKeyEntry(true)}
                            >
                              Replace
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <RequiredFieldLabel htmlFor={systemFieldId}>System prompt</RequiredFieldLabel>
                        <Textarea
                          id={systemFieldId}
                          value={system}
                          onChange={(e) => {
                            setSystem(e.target.value);
                            setErrors((prev) => ({ ...prev, system: undefined }));
                          }}
                          placeholder="You are a helpful assistant for the team. Always reply concisely and cite sources when you can..."
                          className="min-h-32 text-sm"
                          aria-invalid={errors.system ? true : undefined}
                        />
                        {errors.system ? (
                          <p className="text-error-base text-label-xs" role="alert">
                            {errors.system}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-text-strong text-label-xs font-medium">Capabilities</span>
                          <span className="text-text-soft text-label-xs">All tools enabled by default</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {AGENT_TOOL_NAMES.map((tool) => {
                            const isDisabled = disabledTools.has(tool);
                            const meta = TOOL_LABELS[tool];

                            return (
                              <label
                                key={tool}
                                htmlFor={`${formId}-tool-${tool}`}
                                className="border-stroke-soft bg-bg-white flex cursor-pointer items-start gap-2 rounded-md border p-2 hover:border-stroke-strong transition-colors"
                              >
                                <Checkbox
                                  id={`${formId}-tool-${tool}`}
                                  checked={!isDisabled}
                                  onCheckedChange={() => toggleTool(tool)}
                                />
                                <div className="flex min-w-0 flex-col gap-0.5">
                                  <span className="text-text-strong text-label-xs font-medium">{meta.label}</span>
                                  <span className="text-text-soft text-paragraph-xs leading-4">{meta.description}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      <Hint className="text-text-soft text-paragraph-xs leading-4">
                        <HintIcon as={RiInformationFill} />
                        Reference an Anthropic Managed Agent that you already created in the Anthropic Console.
                      </Hint>

                      <div className="flex flex-col gap-1">
                        <RequiredFieldLabel htmlFor={claudeAgentIdFieldId}>Anthropic agent ID</RequiredFieldLabel>
                        <Input
                          id={claudeAgentIdFieldId}
                          size="2xs"
                          className="font-mono"
                          value={claudeAgentId}
                          onChange={(e) => {
                            setClaudeAgentId(e.target.value);
                            setErrors((prev) => ({ ...prev, claudeAgentId: undefined }));
                          }}
                          placeholder="agent_011..."
                          hasError={Boolean(errors.claudeAgentId)}
                          aria-invalid={errors.claudeAgentId ? true : undefined}
                        />
                        {errors.claudeAgentId ? (
                          <p className="text-error-base text-label-xs" role="alert">
                            {errors.claudeAgentId}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-1">
                        <RequiredFieldLabel htmlFor={claudeEnvironmentIdFieldId}>
                          Anthropic environment ID
                        </RequiredFieldLabel>
                        <Input
                          id={claudeEnvironmentIdFieldId}
                          size="2xs"
                          className="font-mono"
                          value={claudeEnvironmentId}
                          onChange={(e) => {
                            setClaudeEnvironmentId(e.target.value);
                            setErrors((prev) => ({ ...prev, claudeEnvironmentId: undefined }));
                          }}
                          placeholder="env_013..."
                          hasError={Boolean(errors.claudeEnvironmentId)}
                          aria-invalid={errors.claudeEnvironmentId ? true : undefined}
                        />
                        {errors.claudeEnvironmentId ? (
                          <p className="text-error-base text-label-xs" role="alert">
                            {errors.claudeEnvironmentId}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label htmlFor={vaultIdsFieldId} className="text-text-strong text-label-xs font-medium">
                          Vault IDs (optional)
                        </label>
                        <Input
                          id={vaultIdsFieldId}
                          size="2xs"
                          className="font-mono"
                          value={vaultIdsInput}
                          onChange={(e) => setVaultIdsInput(e.target.value)}
                          placeholder="vlt_..., vlt_..."
                        />
                        <Hint className="text-text-soft text-paragraph-xs leading-4">
                          <HintIcon as={RiInformationFill} />
                          Comma-separated. Used to authenticate MCP servers attached to the agent.
                        </Hint>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end px-4 py-3">
            <Button
              variant="secondary"
              mode="gradient"
              size="xs"
              type="submit"
              isLoading={isSubmitting}
              trailingIcon={RiArrowRightSLine}
            >
              {submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
