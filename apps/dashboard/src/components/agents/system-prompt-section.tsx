import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowRightUpLine, RiCheckLine, RiCloseLine, RiPencilLine } from 'react-icons/ri';
import {
  type AgentResponse,
  getAgentRuntimeConfig,
  getAgentRuntimeConfigQueryKey,
  patchAgentRuntimeConfig,
} from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { Skeleton } from '@/components/primitives/skeleton';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';

type SystemPromptSectionProps = {
  agent: AgentResponse;
};

const PROD_READ_ONLY_TOOLTIP =
  'This setting is read-only in production. Edit in Development and promote to apply changes.';

export function SystemPromptSection({ agent }: SystemPromptSectionProps) {
  const { currentEnvironment, readOnly } = useEnvironment();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const configQuery = useQuery({
    queryKey: getAgentRuntimeConfigQueryKey(currentEnvironment?._id, agent.identifier),
    queryFn: () =>
      getAgentRuntimeConfig(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier),
    enabled: Boolean(currentEnvironment && agent.identifier && agent.runtime === 'managed'),
  });

  const updatePrompt = useMutation({
    mutationFn: (systemPrompt: string) =>
      patchAgentRuntimeConfig(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier, {
        systemPrompt,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getAgentRuntimeConfigQueryKey(currentEnvironment?._id, agent.identifier),
      });
      setIsEditing(false);
    },
    onError: (err: Error) => {
      const message = err instanceof NovuApiError ? err.message : 'Could not update system prompt.';
      showErrorToast(message, 'Update failed');
    },
  });

  const config = configQuery.data;
  const systemPrompt = config?.systemPrompt ?? '';

  useEffect(() => {
    if (!isEditing || !textareaRef.current) return;

    textareaRef.current.focus();
    const length = textareaRef.current.value.length;
    textareaRef.current.setSelectionRange(length, length);
  }, [isEditing]);

  if (agent.runtime !== 'managed') {
    return null;
  }

  if (config?.capabilities && config.capabilities.systemPrompt === false) {
    return null;
  }

  const consoleUrl = agent.managedRuntime?.consoleUrl;
  const canEdit = !readOnly;
  const isMutating = updatePrompt.isPending;
  const showInstructionsActions = !configQuery.isLoading && !configQuery.isError;

  const handleEditClick = () => {
    setDraft(systemPrompt);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(systemPrompt);
    setIsEditing(false);
  };

  const handleSave = () => {
    if (draft === systemPrompt) {
      setIsEditing(false);

      return;
    }

    updatePrompt.mutate(draft);
  };

  let body: React.ReactNode = (
    <div className="relative max-h-[96px] overflow-hidden">
      {systemPrompt ? (
        <p className="text-text-sub text-label-xs leading-4 font-medium whitespace-pre-wrap break-words">
          {systemPrompt}
        </p>
      ) : (
        <p className="text-text-soft text-label-xs italic">No system prompt set.</p>
      )}
      {systemPrompt ? (
        <div className="bg-linear-to-b from-transparent via-bg-white/40 to-bg-white pointer-events-none absolute inset-x-0 bottom-0 h-14" />
      ) : null}
    </div>
  );

  if (configQuery.isLoading) {
    body = (
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    );
  }

  if (configQuery.isError) {
    body = <div className="text-text-soft text-label-xs">Could not load system prompt. Try again later.</div>;
  }

  if (isEditing) {
    body = (
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        disabled={isMutating}
        rows={6}
        className="text-text-sub text-label-xs placeholder:text-text-soft w-full resize-y bg-transparent font-medium leading-4 whitespace-pre-wrap outline-hidden disabled:opacity-50"
        placeholder="Describe what this agent should do…"
        aria-label="System prompt instructions"
      />
    );
  }

  return (
    <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
      <div className="flex items-center justify-between gap-1 px-2 pt-1 pb-1.5">
        <span className="text-text-soft font-code text-[11px] font-medium uppercase leading-4 tracking-wider truncate">
          System prompt
        </span>
        {consoleUrl ? (
          <a
            href={consoleUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 rounded-lg p-0 text-label-xs font-medium transition-colors truncate"
          >
            View in Claude
            <RiArrowRightUpLine className="size-4" />
          </a>
        ) : null}
      </div>
      <div className="bg-bg-white flex flex-col overflow-hidden rounded-md shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-2 p-3">
          <div className="flex items-center gap-2">
            <span className="text-text-soft text-[11px] font-medium leading-3 tracking-wider">Instructions</span>
            <span className="bg-stroke-soft h-px flex-1" />
            {showInstructionsActions ? (
              <InstructionsActions
                isEditing={isEditing}
                canEdit={canEdit}
                isMutating={isMutating}
                onEdit={handleEditClick}
                onCancel={handleCancel}
                onSave={handleSave}
              />
            ) : null}
          </div>
          {body}
        </div>
      </div>
    </div>
  );
}

type InstructionsActionsProps = {
  isEditing: boolean;
  canEdit: boolean;
  isMutating: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
};

function InstructionsActions({ isEditing, canEdit, isMutating, onEdit, onCancel, onSave }: InstructionsActionsProps) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Cancel"
          className="text-error-base inline-flex size-4 items-center justify-center rounded transition-opacity hover:opacity-80 disabled:opacity-50"
          disabled={isMutating}
          onClick={onCancel}
        >
          <RiCloseLine className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Save system prompt"
          className="text-success-base inline-flex size-4 items-center justify-center rounded transition-opacity hover:opacity-80 disabled:opacity-50"
          disabled={isMutating}
          onClick={onSave}
        >
          <RiCheckLine className="size-4" />
        </button>
      </div>
    );
  }

  if (canEdit) {
    return (
      <button
        type="button"
        aria-label="Edit system prompt"
        className="text-text-soft hover:text-text-strong inline-flex size-4 items-center justify-center rounded transition-colors"
        onClick={onEdit}
      >
        <RiPencilLine className="size-4" />
      </button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="text-text-disabled inline-flex size-4 items-center justify-center rounded">
          <RiPencilLine className="size-4" aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{PROD_READ_ONLY_TOOLTIP}</TooltipContent>
    </Tooltip>
  );
}
