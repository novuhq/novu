import { NovuProvider } from '@novu/nextjs/hooks';
import React from 'react';
import { NotionTheme } from '@/components/hooks/demo/notion-theme';
import { StatusProvider } from '@/components/hooks/demo/status-context';
import { novuConfig } from '../../utils/config';

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
