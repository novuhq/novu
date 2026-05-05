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
  RiSparkling2Line,
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
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/primitives/dialog';
import { Hint, HintIcon } from '@/components/primitives/hint';
import { Input } from '@/components/primitives/input';
import { SecretInput } from '@/components/primitives/secret-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { Switch } from '@/components/primitives/switch';
import { Textarea } from '@/components/primitives/textarea';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { cn } from '@/utils/ui';

const DOCS_AGENTS_LEARN_MORE_HREF = 'https://docs.novu.co';
const NOVU_DESCRIPTION_MAX_LENGTH = 200;

const TOOL_LABELS: Record<AgentToolName, string> = {
  bash: 'Bash',
  read: 'Read files',
  write: 'Write files',
  edit: 'Edit files',
  glob: 'Glob search',
  grep: 'Grep search',
  web_fetch: 'Fetch URL',
  web_search: 'Web search',
};

type PromptTemplate = {
  id: string;
  label: string;
  name: string;
  prompt: string;
};

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'support',
    label: 'Customer Support',
    name: 'Support Agent',
    prompt:
      'You are a friendly customer support agent. Always respond with empathy, ask clarifying questions when the request is ambiguous, and surface relevant documentation links when applicable. Escalate to a human teammate when the issue requires account-level changes.',
  },
  {
    id: 'sommelier',
    label: 'Wine Sommelier',
    name: 'Wine Sommelier',
    prompt:
      'You are an expert wine sommelier. Pair wines with the dishes the user mentions, explain why the pairing works (acidity, tannins, body, flavor notes), and suggest two price tiers for each recommendation.',
  },
  {
    id: 'code_reviewer',
    label: 'Code Reviewer',
    name: 'Code Reviewer',
    prompt:
      'You are a senior code reviewer. Read code snippets the user shares, point out bugs, suggest concrete improvements with code examples, and call out testability and security concerns. Stay concise and prioritize the most impactful feedback first.',
  },
  {
    id: 'docs',
    label: 'Docs Helper',
    name: 'Docs Helper',
    prompt:
      'You are a technical documentation expert. Help the team draft clear, concise docs from rough notes, suggest structure (headings, examples, prerequisites), and rewrite passages for clarity while preserving the original meaning.',
  },
  {
    id: 'devops',
    label: 'DevOps Buddy',
    name: 'DevOps Buddy',
    prompt:
      'You are a DevOps engineer with deep experience in AWS, Kubernetes, Terraform, and CI pipelines. Diagnose deployment issues from logs and command output, suggest infrastructure changes with trade-offs, and produce ready-to-run shell snippets when appropriate.',
  },
];

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
  description?: string;
  claudeAgentId?: string;
  claudeEnvironmentId?: string;
};

/**
 * Derive a short Novu-side description from the longer system prompt, so the user
 * doesn't have to type the same thing twice. Prefers the first sentence; falls back
 * to a hard truncation. Returns at most {@link NOVU_DESCRIPTION_MAX_LENGTH} chars.
 */
function deriveDescriptionFromSystem(system: string): string {
  const trimmed = system.trim();
  if (!trimmed) return '';

  const sentenceMatch = trimmed.match(/^[^.!?\n]+[.!?]/);
  if (sentenceMatch && sentenceMatch[0].length <= NOVU_DESCRIPTION_MAX_LENGTH) {
    return sentenceMatch[0].trim();
  }

  if (trimmed.length <= NOVU_DESCRIPTION_MAX_LENGTH) {
    return trimmed;
  }

  return `${trimmed.slice(0, NOVU_DESCRIPTION_MAX_LENGTH - 3).trimEnd()}...`;
}

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
    <div className="bg-bg-weak inline-flex w-full items-center gap-px rounded-md p-px">
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 rounded-[5px] px-2 py-1 text-label-xs font-medium transition-colors',
              isActive
                ? 'bg-bg-white text-text-strong shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_2px_-1px_rgba(0,0,0,0.08)]'
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

function PromptTemplateChips({
  onSelect,
  activeTemplateId,
  disabled,
}: {
  onSelect: (template: PromptTemplate) => void;
  activeTemplateId?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <RiSparkling2Line className="text-text-soft size-3.5 shrink-0" aria-hidden />
        <span className="text-text-strong text-label-xs font-medium">Start from a template</span>
        <span className="text-text-soft text-paragraph-xs leading-4">— fills the name and instructions</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {PROMPT_TEMPLATES.map((template) => {
          const isActive = activeTemplateId === template.id;

          return (
            <button
              key={template.id}
              type="button"
              disabled={disabled}
              aria-pressed={isActive}
              onClick={() => onSelect(template)}
              className={cn(
                'rounded-md border px-2 py-1 text-label-xs leading-4 transition-colors',
                isActive
                  ? 'border-primary-base bg-primary-alpha-10 text-text-strong'
                  : 'border-stroke-soft bg-bg-white text-text-sub hover:border-stroke-strong hover:text-text-strong cursor-pointer',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              {template.label}
            </button>
          );
        })}
      </div>
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
  const [activeTemplateId, setActiveTemplateId] = useState<string | undefined>();
  const [disabledTools, setDisabledTools] = useState<Set<AgentToolName>>(() => new Set());
  const [claudeAgentId, setClaudeAgentId] = useState('');
  const [claudeEnvironmentId, setClaudeEnvironmentId] = useState('');
  const [vaultIdsInput, setVaultIdsInput] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  // Once the user edits the identifier manually, stop auto-syncing it from the name.
  const [isIdentifierTouched, setIsIdentifierTouched] = useState(false);

  const isClaudeCreateMode = runtime === 'claude_managed' && setupMode === 'create';
  const showApiKeyField = !hasSavedApiKey || forceApiKeyEntry;
  // The Description field is hidden in Claude create mode — the system prompt doubles
  // as both the Anthropic instructions and the (derived) Novu-side description.
  const showDescriptionField = !isClaudeCreateMode;

  const reset = () => {
    setName('');
    setIdentifier('');
    setDescription('');
    setRuntime('bridge');
    setSetupMode('create');
    setApiKey('');
    setForceApiKeyEntry(false);
    setSystem('');
    setActiveTemplateId(undefined);
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

  const applyTemplate = (template: PromptTemplate) => {
    setSystem(template.prompt);
    setActiveTemplateId(template.id);
    setErrors((prev) => ({ ...prev, system: undefined }));

    if (!name.trim()) {
      setName(template.name);
      setErrors((prev) => ({ ...prev, name: undefined }));

      if (!isIdentifierTouched) {
        setIdentifier(slugify(template.name));
        setErrors((prev) => ({ ...prev, identifier: undefined }));
      }
    }
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
    const trimmedDescription = description.trim();
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
          nextErrors.system = 'Instructions are required.';
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

    // In Claude create mode the system prompt is the source of truth — derive a short
    // Novu-side description from it so the agent card has a useful summary.
    const resolvedDescription = isClaudeCreateMode ? deriveDescriptionFromSystem(trimmedSystem) : trimmedDescription;

    if (resolvedDescription) {
      body.description = resolvedDescription;
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
          <div className="border-stroke-soft bg-background max-h-[70vh] overflow-y-auto border-y">
            <div className="flex flex-col gap-5 p-4">
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
              ) : null}

              {isClaudeCreateMode ? (
                <PromptTemplateChips
                  onSelect={applyTemplate}
                  activeTemplateId={activeTemplateId}
                  disabled={isSubmitting}
                />
              ) : null}

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

              {isClaudeCreateMode ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <RequiredFieldLabel htmlFor={systemFieldId}>Instructions</RequiredFieldLabel>
                    <span className="text-text-soft text-paragraph-xs leading-4">
                      Sent to Claude as the system prompt
                    </span>
                  </div>
                  <Textarea
                    id={systemFieldId}
                    value={system}
                    onChange={(e) => {
                      setSystem(e.target.value);
                      setActiveTemplateId(undefined);
                      setErrors((prev) => ({ ...prev, system: undefined }));
                    }}
                    placeholder="You are a helpful assistant for the team. Always reply concisely and cite sources when you can..."
                    className="min-h-32 text-sm"
                    aria-invalid={errors.system ? true : undefined}
                  />
                  <Hint className="text-text-soft text-paragraph-xs leading-4">
                    <HintIcon as={RiInformationFill} />
                    The first sentence is shown as the agent description in Novu.
                  </Hint>
                  {errors.system ? (
                    <p className="text-error-base text-label-xs" role="alert">
                      {errors.system}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {showDescriptionField ? (
                <div className="flex flex-col gap-1">
                  <label htmlFor={descriptionId} className="text-text-strong text-label-xs font-medium">
                    Description
                  </label>
                  <Textarea
                    id={descriptionId}
                    placeholder="What does this agent do..."
                    maxLength={NOVU_DESCRIPTION_MAX_LENGTH}
                    showCounter
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-24 text-sm"
                  />
                </div>
              ) : null}

              {isClaudeCreateMode ? (
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
                        Stored as an encrypted environment secret. Used only to create sessions for this environment.
                      </Hint>
                      {errors.apiKey ? (
                        <p className="text-error-base text-label-xs" role="alert">
                          {errors.apiKey}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <div className="border-stroke-soft bg-bg-weak flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5">
                      <span className="text-text-sub flex items-center gap-1.5 text-label-xs">
                        <RiCheckLine className="text-success-base size-4 shrink-0" aria-hidden />
                        Using saved Anthropic API key
                      </span>
                      <button
                        type="button"
                        className="text-text-soft hover:text-text-strong cursor-pointer text-label-xs underline-offset-2 hover:underline"
                        onClick={() => setForceApiKeyEntry(true)}
                      >
                        Replace
                      </button>
                    </div>
                  )}
                </div>
              ) : null}

              {isClaudeManagedAgentsEnabled && runtime === 'claude_managed' && setupMode === 'existing' ? (
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
              ) : null}

              {isClaudeCreateMode ? (
                <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <span className="text-text-soft font-code text-[11px] font-medium uppercase leading-4 tracking-wider">
                      Capabilities
                    </span>
                    <span className="text-text-soft text-paragraph-xs leading-4">All tools enabled</span>
                  </div>
                  <div className="bg-bg-white shadow-box-xs flex flex-col overflow-hidden rounded-md">
                    <div className="flex flex-col divide-y divide-stroke-soft">
                      {AGENT_TOOL_NAMES.map((tool) => {
                        const isEnabled = !disabledTools.has(tool);

                        return (
                          <label
                            key={tool}
                            htmlFor={`${formId}-tool-${tool}`}
                            className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2"
                          >
                            <span className="text-text-sub text-label-xs font-medium">{TOOL_LABELS[tool]}</span>
                            <Switch
                              id={`${formId}-tool-${tool}`}
                              checked={isEnabled}
                              onCheckedChange={() => toggleTool(tool)}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
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
