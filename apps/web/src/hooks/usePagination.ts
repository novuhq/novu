const calculatePageCount = ({ totalItemCount, pageSize }: { totalItemCount: number; pageSize: number }) =>
  Math.ceil(totalItemCount / pageSize);

export const usePagination = () => {};
