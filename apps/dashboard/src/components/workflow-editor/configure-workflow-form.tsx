import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import {
  EnvironmentTypeEnum,
  MAX_DESCRIPTION_LENGTH,
  MAX_TAG_ELEMENTS,
  PermissionsEnum,
  ResourceOriginEnum,
  UpdateWorkflowDto,
  WorkflowResponseDto,
} from '@novu/shared';
import { ChevronsUpDown, CircleDot, FilesIcon, FileText, Hash, Tags } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { LuPlus, LuX } from 'react-icons/lu';
import {
  RiArrowRightSLine,
  RiCodeSSlashLine,
  RiDeleteBin2Line,
  RiListView,
  RiMore2Fill,
  RiSettingsLine,
} from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import type { ExternalToast } from 'sonner';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { DeleteWorkflowDialog } from '@/components/delete-workflow-dialog';
import { RouteFill } from '@/components/icons/route-fill';
import { PageMeta } from '@/components/page-meta';
import { PAUSE_MODAL_TITLE, PauseModalDescription } from '@/components/pause-workflow-dialog';
import { AnimatedBadgeDot, Badge, Dot as BadgeDot } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { CopyButton } from '@/components/primitives/copy-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { Form, FormField, FormItem, FormMessage, FormRoot } from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { Separator } from '@/components/primitives/separator';
import { ToastIcon } from '@/components/primitives/sonner';
import { showToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import { Tag } from '@/components/primitives/tag';
import { TagInput } from '@/components/primitives/tag-input';
import { Textarea } from '@/components/primitives/textarea';
import { usePromotionalBanner } from '@/components/promotional/coming-soon-banner';
import { SidebarContent, SidebarHeader } from '@/components/side-navigation/sidebar';
import { workflowSchema } from '@/components/workflow-editor/schema';
import { UpdateWorkflowFn } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { useDeleteWorkflow } from '@/hooks/use-delete-workflow';
import { useFormAutosave } from '@/hooks/use-form-autosave';
import { useSyncWorkflow } from '@/hooks/use-sync-workflow';
import { useTags } from '@/hooks/use-tags';
import { LocalizationResourceEnum } from '@/types/translations';
import { Protect } from '@/utils/protect';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { cn } from '@/utils/ui';
import { PayloadSchemaDrawer } from './payload-schema-drawer';
import { TranslationToggleSection } from './translation-toggle-section';

interface ConfigureWorkflowFormProps {
  workflow: WorkflowResponseDto;
  update: UpdateWorkflowFn;
}

const toastOptions: ExternalToast = {
  position: 'bottom-right',
  classNames: {
    toast: 'mb-4 right-0',
  },
};

type TagInputFieldProps = {
  currentTags: string[];
  suggestions: string[];
  onAddTag: (tag: string) => void;
  onBlur: () => void;
  hasReachedTagLimit: boolean;
};

function TagInputField({ currentTags, suggestions, onAddTag, onBlur, hasReachedTagLimit }: TagInputFieldProps) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="mt-2"
    >
      <TagInput
        value={currentTags}
        suggestions={suggestions}
        onChange={() => {
          // No-op since we use onAddTag instead
        }}
        onAddTag={onAddTag}
        onBlur={onBlur}
        hideTags
        size="xs"
        placeholder={hasReachedTagLimit ? `Tag limit reached (${MAX_TAG_ELEMENTS} max)` : 'Type a tag and press Enter'}
        disabled={hasReachedTagLimit}
      />
    </motion.div>
  );
}

export const ConfigureWorkflowForm = (props: ConfigureWorkflowFormProps) => {
  const { workflow, update } = props;
  const navigate = useNavigate();
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPayloadSchemaDrawerOpen, setIsPayloadSchemaDrawerOpen] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const descriptionContainerRef = useRef<HTMLDivElement>(null);
  const nameBeforeEditRef = useRef(workflow.name);

  const { tags } = useTags();
  const { currentEnvironment } = useEnvironment();
  const { isSyncable, PromoteConfirmModal } = useSyncWorkflow(workflow);

  const { show: showComingSoonBanner } = usePromotionalBanner({
    content: {
      title: '🚧 Export to Code is on the way!',
      description:
        'With Export to Code, you can design workflows in the GUI and switch to code anytime you need more control and flexibility.',
      feedbackQuestion: "Sounds like a feature you'd need?",
      telemetryEvent: TelemetryEvent.EXPORT_TO_CODE_BANNER_REACTION,
    },
  });

  const isReadOnly =
    workflow.origin === ResourceOriginEnum.EXTERNAL || currentEnvironment?.type !== EnvironmentTypeEnum.DEV;

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

  const form = useForm({
    defaultValues: {
      active: workflow.active,
      name: workflow.name,
      workflowId: workflow.workflowId,
      description: workflow.description,
      tags: workflow.tags,
      isTranslationEnabled: workflow.isTranslationEnabled,
    },
    resolver: standardSchemaResolver(workflowSchema),
    shouldFocusError: false,
  });

  const { onBlur, saveForm } = useFormAutosave({
    previousData: workflow,
    form,
    isReadOnly,
    save: (data) => update(data as UpdateWorkflowDto),
    shouldClientValidate: true,
  });

  const onPauseWorkflow = (active: boolean) => {
    form.setValue('active', active, { shouldValidate: true, shouldDirty: true });
    saveForm();
  };

  function handleExportToCode() {
    showComingSoonBanner();
  }

  const handleSavePayloadSchema = useCallback(() => {
    showToast({
      children: () => (
        <>
          <ToastIcon variant="success" />
          <span className="text-sm">Payload schema updated.</span>
        </>
      ),
      options: toastOptions,
    });
  }, []);

  const isDuplicable = useMemo(() => workflow.origin === ResourceOriginEnum.NOVU_CLOUD, [workflow.origin]);

  useEffect(() => {
    if (!isDescriptionExpanded) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (descriptionContainerRef.current?.contains(target)) {
        return;
      }

      // mousedown fires before blur; collapsing here would unmount the textarea
      // and skip its onBlur save. Persist first, then collapse.
      void saveForm().finally(() => {
        setIsDescriptionExpanded(false);
      });
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDescriptionExpanded, saveForm]);

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
      <PayloadSchemaDrawer
        workflow={workflow}
        isOpen={isPayloadSchemaDrawerOpen}
        onOpenChange={setIsPayloadSchemaDrawerOpen}
        onSave={handleSavePayloadSchema}
        readOnly={isReadOnly}
      />
      <PageMeta title={workflow.name} />
      <motion.div
        className={cn('relative flex h-full w-full flex-col')}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0.1 }}
        transition={{ duration: 0.1 }}
      >
        <SidebarHeader className="items-center border-b py-3 text-sm font-medium">
          <div className="flex items-center gap-1">
            <RouteFill />
            <span>Configure workflow</span>
          </div>
          {/**
           * Needs modal={false} to prevent the click freeze after the modal is closed
           */}
          <Protect permission={PermissionsEnum.WORKFLOW_WRITE}>
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
                  {isDuplicable && currentEnvironment?.type === EnvironmentTypeEnum.DEV && (
                    <Link
                      to={buildRoute(ROUTES.WORKFLOWS_DUPLICATE, {
                        environmentSlug: currentEnvironment?.slug ?? '',
                        workflowId: workflow.workflowId,
                      })}
                    >
                      <DropdownMenuItem className="cursor-pointer">
                        <FilesIcon />
                        Duplicate workflow
                      </DropdownMenuItem>
                    </Link>
                  )}
                </DropdownMenuGroup>
                {currentEnvironment?.type === EnvironmentTypeEnum.DEV && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup className="*:cursor-pointer">
                      <DropdownMenuItem
                        className="text-destructive"
                        disabled={workflow.origin === ResourceOriginEnum.EXTERNAL}
                        onClick={() => {
                          setIsDeleteModalOpen(true);
                        }}
                      >
                        <RiDeleteBin2Line />
                        Delete workflow
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </Protect>
          <PromoteConfirmModal />
        </SidebarHeader>
        <Form {...form}>
          <FormRoot onBlur={onBlur}>
            <SidebarContent size="md">
              {/* STATUS Section */}
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem>
                    <div className="group flex h-6 items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CircleDot className="text-text-soft h-3.5 w-3.5 shrink-0" />
                        <span className="text-text-soft font-code text-xs font-medium">STATUS</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {field.value ? (
                          <Badge variant="lighter" color="green" size="md" className="text-success-base gap-1.5">
                            <AnimatedBadgeDot size="md" variant="lighter" color="green" />
                            <span className="font-code text-xs uppercase">Active</span>
                          </Badge>
                        ) : (
                          <Badge variant="lighter" color="gray" size="md" className="gap-1.5">
                            <BadgeDot />
                            <span className="font-code text-xs uppercase">Inactive</span>
                          </Badge>
                        )}
                        <motion.div whileTap={{ scale: 0.95 }} transition={{ duration: 0.1 }}>
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
                        </motion.div>
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              {/* WORKFLOW Section */}
              <FormField
                control={form.control}
                name="name"
                defaultValue=""
                render={({ field, fieldState }) => (
                  <FormItem>
                    <div className="group flex h-6 items-center justify-between gap-6">
                      <div className="flex items-center gap-1.5">
                        <RouteFill className="text-text-soft h-3.5 w-3.5 shrink-0" />
                        <span className="text-text-soft font-code text-xs font-medium">NAME</span>
                      </div>
                      <div className="relative flex h-8 min-w-0 flex-1 items-center justify-end">
                        <AnimatePresence mode="wait">
                          {isEditingName && !isReadOnly ? (
                            <motion.div
                              key="input"
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.98 }}
                              transition={{ duration: 0.15, ease: 'easeOut' }}
                              className="absolute inset-0 flex items-center"
                            >
                              <Input
                                placeholder="Workflow name"
                                value={field.value}
                                onChange={field.onChange}
                                hasError={!!fieldState.error}
                                maxLength={64}
                                className="w-full text-right whitespace-nowrap overflow-x-hidden mask-none"
                                size="xs"
                                autoFocus
                                onBlur={() => {
                                  field.onBlur();

                                  if (!field.value?.trim()) {
                                    field.onChange(nameBeforeEditRef.current);
                                    setIsEditingName(false);

                                    return;
                                  }

                                  setIsEditingName(false);
                                  saveForm();
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    if (field.value?.trim()) {
                                      e.currentTarget.blur();
                                    } else {
                                      field.onChange(nameBeforeEditRef.current);
                                      setIsEditingName(false);
                                    }
                                  }
                                  if (e.key === 'Escape') {
                                    form.resetField('name');
                                    setIsEditingName(false);
                                  }
                                }}
                              />
                            </motion.div>
                          ) : (
                            <motion.button
                              key="button"
                              type="button"
                              onClick={() => {
                                if (isReadOnly) {
                                  return;
                                }

                                const current = field.value ?? '';
                                nameBeforeEditRef.current = current.trim() ? current : workflow.name;

                                setIsEditingName(true);
                              }}
                              disabled={isReadOnly}
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.98 }}
                              transition={{ duration: 0.15, ease: 'easeOut' }}
                              whileHover={!isReadOnly ? { x: 2 } : {}}
                              whileTap={!isReadOnly ? { scale: 0.98 } : {}}
                              className={cn(
                                'text-foreground-600 flex h-8 min-w-0 w-full items-center justify-end text-right text-label-xs transition-colors',
                                !isReadOnly && 'hover:text-foreground-800 cursor-pointer',
                                isReadOnly && 'cursor-default'
                              )}
                            >
                              <span className="block w-full min-w-0 truncate text-right">
                                {field.value || 'Untitled workflow'}
                              </span>
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ID Section */}
              <FormField
                control={form.control}
                name="workflowId"
                defaultValue=""
                render={({ field }) => (
                  <FormItem>
                    <div className="group flex h-6 items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Hash className="text-text-soft h-3.5 w-3.5 shrink-0" />
                        <span className="text-text-soft font-code text-xs font-medium">ID</span>
                      </div>
                      <div className="relative flex items-center gap-2">
                        <div className="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                          <CopyButton valueToCopy={field.value} size="2xs" className="h-1 p-0.5" />
                        </div>
                        <motion.span
                          whileHover={{ x: -2 }}
                          transition={{ duration: 0.15 }}
                          className="text-foreground-600 text-right text-label-xs"
                        >
                          {field.value}
                        </motion.span>
                      </div>
                    </div>
                  </FormItem>
                )}
              />

              {/* DESCRIPTION Section */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <div ref={descriptionContainerRef}>
                      <button
                        type="button"
                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                        className="group flex h-6 w-full cursor-pointer items-center justify-between transition-colors hover:text-foreground-800"
                      >
                        <div className="flex items-center gap-1.5">
                          <FileText className="text-text-soft h-3.5 w-3.5 shrink-0" />
                          <span className="text-text-soft font-code text-xs font-medium">DESCRIPTION</span>
                        </div>
                        <div className="relative flex items-center gap-2">
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="bg-bg-white hover:bg-bg-weak text-foreground-400 hover:text-foreground-600 flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors"
                          >
                            <ChevronsUpDown
                              className={cn(
                                'size-3.5 transition-transform duration-200',
                                isDescriptionExpanded && 'rotate-180'
                              )}
                            />
                          </motion.div>
                        </div>
                      </button>
                      {isDescriptionExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="mt-2 overflow-hidden"
                        >
                          <Textarea
                            className="min-h-24 text-sm"
                            placeholder="Describe what this workflow does"
                            value={field.value}
                            onChange={field.onChange}
                            maxLength={MAX_DESCRIPTION_LENGTH}
                            showCounter
                            disabled={isReadOnly}
                            onBlur={() => {
                              field.onBlur();
                              saveForm();
                            }}
                          />
                        </motion.div>
                      )}
                    </div>
                    <FormMessage className="mt-1" />
                  </FormItem>
                )}
              />

              {/* TAGS Section */}
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => {
                  const currentTags = field.value ?? [];
                  const availableSuggestions = tags.map((tag) => tag.name).filter((tag) => !currentTags.includes(tag));
                  const hasReachedTagLimit = currentTags.length >= MAX_TAG_ELEMENTS;

                  const handleRemoveTag = (tagToRemove: string) => {
                    const newTags = currentTags.filter((tag) => tag !== tagToRemove);
                    form.setValue('tags', newTags, { shouldValidate: true, shouldDirty: true });
                    form.clearErrors('tags');
                    saveForm();
                  };

                  const handleAddTag = (newTag: string) => {
                    const trimmedTag = newTag.trim();
                    if (trimmedTag === '' || currentTags.includes(trimmedTag)) {
                      return;
                    }
                    if (hasReachedTagLimit) {
                      form.setError('tags', {
                        type: 'max',
                        message: `Tag limit reached. A workflow can have up to ${MAX_TAG_ELEMENTS} tags.`,
                      });
                      return;
                    }
                    const newTags = [...currentTags, trimmedTag];
                    form.setValue('tags', newTags, { shouldValidate: true, shouldDirty: true });
                    form.clearErrors('tags');
                    saveForm();
                  };

                  return (
                    <FormItem>
                      {!isReadOnly ? (
                        <button
                          type="button"
                          onClick={() => setIsAddingTag(!isAddingTag)}
                          className="group flex h-6 w-full cursor-pointer items-center justify-between transition-colors hover:text-foreground-800"
                        >
                          <div className="flex items-center gap-1.5">
                            <Tags className="text-text-soft h-3.5 w-3.5 shrink-0" />
                            <span className="text-text-soft font-code text-xs font-medium">TAGS</span>
                          </div>
                          <div className="relative flex items-center gap-2">
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="bg-bg-white hover:bg-bg-weak text-foreground-400 hover:text-foreground-600 flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors"
                            >
                              {isAddingTag ? <LuX className="size-3.5" /> : <LuPlus className="size-3.5" />}
                            </motion.div>
                          </div>
                        </button>
                      ) : (
                        <div className="group flex h-6 items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Tags className="text-text-soft h-3.5 w-3.5 shrink-0" />
                            <span className="text-text-soft font-code text-xs font-medium">TAGS</span>
                          </div>
                        </div>
                      )}

                      {currentTags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {currentTags.map((tag, index) => (
                            <Tag
                              key={index}
                              variant="stroke"
                              className="max-w-48 shrink-0"
                              onDismiss={
                                !isReadOnly
                                  ? (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleRemoveTag(tag);
                                    }
                                  : undefined
                              }
                              dismissTestId={`tags-badge-remove-${tag}`}
                            >
                              <span
                                className="block max-w-full truncate"
                                style={{ wordBreak: 'break-all' }}
                                data-testid="tags-badge-value"
                                title={tag}
                              >
                                {tag}
                              </span>
                            </Tag>
                          ))}
                        </div>
                      )}

                      <AnimatePresence>
                        {isAddingTag && !isReadOnly && (
                          <TagInputField
                            currentTags={currentTags}
                            suggestions={availableSuggestions}
                            onAddTag={handleAddTag}
                            onBlur={() => setIsAddingTag(false)}
                            hasReachedTagLimit={hasReachedTagLimit}
                          />
                        )}
                      </AnimatePresence>
                      <FormMessage className="mt-1" />
                    </FormItem>
                  );
                }}
              />
            </SidebarContent>
          </FormRoot>
        </Form>
        <Separator className="bg-stroke-soft" />
        <SidebarContent size="lg" className="gap-0 px-0 py-0">
          <Link to={ROUTES.EDIT_WORKFLOW_PREFERENCES} className="block">
            <Button
              variant="secondary"
              mode="ghost"
              leadingIcon={RiSettingsLine}
              className="flex h-12 w-full justify-start gap-1.5 rounded-none border-b border-stroke-weak px-3 text-xs font-medium"
              type="button"
              trailingIcon={RiArrowRightSLine}
            >
              Configure channel preferences
              <span className="ml-auto" />
            </Button>
          </Link>
          {workflow?.origin === ResourceOriginEnum.NOVU_CLOUD && (
            <Button
              variant="secondary"
              mode="ghost"
              leadingIcon={RiListView}
              className="flex h-12 w-full justify-start gap-1.5 rounded-none border-b border-stroke-soft px-3 text-xs font-medium"
              type="button"
              onClick={() => setIsPayloadSchemaDrawerOpen(true)}
              trailingIcon={RiArrowRightSLine}
            >
              Manage payload schema
              <span className="ml-auto" />
            </Button>
          )}
          <FormField
            control={form.control}
            name="isTranslationEnabled"
            render={({ field }) => (
              <TranslationToggleSection
                value={field.value ?? false}
                onChange={(checked) => {
                  field.onChange(checked);
                  saveForm();
                }}
                isReadOnly={isReadOnly}
                resourceId={workflow?.workflowId}
                resourceType={LocalizationResourceEnum.WORKFLOW}
                showDrawer={!!(workflow?.workflowId && (field.value ?? false))}
                className="w-full min-w-0 px-3 py-4"
              />
            )}
          />
        </SidebarContent>
        <Separator />
      </motion.div>
    </>
  );
};
