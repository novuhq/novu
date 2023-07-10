import React, { useEffect, useState } from 'react';
import type {
  InkeepAIChatSettings,
  InkeepWidgetBaseSettings,
  InkeepSearchBarProps,
} from '@inkeep/widgets';
import { useColorMode } from '@docusaurus/theme-common'; // import the useColorMode hook
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import BrowserOnly from '@docusaurus/BrowserOnly';

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

  const [SearchBar, setSearchBar] = useState(null);

  useEffect(() => {
    /*
     * We're using an IIFE (Immediately Invoked Function Expression) here because
     * useEffect cannot directly return a Promise.
     */
    (async () => {
      const { InkeepSearchBar } = await import('@inkeep/widgets');
      setSearchBar(() => InkeepSearchBar);
    })();
  }, []);

  return (
    <div className="Inkeep-Search">
      <BrowserOnly fallback={<div></div>}>
        {() => {
          return SearchBar ? <SearchBar {...searchBarProps} /> : <div></div>;
        }}
      </BrowserOnly>
    </div>
  );
}
