import {
  CLAUDE_ANTHROPIC_SKILLS,
  CLAUDE_BUILTIN_TOOLS,
  CLAUDE_DEFAULT_TOOL_TYPES,
  CLAUDE_MCP_SERVERS,
  FeatureFlagsKeysEnum,
  SLUG_IDENTIFIER_REGEX,
  slugIdentifierFormatMessage,
  slugify,
} from '@novu/shared';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { FormEvent, ReactNode } from 'react';
import { useId, useMemo, useState } from 'react';
import {
  RiArrowRightSLine,
  RiCloseLine,
  RiCodeLine,
  RiExternalLinkLine,
  RiInformationFill,
  RiRefreshLine,
  RiSearchLine,
  RiServerLine,
  RiSparkling2Line,
  RiToolsLine,
} from 'react-icons/ri';
import type { CreateAgentBody } from '@/api/agents';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/primitives/dialog';
import { Hint, HintIcon } from '@/components/primitives/hint';
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

const DOCS_AGENTS_LEARN_MORE_HREF = 'https://docs.novu.co';
const ANTHROPIC_API_KEY_HREF = 'https://console.anthropic.com/settings/keys';

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
          'flex size-9 items-center justify-center rounded-lg border',
          selected ? 'border-stroke-soft bg-bg-white' : 'border-stroke-weak bg-bg-weak'
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

/**
 * Body emitted by the Create Agent dialog.
 * `managedRuntime.integrationId` is intentionally absent — the dialog collects the raw `apiKey`
 * instead, and the caller (agents-list.tsx) creates the integration first then fills in the id.
 */
export type CreateAgentDialogSubmitBody = Omit<CreateAgentBody, 'name' | 'identifier' | 'managedRuntime'> & {
  name?: string;
  identifier?: string;
  /** Raw Anthropic API key; used by the caller to create an agent-kind integration before calling POST /agents. */
  apiKey?: string;
  managedRuntime?: Omit<import('@/api/agents').CreateManagedRuntimeBody, 'integrationId'> & {
    integrationId?: string;
  };
};

type CreateAgentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: CreateAgentDialogSubmitBody) => Promise<void>;
  isSubmitting: boolean;
};

export function CreateAgentDialog({ open, onOpenChange, onSubmit, isSubmitting }: CreateAgentDialogProps) {
  const formId = useId();
  const nameId = `${formId}-name`;
  const identifierId = `${formId}-identifier`;
  const instructionsId = `${formId}-instructions`;
  const apiKeyId = `${formId}-api-key`;

  const isManagedEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_MANAGED_AGENT_RUNTIME_ENABLED, false);

  const [runtime, setRuntime] = useState<RuntimeType>('scratch');
  const [mode, setMode] = useState<CreateAgentMode>('create');
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [instructions, setInstructions] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [externalAgentId, setExternalAgentId] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isIdentifierTouched, setIsIdentifierTouched] = useState(false);
  const [templateOffset, setTemplateOffset] = useState(0);
  const [selectedTools, setSelectedTools] = useState<string[]>(CLAUDE_DEFAULT_TOOL_TYPES);
  const [selectedMcpServers, setSelectedMcpServers] = useState<string[]>([]);
  const [mcpSearch, setMcpSearch] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const visibleTemplates = AGENT_TEMPLATES.slice(templateOffset, templateOffset + 4);

  const reset = () => {
    setRuntime('scratch');
    setMode('create');
    setName('');
    setIdentifier('');
    setInstructions('');
    setApiKey('');
    setExternalAgentId('');
    setErrors({});
    setIsIdentifierTouched(false);
    setTemplateOffset(0);
    setSelectedTools(CLAUDE_DEFAULT_TOOL_TYPES);
    setSelectedMcpServers([]);
    setMcpSearch('');
    setSelectedSkills([]);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleTemplateSelect = (template: AgentTemplate) => {
    setName(template.name);
    if (!isIdentifierTouched) {
      setIdentifier(slugify(template.name));
    }
    setInstructions(template.instructions);
    setErrors((prev) => ({ ...prev, name: undefined }));
  };

  const handleTemplateRotate = () => {
    setTemplateOffset((prev) => (prev + 4) % AGENT_TEMPLATES.length);
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
      nextErrors.externalAgentId = 'Claude agent ID is required.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);

      return;
    }

    setErrors({});

    const trimmedInstructions = instructions.trim();

    let body: CreateAgentDialogSubmitBody;

    if (isExistingMode) {
      body = {
        runtime: 'managed',
        managedRuntime: {
          providerId: 'anthropic',
          externalAgentId: externalAgentId.trim(),
        },
        apiKey: apiKey.trim(),
      };
    } else {
      const trimmedName = name.trim();
      const trimmedIdentifier = identifier.trim();

      body = {
        name: trimmedName,
        identifier: trimmedIdentifier,
      };

      if (runtime === 'claude') {
        body.runtime = 'managed';
        body.managedRuntime = {
          providerId: 'anthropic',
          model: 'claude-opus-4-5',
          systemPrompt: trimmedInstructions || undefined,
          tools: selectedTools.length > 0 ? selectedTools : undefined,
          mcpServers: selectedMcpServers.length > 0 ? selectedMcpServers : undefined,
          skills:
            selectedSkills.length > 0
              ? selectedSkills.map((skillId) => ({ type: 'anthropic' as const, skillId }))
              : undefined,
        };
        body.apiKey = apiKey.trim();
      } else if (trimmedInstructions) {
        body.description = trimmedInstructions;
      }
    }

    await onSubmit(body);
    handleOpenChange(false);
  };

  const isClaudeSelected = runtime === 'claude';
  const showManagedOptions = isManagedEnabled;

  const filteredMcpServers = useMemo(() => {
    const q = mcpSearch.toLowerCase().trim();

    if (!q) {
      return CLAUDE_MCP_SERVERS;
    }

    return CLAUDE_MCP_SERVERS.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.category.includes(q)
    );
  }, [mcpSearch]);

  const popularMcpServers = filteredMcpServers.filter((s) => s.popular);
  const otherMcpServers = filteredMcpServers.filter((s) => !s.popular);

  const toggleTool = (type: string) => {
    setSelectedTools((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };

  const toggleMcpServer = (id: string) => {
    setSelectedMcpServers((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const toggleSkill = (skillId: string) => {
    setSelectedSkills((prev) => (prev.includes(skillId) ? prev.filter((s) => s !== skillId) : [...prev, skillId]));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="border-stroke-soft max-w-[560px] gap-0 overflow-hidden rounded-12 border p-0 shadow-xl sm:rounded-12"
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
                  icon={<RiCodeLine className="text-text-sub size-5" />}
                  title="From scratch"
                  description="Just creating agent or already defined in code"
                />

                {showManagedOptions && (
                  <RuntimeCard
                    selected={runtime === 'claude'}
                    onClick={() => setRuntime('claude')}
                    icon={
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path
                          d="M10 2L12.5 7.5L18 8.5L14 12.5L15 18L10 15.5L5 18L6 12.5L2 8.5L7.5 7.5L10 2Z"
                          fill="#D4540A"
                          stroke="#D4540A"
                          strokeWidth="1"
                          strokeLinejoin="round"
                        />
                      </svg>
                    }
                    title="Claude Managed Agent"
                    description="Agent managed by Claude Managed Agents"
                  />
                )}

                <RuntimeCard
                  selected={runtime === 'vertex'}
                  onClick={() => {}}
                  disabled
                  icon={
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path
                        d="M10 2L17 6V14L10 18L3 14V6L10 2Z"
                        fill="#4285F4"
                        opacity="0.2"
                        stroke="#4285F4"
                        strokeWidth="1.5"
                      />
                      <circle cx="10" cy="10" r="3" fill="#4285F4" />
                    </svg>
                  }
                  title="Google Vertex AI Agent"
                  description="Agent is managed in Google Vertex AI Agent"
                />
              </div>
            </div>

            {/* Anthropic API key (Claude only) */}
            {isClaudeSelected && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-px">
                  <label htmlFor={apiKeyId} className="text-text-sub text-label-xs font-medium">
                    Anthropic API key
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-text-soft ml-0.5 inline-flex cursor-default items-center">
                        <RiInformationFill className="size-3.5" aria-hidden />
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
                      <RiExternalLinkLine className="size-3" aria-hidden />
                    </a>
                  </div>
                </div>
                <Input
                  id={apiKeyId}
                  size="2xs"
                  type="password"
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
                />
                {errors.apiKey ? (
                  <p id={`${apiKeyId}-error`} className="text-error-base text-label-xs" role="alert">
                    {errors.apiKey}
                  </p>
                ) : null}
              </div>
            )}

            {/* Separator */}
            <div className="border-stroke-weak border-t" />

            {/* Segmented control (Claude only) */}
            {isClaudeSelected && (
              <SegmentedControl value={mode} onValueChange={(v) => setMode(v as CreateAgentMode)}>
                <SegmentedControlList className="rounded-[5px] bg-bg-muted p-px">
                  <SegmentedControlTrigger value="create" className="text-label-xs">
                    Create new agent
                  </SegmentedControlTrigger>
                  <SegmentedControlTrigger value="existing" className="text-label-xs">
                    Setup from existing agent
                  </SegmentedControlTrigger>
                </SegmentedControlList>
                <TabsPrimitive.Content value="existing" className="mt-4 flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-px">
                      <label htmlFor={`${formId}-external-id`} className="text-text-sub text-label-xs font-medium">
                        Claude agent ID
                      </label>
                      <span className="text-primary-base text-label-sm leading-5 tracking-tight" aria-hidden>
                        *
                      </span>
                    </div>
                    <Input
                      id={`${formId}-external-id`}
                      size="2xs"
                      value={externalAgentId}
                      onChange={(e) => {
                        setExternalAgentId(e.target.value);
                        setErrors((prev) => ({ ...prev, externalAgentId: undefined }));
                      }}
                      placeholder="e.g. agent_01XJ5..."
                      className="font-mono"
                      hasError={Boolean(errors.externalAgentId)}
                      aria-invalid={errors.externalAgentId ? true : undefined}
                      aria-describedby={errors.externalAgentId ? `${formId}-external-id-error` : undefined}
                    />
                    {errors.externalAgentId ? (
                      <p id={`${formId}-external-id-error`} className="text-error-base text-label-xs" role="alert">
                        {errors.externalAgentId}
                      </p>
                    ) : (
                      <p className="text-text-soft text-paragraph-xs leading-4">
                        Find this in the Claude platform under your agent's settings. Novu will link to it and
                        automatically use its name as the agent name.
                      </p>
                    )}
                  </div>
                </TabsPrimitive.Content>
              </SegmentedControl>
            )}

            {/* Tools selector (Claude, create mode) */}
            {isClaudeSelected && mode === 'create' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <RiToolsLine className="text-text-soft size-3.5" aria-hidden />
                  <label className="text-text-strong text-label-xs font-medium">Tools</label>
                  <span className="text-text-soft text-paragraph-xs">({selectedTools.length} selected)</span>
                </div>
                <div className="border-stroke-soft flex flex-col gap-0 overflow-hidden rounded-lg border">
                  {CLAUDE_BUILTIN_TOOLS.map((tool, i) => (
                    <label
                      key={tool.type}
                      className={cn(
                        'flex cursor-pointer items-start gap-2.5 px-3 py-2 transition-colors',
                        'hover:bg-bg-weak',
                        i > 0 && 'border-stroke-weak border-t'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 size-3.5 shrink-0 cursor-pointer rounded accent-current"
                        checked={selectedTools.includes(tool.type)}
                        onChange={() => toggleTool(tool.type)}
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-text-sub text-label-xs font-medium">{tool.name}</span>
                        <span className="text-text-soft text-paragraph-xs leading-4">{tool.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* MCP servers selector (Claude, create mode) */}
            {isClaudeSelected && mode === 'create' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <RiServerLine className="text-text-soft size-3.5" aria-hidden />
                  <label className="text-text-strong text-label-xs font-medium">MCP Servers</label>
                  {selectedMcpServers.length > 0 && (
                    <span className="text-text-soft text-paragraph-xs">({selectedMcpServers.length} selected)</span>
                  )}
                </div>
                {/* Search */}
                <div className="border-stroke-soft relative overflow-hidden rounded-lg border">
                  <div className="border-stroke-weak relative flex items-center gap-2 border-b px-3 py-1.5">
                    <RiSearchLine className="text-text-soft size-3.5 shrink-0" aria-hidden />
                    <input
                      type="text"
                      value={mcpSearch}
                      onChange={(e) => setMcpSearch(e.target.value)}
                      placeholder="Search MCP servers..."
                      className="text-text-sub placeholder:text-text-soft w-full bg-transparent text-label-xs outline-none"
                    />
                  </div>
                  {/* Scrollable list */}
                  <div className="max-h-52 overflow-y-auto">
                    {filteredMcpServers.length === 0 ? (
                      <p className="text-text-soft px-3 py-3 text-center text-label-xs">
                        No servers match your search.
                      </p>
                    ) : (
                      <>
                        {popularMcpServers.length > 0 && (
                          <>
                            <div className="bg-bg-weak px-3 py-1">
                              <span className="text-text-soft font-code text-[10px] font-medium uppercase tracking-wider">
                                Popular
                              </span>
                            </div>
                            {popularMcpServers.map((server, i) => (
                              <label
                                key={server.id}
                                className={cn(
                                  'flex cursor-pointer items-start gap-2.5 px-3 py-2 transition-colors hover:bg-bg-weak',
                                  i > 0 && 'border-stroke-weak border-t'
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5 size-3.5 shrink-0 cursor-pointer rounded accent-current"
                                  checked={selectedMcpServers.includes(server.id)}
                                  onChange={() => toggleMcpServer(server.id)}
                                />
                                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-text-sub text-label-xs font-medium">{server.name}</span>
                                    <span className="text-text-soft rounded bg-bg-weak px-1 py-px text-[10px] leading-3">
                                      {server.category}
                                    </span>
                                  </div>
                                  <span className="text-text-soft text-paragraph-xs leading-4">
                                    {server.description}
                                  </span>
                                </div>
                              </label>
                            ))}
                          </>
                        )}
                        {otherMcpServers.length > 0 && (
                          <>
                            <div className="bg-bg-weak border-stroke-weak border-t px-3 py-1">
                              <span className="text-text-soft font-code text-[10px] font-medium uppercase tracking-wider">
                                All
                              </span>
                            </div>
                            {otherMcpServers.map((server, i) => (
                              <label
                                key={server.id}
                                className={cn(
                                  'flex cursor-pointer items-start gap-2.5 px-3 py-2 transition-colors hover:bg-bg-weak',
                                  i > 0 && 'border-stroke-weak border-t'
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5 size-3.5 shrink-0 cursor-pointer rounded accent-current"
                                  checked={selectedMcpServers.includes(server.id)}
                                  onChange={() => toggleMcpServer(server.id)}
                                />
                                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-text-sub text-label-xs font-medium">{server.name}</span>
                                    <span className="text-text-soft rounded bg-bg-weak px-1 py-px text-[10px] leading-3">
                                      {server.category}
                                    </span>
                                  </div>
                                  <span className="text-text-soft text-paragraph-xs leading-4">
                                    {server.description}
                                  </span>
                                </div>
                              </label>
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Skills selector (Claude, create mode) */}
            {isClaudeSelected && mode === 'create' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <RiSparkling2Line className="text-text-soft size-3.5" aria-hidden />
                  <label className="text-text-strong text-label-xs font-medium">Skills</label>
                  {selectedSkills.length > 0 && (
                    <span className="text-text-soft text-paragraph-xs">({selectedSkills.length} selected)</span>
                  )}
                </div>
                <div className="border-stroke-soft flex flex-col gap-0 overflow-hidden rounded-lg border">
                  {CLAUDE_ANTHROPIC_SKILLS.map((skill, i) => (
                    <label
                      key={skill.skillId}
                      className={cn(
                        'flex cursor-pointer items-start gap-2.5 px-3 py-2 transition-colors',
                        'hover:bg-bg-weak',
                        i > 0 && 'border-stroke-weak border-t'
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 size-3.5 shrink-0 cursor-pointer rounded accent-current"
                        checked={selectedSkills.includes(skill.skillId)}
                        onChange={() => toggleSkill(skill.skillId)}
                      />
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-text-sub text-label-xs font-medium">{skill.name}</span>
                        <span className="text-text-soft text-paragraph-xs leading-4">{skill.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Template pills (create tab or non-Claude) */}
            {(!isClaudeSelected || mode === 'create') && (
              <div className="flex flex-col gap-2.5">
                <label className="text-text-sub text-label-xs font-medium">Start from a template</label>
                <div className="flex flex-wrap items-center gap-2">
                  {visibleTemplates.map((template) => (
                    <button
                      key={template.label}
                      type="button"
                      onClick={() => handleTemplateSelect(template)}
                      className="border-stroke-soft text-text-sub hover:bg-bg-weak inline-flex items-center gap-1 rounded-full border bg-bg-white px-2 py-1.5 text-label-xs font-medium transition-colors"
                    >
                      <RiCodeLine className="size-3.5 shrink-0" aria-hidden />
                      {template.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleTemplateRotate}
                    aria-label="Show more templates"
                    className="text-text-soft hover:text-text-sub inline-flex size-5 items-center justify-center transition-colors"
                  >
                    <RiRefreshLine className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            )}

            {/* Name + Identifier side by side — hidden when adopting an existing Claude agent */}
            {!(isClaudeSelected && mode === 'existing') && (
              <div className="flex gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
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

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-px">
                    <RequiredFieldLabel htmlFor={identifierId}>Agent Identifier</RequiredFieldLabel>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-text-soft ml-0.5 inline-flex cursor-default items-center">
                          <RiInformationFill className="size-3.5" aria-hidden />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Used in code and APIs. Must be unique. Letters, numbers, hyphens, underscores, and dots only.
                      </TooltipContent>
                    </Tooltip>
                  </div>
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
                    Letters, numbers, hyphens, underscores, and dots only (no spaces).
                  </Hint>
                  {errors.identifier ? (
                    <p id={`${identifierId}-error`} className="text-error-base text-label-xs" role="alert">
                      {errors.identifier}
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            {/* Instructions / Description textarea — hidden when adopting an existing Claude agent */}
            {!(isClaudeSelected && mode === 'existing') && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <label htmlFor={instructionsId} className="text-text-strong text-label-xs font-medium">
                    Instructions
                  </label>
                  {isClaudeSelected && (
                    <span className="text-text-soft text-paragraph-xs">(Sent to Claude as the system prompt)</span>
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
