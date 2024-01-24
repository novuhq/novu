import styled from '@emotion/styled';
import { Box, BoxProps } from '@mantine/core';
import { forwardRef, useContext } from 'react';
import { PageButton } from './PageButton';
import { PaginationContext } from './PaginationContext';

const Group = styled(Box)<BoxProps & React.RefAttributes<HTMLDivElement>>(
  ({ theme }) => `
  display: flex;
  flex-direction: row;
  gap: 0.25rem;
`
);

export interface IButtonGroupProps {
  className?: string;
}

/**
 * Button for navigating to a specific page.
 * @requires this component to be a child of a Pagination component
 */
export const ButtonGroup = forwardRef<HTMLDivElement, IButtonGroupProps>(({ className, ...buttonProps }, ref) => {
  // const { to } = useContext(PaginationContext);

  return (
    <Group ref={ref}>
      <PageButton onClick={() => alert('Left')}>{`<`}</PageButton>
      <PageButton onClick={() => alert('Right')}>{`>`}</PageButton>
    </Group>
  );
});
