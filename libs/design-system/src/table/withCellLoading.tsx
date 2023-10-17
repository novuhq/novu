import styled from '@emotion/styled';
import { Skeleton } from '@mantine/core';

import { IExtendedCellProps } from './Table';
import { Renderer } from 'react-table';

const SkeletonStyled = styled(Skeleton)`
  width: 100%;
`;

export const withCellLoading = <T extends object = {}>(
  Component: Renderer<IExtendedCellProps<T>>,
  { width = 100, height = 20, loadingTestId }: { width?: number; height?: number; loadingTestId?: string } = {}
) => {
  const displayName =
    typeof Component === 'function' ? (Component as React.ComponentType).displayName || Component.name : 'Component';

  const CellLoading = ({ isLoading, ...rest }: IExtendedCellProps<T>) => {
    if (isLoading) {
      return <SkeletonStyled width={width} height={height} data-test-id={loadingTestId} />;
    }

    if (typeof Component === 'function') {
      return <Component isLoading={isLoading} {...rest} />;
    }

    return Component;
  };

  CellLoading.displayName = `withCellLoading(${displayName})`;

  return CellLoading;
};
