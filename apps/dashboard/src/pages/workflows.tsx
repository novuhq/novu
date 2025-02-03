import { DashboardLayout } from '@/components/dashboard-layout';
import { OptInModal } from '@/components/opt-in-modal';
import { PageMeta } from '@/components/page-meta';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { ScrollArea, ScrollBar } from '@/components/primitives/scroll-area';
import { useDebounce } from '@/hooks/use-debounce';
import { useFetchWorkflows } from '@/hooks/use-fetch-workflows';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { DirectionEnum, StepTypeEnum } from '@novu/shared';
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
import { ButtonGroupItem, ButtonGroupRoot } from '../components/primitives/button-group';
import { LinkButton } from '../components/primitives/button-link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/primitives/dropdown-menu';
import { Form, FormField, FormItem } from '../components/primitives/form/form';
import { getTemplates, WorkflowTemplate } from '../components/template-store/templates';
import { WorkflowCard } from '../components/template-store/workflow-card';
import { WorkflowTemplateModal } from '../components/template-store/workflow-template-modal';
import { SortableColumn, WorkflowList } from '../components/workflow-list';
import { buildRoute, ROUTES } from '../utils/routes';

interface WorkflowFilters {
  query: string;
}

export const WorkflowsPage = () => {
  const { environmentSlug } = useParams();
  const track = useTelemetry();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams({
    orderDirection: DirectionEnum.DESC,
    orderBy: 'updatedAt',
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

  const hasActiveFilters = searchParams.get('query') && searchParams.get('query') !== null;

  const shouldShowStartWith = workflowsData && workflowsData.totalCount < 5 && !hasActiveFilters;

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
        <OptInModal />
        <div className="h-full w-full">
          <div className="flex justify-between px-2.5 py-2.5">
            <Form {...form}>
              <form>
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
              </form>
            </Form>
            <ButtonGroupRoot size="xs">
              <ButtonGroupItem asChild className="gap-1">
                <Button
                  mode="gradient"
                  className="rounded-l-lg rounded-r-none border-none p-2 text-white"
                  variant="primary"
                  size="xs"
                  leadingIcon={RiRouteFill}
                  onClick={() =>
                    navigate(buildRoute(ROUTES.WORKFLOWS_CREATE, { environmentSlug: environmentSlug || '' }))
                  }
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
                      <div
                        className="w-full"
                        onClick={() => {
                          track(TelemetryEvent.CREATE_WORKFLOW_CLICK);
                          navigate(buildRoute(ROUTES.WORKFLOWS_CREATE, { environmentSlug: environmentSlug || '' }));
                        }}
                      >
                        <RiFileAddLine />
                        Blank Workflow
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => {
                        navigate(
                          buildRoute(ROUTES.TEMPLATE_STORE, {
                            environmentSlug: environmentSlug || '',
                          }) + '?source=create-workflow-dropdown'
                        );
                      }}
                    >
                      <RiFileMarkedLine />
                      View Workflow Gallery
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ButtonGroupItem>
            </ButtonGroupRoot>
          </div>
          {shouldShowStartWith && (
            <div className="px-2.5 py-2">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-label-xs text-text-soft">Start with</div>
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
                    <WorkflowCard name="Blank workflow" description="Create a blank workflow" steps={[]} />
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

          <div className="px-2.5 py-2">
            {shouldShowStartWith && <div className="text-label-xs text-text-soft mb-2">Your Workflows</div>}
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
        </div>
        <Outlet />
      </DashboardLayout>
    </>
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
