import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTrigger } from '@/components/primitives/dialog';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { ComponentProps, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { RiArrowLeftSLine } from 'react-icons/ri';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useCreateWorkflow } from '../../hooks/use-create-workflow';
import { buildRoute, ROUTES } from '../../utils/routes';
import { RouteFill } from '../icons';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../primitives/breadcrumb';
import { Button } from '../primitives/button';
import { CompactButton } from '../primitives/button-compact';
import { Form } from '../primitives/form/form';
import TruncatedText from '../truncated-text';
import { CreateWorkflowForm } from '../workflow-editor/create-workflow-form';
import { workflowSchema } from '../workflow-editor/schema';
import { WorkflowCanvas } from '../workflow-editor/workflow-canvas';
import { WorkflowResults } from './components/workflow-results';
import { getTemplates, IWorkflowSuggestion } from './templates';
import { WorkflowMode } from './types';
import { WorkflowSidebar } from './workflow-sidebar';

const WORKFLOW_TEMPLATES = getTemplates();

export type WorkflowTemplateModalProps = ComponentProps<typeof DialogTrigger> & {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  source?: string;
  selectedTemplate?: IWorkflowSuggestion;
};

export function WorkflowTemplateModal(props: WorkflowTemplateModalProps) {
  const form = useForm();
  const track = useTelemetry();
  const navigate = useNavigate();
  const { environmentSlug } = useParams();
  const [searchParams] = useSearchParams();
  const { submit: createFromTemplate, isLoading: isCreating } = useCreateWorkflow();
  const [selectedCategory, setSelectedCategory] = useState<string>('popular');
  const [suggestions, setSuggestions] = useState<IWorkflowSuggestion[]>([]);
  const [mode, setMode] = useState<WorkflowMode>(WorkflowMode.TEMPLATES);
  const [internalSelectedTemplate, setInternalSelectedTemplate] = useState<IWorkflowSuggestion | null>(null);

  const selectedTemplate = props.selectedTemplate ?? internalSelectedTemplate;

  const filteredTemplates = WORKFLOW_TEMPLATES.filter((template) =>
    selectedCategory === 'popular' ? template.isPopular : template.category === selectedCategory
  );
  const templates = suggestions.length > 0 ? suggestions : filteredTemplates;

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

  const handleCreateWorkflow = async (values: z.infer<typeof workflowSchema>) => {
    if (!selectedTemplate) return;

    await createFromTemplate(values, selectedTemplate.workflowDefinition);
    track(TelemetryEvent.CREATE_WORKFLOW_FROM_TEMPLATE, {
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      category: selectedCategory,
    });
  };

  const getHeaderText = () => {
    if (selectedTemplate) {
      return selectedTemplate.name;
    }

    if (mode === WorkflowMode.GENERATE) {
      return 'AI Suggested workflows';
    }

    if (mode === WorkflowMode.FROM_PROMPT) {
      return 'Scaffold your workflow';
    }

    if (mode === WorkflowMode.TEMPLATES) {
      return `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} workflows`;
    }

    return '';
  };

  const handleTemplateClick = (template: IWorkflowSuggestion) => {
    setInternalSelectedTemplate(template);
  };

  const handleBackClick = () => {
    navigate(buildRoute(ROUTES.TEMPLATE_STORE, { environmentSlug: environmentSlug || '' }));
    setInternalSelectedTemplate(null);
    setMode(WorkflowMode.TEMPLATES);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setSuggestions([]);
    setMode(WorkflowMode.TEMPLATES);
    track(TelemetryEvent.TEMPLATE_CATEGORY_SELECTED, {
      category,
    });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogTrigger asChild {...props} />

      <DialogContent className="w-full max-w-[1240px] gap-0 p-0" id="workflow-templates-modal">
        <DialogHeader className="border-stroke-soft flex flex-row items-center gap-1 border-b p-3">
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
            <WorkflowSidebar selectedCategory={selectedCategory} onCategorySelect={handleCategorySelect} mode={mode} />
          )}

          <div className="w-full flex-1 overflow-auto">
            {!selectedTemplate ? (
              <div className="p-3">
                <Form {...form}>
                  <form>
                    <div className="mb-1.5 flex items-center justify-between">
                      <h2 className="text-label-md text-strong">{getHeaderText()}</h2>
                    </div>

                    <WorkflowResults mode={mode} suggestions={templates} onClick={handleTemplateClick} />
                  </form>
                </Form>
              </div>
            ) : (
              <div className="flex h-full w-full gap-4">
                <div className="flex-1">
                  <WorkflowCanvas
                    readOnly
                    steps={
                      selectedTemplate.workflowDefinition.steps.map((step) => ({
                        _id: null,
                        slug: null,
                        stepId: step.name,
                        controls: {
                          values: step.controlValues ?? {},
                        },
                        ...step,
                      })) as any
                    }
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
