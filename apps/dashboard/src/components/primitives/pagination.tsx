import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DotsHorizontalIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons';
import * as React from 'react';

import { ButtonProps, buttonVariants } from '@/components/primitives/button';
import { cn } from '@/utils/ui';
import { Link, LinkProps } from 'react-router-dom';

const Pagination = ({ className, ...props }: React.ComponentProps<'nav'>) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn('text-foreground-600 mx-auto flex w-fit justify-center overflow-hidden rounded-md border', className)}
    {...props}
  />
);
Pagination.displayName = 'Pagination';

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<'ul'>>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      className={cn('flex flex-row items-center *:border-r [&>*:last-child]:border-r-0', className)}
      {...props}
    />
  )
);
PaginationContent.displayName = 'PaginationContent';

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<'li'>>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn('', className)} {...props} />
));
PaginationItem.displayName = 'PaginationItem';

type PaginationLinkProps = {
  isActive?: boolean;
  isDisabled?: boolean;
} & Pick<ButtonProps, 'size'> &
  LinkProps;

const PaginationLink = ({ className, isActive, isDisabled, ...props }: PaginationLinkProps) => (
  <Link
    aria-current={isActive ? 'page' : undefined}
    className={cn(
      buttonVariants({
        mode: 'ghost',
        size: 'xs',
        variant: 'secondary',
      }).root(),
      { 'bg-neutral-50': isActive },
      { 'pointer-events-none cursor-default opacity-50': isDisabled },
      'min-w-8 rounded-none ring-0',
      className
    )}
    {...props}
  />
);
PaginationLink.displayName = 'PaginationLink';

const PaginationStart = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to first page" className={cn('', className)} {...props}>
    <DoubleArrowLeftIcon className="size-3" />
  </PaginationLink>
);
PaginationStart.displayName = 'PaginationStart';

const PaginationPrevious = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to previous page" className={cn('', className)} {...props}>
    <ChevronLeftIcon className="size-3" />
  </PaginationLink>
);
PaginationPrevious.displayName = 'PaginationPrevious';

const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to next page" className={cn('', className)} {...props}>
    <ChevronRightIcon className="size-3" />
  </PaginationLink>
);
PaginationNext.displayName = 'PaginationNext';

const PaginationEnd = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to final page" className={cn('', className)} {...props}>
    <DoubleArrowRightIcon className="size-3" />
  </PaginationLink>
);
PaginationEnd.displayName = 'PaginationEnd';

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span
    aria-hidden
    className={cn(
      buttonVariants({ mode: 'ghost', size: 'xs', variant: 'secondary' }).root(),
      'bg-transparent hover:bg-transparent',
      className
    )}
    {...props}
  >
    <DotsHorizontalIcon className="size-3" />
  </span>
);
PaginationEllipsis.displayName = 'PaginationEllipsis';

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationEnd,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationStart,
};
