import React from 'react';
import { NovuProvider } from '@novu/react';
import { NotionTheme } from './_components/notion-theme';
import { novuConfig } from '../../utils/config';
import { StatusProvider } from './_components/status-context';

const Page = () => {
  return (
    <NovuProvider {...novuConfig}>
      <StatusProvider>
        <NotionTheme />
      </StatusProvider>
    </NovuProvider>
  );
};

export default Page;
