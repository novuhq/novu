import React from 'react';
import {
  InkeepAIChatSettings,
  InkeepWidgetBaseSettings,
  InkeepSearchBarProps,
  InkeepSearchBar,
} from '@inkeep/widgets';
import { useColorMode } from '@docusaurus/theme-common'; // import the useColorMode hook
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

type InkeepIdentifierSettings = {
  apiKey: string;
  integrationId: string;
  organizationId: string;
};

export default function SearchBarWrapper() {
  const { colorMode } = useColorMode();
  const { siteConfig } = useDocusaurusContext();

  const inkeepBaseConfig = siteConfig.customFields.inkeepConfig as InkeepIdentifierSettings;

  const inkeepBaseSettings: InkeepWidgetBaseSettings = {
    // ...inkeepIdentifierSettings,
    ...inkeepBaseConfig,
    organizationDisplayName: 'Novu',
    primaryBrandColor: '#F8247C',
    theme: {
      colorMode: colorMode,
      fontWeights: {
        semibold: 500,
      },
      primaryColors: {
        textColorOnPrimary: 'white',
      },
    },
  };

  const aiChatSettings: InkeepAIChatSettings = {
    botName: 'Novu',
    isChatModeToggleEnabled: true,
  };

  const searchBarProps: InkeepSearchBarProps = {
    baseSettings: { ...inkeepBaseSettings },
    aiChatSettings: { ...aiChatSettings },
  };

  return (
    <div className="Inkeep-Search">
      <InkeepSearchBar {...searchBarProps} />
    </div>
  );
}
