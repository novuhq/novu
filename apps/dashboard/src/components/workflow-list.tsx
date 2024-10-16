import { getV2 } from '@/api/api.client';
import { DefaultPagination } from '@/components/default-pagination';
import { Badge, BadgeContent } from '@/components/primitives/badge';
import { Button, buttonVariants } from '@/components/primitives/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { Skeleton } from '@/components/primitives/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/primitives/table';
import TruncatedText from '@/components/truncated-text';
import { WorkflowCloud } from '@/components/workflow-cloud';
import { WorkflowStatus } from '@/components/workflow-status';
import { WorkflowSteps } from '@/components/workflow-steps';
import { WorkflowTags } from '@/components/workflow-tags';
import { useEnvironment } from '@/context/environment/hooks';
import { ListWorkflowResponse, WorkflowOriginEnum, WorkflowStatusEnum } from '@novu/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FaCode } from 'react-icons/fa6';
import { createSearchParams, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  RiRouteFill,
  RiBookMarkedLine,
  RiMore2Fill,
  RiPlayCircleLine,
  RiGitPullRequestFill,
  RiPulseFill,
  RiPauseCircleLine,
  RiDeleteBin2Line,
} from 'react-icons/ri';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { buildRoute, ROUTES } from '@/utils/routes';

export const WorkflowList = () => {
  const { currentEnvironment } = useEnvironment();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const hrefFromOffset = (offset: number) => {
    return `${location.pathname}?${createSearchParams({
      ...searchParams,
      offset: offset.toString(),
    })}`;
  };
  const setLimit = (limit: number) => {
    setSearchParams((searchParams) => {
      searchParams.set('limit', limit.toString());
      return searchParams;
    });
  };

  const offset = parseInt(searchParams.get('offset') || '0');
  const limit = parseInt(searchParams.get('limit') || '12');
  const workflowsQuery = useQuery({
    queryKey: ['workflows', { environmentId: currentEnvironment?._id, limit, offset }],
    queryFn: async () => {
      const { data } = await getV2<{ data: ListWorkflowResponse }>(`/workflows?limit=${limit}&offset=${offset}`);
      return data;
    },
    placeholderData: keepPreviousData,
  });
  const currentPage = Math.floor(offset / limit) + 1;

  if (workflowsQuery.isError) {
    return null;
  }

  if (!workflowsQuery.isPending && workflowsQuery.data.totalCount === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <WorkflowCloud className="drop-shadow" />
          <span className="text-foreground-900 block font-medium">
            No workflows exist, create workflows to orchestrate notifications
          </span>
          <p className="text-foreground-600 max-w-[55ch] text-sm">
            Workflows in Novu handle event-driven notifications across multiple channels in a single, version-controlled
            flow, with the ability to manage preference for each subscriber.
          </p>
        </div>

        <div className="flex items-center justify-center gap-6">
          <Link
            to={'https://docs.novu.co/concepts/workflows'}
            className={buttonVariants({ variant: 'link', className: 'text-foreground-600 gap-1' })}
          >
            <RiBookMarkedLine className="size-4" />
            View docs
          </Link>
          <Button variant="primary" className="gap-2">
            <RiRouteFill className="size-5" />
            Create workflow
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col px-6 py-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Workflows</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Steps</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Last updated</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {workflowsQuery.isPending ? (
            <>
              {new Array(limit).fill(0).map((_, index) => (
                <TableRow key={index}>
                  <TableCell className="flex flex-col gap-1 font-medium">
                    <Skeleton className="h-5 w-[20ch]" />
                    <Skeleton className="h-3 w-[15ch] rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[6ch] rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[8ch] rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-[7ch] rounded-full" />
                  </TableCell>
                  <TableCell className="text-foreground-600 text-sm font-medium">
                    <Skeleton className="h-5 w-[14ch] rounded-full" />
                  </TableCell>
                  <TableCell className="text-foreground-600 text-sm font-medium">
                    <RiMore2Fill className="size-4 opacity-50" />
                  </TableCell>
                </TableRow>
              ))}
            </>
          ) : (
            <>
              {workflowsQuery.data.workflows.map((workflow) => (
                <>
                  <TableRow key={workflow._id} className="relative">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1">
                        {workflow.origin === WorkflowOriginEnum.EXTERNAL && (
                          <Badge className="rounded-full px-1.5" variant="warning-light">
                            <BadgeContent variant="warning">
                              <FaCode className="size-3" />
                            </BadgeContent>
                          </Badge>
                        )}
                        <TruncatedText
                          className="cursor-pointer"
                          text={workflow.name}
                          onClick={() => {
                            navigate(
                              buildRoute(ROUTES.EDIT_WORKFLOW, {
                                environmentId: currentEnvironment?._id ?? '',
                                workflowId: workflow._id,
                              })
                            );
                          }}
                        />
                      </div>
                      <TruncatedText className="text-foreground-400 font-code block text-xs" text={workflow._id} />
                    </TableCell>
                    <TableCell>
                      <WorkflowStatus status={workflow.status} />
                    </TableCell>
                    <TableCell>
                      <WorkflowSteps steps={workflow.stepTypeOverviews} />
                    </TableCell>
                    <TableCell>
                      <WorkflowTags tags={workflow.tags || []} />
                    </TableCell>
                    <TableCell className="text-foreground-600 text-sm font-medium">
                      {new Date(workflow.updatedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="w-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <RiMore2Fill />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          <DropdownMenuGroup>
                            <DropdownMenuItem>
                              <RiPlayCircleLine />
                              Trigger workflow
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={workflow.status === WorkflowStatusEnum.ERROR}>
                              <RiGitPullRequestFill />
                              Promote to Production
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <RiPulseFill />
                              View activity
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuItem>
                              <RiPauseCircleLine />
                              Pause workflow
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <RiDeleteBin2Line />
                              Delete workflow
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                </>
              ))}
            </>
          )}
        </TableBody>
        {workflowsQuery.data && limit < workflowsQuery.data.totalCount && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={5}>
                <div className="flex items-center justify-between">
                  {workflowsQuery.data ? (
                    <span className="text-foreground-600 block text-sm font-normal">
                      Page {currentPage} of {Math.ceil(workflowsQuery.data.totalCount / limit)}
                    </span>
                  ) : (
                    <Skeleton className="h-5 w-[20ch]" />
                  )}
                  {workflowsQuery.data ? (
                    <DefaultPagination
                      hrefFromOffset={hrefFromOffset}
                      totalCount={workflowsQuery.data.totalCount}
                      limit={limit}
                      offset={offset}
                    />
                  ) : (
                    <Skeleton className="h-5 w-32" />
                  )}
                  <Select onValueChange={(v) => setLimit(parseInt(v))} defaultValue={limit.toString()}>
                    <SelectTrigger className="w-fit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12 / page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
};
