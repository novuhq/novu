import {
  HOME_DEFINITION,
  HOME_HOSTS,
  HOME_HOSTS_DESCRIPTION,
  HOME_QUICKSTART,
  type HomeCommand,
  INSTALL_COMMAND,
  INSTALL_MCP_COMMAND,
} from '@/data/home';
import { PACKAGE_URL, SITE_NAME, SITE_ORIGIN } from '@/lib/seo';

const PUBLISHER = 'https://novu.co/#organization';

/** The extra JSON-LD nodes for the robots page, each one a section that page shows. */
export function homeStructuredNodes() {
  return [homeSoftware(), homeQuickstart(), homeHosts()];
}

/** The CLI the install tab shows, and the MCP server beside it. */
function homeSoftware() {
  return {
    '@type': 'SoftwareApplication' as const,
    '@id': `${SITE_ORIGIN}/#software`,
    name: SITE_NAME,
    applicationCategory: 'DeveloperApplication',
    description: HOME_DEFINITION,
    url: `${SITE_ORIGIN}/`,
    downloadUrl: PACKAGE_URL,
    author: { '@id': PUBLISHER },
  };
}

/** QUICKSTART: the install tabs, then the commands under them, in the order the page prints them. */
function homeQuickstart() {
  const steps = [
    {
      name: 'Install',
      text: `CLI: ${commandText(INSTALL_COMMAND)}. MCP: ${commandText(INSTALL_MCP_COMMAND)}.`,
    },
    ...HOME_QUICKSTART.map((command) => ({
      name: commandText(command),
      text: command.note ? `${commandText(command)} ${command.note}` : commandText(command),
    })),
  ];

  return {
    '@type': 'HowTo' as const,
    '@id': `${SITE_ORIGIN}/#quickstart`,
    name: 'Quickstart',
    description: HOME_DEFINITION,
    isPartOf: { '@id': `${SITE_ORIGIN}/#webpage` },
    step: steps.map((step, index) => ({
      '@type': 'HowToStep' as const,
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

/** HOSTS: one link for each host the page lists. */
function homeHosts() {
  return {
    '@type': 'ItemList' as const,
    '@id': `${SITE_ORIGIN}/#hosts`,
    name: 'Hosts',
    description: HOME_HOSTS_DESCRIPTION,
    isPartOf: { '@id': `${SITE_ORIGIN}/#webpage` },
    itemListElement: HOME_HOSTS.map((host, index) => ({
      '@type': 'ListItem' as const,
      position: index + 1,
      name: host.name,
      url: `${SITE_ORIGIN}${host.href}`,
    })),
  };
}

function commandText(command: HomeCommand): string {
  return command.parts
    .map((part) => part.text)
    .join('')
    .trim();
}
