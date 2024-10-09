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

type DefaultPaginationProps = {
  offset: number;
  limit: number;
  totalCount: number;
  hrefFromOffset: (offset: number) => string;
};

export const DefaultPagination = (props: DefaultPaginationProps) => {
  const { hrefFromOffset, offset, limit, totalCount } = props;
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(totalCount / limit);
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationStart to={hrefFromOffset(0)} />
        </PaginationItem>
        <PaginationItem>
          <PaginationPrevious to={hrefFromOffset(Math.max(0, offset - limit))} isDisabled={currentPage === 1} />
        </PaginationItem>
        {(() => {
          const pageItems = [];

          if (startPage > 1) {
            pageItems.push(
              <PaginationItem key={1}>
                <PaginationLink to={hrefFromOffset(0)}>1</PaginationLink>
              </PaginationItem>
            );

            if (startPage > 2) {
              pageItems.push(
                <PaginationItem key="ellipsis">
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }
          }

          for (let i = startPage; i <= endPage; i++) {
            pageItems.push(
              <PaginationItem key={i}>
                <PaginationLink to={hrefFromOffset((i - 1) * limit)} isActive={i === currentPage}>
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
                <PaginationLink to={hrefFromOffset((totalPages - 1) * limit)}>{totalPages}</PaginationLink>
              </PaginationItem>
            );
          }

          pageItems.push(
            <PaginationItem key="next">
              <PaginationNext
                to={hrefFromOffset(Math.min(offset + limit, (totalPages - 1) * limit))}
                isDisabled={currentPage === totalPages}
              />
            </PaginationItem>
          );

          pageItems.push(
            <PaginationItem key="end">
              <PaginationEnd to={hrefFromOffset((totalPages - 1) * limit)} isDisabled={currentPage === totalPages} />
            </PaginationItem>
          );

          return pageItems;
        })()}
      </PaginationContent>
    </Pagination>
  );
};
