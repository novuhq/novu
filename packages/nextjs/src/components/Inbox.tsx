'use client';

import React from 'react';
import { InboxProps } from '@novu/react';
import { useRouter } from 'next/compat/router';
import { AppRouterInbox } from './app-router/AppRouterInbox';
import { PagesRouterInbox } from './pages-router/PagesRouterInbox';

export const Inbox = React.memo((props: InboxProps) => {
  const router = useRouter();

  return router ? <PagesRouterInbox {...props} /> : <AppRouterInbox {...props} />;
});
