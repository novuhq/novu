import React from 'react';
import { StoryFn, Meta } from '@storybook/react';
import { ComponentAuditTable } from './ComponentAuditTable';
import { css } from '../../styled-system/css';

import scanJson from './component-scans/scan.json';

export default {
  title: 'ComponentAudit',
  component: ComponentAuditTable,
  argTypes: {},
} as Meta<typeof ComponentAuditTable>;

const TableWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div
      className={css({
        overflowX: 'auto',
        maxWidth: '100%',
        overflowY: 'auto',
        maxHeight: '95dvh',
      })}
    >
      {children}
    </div>
  );
};

const Template: StoryFn<typeof ComponentAuditTable> = ({ ...args }) => (
  <>
    <h3>
      If no data is appearing below, please run `pnpm audit-components` in your terminal in the `design-system`
      directory
    </h3>
    <br />
    <TableWrapper>
      <ComponentAuditTable data={scanJson ?? {}} />
    </TableWrapper>
  </>
);

export const ComponentAudit = Template.bind({});
ComponentAudit.args = {};
