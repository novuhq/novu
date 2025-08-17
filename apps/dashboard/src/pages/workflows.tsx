import { DirectionEnum, EnvironmentTypeEnum, PermissionsEnum, StepTypeEnum, WorkflowStatusEnum } from '@novu/shared';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiFileAddLine,
  RiFileMarkedLine,
  RiLoader4Line,
  RiRouteFill,
} from 'react-icons/ri';
import { Outlet, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { FacetedFormFilter } from '@/components/primitives/form/faceted-filter/facated-form-filter';
import { ScrollArea, ScrollBar } from '@/components/primitives/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { getTemplates, WorkflowTemplate } from '@/components/template-store/templates';
import { WorkflowCard } from '@/components/template-store/workflow-card';
import { WorkflowTemplateModal } from '@/components/template-store/workflow-template-modal';
import { SortableColumn, WorkflowList } from '@/components/workflow-list';
import { useEnvironment } from '@/context/environment/hooks';
import { useDebounce } from '@/hooks/use-debounce';
import { useFetchWorkflows } from '@/hooks/use-fetch-workflows';
import { useHasPermission } from '@/hooks/use-has-permission';
import { useTags } from '@/hooks/use-tags';
import { useTelemetry } from '@/hooks/use-telemetry';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';

interface WorkflowFilters {
  query: string;
  tags: string[];
  status: string[];
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
      tags: searchParams.getAll('tags') || [],
      status: searchParams.getAll('status') || [],
    },
  });

  useEffect(() => {
    if (!searchParams.has('query') && form.getValues('query')) {
      form.setValue('query', '');
    }
  }, []);

  const updateSearchParam = (value: string) => {
    if (value) {
      searchParams.set('query', value);
    } else {
      searchParams.delete('query');
    }

    setSearchParams(searchParams);
  };

  const updateTagsParam = (tags: string[]) => {
    searchParams.delete('tags');
    tags.forEach((tag) => searchParams.append('tags', tag));
    setSearchParams(searchParams);
  };

  const updateStatusParam = (status: string[]) => {
    searchParams.delete('status');
    status.forEach((s) => searchParams.append('status', s));
    setSearchParams(searchParams);
  };

  const debouncedSearch = useDebounce((value: string) => updateSearchParam(value), 500);

  const clearFilters = () => {
    form.reset({ query: '', tags: [], status: [] });
    searchParams.delete('query');
    searchParams.delete('tags');
    searchParams.delete('status');
    setSearchParams(searchParams);
  };

  useEffect(() => {
    const subscription = form.watch((value) => {
      if (value.query !== undefined) {
        debouncedSearch(value.query || '');
      }

      if (value.tags !== undefined) {
        updateTagsParam(value.tags as string[]);
      }

      if (value.status !== undefined) {
        updateStatusParam(value.status as string[]);
      }
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
    isFetching,
    isError,
  } = useFetchWorkflows({
    limit,
    offset,
    orderBy: searchParams.get('orderBy') as SortableColumn,
    orderDirection: searchParams.get('orderDirection') as DirectionEnum,
    query: searchParams.get('query') || '',
    tags: searchParams.getAll('tags'),
    status: searchParams.getAll('status'),
  });

  const { currentEnvironment } = useEnvironment();
  const { tags } = useTags();

  const hasActiveFilters =
    (searchParams.get('query') ? searchParams.get('query')!.trim() !== '' : false) ||
    searchParams.getAll('tags').length > 0 ||
    searchParams.getAll('status').length > 0;

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
        <div className="flex h-full w-full flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 py-2.5">
              <FacetedFormFilter
                type="text"
                size="small"
                title="Search"
                value={form.watch('query') || ''}
                onChange={(value) => form.setValue('query', value || '')}
                placeholder="Search workflows..."
              />
              <FacetedFormFilter
                size="small"
                type="multi"
                title="Tags"
                placeholder="Filter by tags"
                options={tags?.map((tag) => ({ label: tag.name, value: tag.name })) || []}
                selected={form.watch('tags')}
                onSelect={(values) => form.setValue('tags', values)}
              />
              <FacetedFormFilter
                size="small"
                type="multi"
                title="Status"
                placeholder="Filter by status"
                options={[
                  { label: 'Active', value: WorkflowStatusEnum.ACTIVE },
                  { label: 'Inactive', value: WorkflowStatusEnum.INACTIVE },
                  { label: 'Error', value: WorkflowStatusEnum.ERROR },
                ]}
                selected={form.watch('status')}
                onSelect={(values) => form.setValue('status', values)}
              />

              {hasActiveFilters && (
                <div className="flex items-center gap-1">
                  <Button variant="secondary" mode="ghost" size="2xs" onClick={clearFilters}>
                    Reset
                  </Button>
                  {isFetching && !isPending && <RiLoader4Line className="h-3 w-3 animate-spin text-neutral-400" />}
                </div>
              )}
            </div>
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
  const { currentEnvironment } = useEnvironment();

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

  const canCreateWorkflow = has({ permission: PermissionsEnum.WORKFLOW_WRITE });

  if (!canCreateWorkflow || currentEnvironment?.type !== EnvironmentTypeEnum.DEV) {
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
          {currentEnvironment?.type !== EnvironmentTypeEnum.DEV
            ? 'Create the workflow in your development environment.'
            : "Almost there! Your role just doesn't have permission for this one."}{' '}
          {currentEnvironment?.type === EnvironmentTypeEnum.DEV && (
            <a
              href="https://docs.novu.co/platform/account/roles-and-permissions"
              target="_blank"
              className="underline"
              rel="noopener"
            >
              Learn More ↗
            </a>
          )}
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
              className="rounded-l-none rounded-r-lg border-none px-1.5 text-white"
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
