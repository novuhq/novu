import { getV2 } from '@/api/api.client';
import { Badge } from '@/components/primitives/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationStart,
  PaginationPrevious,
  PaginationLink,
  PaginationEllipsis,
  PaginationNext,
  PaginationEnd,
} from '@/components/primitives/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/primitives/table';
import { WorkflowSteps } from '@/components/workflow-steps';
import { WorkflowTags } from '@/components/workflow-tags';
import { useEnvironment } from '@/context/environment/hooks';
import { ListWorkflowResponse } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

export const WorkflowList = () => {
  const { currentEnvironment } = useEnvironment();
  const [limit, setLimit] = useState(6);
  const workflowsQuery = useQuery({
    queryKey: ['workflows', { environmentId: currentEnvironment?._id, limit }],
    queryFn: async () => {
      const { data } = await getV2<{ data: ListWorkflowResponse }>(`/workflows?limit=${limit}`);
      return data;
    },
  });

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
            <>loading</>
          ) : (
            <>
              {workflowsQuery.data.workflows.map((workflow) => (
                <TableRow key={workflow._id}>
                  <TableCell className="font-medium">
                    {workflow.name}
                    <span className="text-foreground-400 font-code block text-xs">{workflow._id}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={'success'}>Active</Badge>
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
                <p className="text-foreground-600 text-sm font-normal">Page X of Y</p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationStart href="#" />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationPrevious href="#" />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink href="#">1</PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink href="#">2</PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink href="#">3</PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink href="#">15</PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext href="#" />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationEnd href="#" />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
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
