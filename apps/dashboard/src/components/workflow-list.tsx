import { getV2 } from '@/api/api.client';
import { Badge } from '@/components/primitives/badge';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationEnd,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationStart,
} from '@/components/primitives/pagination';
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
import { WorkflowStatus } from '@/components/workflow-status';
import { WorkflowSteps } from '@/components/workflow-steps';
import { WorkflowTags } from '@/components/workflow-tags';
import { useEnvironment } from '@/context/environment/hooks';
import { ListWorkflowResponse, WorkflowOriginEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { FaCode } from 'react-icons/fa6';
import { useSearchParams } from 'react-router-dom';

export const WorkflowList = () => {
  const { currentEnvironment } = useEnvironment();
  const [searchParams, setSearchParams] = useSearchParams();
  const setOffset = useCallback(
    (offset: number) =>
      setSearchParams((searchParams) => {
        searchParams.set('offset', offset.toString());
        return searchParams;
      }),
    [setSearchParams]
  );
  const setLimit = useCallback(
    (limit: number) =>
      setSearchParams((searchParams) => {
        searchParams.set('limit', limit.toString());
        return searchParams;
      }),
    [setSearchParams]
  );
  const offset = useMemo(() => parseInt(searchParams.get('offset') || '0'), [searchParams]);
  const limit = useMemo(() => parseInt(searchParams.get('limit') || '12'), [searchParams]);
  const workflowsQuery = useQuery({
    queryKey: ['workflows', { environmentId: currentEnvironment?._id, limit, offset }],
    queryFn: async () => {
      const { data } = await getV2<{ data: ListWorkflowResponse }>(`/workflows?limit=${limit}&offset=${offset}`);
      return data;
    },
  });
  const currentPage = Math.floor(offset / limit) + 1;

  if (!workflowsQuery.isLoading && !workflowsQuery.data) {
    return null;
  }

  return (
    <div className="flex h-full flex-col px-6 py-2">
      <Table containerClassname="overflow-auto">
        <TableHeader>
          <TableRow>
            <TableHead>Workflows</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Steps</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Last updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workflowsQuery.isLoading ? (
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
                </TableRow>
              ))}
            </>
          ) : (
            <>
              {workflowsQuery.data.workflows.map((workflow) => (
                <TableRow key={workflow._id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      {workflow.origin === WorkflowOriginEnum.EXTERNAL && (
                        <Badge className="rounded-full px-1.5" variant={'warning'}>
                          <FaCode className="size-3" />
                        </Badge>
                      )}
                      <TruncatedText text={workflow.name} />
                    </div>
                    <span className="text-foreground-400 font-code block text-xs">{workflow._id}</span>
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
                </TableRow>
              ))}
            </>
          )}
        </TableBody>
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
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationStart href="#" onClick={() => setOffset(0)} />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationPrevious href="#" onClick={() => setOffset(Math.max(0, offset - limit))} />
                      </PaginationItem>
                      {(() => {
                        const currentPage = Math.floor(offset / limit) + 1;
                        const totalPages = Math.ceil(workflowsQuery.data.totalCount / limit);
                        const startPage = Math.max(1, currentPage - 2);
                        const endPage = Math.min(totalPages, currentPage + 2);

                        const pageItems = [];

                        if (startPage > 1) {
                          pageItems.push(
                            <PaginationItem key={1}>
                              <PaginationLink href="#" onClick={() => setOffset(0)}>
                                1
                              </PaginationLink>
                            </PaginationItem>
                          );

                          if (startPage > 2) {
                            pageItems.push(
                              <PaginationItem>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                        }

                        for (let i = startPage; i <= endPage; i++) {
                          pageItems.push(
                            <PaginationItem key={i}>
                              <PaginationLink
                                href="#"
                                isActive={i === currentPage}
                                onClick={() => setOffset((i - 1) * limit)}
                              >
                                {i}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }

                        if (endPage < totalPages) {
                          if (endPage < totalPages - 1) {
                            pageItems.push(
                              <PaginationItem key="ellipsis-end">
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }

                          pageItems.push(
                            <PaginationItem key={totalPages}>
                              <PaginationLink href="#" onClick={() => setOffset((totalPages - 1) * limit)}>
                                {totalPages}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }

                        pageItems.push(
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={() => {
                                setOffset(Math.min(offset + limit, (totalPages - 1) * limit));
                              }}
                            />
                          </PaginationItem>
                        );

                        pageItems.push(
                          <PaginationItem>
                            <PaginationEnd
                              href="#"
                              onClick={() => {
                                setOffset((totalPages - 1) * limit);
                              }}
                            />
                          </PaginationItem>
                        );

                        return pageItems;
                      })()}
                    </PaginationContent>
                  </Pagination>
                ) : (
                  <Skeleton className="h-5 w-32" />
                )}
                <Select onValueChange={(v) => setLimit(parseInt(v))} defaultValue={limit.toString()}>
                  <SelectTrigger className="w-fit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 / page</SelectItem>
                    <SelectItem value="12">12 / page</SelectItem>
                    <SelectItem value="24">24 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
};
