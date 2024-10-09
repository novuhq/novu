import * as React from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DotsHorizontalIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons';

import { cn } from '@/utils/ui';
import { ButtonProps, buttonVariants } from '@/components/primitives/button';
import { Link, LinkProps } from 'react-router-dom';

const Pagination = ({ className, ...props }: React.ComponentProps<'nav'>) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn('text-foreground-600 mx-auto flex w-fit justify-center rounded-md border', className)}
    {...props}
  />
);
Pagination.displayName = 'Pagination';

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<'ul'>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn('flex flex-row items-center *:border-r', className)} {...props} />
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

const PaginationLink = ({ className, isActive, isDisabled, size = 'icon', ...props }: PaginationLinkProps) => (
  <Link
    aria-current={isActive ? 'page' : undefined}
    className={cn(
      buttonVariants({
        variant: 'ghost',
        size,
      }),
      { 'bg-neutral-50': isActive },
      { 'pointer-events-none cursor-default opacity-50': isDisabled },
      'rounded-none',
      className
    )}
    {...props}
  />
);
PaginationLink.displayName = 'PaginationLink';

const PaginationStart = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to first page" size="icon" className={cn('', className)} {...props}>
    <DoubleArrowLeftIcon className="size-3" />
  </PaginationLink>
);
PaginationStart.displayName = 'PaginationStart';

const PaginationPrevious = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to previous page" size="icon" className={cn('', className)} {...props}>
    <ChevronLeftIcon className="size-3" />
  </PaginationLink>
);
PaginationPrevious.displayName = 'PaginationPrevious';

const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to next page" size="icon" className={cn('', className)} {...props}>
    <ChevronRightIcon className="size-3" />
  </PaginationLink>
);
PaginationNext.displayName = 'PaginationNext';

const PaginationEnd = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink aria-label="Go to final page" size="icon" className={cn('', className)} {...props}>
    <DoubleArrowRightIcon className="size-3" />
  </PaginationLink>
);
PaginationEnd.displayName = 'PaginationEnd';

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span
    aria-hidden
    className={cn(buttonVariants({ size: 'icon', variant: 'ghost' }), 'bg-transparent hover:bg-transparent', className)}
    {...props}
  >
    <DotsHorizontalIcon className="size-3" />
  </span>
);
PaginationEllipsis.displayName = 'PaginationEllipsis';

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationStart,
  PaginationPrevious,
  PaginationNext,
  PaginationEnd,
  PaginationEllipsis,
};
