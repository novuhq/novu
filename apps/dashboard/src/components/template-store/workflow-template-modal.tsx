import { StepCreateDto, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { useEffect, useMemo, useState } from 'react';
import { RiArrowLeftSLine } from 'react-icons/ri';
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
import { IWorkflowSuggestion } from '@/components/template-store/types';
import { WorkflowSidebar } from '@/components/template-store/workflow-sidebar';
import TruncatedText from '@/components/truncated-text';
import { CreateWorkflowForm } from '@/components/workflow-editor/create-workflow-form';
import { workflowSchema } from '@/components/workflow-editor/schema';
import { showErrorToast } from '@/components/workflow-editor/toasts';
import { WorkflowCanvas } from '@/components/workflow-editor/workflow-canvas';
import { useCreateWorkflow } from '@/hooks/use-create-workflow';
import { useTelemetry } from '@/hooks/use-telemetry';
import { extractApiItems } from '@/utils/api-response-normalizer';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { Step } from '@/utils/types';
import { selectPopularByIdStrict } from './featured';

/**
 * Maps template steps to Step interface, ensuring all required properties are present
 * and properly typed without using unsafe type assertions.
 */
function mapTemplateStepsToSteps(templateSteps: StepCreateDto[]): Step[] {
  return templateSteps.map((step, index) => {
    // Create a proper Step object with all required properties
    const mappedStep: Step = {
      name: step.name || `Step ${index + 1}`,
      type: step.type,
      _id: `temp-${index}`, // Temporary ID for template preview
      stepId: step.name || `step-${index}`,
      slug: `template-step-${index}_st_temp` as const, // Temporary slug for template preview
      controls: {
        values: step.controlValues ?? {},
      },
      issues: undefined, // No issues for template steps
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
  const [internalSelectedTemplate, setInternalSelectedTemplate] = useState<IWorkflowSuggestion | null>(null);

  const selectedTemplate = props.selectedTemplate ?? internalSelectedTemplate;
  const [suggestions, setSuggestions] = useState<IWorkflowSuggestion[]>([]);
  const filteredSuggestions = useMemo(() => {
    if (selectedCategory === 'popular') {
      const popular = selectPopularByIdStrict(suggestions, (s) => s.workflowDefinition.workflowId, 12);
      return popular.length ? popular : suggestions.slice(0, 12);
    }

    const categoryToTags: Record<string, string[]> = {
      billing: ['billing'],
      authentication: ['authentication', 'security'],
      operational: ['operational', 'usage', 'engagement', 'subscription'],
    };
    const tags = categoryToTags[selectedCategory] || [selectedCategory];
    return suggestions.filter((s) => {
      const workflowTags = s?.workflowDefinition?.tags || [];
      return tags.some((t) => workflowTags.includes(t));
    });
  }, [selectedCategory, suggestions]);

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
    const controller = new AbortController();

    const load = async () => {
      try {
        const res = await fetch('/templates-proxy/api/workflows?refresh=1', {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        if (!res.ok) {
          setSuggestions([]);
          return;
        }

        const body = await res.json();
        if (!body) {
          setSuggestions([]);
          return;
        }

        const firstOk: unknown[] = extractApiItems(body);

        type ApiWorkflow = {
          id?: string;
          _id?: string;
          workflowId?: string;
          slug?: string;
          name?: string;
          description?: string;
          tags?: string[];
          active?: boolean;
          status?: string;
          payloadSchema?: unknown;
          steps?: Array<{
            name?: string;
            type?: StepTypeEnum | string;
            controlValues?: Record<string, unknown>;
          }>;
        };

        const typeMap: Record<string, StepTypeEnum> = {
          trigger: StepTypeEnum.TRIGGER,
          email: StepTypeEnum.EMAIL,
          sms: StepTypeEnum.SMS,
          in_app: StepTypeEnum.IN_APP,
          inapp: StepTypeEnum.IN_APP,
          push: StepTypeEnum.PUSH,
          chat: StepTypeEnum.CHAT,
          delay: StepTypeEnum.DELAY,
          digest: StepTypeEnum.DIGEST,
          custom: StepTypeEnum.CUSTOM,
        };

        function normalizeStepType(input: unknown): StepTypeEnum {
          if (typeof input === 'string') {
            const key = input.toLowerCase();
            if (typeMap[key]) return typeMap[key];
            const upper = key.toUpperCase() as keyof typeof StepTypeEnum;
            if (StepTypeEnum[upper]) return StepTypeEnum[upper as keyof typeof StepTypeEnum];
          }

          return StepTypeEnum.IN_APP;
        }

        const mapped: IWorkflowSuggestion[] = (Array.isArray(firstOk) ? firstOk : []).map((rawItem) => {
          const rawWorkflow = rawItem as ApiWorkflow;
          const workflowId = rawWorkflow.workflowId || rawWorkflow.slug || rawWorkflow.id || rawWorkflow._id || '';
          const rawSteps = Array.isArray(rawWorkflow.steps) ? rawWorkflow.steps : [];

          function normalizeControlValuesForType(type: StepTypeEnum, values: Record<string, unknown>) {
            const nextValues: Record<string, unknown> = { ...(values || {}) };

            const coalesceText = (...keys: string[]) => {
              for (const key of keys) {
                if (key in nextValues && nextValues[key] != null) return nextValues[key] as unknown;
              }
              return undefined;
            };

            if (type === StepTypeEnum.EMAIL) {
              let body: unknown = (nextValues as { body?: unknown }).body;
              if (!body) body = coalesceText('content', 'html', 'message', 'bodyJson');
              if (body && typeof body !== 'string') {
                nextValues.body = JSON.stringify(body);
              } else if (typeof body === 'string') {
                nextValues.body = body;
              }

              if ('layoutId' in nextValues) delete (nextValues as { layoutId?: unknown }).layoutId;
              if ('layout' in nextValues) delete (nextValues as { layout?: unknown }).layout;
              if ('selectedLayoutId' in nextValues)
                delete (nextValues as { selectedLayoutId?: unknown }).selectedLayoutId;

              if (!('subject' in nextValues)) {
                const subject = coalesceText('title', 'subjectText');
                if (typeof subject === 'string') nextValues.subject = subject;
              }
            }

            if (type === StepTypeEnum.IN_APP) {
              if (!('body' in nextValues)) {
                const text = coalesceText('content', 'message', 'text');
                if (typeof text === 'string') nextValues.body = text;
              }

              if (!('primaryAction' in nextValues)) {
                const label = coalesceText('ctaLabel', 'primaryLabel', 'buttonText');
                const url = coalesceText('ctaUrl', 'redirectUrl', 'url');
                if (typeof label === 'string' && typeof url === 'string') {
                  nextValues.primaryAction = {
                    label,
                    redirect: { url, target: '_self' },
                  };
                }
              }
            }

            if (type === StepTypeEnum.SMS || type === StepTypeEnum.CHAT || type === StepTypeEnum.PUSH) {
              if (!('body' in nextValues)) {
                const text = coalesceText('content', 'message', 'text');
                if (typeof text === 'string') nextValues.body = text;
              }
              if (type === StepTypeEnum.PUSH && !('subject' in nextValues)) {
                const subject = coalesceText('title', 'subjectText');
                if (typeof subject === 'string') nextValues.subject = subject;
              }
            }

            return nextValues;
          }

          const steps: StepCreateDto[] = rawSteps.map((rawStep, index) => {
            const raw = rawStep as unknown as {
              controlValues?: Record<string, unknown>;
              controls?: { values?: Record<string, unknown> };
            };
            const type = normalizeStepType(rawStep?.type);
            const baseValues = raw?.controlValues ?? raw?.controls?.values ?? {};
            const controlValues = normalizeControlValuesForType(type, baseValues);

            return {
              name: rawStep?.name || String(rawStep?.type) || `Step ${index + 1}`,
              type,
              controlValues,
            };
          });

          const categoryOrder: IWorkflowSuggestion['category'][] = [
            'authentication',
            'billing',
            'operational',
            'security',
            'social',
            'events',
          ];
          const tagCategory =
            categoryOrder.find((category) => (rawWorkflow.tags || []).includes(category)) || 'authentication';

          const rawPayloadSchema =
            (rawWorkflow as { payloadSchema?: unknown }).payloadSchema ??
            (rawWorkflow as Record<string, unknown>)['payload_schema'] ??
            (rawWorkflow as Record<string, unknown>)['payload'] ??
            (rawWorkflow as Record<string, unknown>)['schema'] ??
            (rawWorkflow as Record<string, unknown>)['inputSchema'];

          const payloadSchema =
            rawPayloadSchema && typeof rawPayloadSchema === 'object' && !Array.isArray(rawPayloadSchema)
              ? (rawPayloadSchema as object)
              : undefined;

          return {
            id: String(rawWorkflow.id ?? workflowId ?? Math.random()),
            name: rawWorkflow.name || 'Untitled',
            description: rawWorkflow.description || '',
            category: tagCategory,
            workflowDefinition: {
              name: rawWorkflow.name || 'Untitled',
              description: rawWorkflow.description || '',
              workflowId: String(workflowId || 'workflow'),
              steps,
              tags: Array.isArray(rawWorkflow.tags) ? rawWorkflow.tags : [],
              active: typeof rawWorkflow.active === 'boolean' ? rawWorkflow.active : rawWorkflow.status === 'ACTIVE',
              __source: WorkflowCreationSourceEnum.TEMPLATE_STORE,
              payloadSchema,
            },
          };
        });

        setSuggestions(mapped);
      } catch {
        setSuggestions([]);
      }
    };

    load();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!templateId || selectedTemplate) return;
    const match = suggestions.find((s) => s.workflowDefinition.workflowId === templateId);
    if (match) setInternalSelectedTemplate(match);
  }, [templateId, suggestions, selectedTemplate]);

  const handleCreateWorkflow = (values: z.infer<typeof workflowSchema>) => {
    if (!selectedTemplate) return;

    createFromTemplate(values, selectedTemplate.workflowDefinition)
      .then(() => {
        // Track successful workflow creation from template
        track(TelemetryEvent.CREATE_WORKFLOW_FROM_TEMPLATE, {
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
          category: selectedCategory,
        });
      })
      .catch((error: unknown) => {
        // Robust error parsing with proper type guards
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
          // Handle layout missing case - navigate to workflow editor
          // This is considered a success case where the workflow was created but layout is missing
          navigate(
            buildRoute(ROUTES.EDIT_WORKFLOW, {
              environmentSlug: environmentSlug || '',
              workflowSlug: values.workflowId,
            })
          );
          return;
        }

        // Handle all other errors - show user-facing error notification
        console.error('Failed to create workflow from template:', error);
        showErrorToast(undefined, error);
      });
  };

  const getHeaderText = () => {
    if (selectedTemplate) {
      return selectedTemplate.name;
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
          <Breadcrumb className="!mt-0">
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
            <WorkflowSidebar selectedCategory={selectedCategory} onCategorySelect={handleCategorySelect} />
          )}

          <div className="w-full flex-1 overflow-auto">
            {!selectedTemplate ? (
              <div className="p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <h2 className="text-label-md text-strong">{getHeaderText()}</h2>
                </div>

                <ScrollArea className="h-[520px]">
                  <div className="pr-2">
                    {!suggestions.length ? (
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
                  <WorkflowCanvas
                    isTemplateStorePreview
                    steps={mapTemplateStepsToSteps(selectedTemplate.workflowDefinition.steps)}
                  />
                </div>
                <div className="border-stroke-soft w-full max-w-[300px] border-l p-3">
                  <CreateWorkflowForm onSubmit={handleCreateWorkflow} template={selectedTemplate.workflowDefinition} />
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedTemplate && (
          <DialogFooter className="border-stroke-soft !mx-0 border-t !p-1.5">
            <Button className="ml-auto" mode="gradient" type="submit" form="create-workflow" isLoading={isCreating}>
              Create workflow
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
