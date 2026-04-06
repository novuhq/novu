import React from 'react';
import { NovuProvider } from '@novu/nextjs/hooks';
import { NotionTheme } from '@/components/hooks/demo/notion-theme';
import { novuConfig } from '../../utils/config';
import { StatusProvider } from '@/components/hooks/demo/status-context';

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
