interface IFilterByTags {
  tags: string[];
}

interface IFilterByData {
  data: Record<string, unknown>;
}

interface IFilterByTagsAndData {
  tags: string[];
  data: Record<string, unknown>;
}

interface IRegionConfig {
  socketUrl: string;
  backendUrl: string;
}

interface IRegionConfigs {
  eu: IRegionConfig;
}

export function generateNextJsComponent(
  subscriberId: string | null = null,
  region: 'us' | 'eu' = 'us',
  backendUrl: string | null = null,
  socketUrl: string | null = null
): string {
  // Define common filter patterns
  const filterByTags = (tags: string[]): IFilterByTags => ({ tags });
  const filterByData = (data: Record<string, unknown>): IFilterByData => ({ data });
  const filterByTagsAndData = (tags: string[], data: Record<string, unknown>): IFilterByTagsAndData => ({ tags, data });

  // Define region-specific configuration
  const regionConfig: IRegionConfigs = {
    eu: {
      socketUrl: 'wss://eu.ws.novu.co',
      backendUrl: 'https://eu.api.novu.co',
    },
  };

  // Use custom URLs if provided, otherwise fall back to region-based URLs
  const finalBackendUrl = backendUrl || (region === 'eu' ? regionConfig.eu.backendUrl : null);
  const finalSocketUrl = socketUrl || (region === 'eu' ? regionConfig.eu.socketUrl : null);

  const escapeString = (str: string) =>
    str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

  // Build URL props string
  let urlProps = '';
  if (finalBackendUrl || finalSocketUrl) {
    const props = [];
    if (finalBackendUrl) {
      props.push(`backendUrl="${escapeString(finalBackendUrl)}"`);
    }
    if (finalSocketUrl) {
      props.push(`socketUrl="${escapeString(finalSocketUrl)}"`);
    }
    urlProps = `\n    ${props.join(' ')}`;
  }

  const componentCode = `'use client';

// The Novu inbox component is a React component that allows you to display a notification inbox.
// Learn more: https://docs.novu.co/platform/inbox/overview

import { Inbox } from '@novu/nextjs';

// import { dark } from '@novu/nextjs/themes'; => To enable dark theme support, uncomment this line.

// Get the subscriber ID based on the auth provider
// const getSubscriberId = () => {};

export default function NovuInbox() {
  // Temporary subscriber ID - replace with your actual subscriber ID from your auth system
  const temporarySubscriberId = ${subscriberId ? `"${escapeString(subscriberId)}"` : '""'};

  const tabs = [
    // Basic tab with no filtering (shows all notifications)
    {
      label: 'All',
      filter: { tags: [] },
    },
    
    // Filter by tags - shows notifications from workflows tagged "promotions"
    {
      label: 'Promotions',
      filter: ${JSON.stringify(filterByTags(['promotions']))},
    },
    
    // Filter by multiple tags - shows notifications with either "security" OR "alert" tags
    {
      label: 'Security',
      filter: ${JSON.stringify(filterByTags(['security', 'alert']))},
    },
    
    // Filter by data attributes - shows notifications with priority="high" in payload
    {
      label: 'High Priority',
      filter: ${JSON.stringify(filterByData({ priority: 'high' }))},
    },
    
    // Combined filtering - shows notifications that:
    // 1. Come from workflows tagged "alert" AND
    // 2. Have priority="high" in their data payload
    {
      label: 'Critical Alerts',
      filter: ${JSON.stringify(filterByTagsAndData(['alert'], { priority: 'high' }))},
    },
  ];

  return <Inbox 
    applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APP_ID as string}
    subscriberId={temporarySubscriberId} 
    tabs={tabs}${urlProps}
    appearance={{
      // To enable dark theme support, uncomment the following line:
      // baseTheme: dark,
      variables: {
        // The \`variables\` object allows you to define global styling properties that can be reused throughout the inbox.
        // Learn more: https://docs.novu.co/platform/inbox/configuration/styling
      },
      elements: {
        // The \`elements\` object allows you to define styles for these components.
        // Learn more: https://docs.novu.co/platform/inbox/configuration/styling
      },
      icons: {
        // The \`icons\` object allows you to define custom icons for the inbox.
      },
    }} 
  />;
}`;

  return componentCode;
}
