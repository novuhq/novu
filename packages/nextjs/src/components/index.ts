'use client';

import * as NovuReact from '@novu/react';

export * from './Inbox';

const { Inbox, ...rest } = NovuReact;
export { rest };
