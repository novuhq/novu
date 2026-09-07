import { FeatureFlagsKeysEnum, StepCreateDto } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { RiArrowLeftSLine, RiSparklingFill } from 'react-icons/ri';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { RouteFill } from '@/components/icons/route-fill';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/primitives/breadcrumb';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/primitives/dialog';
import { ScrollArea, ScrollBar } from '@/components/primitives/scroll-area';
import { Skeleton } from '@/components/primitives/skeleton';
import { WorkflowResults } from '@/components/template-store/components/workflow-results';
import { IWorkflowSuggestion, TemplateCategory } from '@/components/template-store/types';
import { WorkflowSidebar } from '@/components/template-store/workflow-sidebar';
import TruncatedText from '@/components/truncated-text';
import { CreateWorkflowForm } from '@/components/workflow-editor/create-workflow-form';
import { workflowSchema } from '@/components/workflow-editor/schema';
import { showErrorToast } from '@/components/workflow-editor/toasts';
import { WorkflowCanvas } from '@/components/workflow-editor/workflow-canvas';
import { useCreateWorkflow } from '@/hooks/use-create-workflow';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useOnboardingWorkflowSuggestions } from '@/hooks/use-onboarding-workflow-suggestions';
import { useTelemetry } from '@/hooks/use-telemetry';
import { useTemplateStore } from '@/hooks/use-template-store';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { Step } from '@/utils/types';

const PERSONALIZED_CATEGORY_ID = 'personalized';
const PERSONALIZED_CATEGORY_LABEL = 'Personalized';

function mapTemplateStepsToSteps(templateSteps: StepCreateDto[]): Step[] {
  return templateSteps.map((step, index) => {
    const mappedStep: Step = {
      name: step.name || `Step ${index + 1}`,
      type: step.type,
      _id: `temp-${index}`,
      stepId: step.name || `step-${index}`,
      slug: `template-step-${index}_st_temp` as const,
      controls: {
        values: step.controlValues ?? {},
      },
      issues: undefined,
    };

    return mappedStep;
  });
}

export type WorkflowTemplateModalProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  selectedTemplate?: IWorkflowSuggestion;
};

export function WorkflowTemplateModal(props: WorkflowTemplateModalProps) {
  const track = useTelemetry();
  const navigate = useNavigate();
  const { environmentSlug, templateId } = useParams();
  const [searchParams] = useSearchParams();
  const { submit: createFromTemplate, isLoading: isCreating } = useCreateWorkflow();
  const [selectedCategory, setSelectedCategory] = useState<string>('popular');
  const [hasUserSelectedCategory, setHasUserSelectedCategory] = useState(false);
  const [internalSelectedTemplate, setInternalSelectedTemplate] = useState<IWorkflowSuggestion | null>(null);

  const selectedTemplate = props.selectedTemplate ?? internalSelectedTemplate;

  const { suggestions, isLoading } = useTemplateStore();
  const isAiWorkflowGenerationEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_AI_WORKFLOW_GENERATION_ENABLED);
  const { suggestions: personalizedSuggestions, hasPersonalizedSuggestions } = useOnboardingWorkflowSuggestions();
  const previewSteps = useMemo(() => {
    if (!selectedTemplate) return [] as Step[];
    return mapTemplateStepsToSteps(selectedTemplate.workflowDefinition.steps);
  }, [selectedTemplate]);

  const personalizedCategory = useMemo<TemplateCategory | null>(() => {
    if (!isAiWorkflowGenerationEnabled || !hasPersonalizedSuggestions) return null;

    return {
      id: PERSONALIZED_CATEGORY_ID,
      label: PERSONALIZED_CATEGORY_LABEL,
      icon: <RiSparklingFill className="h-3 w-3 text-purple-700" />,
      bgColor: 'bg-purple-50',
      tag: PERSONALIZED_CATEGORY_ID,
    };
  }, [isAiWorkflowGenerationEnabled, hasPersonalizedSuggestions]);

  const extraCategories = useMemo(
    () => (personalizedCategory ? [personalizedCategory] : undefined),
    [personalizedCategory]
  );

  const filteredSuggestions = useMemo(() => {
    if (selectedCategory === PERSONALIZED_CATEGORY_ID) {
      return personalizedSuggestions;
    }

    if (selectedCategory === 'popular') {
      const popularWorkflows = suggestions.filter((suggestion) => suggestion.tags.includes('popular'));
      return popularWorkflows.length > 0 ? popularWorkflows : suggestions.slice(0, 12);
    }

    return suggestions.filter((suggestion) => suggestion.tags.includes(selectedCategory));
  }, [selectedCategory, suggestions, personalizedSuggestions]);

  useEffect(() => {
    if (props.open) {
      track(TelemetryEvent.TEMPLATE_MODAL_OPENED, {
        source: searchParams.get('source') || 'unknown',
      });
    }
  }, [props.open, track, searchParams]);

  useEffect(() => {
    if (props.selectedTemplate) {
      setInternalSelectedTemplate(props.selectedTemplate);
    }
  }, [props.selectedTemplate]);

  useEffect(() => {
    if (!templateId || selectedTemplate) return;
    const match = suggestions.find((s) => s.workflowDefinition.workflowId === templateId);
    if (match) setInternalSelectedTemplate(match);
  }, [templateId, suggestions, selectedTemplate]);

  useEffect(() => {
    if (hasUserSelectedCategory) return;
    if (!isAiWorkflowGenerationEnabled || !hasPersonalizedSuggestions) return;
    setSelectedCategory(PERSONALIZED_CATEGORY_ID);
  }, [hasUserSelectedCategory, isAiWorkflowGenerationEnabled, hasPersonalizedSuggestions]);

  const handleCreateWorkflow = (values: z.infer<typeof workflowSchema>) => {
    if (!selectedTemplate) return;

    createFromTemplate(values, selectedTemplate.workflowDefinition)
      .then(() => {
        track(TelemetryEvent.CREATE_WORKFLOW_FROM_TEMPLATE, {
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
          category: selectedCategory,
        });
      })
      .catch((error: unknown) => {
        const message =
          typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message?: unknown }).message || '').toLowerCase()
            : '';
        const status =
          typeof error === 'object' && error !== null && 'status' in error
            ? Number((error as { status?: unknown }).status)
            : undefined;

        const isLayoutMissing = message.includes('layout not found') || status === 404;

        if (isLayoutMissing) {
          navigate(
            buildRoute(ROUTES.EDIT_WORKFLOW, {
              environmentSlug: environmentSlug || '',
              workflowSlug: values.workflowId,
            })
          );
          return;
        }
        showErrorToast(undefined, error);
      });
  };

  const getHeaderText = () => {
    if (selectedTemplate) {
      return selectedTemplate.name;
    }

    if (selectedCategory === PERSONALIZED_CATEGORY_ID) {
      return `${PERSONALIZED_CATEGORY_LABEL} workflows`;
    }

    return `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} workflows`;
  };

  const handleTemplateClick = (template: IWorkflowSuggestion) => {
    setInternalSelectedTemplate(template);
  };

  const handleBackClick = () => {
    navigate(buildRoute(ROUTES.TEMPLATE_STORE, { environmentSlug: environmentSlug || '' }));
    setInternalSelectedTemplate(null);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setHasUserSelectedCategory(true);
    track(TelemetryEvent.TEMPLATE_CATEGORY_SELECTED, {
      category,
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="w-full max-w-[1240px] gap-0 p-0">
        <DialogHeader className="border-stroke-soft flex flex-row items-center gap-1 border-b p-3">
          <DialogTitle className="sr-only">Workflow Templates</DialogTitle>
          {selectedTemplate ? (
            <CompactButton size="md" variant="ghost" onClick={handleBackClick} icon={RiArrowLeftSLine}></CompactButton>
          ) : null}
          <Breadcrumb className="mt-0!">
            <BreadcrumbList>
              {selectedTemplate && (
                <>
                  <BreadcrumbItem onClick={handleBackClick} className="flex items-center gap-1 hover:cursor-pointer">
                    Templates
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              )}
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-1">
                  <RouteFill className="size-4" />
                  <div className="flex max-w-[32ch]">
                    <TruncatedText>{getHeaderText()}</TruncatedText>
                  </div>
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </DialogHeader>
        <div className={`flex ${selectedTemplate ? 'min-h-[600px]' : 'min-h-[640px]'}`}>
          {!selectedTemplate && (
            <AnimatePresence initial={false} mode="wait">
              {isLoading ? (
                <motion.div
                  key="sidebar-skeleton"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="flex h-full w-[240px] flex-col gap-4 border-r p-2"
                >
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>

                  <section className="p-2">
                    <div className="mb-2">
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </section>

                  <div className="mt-auto p-3">
                    <Skeleton className="h-[72px] w-full" />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="sidebar-content"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <WorkflowSidebar
                    selectedCategory={selectedCategory}
                    onCategorySelect={handleCategorySelect}
                    extraCategories={extraCategories}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}

          <div className="w-full flex-1 overflow-auto">
            {!selectedTemplate ? (
              <div className="p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <h2 className="text-label-md text-strong">{getHeaderText()}</h2>
                </div>

                <ScrollArea className="h-[520px]">
                  <div className="pr-2">
                    {!suggestions.length && !filteredSuggestions.length ? (
                      <div className="grid grid-cols-3 gap-4">
                        <Skeleton className="h-[140px] w-full" />
                        <Skeleton className="h-[140px] w-full" />
                        <Skeleton className="h-[140px] w-full" />
                        <Skeleton className="h-[140px] w-full" />
                        <Skeleton className="h-[140px] w-full" />
                        <Skeleton className="h-[140px] w-full" />
                      </div>
                    ) : (
                      <WorkflowResults suggestions={filteredSuggestions} onClick={handleTemplateClick} />
                    )}
                  </div>
                  <ScrollBar orientation="vertical" />
                </ScrollArea>
              </div>
            ) : (
              <div className="flex h-full w-full gap-4">
                <div className="flex-1">
                  <WorkflowCanvas isReadOnly areConditionsClickable={false} showStepPreview steps={previewSteps} />
                </div>
                <div className="border-stroke-soft w-full max-w-[300px] border-l p-3">
                  <CreateWorkflowForm onSubmit={handleCreateWorkflow} template={selectedTemplate.workflowDefinition} />
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedTemplate && (
          <DialogFooter className="border-stroke-soft mx-0! border-t p-1.5!">
            <Button className="ml-auto" mode="gradient" type="submit" form="create-workflow" isLoading={isCreating}>
              Create workflow
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
