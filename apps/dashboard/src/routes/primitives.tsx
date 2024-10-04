import { Badge } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationLink,
  PaginationEllipsis,
  PaginationNext,
  PaginationStart,
  PaginationEnd,
} from '@/components/primitives/pagination';
import { Step } from '@/components/primitives/step';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/primitives/table';
import { Tag } from '@/components/primitives/tag';
import { GlobeIcon } from '@radix-ui/react-icons';

export const Primitives = () => {
  return (
    <div className="flex min-h-[2000px] w-full flex-col gap-8">
      <h1>Home page</h1>
      <div className="flex w-full flex-col items-center justify-center gap-4">
        <h2 className="text-lg font-semibold">Buttons</h2>
        <Button>Default button</Button>
        <Button variant="primary">Primary button</Button>
        <Button variant="destructive">Destructive button</Button>
        <Button variant="ghost">Ghost button</Button>
        <Button variant="outline">Outline button</Button>
      </div>

      <div className="flex w-full flex-col items-center justify-center gap-4">
        <h2 className="text-lg font-semibold">Badges</h2>
        <Badge>Secondary badge</Badge>
        <Badge variant="success">Success badge</Badge>
        <Badge variant="destructive">Destructive badge</Badge>
        <Badge variant="warning">Warning badge</Badge>
      </div>

      <div className="flex w-full flex-col items-center justify-center gap-4">
        <h2 className="text-lg font-semibold">Tags</h2>
        <Tag variant="feature">authentication</Tag>
        <Tag variant="information">tags</Tag>
        <Tag>+11</Tag>
      </div>

      <div className="flex w-full flex-col items-center justify-center gap-4">
        <h2 className="text-lg font-semibold">Steps</h2>
        <Step>
          <GlobeIcon />
        </Step>
        <Step variant="feature">
          <GlobeIcon />
        </Step>
        <Step variant="information">
          <GlobeIcon />
        </Step>
        <Step variant="highlighted">
          <GlobeIcon />
        </Step>
        <Step variant="stable">
          <GlobeIcon />
        </Step>
      </div>

      <div className="flex w-full flex-col items-center justify-center gap-4">
        <h2 className="text-lg font-semibold">Table</h2>

        <div className="mx-auto w-full max-w-4xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Test</TableCell>
                <TableCell>Test</TableCell>
                <TableCell>Test</TableCell>
                <TableCell>Test</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Test</TableCell>
                <TableCell>Test</TableCell>
                <TableCell>Test</TableCell>
                <TableCell>Test</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Test</TableCell>
                <TableCell>Test</TableCell>
                <TableCell>Test</TableCell>
                <TableCell>Test</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div>
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
        </div>
      </div>
    </div>
  );
};
