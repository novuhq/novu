import type { IExtendedCellProps } from './Table';
import { withCellLoading } from './withCellLoading';

const DefaultCellComponent = ({ value }: IExtendedCellProps) => {
  return value ?? '';
};

export const DefaultCell = withCellLoading(DefaultCellComponent);
