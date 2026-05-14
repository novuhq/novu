import { FeatureFlagsKeysEnum, SLUG_IDENTIFIER_REGEX, slugIdentifierFormatMessage, slugify } from '@novu/shared';
import type { FormEvent, ReactNode } from 'react';
import { useEffect, useId, useState } from 'react';
import {
  RiArrowRightSLine,
  RiArrowRightUpLine,
  RiCloseLine,
  RiEyeLine,
  RiEyeOffLine,
  RiFileCodeLine,
  RiInformation2Line,
} from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/primitives/dialog';
import { Input } from '@/components/primitives/input';
import {
  SegmentedControl,
  SegmentedControlList,
  SegmentedControlTrigger,
} from '@/components/primitives/segmented-control';
import { Textarea } from '@/components/primitives/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { cn } from '@/utils/ui';
import { BotIcon } from '../icons/bot';
import { ClaudeIcon } from '../icons/claude';
import { GoogleIcon } from '../icons/google';
import { Tag } from '../primitives/tag';

const DOCS_AGENTS_LEARN_MORE_HREF = 'https://docs.novu.co';
const ANTHROPIC_API_KEY_HREF = 'https://console.anthropic.com/settings/keys';
const CLAUDE_AGENT_ID_HREF = 'https://docs.claude.com/en/api/agents-list';
const CLAUDE_ENVIRONMENT_ID_HREF = 'https://docs.claude.com/en/api/agents-list';
const CLAUDE_WORKSPACE_HREF = 'https://console.anthropic.com/settings/workspaces';
const DEFAULT_CLAUDE_WORKSPACE_ID = 'default';

type RuntimeType = 'scratch' | 'claude' | 'vertex';

type AgentTemplate = {
  label: string;
  name: string;
  instructions: string;
};

const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    label: 'Customer Support',
    name: 'Customer Support Agent',
    instructions:
      'You are a helpful customer support assistant. Answer questions clearly and concisely, and escalate complex issues when needed.',
  },
  {
    label: 'DevOps Buddy',
    name: 'DevOps Buddy',
    instructions:
      'You are a DevOps assistant. Help with CI/CD pipelines, infrastructure troubleshooting, and deployment best practices.',
  },
  {
    label: 'Code Reviewer',
    name: 'Code Reviewer',
    instructions:
      'You are a senior code reviewer. Provide constructive feedback on code quality, security, and maintainability.',
  },
  {
    label: 'Docs Helper',
    name: 'Docs Helper',
    instructions:
      'You are a documentation assistant. Help users find information, clarify concepts, and cite sources accurately.',
  },
];

type CreateAgentMode = 'create' | 'existing';

type FormErrors = {
  name?: string;
  identifier?: string;
  apiKey?: string;
  externalAgentId?: string;
  externalEnvironmentId?: string;
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

type RuntimeCardProps = {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
  title: string;
  description: string;
};

function RuntimeCard({ selected, onClick, disabled, icon, title, description }: RuntimeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-1 cursor-pointer flex-col gap-2 rounded-lg border p-2 text-left transition-all',
        'shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]',
        selected
          ? 'border-stroke-soft shadow-[0px_1px_4px_-2px_rgba(24,39,75,0.02),0px_4px_4px_0px_rgba(24,39,75,0.06),0px_0px_2px_0px_#e0e0e0,0px_0px_0px_0px_#f2f4f7,0px_1px_2px_0px_rgba(16,24,40,0.05)]'
          : 'border-stroke-weak bg-bg-white hover:border-stroke-soft',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <div
        className={cn(
          'flex size-9 items-center justify-center rounded-lg border bg-bg-weak',
          selected ? 'border-stroke-soft' : 'border-stroke-weak '
        )}
      >
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-text-sub text-label-xs font-medium">{title}</span>
        <span className="text-text-soft text-label-xs font-normal leading-4">{description}</span>
      </div>
    </button>
  );
}

export type CreateAgentForm = {
  name: string;
  identifier: string;
  instructions: string;
  apiKey: string;
  runtime: RuntimeType;
  isExistingMode: boolean;
  externalAgentId?: string;
  externalEnvironmentId?: string;
  /**
   * Optional Anthropic workspace id. Empty/omitted means "use the default workspace".
   * Custom workspaces are identified by a `wrkspc_…` id.
   */
  externalWorkspaceId?: string;
};

type CreateAgentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: CreateAgentForm) => Promise<void>;
  isSubmitting: boolean;
  initialName?: string;
  initialInstructions?: string;
};

export function CreateAgentDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  initialName,
  initialInstructions,
}: CreateAgentDialogProps) {
  const formId = useId();
  const nameId = `${formId}-name`;
  const identifierId = `${formId}-identifier`;
  const instructionsId = `${formId}-instructions`;
  const apiKeyId = `${formId}-api-key`;
  const workspaceIdInputId = `${formId}-workspace-id`;
  const isManagedEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_MANAGED_AGENT_RUNTIME_ENABLED, false);

  const [runtime, setRuntime] = useState<RuntimeType>('scratch');
  const [mode, setMode] = useState<CreateAgentMode>('create');
  const [name, setName] = useState(initialName ?? '');
  const [identifier, setIdentifier] = useState(initialName ? slugify(initialName) : '');
  const [instructions, setInstructions] = useState(initialInstructions ?? '');
  const [apiKey, setApiKey] = useState('');
  const [externalWorkspaceId, setExternalWorkspaceId] = useState('');
  const [externalAgentId, setExternalAgentId] = useState('');
  const [externalEnvironmentId, setExternalEnvironmentId] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isIdentifierTouched, setIsIdentifierTouched] = useState(false);
  const [templateOffset, setTemplateOffset] = useState(0);
  const [showSecret, setShowSecret] = useState(false);

  const toggleSecretVisibility = () => {
    setShowSecret(!showSecret);
  };

  const visibleTemplates = AGENT_TEMPLATES.slice(templateOffset, templateOffset + 4);

  // Seed the form fields from initial props when the dialog opens.
  useEffect(() => {
    if (!open) return;

    setName(initialName ?? '');
    setIdentifier(initialName ? slugify(initialName) : '');
    setInstructions(initialInstructions ?? '');
    setIsIdentifierTouched(false);
    setErrors({});
  }, [open, initialName, initialInstructions]);

  const reset = () => {
    setRuntime('scratch');
    setMode('create');
    setName('');
    setIdentifier('');
    setInstructions('');
    setApiKey('');
    setExternalWorkspaceId('');
    setExternalAgentId('');
    setExternalEnvironmentId('');
    setErrors({});
    setIsIdentifierTouched(false);
    setTemplateOffset(0);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const nextErrors: FormErrors = {};
    const isExistingMode = runtime === 'claude' && mode === 'existing';

    if (!isExistingMode) {
      const trimmedName = name.trim();
      const trimmedIdentifier = identifier.trim();

      if (!trimmedName) nextErrors.name = 'Name is required.';

      if (!trimmedIdentifier) {
        nextErrors.identifier = 'Identifier is required.';
      } else if (!SLUG_IDENTIFIER_REGEX.test(trimmedIdentifier)) {
        nextErrors.identifier = slugIdentifierFormatMessage('identifier');
      }
    }

    if (runtime === 'claude' && !apiKey.trim()) {
      nextErrors.apiKey = 'Anthropic API key is required.';
    }

    if (isExistingMode && !externalAgentId.trim()) {
      nextErrors.externalAgentId = 'Claude Agent ID is required.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);

      return;
    }

    setErrors({});

    const trimmedInstructions = instructions.trim();
    const trimmedName = name.trim();
    const trimmedIdentifier = identifier.trim();
    const trimmedApiKey = apiKey.trim();
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
      });
      handleOpenChange(false);
    } catch {
      // Caller surfaces a toast; keep the dialog open so the user can retry.
    }
  };

  const isClaudeSelected = runtime === 'claude';
  const showManagedOptions = isManagedEnabled;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="border-stroke-soft max-w-[600px] gap-0 overflow-hidden rounded-12 border p-0 shadow-xl sm:rounded-12 min-w-[400px]"
        hideCloseButton
      >
        {/* Header */}
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
            {/* Runtime selection cards */}
            <div className="flex flex-col gap-2.5">
              <label className="text-text-strong text-label-xs font-medium">Where do you want your agent?</label>
              <div className="flex gap-2.5">
                <RuntimeCard
                  selected={runtime === 'scratch'}
                  onClick={() => setRuntime('scratch')}
                  icon={<RiFileCodeLine className="text-text-sub size-5" />}
                  title="Custom Code"
                  description="Built with LangChain, AI SDK, or your own scaffold"
                />

                {showManagedOptions && (
                  <RuntimeCard
                    selected={runtime === 'claude'}
                    onClick={() => setRuntime('claude')}
                    icon={<ClaudeIcon className="size-5" />}
                    title="Claude Managed Agent"
                    description="Agent managed by Claude Managed Agents"
                  />
                )}

                <RuntimeCard
                  selected={runtime === 'vertex'}
                  onClick={() => {}}
                  disabled
                  icon={<GoogleIcon className="size-5" />}
                  title="Google Vertex AI Agent"
                  description="Agent is managed in Google Vertex AI Agent"
                />
              </div>
            </div>

            {/* Claude-only configuration: API key + separator + segmented control */}
            {isClaudeSelected && (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-px">
                    <label htmlFor={apiKeyId} className="text-text-sub text-label-xs font-medium">
                      Anthropic API key
                    </label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-text-soft ml-0.5 inline-flex cursor-default items-center">
                          <RiInformation2Line className="size-3.5" aria-hidden />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Your Anthropic API key is encrypted and stored securely. It is used to provision the agent on
                        Claude Platform.
                      </TooltipContent>
                    </Tooltip>
                    <div className="ml-auto">
                      <a
                        href={ANTHROPIC_API_KEY_HREF}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 text-label-xs font-medium"
                      >
                        Get API Key
                        <RiArrowRightUpLine className="size-3.5" aria-hidden />
                      </a>
                    </div>
                  </div>
                  <Input
                    id={apiKeyId}
                    size="xs"
                    type={showSecret ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setErrors((prev) => ({ ...prev, apiKey: undefined }));
                    }}
                    placeholder="Paste the Anthropic API key here..."
                    hasError={Boolean(errors.apiKey)}
                    aria-invalid={errors.apiKey ? true : undefined}
                    aria-describedby={errors.apiKey ? `${apiKeyId}-error` : undefined}
                    className="font-mono"
                    inlineTrailingNode={
                      <button
                        type="button"
                        onClick={toggleSecretVisibility}
                        aria-label={showSecret ? 'Hide API key' : 'Show API key'}
                        aria-pressed={showSecret}
                      >
                        {showSecret ? (
                          <RiEyeOffLine className="text-text-sub group-has-[disabled]:text-text-disabled" />
                        ) : (
                          <RiEyeLine className="text-text-sub group-has-[disabled]:text-text-disabled" />
                        )}
                      </button>
                    }
                  />
                  {errors.apiKey ? (
                    <p id={`${apiKeyId}-error`} className="text-error-base text-label-xs" role="alert">
                      {errors.apiKey}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-px">
                    <label htmlFor={workspaceIdInputId} className="text-text-sub text-label-xs font-medium">
                      Workspace ID
                    </label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-text-soft ml-0.5 inline-flex cursor-default items-center">
                          <RiInformation2Line className="size-3.5" aria-hidden />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        The Anthropic workspace your API key is scoped to. Leave empty for the Default Workspace. For
                        custom workspaces, paste the `wrkspc_…` id from the Claude Console (Settings → Workspaces). Used
                        for the in-product &quot;Open in Claude&quot; deep link.
                      </TooltipContent>
                    </Tooltip>
                    <div className="ml-auto">
                      <a
                        href={CLAUDE_WORKSPACE_HREF}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 text-label-xs font-medium"
                      >
                        Find Workspace ID
                        <RiArrowRightUpLine className="size-3.5" aria-hidden />
                      </a>
                    </div>
                  </div>
                  <Input
                    id={workspaceIdInputId}
                    size="xs"
                    value={externalWorkspaceId}
                    onChange={(e) => setExternalWorkspaceId(e.target.value)}
                    placeholder={DEFAULT_CLAUDE_WORKSPACE_ID}
                    className="font-mono"
                  />
                </div>

                <div className="border-stroke-weak border-t" />

                <SegmentedControl value={mode} onValueChange={(v) => setMode(v as CreateAgentMode)}>
                  <SegmentedControlList className="rounded-[5px] bg-bg-muted p-px">
                    <SegmentedControlTrigger value="create" className="text-label-xs">
                      Create new agent
                    </SegmentedControlTrigger>
                    <SegmentedControlTrigger value="existing" className="text-label-xs">
                      Setup from existing agent
                    </SegmentedControlTrigger>
                  </SegmentedControlList>
                </SegmentedControl>
              </div>
            )}

            {/* Tab content: existing-fields ⇄ create-mode-content (mutually exclusive) */}
            {isClaudeSelected && mode === 'existing' ? (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-px">
                    <label htmlFor={`${formId}-external-id`} className="text-text-strong text-label-xs font-medium">
                      Claude Agent ID
                    </label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-text-soft ml-0.5 inline-flex cursor-default items-center">
                          <RiInformation2Line className="size-3.5" aria-hidden />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        The unique identifier of the agent on the Claude Platform (e.g. agent_xxx).
                      </TooltipContent>
                    </Tooltip>
                    <div className="ml-auto">
                      <a
                        href={CLAUDE_AGENT_ID_HREF}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 text-label-xs font-medium"
                      >
                        Get Agent ID
                        <RiArrowRightUpLine className="size-3.5" aria-hidden />
                      </a>
                    </div>
                  </div>
                  <Input
                    id={`${formId}-external-id`}
                    size="xs"
                    value={externalAgentId}
                    onChange={(e) => {
                      setExternalAgentId(e.target.value);
                      setErrors((prev) => ({ ...prev, externalAgentId: undefined }));
                    }}
                    placeholder="e.g. agent_xx"
                    className="font-mono"
                    hasError={Boolean(errors.externalAgentId)}
                    aria-invalid={errors.externalAgentId ? true : undefined}
                    aria-describedby={errors.externalAgentId ? `${formId}-external-id-error` : undefined}
                  />
                  {errors.externalAgentId ? (
                    <p id={`${formId}-external-id-error`} className="text-error-base text-label-xs" role="alert">
                      {errors.externalAgentId}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-px">
                    <label htmlFor={`${formId}-external-env-id`} className="text-text-strong text-label-xs font-medium">
                      Claude Environment ID
                    </label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-text-soft ml-0.5 inline-flex cursor-default items-center">
                          <RiInformation2Line className="size-3.5" aria-hidden />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>The Claude environment that hosts this agent (e.g. env_xxx).</TooltipContent>
                    </Tooltip>
                    <div className="ml-auto">
                      <a
                        href={CLAUDE_ENVIRONMENT_ID_HREF}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 text-label-xs font-medium"
                      >
                        Get Environment ID
                        <RiArrowRightUpLine className="size-3.5" aria-hidden />
                      </a>
                    </div>
                  </div>
                  <Input
                    id={`${formId}-external-env-id`}
                    size="xs"
                    value={externalEnvironmentId}
                    onChange={(e) => {
                      setExternalEnvironmentId(e.target.value);
                      setErrors((prev) => ({ ...prev, externalEnvironmentId: undefined }));
                    }}
                    placeholder="e.g. env_xx"
                    className="font-mono"
                    hasError={Boolean(errors.externalEnvironmentId)}
                    aria-invalid={errors.externalEnvironmentId ? true : undefined}
                    aria-describedby={errors.externalEnvironmentId ? `${formId}-external-env-id-error` : undefined}
                  />
                  {errors.externalEnvironmentId ? (
                    <p id={`${formId}-external-env-id-error`} className="text-error-base text-label-xs" role="alert">
                      {errors.externalEnvironmentId}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2.5">
                  <label className="text-text-sub text-label-xs font-medium">Start from a template</label>
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

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <RequiredFieldLabel htmlFor={nameId}>Agent name</RequiredFieldLabel>
                    <Input
                      id={nameId}
                      size="xs"
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

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-px">
                      <RequiredFieldLabel htmlFor={identifierId}>Agent Identifier</RequiredFieldLabel>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-text-soft ml-0.5 inline-flex cursor-default items-center">
                            <RiInformation2Line className="size-3.5" aria-hidden />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Used in code and APIs. Must be unique. Letters, numbers, hyphens, underscores, and dots only.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id={identifierId}
                      size="xs"
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
                    {errors.identifier ? (
                      <p id={`${identifierId}-error`} className="text-error-base text-label-xs" role="alert">
                        {errors.identifier}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <label htmlFor={instructionsId} className="text-text-strong text-label-xs font-medium">
                      Instructions
                    </label>
                    {isClaudeSelected && (
                      <span className="text-text-soft text-paragraph-xs ml-auto">
                        (Sent to Claude as the system prompt)
                      </span>
                    )}
                  </div>
                  <Textarea
                    id={instructionsId}
                    placeholder={
                      isClaudeSelected
                        ? 'You are a helpful assistant for the team. Always reply concisely\nand cite sources when you can...'
                        : 'What does this agent do...'
                    }
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="min-h-24 resize-none text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
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
