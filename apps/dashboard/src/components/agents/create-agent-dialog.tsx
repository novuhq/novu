import { FeatureFlagsKeysEnum, slugify } from '@novu/shared';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { RiArrowRightSLine, RiArrowRightUpLine, RiCloseLine, RiFileCodeLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/primitives/dialog';
import {
  SegmentedControl,
  SegmentedControlList,
  SegmentedControlTrigger,
} from '@/components/primitives/segmented-control';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { cn } from '@/utils/ui';
import { BotIcon } from '../icons/bot';
import { ClaudeIcon } from '../icons/claude';
import { GoogleIcon } from '../icons/google';
import { Tag } from '../primitives/tag';
import {
  AGENT_TEMPLATES,
  type AgentTemplate,
  ClaudeCredentialsFields,
  type CreateAgentForm,
  type CreateAgentFormErrors,
  type CreateAgentMode,
  ExistingAgentFields,
  hasFormErrors,
  type RuntimeType,
  ScratchAgentFields,
  validateCreateAgentForm,
} from './create-agent-fields';

const DOCS_AGENTS_LEARN_MORE_HREF = 'https://docs.novu.co';

import type { ReactNode } from 'react';

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

export type { CreateAgentForm } from './create-agent-fields';

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
  const [errors, setErrors] = useState<CreateAgentFormErrors>({});
  const [isIdentifierTouched, setIsIdentifierTouched] = useState(false);
  const [templateOffset] = useState(0);

  const visibleTemplates = AGENT_TEMPLATES.slice(templateOffset, templateOffset + 4);

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

            {isClaudeSelected && (
              <div className="flex flex-col gap-5">
                <ClaudeCredentialsFields
                  apiKey={apiKey}
                  workspaceId={externalWorkspaceId}
                  errors={errors}
                  onApiKeyChange={(next) => {
                    setApiKey(next);
                    setErrors((prev) => ({ ...prev, apiKey: undefined }));
                  }}
                  onWorkspaceIdChange={setExternalWorkspaceId}
                />

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
