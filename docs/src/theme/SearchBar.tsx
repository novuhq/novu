// By default, the classic theme does not provide any SearchBar implementation
// If you swizzled this, it is your responsibility to provide an implementation
// Tip: swizzle the SearchBar from the Algolia theme for inspiration:
// npm run swizzle @docusaurus/theme-search-algolia SearchBar
import React from 'react';
import {
  InkeepAIChatSettings,
  InkeepWidgetBaseSettings,
  InkeepSearchBarProps,
  InkeepSearchBar,
} from '@inkeep/widgets';
import BrowserOnly from '@docusaurus/BrowserOnly';
// import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

type InkeepIdentifierSettings = {
  apiKey: string;
  integrationId: string;
  organizationId: string;
};

export default function SearchBarWrapper() {
  //   const {
  //     siteConfig: { customFields },
  //   } = useDocusaurusContext();

  //   const inkeepIdentifierSettings =
  //     customFields.inkeepIdentifierSettings as InkeepIdentifierSettings;

  const inkeepBaseSettings: InkeepWidgetBaseSettings = {
    // ...inkeepIdentifierSettings,
    apiKey: '78648f6e062ede8c6905d2af9ae468c3cb6a2494bb3f9e1d',
    integrationId: 'clj6g2vov0005s601blyuv4wi',
    organizationId: 'novu',
    organizationDisplayName: 'Novu',
    primaryBrandColor: '#F8247C',
    theme: {
      fontWeights: {
        semibold: 500,
      },
      primaryColors: {
        textColorOnPrimary: "white"
      }
      // colors: {
      //   inkeepPrimary: {
      //     textColorOnPrimary: "white"
      //   }
      // }
    }
  };

  const aiChatSettings: InkeepAIChatSettings = {
    botName: 'Novu',
    isChatModeToggleEnabled: true,
  };

  const searchSettings: InkeepSearchBarProps = {
    baseSettings: { ...inkeepBaseSettings },
    aiChatSettings: { ...aiChatSettings },
  };

  return (
    <div className="Inkeep-Search">
      <InkeepSearchBar {...searchSettings} />
    </div>
  );
}
