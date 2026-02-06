/** biome-ignore-all lint/correctness/useUniqueElementIds: working correctly */
import { AiAgentTypeEnum, AiResourceTypeEnum, DuplicateWorkflowDto } from '@novu/shared';
import { ChatOnDataCallback, generateId, UIMessage } from 'ai';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiArrowRightSLine, RiCloseLine, RiLoopLeftLine, RiRouteFill } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Sparkling } from '@/components/icons/sparkling';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
} from '@/components/primitives/dialog';
import {
  SegmentedControl,
  SegmentedControlList,
  SegmentedControlTrigger,
} from '@/components/primitives/segmented-control';
import { Separator } from '@/components/primitives/separator';
import { Skeleton } from '@/components/primitives/skeleton';
import { Tag } from '@/components/primitives/tag';
import { Textarea } from '@/components/primitives/textarea';
import { ExternalLink } from '@/components/shared/external-link';
import { CreateWorkflowForm } from '@/components/workflow-editor/create-workflow-form';
import { useEnvironment } from '@/context/environment/hooks';
import { useAiChatStream } from '@/hooks/use-ai-chat-stream';
import { useCreateAiChat } from '@/hooks/use-create-ai-chat';
import { useCreateWorkflow } from '@/hooks/use-create-workflow';
import { useDuplicateWorkflow } from '@/hooks/use-duplicate-workflow';
import { useFetchWorkflow } from '@/hooks/use-fetch-workflow';
import { useFormProtection } from '@/hooks/use-form-protection';
import { buildRoute, ROUTES } from '@/utils/routes';
import { StyledMessageResponse } from './ai-sidekick/chat-message-response';
import { Form, FormControl, FormField, FormItem, FormMessage, FormRoot } from './primitives/form/form';
import { showErrorToast } from './primitives/sonner-helpers';

export type WorkflowCreatedEvent = {
  type: 'workflow-created';
  workflowSlug: string;
  chatId: string;
};

type CreateWorkflowTab = 'guided' | 'manual';

const WORKFLOW_SUGGESTIONS = [
  'Welcome email workflow',
  'Order confirmation workflow',
  'Payment failed',
  'Password reset workflow',
];

export function CreateWorkflowModal({ mode, workflowId }: { mode: 'create' | 'duplicate'; workflowId?: string }) {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const [open, setOpen] = useState(true);
  const createdWorkflowSlugRef = useRef<string | null>(null);
  const [tab, setTab] = useState<CreateWorkflowTab>('guided');

  const { workflow, isPending: isLoadingWorkflow } = useFetchWorkflow({
    workflowSlug: mode === 'duplicate' ? workflowId : undefined,
  });

  const handleClose = (isOpen: boolean) => {
    if (isLoading) return;

    setOpen(isOpen);

    if (!isOpen) {
      setTimeout(() => {
        navigate(
          buildRoute(ROUTES.WORKFLOWS, {
            environmentSlug: currentEnvironment?.slug ?? '',
          })
        );
      }, 300);
    }
  };

  const { ref, protectedOnValueChange, ProtectionAlert } = useFormProtection({
    onValueChange: handleClose,
  });

  const handleData = useCallback<ChatOnDataCallback<UIMessage>>((data) => {
    if (
      data &&
      typeof data === 'object' &&
      'type' in data &&
      (data as { type: string }).type === 'data-workflow-created'
    ) {
      const workflowCreatedEvent = data.data as unknown as WorkflowCreatedEvent;
      createdWorkflowSlugRef.current = workflowCreatedEvent.workflowSlug;
    }
  }, []);

  const chatId = useMemo(() => generateId(), []);
  const { sendPrompt, messages, isGenerating } = useAiChatStream({
    id: chatId,
    agentType: AiAgentTypeEnum.CREATE_WORKFLOW,
    onData: handleData,
  });

  const duplicateWorkflow = useDuplicateWorkflow({ workflowSlug: workflowId || '' });
  const createWorkflowHook = useCreateWorkflow();
  const { submit: submitWorkflow, isLoading: isSubmitting } =
    mode === 'duplicate' ? duplicateWorkflow : createWorkflowHook;
  const { createAiChat, isPending: isCreatingAiChat } = useCreateAiChat();

  const isLoading = isSubmitting || isGenerating || isCreatingAiChat;
  const isLoadingTemplate = mode === 'duplicate' && isLoadingWorkflow;

  const template: DuplicateWorkflowDto | undefined =
    mode === 'duplicate' && workflow
      ? {
          name: `${workflow.name} (Copy)`,
          description: workflow.description,
          tags: workflow.tags,
          isTranslationEnabled: workflow.isTranslationEnabled,
        }
      : undefined;

  async function handleGuidedSubmit({ prompt }: { prompt: string }) {
    await createAiChat(
      { resourceType: AiResourceTypeEnum.WORKFLOW },
      {
        onError: (error) => {
          showErrorToast(error.message || 'There was an error creating the chat.', 'Failed to create chat');
        },
        onSuccess: async (chat) => {
          await sendPrompt({ chatId: chat._id, prompt });
          setTimeout(() => {
            navigate(
              buildRoute(ROUTES.EDIT_WORKFLOW, {
                environmentSlug: currentEnvironment?.slug ?? '',
                workflowSlug: createdWorkflowSlugRef.current ?? '',
              }),
              { state: { chatId: chat._id } }
            );
          }, 1000);
        },
      }
    );
  }

  const reasoningText = useMemo(() => {
    const workflowReasoningParts = messages
      .filter((m) => m.role === 'assistant')
      .flatMap((m) => m.parts.filter((p) => p.type === 'data-reasoning'));

    return workflowReasoningParts
      .map((p) =>
        'data' in p && p.data && typeof p.data === 'object' && 'text' in p.data ? (p.data as { text: string }).text : ''
      )
      .join('\n');
  }, [messages]);

  const isDuplicateMode = mode === 'duplicate';
  const showTabs = !isDuplicateMode;
  const showGuidedContent = !isDuplicateMode && tab === 'guided';
  const showManualContent = isDuplicateMode || tab === 'manual';

  const title = isDuplicateMode ? 'Duplicate workflow' : 'Create workflow';
  const buttonText = showGuidedContent
    ? 'Generate workflow'
    : isDuplicateMode
      ? 'Duplicate workflow'
      : 'Create workflow';

  return (
    <>
      <Dialog open={open} onOpenChange={protectedOnValueChange}>
        <DialogOverlay />
        <DialogContent
          ref={ref}
          className={`flex w-[500px] p-0 flex-col overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-md gap-0`}
          hideCloseButton
        >
          <div className="flex flex-col gap-3 p-3">
            <div className="flex items-start gap-2">
              <div className="flex flex-1 flex-col gap-0.5">
                <DialogTitle className="text-label-md font-medium">{title}</DialogTitle>
                <DialogDescription className="text-text-soft text-label-xs flex items-center gap-1">
                  Turn product activity into messages across channels.{' '}
                  <ExternalLink href="https://docs.novu.co/platform/concepts/workflows" underline={false}>
                    Learn more
                  </ExternalLink>
                </DialogDescription>
              </div>
              <DialogClose asChild>
                <CompactButton size="md" variant="ghost" icon={RiCloseLine}>
                  <span className="sr-only">Close</span>
                </CompactButton>
              </DialogClose>
            </div>
          </div>

          <div className={`flex flex-col ${showGuidedContent ? 'flex-1' : ''}`}>
            <Separator />

            {showTabs && (
              <>
                <div className="flex flex-col gap-2 p-3">
                  <SegmentedControl value={tab} onValueChange={(value) => setTab(value as CreateWorkflowTab)}>
                    <SegmentedControlList>
                      <SegmentedControlTrigger value="guided">Guided</SegmentedControlTrigger>
                      <SegmentedControlTrigger value="manual">Manual</SegmentedControlTrigger>
                    </SegmentedControlList>
                  </SegmentedControl>
                </div>
                <Separator className="mx-3 w-[calc(100%-24px)]" />
              </>
            )}

            {showGuidedContent && <GuidedModeContent onSubmit={handleGuidedSubmit} reasoningText={reasoningText} />}

            {showManualContent &&
              (isLoadingTemplate ? (
                <ManualModeContentSkeleton />
              ) : (
                <ManualModeContent onSubmit={submitWorkflow} template={template} />
              ))}
          </div>

          <div className="border-stroke-soft flex items-center justify-end border-t p-3">
            {showGuidedContent ? (
              <Button
                variant="secondary"
                mode="gradient"
                size="xs"
                className="cursor-pointer"
                trailingIcon={RiArrowRightSLine}
                type="submit"
                form="generate-workflow"
                disabled={isLoading}
                isLoading={isLoading}
              >
                {buttonText}
              </Button>
            ) : (
              <Button
                variant="secondary"
                mode="gradient"
                size="xs"
                className="cursor-pointer"
                trailingIcon={RiArrowRightSLine}
                type="submit"
                form="create-workflow"
                disabled={isLoading || isLoadingTemplate}
                isLoading={isLoading}
              >
                {buttonText}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {ProtectionAlert}
    </>
  );
}

const schema = z.object({
  prompt: z.string().max(2000),
});

type GuidedModeContentProps = {
  onSubmit: (values: z.infer<typeof schema>) => void;
  isGenerating?: boolean;
  reasoningText?: string;
};

function GuidedModeContent({ onSubmit, reasoningText }: GuidedModeContentProps) {
  const form = useForm<z.infer<typeof schema>>({
    defaultValues: {
      prompt: '',
    },
  });

  function handleSuggestionClick(suggestion: string) {
    form.setValue('prompt', suggestion);
  }

  if (reasoningText) {
    return (
      <div className="flex flex-1 flex-col gap-2 p-3 pb-6">
        <div className="flex flex-col items-start gap-2 py-4">
          <Sparkling className="size-8 animate-pulse" />
        </div>
        <StyledMessageResponse>{reasoningText}</StyledMessageResponse>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-end gap-2 p-3 pb-6">
      <div className="flex flex-col items-start gap-2 py-8">
        <Sparkling className="size-8" />
        <div className="flex flex-col gap-1">
          <span className="text-label-md text-text-strong font-medium">
            Create a workflow that works out of the box
          </span>
          <span className="text-label-xs text-text-soft">
            Describe a product activity and how you want to reach users. Novu designs a complete workflow with best
            practices.
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {WORKFLOW_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="cursor-pointer"
            onClick={() => handleSuggestionClick(suggestion)}
          >
            <Tag className="rounded-full" variant="stroke" icon={<RiRouteFill className="text-feature" />}>
              {suggestion}
            </Tag>
          </button>
        ))}
        <Button
          className="cursor-pointer h-6 [&_svg]:size-2.5"
          variant="secondary"
          mode="ghost"
          size="2xs"
          trailingIcon={RiLoopLeftLine}
        />
      </div>
      <Form {...form}>
        <FormRoot
          id="generate-workflow"
          autoComplete="off"
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    showCounter
                    maxLength={2000}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="When a user signs up, send a welcome email and an in-app tip. If they don't activate in 24h, send a reminder."
                    className="min-h-[100px] resize-none rounded-lg"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormRoot>
      </Form>
    </div>
  );
}

type ManualModeContentProps = {
  onSubmit: React.ComponentProps<typeof CreateWorkflowForm>['onSubmit'];
  template?: DuplicateWorkflowDto;
};

function ManualModeContent({ onSubmit, template }: ManualModeContentProps) {
  return (
    <div className="p-3 pt-4">
      <CreateWorkflowForm onSubmit={onSubmit} template={template} />
    </div>
  );
}

function ManualModeContentSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-3 pt-4">
      <div>
        <div className="mb-2">
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-9 w-full" />
      </div>

      <div>
        <div className="mb-2">
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-full" />
      </div>

      <Separator />

      <div>
        <div className="mb-2">
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-9 w-full" />
      </div>

      <div>
        <div className="mb-2">
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
