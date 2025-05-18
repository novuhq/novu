import { DashboardLayout } from '@/components/dashboard-layout';
import { PageMeta } from '@/components/page-meta';
import { Button } from '@/components/primitives/button';
import { ButtonGroupItem, ButtonGroupRoot } from '@/components/primitives/button-group';
import { LinkButton } from '@/components/primitives/button-link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { Form, FormField, FormItem, FormRoot } from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { ScrollArea, ScrollBar } from '@/components/primitives/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { getTemplates, WorkflowTemplate } from '@/components/template-store/templates';
import { WorkflowCard } from '@/components/template-store/workflow-card';
import { WorkflowTemplateModal } from '@/components/template-store/workflow-template-modal';
import { SortableColumn, WorkflowList } from '@/components/workflow-list';
import { useEnvironment } from '@/context/environment/hooks';
import { useDebounce } from '@/hooks/use-debounce';
import { useFetchWorkflows } from '@/hooks/use-fetch-workflows';
import { useTelemetry } from '@/hooks/use-telemetry';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { DirectionEnum, PermissionsEnum, StepTypeEnum } from '@novu/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiFileAddLine,
  RiFileMarkedLine,
  RiRouteFill,
  RiSearchLine,
} from 'react-icons/ri';
import { Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useHasPermission } from '@/hooks/use-has-permission';

interface WorkflowFilters {
  query: string;
}

export const WorkflowsPage = () => {
  const { environmentSlug } = useParams();
  const track = useTelemetry();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams({
    orderDirection: DirectionEnum.DESC,
    orderBy: 'createdAt',
    query: '',
  });
  const form = useForm<WorkflowFilters>({
    defaultValues: {
      query: searchParams.get('query') || '',
    },
  });

  const updateSearchParam = (value: string) => {
    if (value) {
      searchParams.set('query', value);
    } else {
      searchParams.delete('query');
    }

    setSearchParams(searchParams);
  };

  const debouncedSearch = useDebounce((value: string) => updateSearchParam(value), 500);

  const clearFilters = () => {
    form.reset({ query: '' });
  };

  useEffect(() => {
    const subscription = form.watch((value: { query?: string }) => {
      debouncedSearch(value.query || '');
    });

    return () => {
      subscription.unsubscribe();
      debouncedSearch.cancel();
    };
  }, [form, debouncedSearch]);
  const templates = getTemplates();
  const popularTemplates = templates.filter((template) => template.isPopular).slice(0, 4);

  const offset = parseInt(searchParams.get('offset') || '0');
  const limit = parseInt(searchParams.get('limit') || '12');

  const {
    data: workflowsData,
    isPending,
    isError,
  } = useFetchWorkflows({
    limit,
    offset,
    orderBy: searchParams.get('orderBy') as SortableColumn,
    orderDirection: searchParams.get('orderDirection') as DirectionEnum,
    query: searchParams.get('query') || '',
  });

  const { currentEnvironment } = useEnvironment();

  const hasActiveFilters = searchParams.get('query') && searchParams.get('query') !== null;

  const isProdEnv = currentEnvironment?.name === 'Production';

  const shouldShowStartWithTemplatesSection =
    workflowsData && workflowsData.totalCount < 5 && !hasActiveFilters && !isProdEnv;

  useEffect(() => {
    track(TelemetryEvent.WORKFLOWS_PAGE_VISIT);
  }, [track]);

  const handleTemplateClick = (template: WorkflowTemplate) => {
    track(TelemetryEvent.TEMPLATE_WORKFLOW_CLICK);

    navigate(
      buildRoute(ROUTES.TEMPLATE_STORE_CREATE_WORKFLOW, {
        environmentSlug: environmentSlug || '',
        templateId: template.id,
      }) + '?source=template-store-card-row'
    );
  };

  return (
    <>
      <PageMeta title="Workflows" />
      <DashboardLayout headerStartItems={<h1 className="text-foreground-950 flex items-center gap-1">Workflows</h1>}>
        <div className="flex h-full w-full flex-col gap-2.5 p-2.5">
          <div className="flex justify-between">
            <Form {...form}>
              <FormRoot
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <FormField
                  control={form.control}
                  name="query"
                  render={({ field }) => (
                    <FormItem className="relative">
                      <Input
                        size="xs"
                        className="w-64"
                        {...field}
                        placeholder="Search workflows..."
                        leadingIcon={RiSearchLine}
                      />
                    </FormItem>
                  )}
                />
              </FormRoot>
            </Form>
            <CreateWorkflowButton />
          </div>
          {shouldShowStartWithTemplatesSection && (
            <div className="mb-2">
              <div className="my-2 flex items-center justify-between">
                <div className="text-label-xs text-text-soft">Quick start</div>
                <LinkButton
                  size="sm"
                  variant="gray"
                  onClick={() =>
                    navigate(
                      buildRoute(ROUTES.TEMPLATE_STORE, {
                        environmentSlug: environmentSlug || '',
                      }) + '?source=start-with'
                    )
                  }
                  trailingIcon={RiArrowRightSLine}
                >
                  Explore templates
                </LinkButton>
              </div>
              <ScrollArea className="w-full">
                <div className="bg-bg-weak rounded-12 flex gap-4 p-3">
                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      track(TelemetryEvent.CREATE_WORKFLOW_CLICK);

                      navigate(buildRoute(ROUTES.WORKFLOWS_CREATE, { environmentSlug: environmentSlug || '' }));
                    }}
                  >
                    <WorkflowCard name="Start from scratch" description="Create a workflow from scratch" steps={[]} />
                  </div>
                  {popularTemplates.map((template) => (
                    <WorkflowCard
                      key={template.id}
                      name={template.name}
                      description={template.description}
                      steps={template.workflowDefinition.steps.map((step) => step.type as StepTypeEnum)}
                      onClick={() => handleTemplateClick(template)}
                    />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}
          {shouldShowStartWithTemplatesSection && <div className="text-label-xs text-text-soft">Your Workflows</div>}
          <WorkflowList
            hasActiveFilters={!!hasActiveFilters}
            onClearFilters={clearFilters}
            orderBy={searchParams.get('orderBy') as SortableColumn}
            orderDirection={searchParams.get('orderDirection') as DirectionEnum}
            data={workflowsData}
            isLoading={isPending}
            isError={isError}
            limit={limit}
          />
        </div>
        <Outlet />
      </DashboardLayout>
    </>
  );
};

const CreateWorkflowButton = () => {
  const navigate = useNavigate();
  const { environmentSlug } = useParams();
  const track = useTelemetry();
  const has = useHasPermission();

  const handleCreateWorkflow = () => {
    track(TelemetryEvent.CREATE_WORKFLOW_CLICK);
    navigate(buildRoute(ROUTES.WORKFLOWS_CREATE, { environmentSlug: environmentSlug || '' }));
  };

  const navigateToTemplateStore = () => {
    navigate(
      buildRoute(ROUTES.TEMPLATE_STORE, {
        environmentSlug: environmentSlug || '',
      }) + '?source=create-workflow-dropdown'
    );
  };

  const canCreateWorkflow = has({ permission: PermissionsEnum.WORKFLOW_CREATE });

  if (!canCreateWorkflow) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Button
            className="text-label-xs gap-1 rounded-lg p-2"
            variant="primary"
            disabled
            size="xs"
            leadingIcon={RiRouteFill}
          >
            Create workflow
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Almost there! Your role just doesn't have permission for this one.{' '}
          <a href="https://docs.novu.co/" target="_blank" className="underline">
            Learn More ↗
          </a>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <ButtonGroupRoot size="xs">
      <ButtonGroupItem asChild className="gap-1">
        <Button
          mode="gradient"
          className="text-label-xs rounded-l-lg rounded-r-none border-none p-2 text-white"
          variant="primary"
          size="xs"
          leadingIcon={RiRouteFill}
          onClick={handleCreateWorkflow}
        >
          Create workflow
        </Button>
      </ButtonGroupItem>
      <ButtonGroupItem asChild>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              mode="gradient"
              className="rounded-l-none rounded-r-lg border-none text-white"
              variant="primary"
              size="xs"
              leadingIcon={RiArrowDownSLine}
            ></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuItem className="cursor-pointer" asChild>
              <div className="w-full" onClick={handleCreateWorkflow}>
                <RiFileAddLine />
                From Blank
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onSelect={navigateToTemplateStore}>
              <RiFileMarkedLine />
              From Template
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroupItem>
    </ButtonGroupRoot>
  );
};

export const TemplateModal = () => {
  const navigate = useNavigate();
  const { templateId, environmentSlug } = useParams();
  const templates = getTemplates();
  const selectedTemplate = templateId ? templates.find((template) => template.id === templateId) : undefined;

  const handleCloseTemplateModal = () => {
    navigate(buildRoute(ROUTES.WORKFLOWS, { environmentSlug: environmentSlug || '' }));
  };

  return (
    <WorkflowTemplateModal
      open={true}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleCloseTemplateModal();
        }
      }}
      selectedTemplate={selectedTemplate}
    />
  );
};
