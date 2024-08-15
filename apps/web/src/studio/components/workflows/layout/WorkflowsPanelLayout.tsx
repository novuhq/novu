import { FC } from 'react';

import { CoreProps } from '@novu/novui';
import { Grid, GridItem } from '@novu/novui/jsx';
import { css, cx } from '@novu/novui/css';

/** Panel layout that accepts exactly two children */
export interface IWorkflowsPanelLayoutProps extends CoreProps {
  children: [React.ReactNode, React.ReactNode];
}

export const WorkflowsPanelLayout: FC<IWorkflowsPanelLayoutProps> = ({ children }) => {
  return (
    <Grid gridTemplateColumns={'12'} columnGap={'250'} className={cx(css({ height: '100%', borderRadius: 'inherit' }))}>
      <GridItem colSpan={7}>{children[0]}</GridItem>
      <GridItem colSpan={5}>{children[1]}</GridItem>
    </Grid>
  );
};
