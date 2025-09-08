import { getReactVersion } from '../react-version';

export function generateReactComponent(
  subscriberId: string | null = null,
  region: string = 'us',
  backendUrl: string | null = null,
  socketUrl: string | null = null
): string {
  const reactVersion = getReactVersion();
  const isModernReact = isReactVersionModern(reactVersion);

  return isModernReact
    ? generateModernReactComponent(subscriberId, region, backendUrl, socketUrl)
    : generateLegacyReactComponent(subscriberId, region, backendUrl, socketUrl);
}

function isReactVersionModern(version: string): boolean {
  try {
    // Remove any pre-release suffixes (e.g., "18.0.0-rc.0" -> "18.0.0")
    const cleanVersion = version.split('-')[0];
    const [majorStr, minorStr] = cleanVersion.split('.');
    const major = Number(majorStr);
    const minor = Number(minorStr);

    if (Number.isNaN(major) || Number.isNaN(minor)) {
      // If we can't parse the version, default to legacy React (not modern)
      return false;
    }

    if (major > 17) return true;
    if (major === 17 && minor >= 0) return true;

    return false;
  } catch (_error) {
    // If anything goes wrong, default to legacy React (not modern)
    return false;
  }
}

function generateSharedInboxCode(
  subscriberId: string | null,
  region: string = 'us',
  envAccessor: string,
  backendUrl: string | null = null,
  socketUrl: string | null = null
): string {
  // Use custom URLs if provided, otherwise fall back to region-based URLs
  const finalBackendUrl = backendUrl || (region === 'eu' ? 'https://eu.api.novu.co' : null);
  const finalSocketUrl = socketUrl || (region === 'eu' ? 'wss://eu.ws.novu.co' : null);

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

  return `import { Inbox } from '@novu/react';

// import { dark } from '@novu/react/themes'; => To enable dark theme support, uncomment this line.

export function NovuInbox() {
 // ${subscriberId ? 'Using provided subscriber ID - replace with your actual subscriber ID from your auth system' : 'TODO: Replace with your actual subscriber ID from your auth system'}
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
      filter: { tags: ['promotions'] },
    },
    
    // Filter by multiple tags - shows notifications with either "security" OR "alert" tags
    {
      label: 'Security',
      filter: { tags: ['security', 'alert'] },
    },
    
    // Filter by data attributes - shows notifications with priority="high" in payload
    {
      label: 'High Priority',
      filter: {
        data: { priority: 'high' },
      },
    },
    
    // Combined filtering - shows notifications that:
    // 1. Come from workflows tagged "alert" AND
    // 2. Have priority="high" in their data payload
    {
      label: 'Critical Alerts',
      filter: { 
        tags: ['alert'],
        data: { priority: 'high' }
      },
    },
  ];

  return <Inbox 
    applicationIdentifier={${envAccessor}}
    subscriberId={temporarySubscriberId}${urlProps}
    tabs={tabs} appearance={{
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
}

export function generateModernReactComponent(
  subscriberId: string | null,
  region: string = 'us',
  backendUrl: string | null = null,
  socketUrl: string | null = null
): string {
  return generateSharedInboxCode(subscriberId, region, "import.meta.env.VITE_NOVU_APP_ID || ''", backendUrl, socketUrl);
}

export function generateLegacyReactComponent(
  subscriberId: string | null,
  region: string = 'us',
  backendUrl: string | null = null,
  socketUrl: string | null = null
): string {
  return `// Legacy React component (React 16.x)
// React import is required for JSX in React 16.x
import React from 'react';

${generateSharedInboxCode(subscriberId, region, "process.env.NOVU_APP_ID || ''", backendUrl, socketUrl)}`;
}
