/** biome-ignore-all lint/correctness/useUniqueElementIds: working correctly */
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { AiAgentTypeEnum, AiResourceTypeEnum, DuplicateWorkflowDto } from '@novu/shared';
import * as Sentry from '@sentry/react';
import { ChatOnDataCallback, generateId, UIMessage } from 'ai';
import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  RiArrowRightSLine,
  RiCheckboxCircleFill,
  RiCloseLine,
  RiLoader3Line,
  RiLoader4Fill,
  RiRouteFill,
} from 'react-icons/ri';
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
import { useTelemetry } from '@/hooks/use-telemetry';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { Badge } from './primitives/badge';
import { Form, FormControl, FormField, FormItem, FormMessage, FormRoot } from './primitives/form/form';
import { showErrorToast } from './primitives/sonner-helpers';

export type WorkflowCreatedEvent = {
  type: 'workflow-created';
  workflowId: string;
  workflowSlug: string;
  chatId: string;
};

type CreateWorkflowTab = 'guided' | 'manual';

const WORKFLOW_SUGGESTIONS = [
  'Welcome email workflow',
  'Order confirmation workflow',
  'Payment failed workflow',
  'Password reset workflow',
];

export function CreateWorkflowModal({ mode, workflowId }: { mode: 'create' | 'duplicate'; workflowId?: string }) {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const track = useTelemetry();
  const [open, setOpen] = useState(true);
  const createdWorkflowSlugRef = useRef<string | null>(null);
  const chatId = useMemo(() => generateId(), []);
  const persistedChatIdRef = useRef<string | null>(null);
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

  const handleData = useCallback<ChatOnDataCallback<UIMessage>>(
    (data) => {
      if (
        data &&
        typeof data === 'object' &&
        'type' in data &&
        (data as { type: string }).type === 'data-workflow-created'
      ) {
        const workflowCreatedEvent = data.data as unknown as WorkflowCreatedEvent;
        createdWorkflowSlugRef.current = workflowCreatedEvent.workflowSlug;

        track(TelemetryEvent.COPILOT_WORKFLOW_GENERATED, {
          workflowId: workflowCreatedEvent.workflowId,
          chatId: workflowCreatedEvent.chatId,
        });

        navigate(
          buildRoute(ROUTES.EDIT_WORKFLOW, {
            environmentSlug: currentEnvironment?.slug ?? '',
            workflowSlug: createdWorkflowSlugRef.current ?? '',
          }),
          { state: { chatId: workflowCreatedEvent.chatId } }
        );
      }
    },
    [currentEnvironment?.slug, navigate, track]
  );

  const { sendPrompt, stop, isGenerating, error } = useAiChatStream({
    id: chatId,
    agentType: AiAgentTypeEnum.GENERATE_WORKFLOW,
    onData: handleData,
  });

  useEffect(() => {
    if (error) {
      const errorMessage = error.message || 'There was an error starting the stream.';
      showErrorToast(errorMessage, 'Failed to start stream');
      // ignore errors from the input guard middleware
      if (!errorMessage.includes('Novu Copilot')) {
        Sentry.captureException(error, {
          tags: { feature: 'ai-copilot', action: 'stream-start-error' },
          extra: { chatId: persistedChatIdRef.current ?? chatId },
        });
      }
    }
  }, [error, chatId]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

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
    const clearedPrompt = prompt.trim();
    if (!clearedPrompt) {
      return;
    }

    track(TelemetryEvent.COPILOT_GUIDED_SUBMIT, {
      promptLength: clearedPrompt.length,
    });

    if (persistedChatIdRef.current) {
      sendPrompt({ chatId: persistedChatIdRef.current, prompt: clearedPrompt });
      return;
    }

    await createAiChat(
      { resourceType: AiResourceTypeEnum.WORKFLOW },
      {
        onError: (err) => {
          showErrorToast(err.message || 'There was an error creating the chat.', 'Failed to create chat');
          Sentry.captureException(err, {
            tags: { feature: 'ai-copilot', action: 'create-ai-chat' },
          });
        },
        onSuccess: async (chat) => {
          persistedChatIdRef.current = chat._id;
          sendPrompt({ chatId: chat._id, prompt: clearedPrompt });
        },
      }
    );
  }

  const handleTabChange = (value: string) => {
    const newTab = value as CreateWorkflowTab;
    setTab(newTab);
    track(TelemetryEvent.COPILOT_TAB_SWITCHED, { tab: newTab });
  };

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
                  <SegmentedControl value={tab} onValueChange={handleTabChange}>
                    <SegmentedControlList>
                      <SegmentedControlTrigger value="guided">
                        Guided{' '}
                        <Badge variant="lighter" color="gray" className="ml-1">
                          BETA
                        </Badge>
                      </SegmentedControlTrigger>
                      <SegmentedControlTrigger value="manual">Manual</SegmentedControlTrigger>
                    </SegmentedControlList>
                  </SegmentedControl>
                </div>
                <Separator className="mx-3 w-[calc(100%-24px)]" />
              </>
            )}

            {showGuidedContent && (
              <GuidedModeContent onSubmit={handleGuidedSubmit} isGenerating={isGenerating} error={error} />
            )}

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
  prompt: z.string().min(1, 'Prompt is required').max(2000),
});

type GuidedModeContentProps = {
  onSubmit: (values: z.infer<typeof schema>) => void;
  isGenerating: boolean;
  error?: Error;
};

const STEP_DELAY_MS = 2000;

const GENERATION_STEPS = [
  { id: 'spinning', text: 'Spinning up a fresh workflow' },
  { id: 'coffee', text: 'Sipping a little bit of coffee' },
  {
    id: 'workflow-id',
    text: 'Generating a unique workflow ID',
  },
  {
    id: 'tags',
    text: 'Setting up tags',
  },
  { id: 'canvas', text: 'Laying out the workflow canvas' },
  { id: 'moment', text: 'One moment while we set this up' },
] as const;

type GenerationStepStatus = 'success' | 'progress' | 'pending';

type GenerationStep = {
  id: string;
  text: string;
  status: GenerationStepStatus;
};

function GuidedModeContent({ onSubmit, isGenerating, error }: GuidedModeContentProps) {
  const track = useTelemetry();
  const form = useForm({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      prompt: '',
    },
  });

  const [animatedStepIndex, setAnimatedStepIndex] = useState(-1);

  useEffect(() => {
    if (!isGenerating) return;

    setAnimatedStepIndex(0);

    const interval = setInterval(() => {
      setAnimatedStepIndex((prev) => {
        if (prev >= GENERATION_STEPS.length - 1) {
          return prev;
        }
        return prev + 1;
      });
    }, STEP_DELAY_MS);

    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    if (error) {
      setAnimatedStepIndex(-1);
    }
  }, [error]);

  function handleSuggestionClick(suggestion: string) {
    track(TelemetryEvent.COPILOT_SUGGESTION_CLICKED, { suggestion });
    form.setValue('prompt', suggestion);
  }

  const header = useMemo(
    () => (
      <div className="flex flex-col items-start gap-2 pt-8 pb-0">
        <Sparkling className="size-8" />
        <div className="flex flex-col gap-1">
          <span className="text-label-md text-text-strong font-medium flex items-center gap-1">
            Create a workflow that works out of the box
          </span>
          <span className="text-label-xs text-text-soft">
            Describe a product activity and how you want to reach users. Novu designs a complete workflow with best
            practices.
          </span>
        </div>
      </div>
    ),
    []
  );

  if (isGenerating || animatedStepIndex >= 0) {
    const effectiveStepIndex = animatedStepIndex === -1 && isGenerating ? 0 : animatedStepIndex;

    const steps: GenerationStep[] = GENERATION_STEPS.map((step, index) => {
      const status: GenerationStepStatus =
        index < effectiveStepIndex ? 'success' : index === effectiveStepIndex ? 'progress' : 'pending';

      return { id: step.id, text: step.text, status };
    });

    const ITEM_HEIGHT = 16;
    const GAP = 8;
    const CONTAINER_HEIGHT = 190;
    const activeIndex = effectiveStepIndex;

    return (
      <div className="flex flex-col gap-2 p-3 pb-6">
        {header}
        <div className="relative flex flex-1 flex-col overflow-hidden" style={{ minHeight: CONTAINER_HEIGHT }}>
          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              maskImage: 'linear-gradient(to bottom, transparent 0%, black 50%, black 60%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 50%, black 60%, transparent 100%)',
            }}
          >
            <motion.div
              className="absolute left-0 right-0 flex flex-col gap-2 px-3"
              initial={false}
              animate={{ y: CONTAINER_HEIGHT / 2 - ITEM_HEIGHT / 2 - activeIndex * (ITEM_HEIGHT + GAP) }}
              transition={{ type: 'tween', ease: 'easeInOut' }}
            >
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  className="flex items-center gap-2 shrink-0"
                  animate={{ opacity: index === activeIndex ? 1 : 0.4 }}
                  transition={{ duration: 0.2 }}
                >
                  {step.status === 'success' && (
                    <div className="flex size-4 shrink-0 items-center justify-center rounded-full shadow-xs">
                      <RiCheckboxCircleFill className="size-3 text-success" />
                    </div>
                  )}
                  {step.status === 'progress' && (
                    <div className="flex size-4 shrink-0 items-center justify-center rounded-full shadow-xs">
                      <RiLoader4Fill className="size-3 animate-spin text-text-sub" />
                    </div>
                  )}
                  {step.status === 'pending' && (
                    <div className="flex size-4 shrink-0 items-center justify-center rounded-full shadow-xs">
                      <RiLoader3Line className="size-3 text-text-sub" />
                    </div>
                  )}
                  <span className="text-label-xs text-text-sub">{step.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 pb-6">
      {header}

      <div className="flex flex-wrap items-center gap-2 mt-8">
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
        {/* <Button
          className="cursor-pointer h-6 [&_svg]:size-2.5"
          variant="secondary"
          mode="ghost"
          size="2xs"
          trailingIcon={RiLoopLeftLine}
        /> */}
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
