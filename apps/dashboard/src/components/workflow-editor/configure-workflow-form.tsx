import { motion } from 'motion/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import type { ExternalToast } from 'sonner';
import { z } from 'zod';

import { PAUSE_MODAL_TITLE, PauseModalDescription } from '@/components/pause-workflow-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { ToastIcon } from '@/components/primitives/sonner';
import { showToast } from '@/components/primitives/sonner-helpers';
import { SidebarContent, SidebarHeader } from '@/components/side-navigation/sidebar';
import { MAX_DESCRIPTION_LENGTH, workflowSchema } from '@/components/workflow-editor/schema';
import { UpdateWorkflowFn } from '@/components/workflow-editor/workflow-provider';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment, useFetchEnvironments } from '@/context/environment/hooks';
import { useDeleteWorkflow } from '@/hooks/use-delete-workflow';
import { useFormAutosave } from '@/hooks/use-form-autosave';
import { useSyncWorkflow } from '@/hooks/use-sync-workflow';
import { useTags } from '@/hooks/use-tags';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { WorkflowOriginEnum, WorkflowResponseDto } from '@novu/shared';
import {
  RiArrowRightSLine,
  RiCodeSSlashLine,
  RiDeleteBin2Line,
  RiGitPullRequestFill,
  RiMore2Fill,
  RiSettingsLine,
} from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { TelemetryEvent } from '../../utils/telemetry';
import { ConfirmationModal } from '../confirmation-modal';
import { DeleteWorkflowDialog } from '../delete-workflow-dialog';
import { RouteFill } from '../icons';
import { PageMeta } from '../page-meta';
import { Button } from '../primitives/button';
import { CompactButton } from '../primitives/button-compact';
import { CopyButton } from '../primitives/copy-button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../primitives/form/form';
import { Input } from '../primitives/input';
import { Separator } from '../primitives/separator';
import { Switch } from '../primitives/switch';
import { TagInput } from '../primitives/tag-input';
import { Textarea } from '../primitives/textarea';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '../primitives/tooltip';
import { usePromotionalBanner } from '../promotional/coming-soon-banner';

type ConfigureWorkflowFormProps = {
  workflow: WorkflowResponseDto;
  update: UpdateWorkflowFn;
};

const toastOptions: ExternalToast = {
  position: 'bottom-right',
  classNames: {
    toast: 'mb-4 right-0',
  },
};

export const ConfigureWorkflowForm = (props: ConfigureWorkflowFormProps) => {
  const { workflow, update } = props;
  const navigate = useNavigate();
  const isReadOnly = workflow.origin === WorkflowOriginEnum.EXTERNAL;
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { tags } = useTags();
  const { currentEnvironment } = useEnvironment();
  const { currentOrganization } = useAuth();
  const { environments = [] } = useFetchEnvironments({ organizationId: currentOrganization?._id });
  const { safeSync, isSyncable, tooltipContent, PromoteConfirmModal } = useSyncWorkflow(workflow);
  const { show: showComingSoonBanner } = usePromotionalBanner({
    content: {
      title: '🚧 Export to Code is on the way!',
      description:
        'With Export to Code, you can design workflows in the GUI and switch to code anytime you need more control and flexibility.',
      feedbackQuestion: "Sounds like a feature you'd need?",
      telemetryEvent: TelemetryEvent.EXPORT_TO_CODE_BANNER_REACTION,
    },
  });

  const { deleteWorkflow, isPending: isDeleteWorkflowPending } = useDeleteWorkflow({
    onSuccess: () => {
      showToast({
        children: () => (
          <>
            <ToastIcon variant="success" />
            <span className="text-sm">
              Deleted workflow <span className="font-bold">{workflow.name}</span>.
            </span>
          </>
        ),
        options: toastOptions,
      });
      navigate(ROUTES.WORKFLOWS);
    },
    onError: () => {
      showToast({
        children: () => (
          <>
            <ToastIcon variant="error" />
            <span className="text-sm">
              Failed to delete workflow <span className="font-bold">{workflow.name}</span>.
            </span>
          </>
        ),
        options: toastOptions,
      });
    },
  });

  const onDeleteWorkflow = async () => {
    await deleteWorkflow({
      workflowSlug: workflow.slug,
    });
  };

  const form = useForm<z.infer<typeof workflowSchema>>({
    defaultValues: {
      active: workflow.active,
      name: workflow.name,
      workflowId: workflow.workflowId,
      description: workflow.description,
      tags: workflow.tags,
    },
    resolver: zodResolver(workflowSchema),
    shouldFocusError: false,
  });

  const { onBlur, saveForm } = useFormAutosave({
    previousData: workflow,
    form,
    isReadOnly,
    save: update,
    shouldClientValidate: true,
  });

  const onPauseWorkflow = (active: boolean) => {
    form.setValue('active', active, { shouldValidate: true, shouldDirty: true });
    saveForm();
  };

  function handleExportToCode() {
    showComingSoonBanner();
  }

  const otherEnvironments = environments.filter((env) => env._id !== currentEnvironment?._id);

  return (
    <>
      <ConfirmationModal
        open={isPauseModalOpen}
        onOpenChange={setIsPauseModalOpen}
        onConfirm={() => {
          onPauseWorkflow(false);
          setIsPauseModalOpen(false);
        }}
        title={PAUSE_MODAL_TITLE}
        description={<PauseModalDescription workflowName={workflow.name} />}
        confirmButtonText="Proceed"
      />
      <DeleteWorkflowDialog
        workflow={workflow}
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        onConfirm={onDeleteWorkflow}
        isLoading={isDeleteWorkflowPending}
      />
      <PageMeta title={workflow.name} />
      <motion.div
        className={cn('relative flex h-full w-full flex-col')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0.1 }}
        transition={{ duration: 0.1 }}
      >
        <SidebarHeader className="items-center border-b text-sm font-medium">
          <div className="flex items-center gap-1">
            <RouteFill />
            <span>Configure workflow</span>
          </div>
          {/**
           * Needs modal={false} to prevent the click freeze after the modal is closed
           */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <CompactButton size="md" icon={RiMore2Fill} variant="ghost" className="ml-auto">
                <span className="sr-only">More</span>
              </CompactButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuGroup>
                {isSyncable && (
                  <DropdownMenuItem onClick={handleExportToCode}>
                    <RiCodeSSlashLine />
                    Export to Code
                  </DropdownMenuItem>
                )}
                {isSyncable ? (
                  otherEnvironments.length === 1 ? (
                    <DropdownMenuItem onClick={() => safeSync(otherEnvironments[0]._id)}>
                      <RiGitPullRequestFill />
                      {`Sync to ${otherEnvironments[0].name}`}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2">
                        <RiGitPullRequestFill />
                        Sync workflow
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                          {otherEnvironments.map((env) => (
                            <DropdownMenuItem key={env._id} onClick={() => safeSync(env._id)}>
                              {env.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  )
                ) : (
                  <Tooltip>
                    <TooltipTrigger>
                      <DropdownMenuItem disabled>
                        <RiGitPullRequestFill />
                        Sync workflow
                      </DropdownMenuItem>
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipContent>{tooltipContent}</TooltipContent>
                    </TooltipPortal>
                  </Tooltip>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup className="*:cursor-pointer">
                <DropdownMenuItem
                  className="text-destructive"
                  disabled={workflow.origin === WorkflowOriginEnum.EXTERNAL}
                  onClick={() => {
                    setIsDeleteModalOpen(true);
                  }}
                >
                  <RiDeleteBin2Line />
                  Delete workflow
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <PromoteConfirmModal />
        </SidebarHeader>
        <Form {...form}>
          <form onBlur={onBlur}>
            <SidebarContent size="md">
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="bg-success/60 data-[active=false]:shadow-neutral-alpha-100 ml-2 h-1.5 w-1.5 rounded-full [--pulse-color:var(--success)] data-[active=true]:animate-[pulse-shadow_1s_ease-in-out_infinite] data-[active=false]:bg-neutral-300 data-[active=false]:shadow-[0_0px_0px_5px_var(--neutral-alpha-200),0_0px_0px_9px_var(--neutral-alpha-100)]"
                        data-active={field.value}
                      />
                      <FormLabel>Active Workflow</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          if (!checked) {
                            setIsPauseModalOpen(true);
                            return;
                          }
                          onPauseWorkflow(checked);
                        }}
                        disabled={isReadOnly}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </SidebarContent>
            <Separator />
            <SidebarContent>
              <FormField
                control={form.control}
                name="name"
                defaultValue=""
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel required>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="New workflow"
                        {...field}
                        disabled={isReadOnly}
                        hasError={!!fieldState.error}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="workflowId"
                defaultValue=""
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Identifier</FormLabel>
                    <FormControl>
                      <Input
                        size="xs"
                        trailingNode={<CopyButton valueToCopy={field.value} />}
                        placeholder="Untitled"
                        className="cursor-default"
                        {...field}
                        readOnly
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-36"
                        placeholder="Describe what this workflow does"
                        {...field}
                        maxLength={MAX_DESCRIPTION_LENGTH}
                        showCounter
                        disabled={isReadOnly}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem className="group" tabIndex={-1}>
                    <div className="flex items-center gap-1">
                      <FormLabel optional>Tags</FormLabel>
                    </div>
                    <FormControl className="text-xs text-neutral-600">
                      <TagInput
                        {...field}
                        onChange={(tags) => {
                          form.setValue('tags', tags, { shouldValidate: true, shouldDirty: true });
                          saveForm();
                        }}
                        disabled={isReadOnly}
                        value={field.value ?? []}
                        suggestions={tags.map((tag) => tag.name)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SidebarContent>
          </form>
        </Form>
        <Separator />
        <SidebarContent size="lg">
          <Link to={ROUTES.EDIT_WORKFLOW_PREFERENCES}>
            <Button
              variant="secondary"
              mode="outline"
              leadingIcon={RiSettingsLine}
              className="flex w-full justify-start gap-1.5 p-1.5 text-xs font-medium"
              type="button"
              trailingIcon={RiArrowRightSLine}
            >
              Configure channel preferences
              <span className="ml-auto" />
            </Button>
          </Link>
        </SidebarContent>
        <Separator />
      </motion.div>
    </>
  );
};
