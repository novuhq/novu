import { DirectionEnum, EnvironmentTypeEnum, PermissionsEnum, WorkflowStatusEnum } from '@novu/shared';
import { useCallback, useEffect, useMemo } from 'react';
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
import { Skeleton } from '@/components/primitives/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { selectPopularByIdStrict } from '@/components/template-store/featured';
import { WorkflowCard } from '@/components/template-store/workflow-card';
import { WorkflowTemplateModal } from '@/components/template-store/workflow-template-modal';
import { SortableColumn, WorkflowList } from '@/components/workflow-list';
import { useEnvironment } from '@/context/environment/hooks';
import { useDebounce } from '@/hooks/use-debounce';
import { useFetchWorkflows } from '@/hooks/use-fetch-workflows';
import { useHasPermission } from '@/hooks/use-has-permission';
import { getPersistedPageSize, usePersistedPageSize } from '@/hooks/use-persisted-page-size';
import { useTags } from '@/hooks/use-tags';
import { useTelemetry } from '@/hooks/use-telemetry';
import { QuickTemplate, useTemplateStore } from '@/hooks/use-template-store';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';

const WORKFLOWS_TABLE_ID = 'workflows-list';

interface WorkflowFilters {
  query: string;
  tags: string[];
  status: string[];
}

const DEFAULT_PAGE_SIZE = getPersistedPageSize(WORKFLOWS_TABLE_ID, 10);

export const WorkflowsPage = () => {
  const { environmentSlug } = useParams();
  const track = useTelemetry();
  const navigate = useNavigate();
  const { setPageSize: setPersistedPageSize } = usePersistedPageSize({
    tableId: WORKFLOWS_TABLE_ID,
    defaultPageSize: 10,
  });
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

  const updateSearchParams = useCallback(
    (updates: Partial<{ query: string; tags: string[]; status: string[] }>) => {
      setSearchParams((prev) => {
        const sp = new URLSearchParams(prev);

        if ('query' in updates) {
          if (updates.query) {
            sp.set('query', updates.query);
          } else {
            sp.delete('query');
          }
        }

        if ('tags' in updates) {
          sp.delete('tags');
          for (const tag of updates.tags || []) {
            sp.append('tags', tag);
          }
        }

        if ('status' in updates) {
          sp.delete('status');
          for (const s of updates.status || []) {
            sp.append('status', s);
          }
        }

        return sp;
      });
    },
    [setSearchParams]
  );

  const debouncedSearch = useDebounce((searchQuery: string) => updateSearchParams({ query: searchQuery }), 500);

  const clearFilters = () => {
    form.reset({ query: '', tags: [], status: [] });
    updateSearchParams({ query: '', tags: [], status: [] });
  };

  useEffect(() => {
    const subscription = form.watch((value) => {
      const updates: Partial<{ query: string; tags: string[]; status: string[] }> = {};

      if (value.query !== undefined) {
        debouncedSearch(value.query || '');
      }

      if (value.tags !== undefined) {
        updates.tags = value.tags as string[];
      }

      if (value.status !== undefined) {
        updates.status = value.status as string[];
      }

      if (Object.keys(updates).length > 0) {
        updateSearchParams(updates);
      }
    });

    return () => {
      subscription.unsubscribe();
      debouncedSearch.cancel();
    };
  }, [form, debouncedSearch, updateSearchParams]);

  const { quickTemplates, isLoading: isLoadingQuickStart } = useTemplateStore();

  const quickStartTemplates = useMemo(() => {
    const popularByTag = quickTemplates
      .filter((template) => Array.isArray(template.tags) && template.tags.includes('popular'))
      .slice(0, 4);

    if (popularByTag.length > 0) {
      return popularByTag;
    }

    const popularByLegacy = selectPopularByIdStrict(quickTemplates, (template) => template.workflowId, 4);
    return popularByLegacy.length ? popularByLegacy : quickTemplates.slice(0, 4);
  }, [quickTemplates]);

  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || DEFAULT_PAGE_SIZE.toString(), 10);

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

  const queryParam = searchParams.get('query') || '';
  const hasActiveFilters =
    queryParam.trim() !== '' || searchParams.getAll('tags').length > 0 || searchParams.getAll('status').length > 0;

  const isDevEnvironment = currentEnvironment?.type === EnvironmentTypeEnum.DEV;

  const shouldShowStartWithTemplatesSection =
    workflowsData && workflowsData.totalCount < 5 && !hasActiveFilters && isDevEnvironment;

  useEffect(() => {
    track(TelemetryEvent.WORKFLOWS_PAGE_VISIT);
  }, [track]);

  const handleTemplateClick = (template: QuickTemplate) => {
    track(TelemetryEvent.TEMPLATE_WORKFLOW_CLICK);

    navigate(
      `${buildRoute(ROUTES.TEMPLATE_STORE_CREATE_WORKFLOW, {
        environmentSlug: environmentSlug || '',
        templateId: template.workflowId,
      })}?source=template-store-card-row`
    );
  };

  return (
    <>
      <PageMeta title="Workflows" />
      <DashboardLayout headerStartItems={<h1 className="text-foreground-950 flex items-center gap-1">Workflows</h1>}>
        <div className="flex h-full w-full flex-col">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 py-2.5">
              <FacetedFormFilter
                type="text"
                size="small"
                title="Search"
                value={form.watch('query') || ''}
                onChange={(value) => {
                  form.setValue('query', value || '');
                }}
                placeholder="Search workflows..."
              />
              <FacetedFormFilter
                size="small"
                type="multi"
                title="Tags"
                placeholder="Filter by tags"
                options={tags?.map((tag) => ({ label: tag.name, value: tag.name })) || []}
                selected={form.watch('tags')}
                onSelect={(values) => {
                  form.setValue('tags', values, { shouldDirty: true, shouldTouch: true });
                }}
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
                onSelect={(values) => {
                  form.setValue('status', values, { shouldDirty: true, shouldTouch: true });
                }}
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
                      `${buildRoute(ROUTES.TEMPLATE_STORE, {
                        environmentSlug: environmentSlug || '',
                      })}?source=start-with`
                    )
                  }
                  trailingIcon={RiArrowRightSLine}
                >
                  Explore templates
                </LinkButton>
              </div>
              <ScrollArea className="w-full">
                <div className="bg-bg-weak rounded-12 flex gap-4 p-3">
                  {isLoadingQuickStart && (
                    <>
                      <Skeleton className="h-[140px] w-[250px] shrink-0" />
                      <Skeleton className="h-[140px] w-[250px] shrink-0" />
                      <Skeleton className="h-[140px] w-[250px] shrink-0" />
                      <Skeleton className="h-[140px] w-[250px] shrink-0" />
                      <Skeleton className="h-[140px] w-[250px] shrink-0" />
                    </>
                  )}
                  {!isLoadingQuickStart && (
                    <>
                      <div className="w-[250px] shrink-0">
                        <WorkflowCard
                          name="Start from scratch"
                          description="Create a workflow from scratch"
                          steps={[]}
                          onClick={() => {
                            track(TelemetryEvent.CREATE_WORKFLOW_CLICK);
                            navigate(buildRoute(ROUTES.WORKFLOWS_CREATE, { environmentSlug: environmentSlug || '' }));
                          }}
                        />
                      </div>
                      {quickStartTemplates.map((template) => (
                        <div key={template.workflowId} className="w-[250px] shrink-0">
                          <WorkflowCard
                            name={template.name}
                            description={template.description}
                            steps={template.steps}
                            onClick={() => handleTemplateClick(template)}
                          />
                        </div>
                      ))}
                    </>
                  )}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}
          {shouldShowStartWithTemplatesSection && (
            <div className="text-label-xs text-text-soft my-2">Your Workflows</div>
          )}
          <WorkflowList
            hasActiveFilters={!!hasActiveFilters}
            onClearFilters={clearFilters}
            orderBy={searchParams.get('orderBy') as SortableColumn}
            orderDirection={searchParams.get('orderDirection') as DirectionEnum}
            data={workflowsData}
            isLoading={isPending}
            isError={isError}
            limit={limit}
            onPageSizeChange={(newPageSize) => {
              setPersistedPageSize(newPageSize);
              setSearchParams((prev) => {
                const sp = new URLSearchParams(prev);
                sp.set('limit', newPageSize.toString());
                sp.delete('offset');

                return sp;
              });
            }}
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

  const handleCreateWorkflow = (event: Pick<Event, 'preventDefault' | 'stopPropagation'>) => {
    event.preventDefault();
    event.stopPropagation();
    track(TelemetryEvent.CREATE_WORKFLOW_CLICK);
    navigate(buildRoute(ROUTES.WORKFLOWS_CREATE, { environmentSlug: environmentSlug || '' }));
  };

  const navigateToTemplateStore = (event: Pick<Event, 'preventDefault' | 'stopPropagation'>) => {
    event.preventDefault();
    event.stopPropagation();
    navigate(
      `${buildRoute(ROUTES.TEMPLATE_STORE, {
        environmentSlug: environmentSlug || '',
      })}?source=create-workflow-dropdown`
    );
  };

  const canCreateWorkflow = has({ permission: PermissionsEnum.WORKFLOW_WRITE });

  if (!canCreateWorkflow || currentEnvironment?.type !== EnvironmentTypeEnum.DEV) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
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
            <DropdownMenuItem className="cursor-pointer" onSelect={handleCreateWorkflow}>
              <RiFileAddLine />
              From Blank
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
  const { environmentSlug } = useParams();

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
    />
  );
};
