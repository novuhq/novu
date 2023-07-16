import React from 'react';
import { useColorMode } from '@docusaurus/theme-common';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { InkeepAIChatSettings, InkeepWidgetBaseSettings } from '@inkeep/widgets';

type InkeepIdentifierSettings = {
  apiKey: string;
  integrationId: string;
  organizationId: string;
};

type InkeepSharedSettings = {
  baseSettings: InkeepWidgetBaseSettings;
  aiChatSettings: InkeepAIChatSettings;
};

const useInkeepSettings = (): InkeepSharedSettings => {
  const { colorMode } = useColorMode();
  const { siteConfig } = useDocusaurusContext();
  const inkeepBaseConfig = siteConfig.customFields.inkeepCredentials as InkeepIdentifierSettings;

  const baseSettings: InkeepWidgetBaseSettings = {
    apiKey: inkeepBaseConfig.apiKey,
    integrationId: inkeepBaseConfig.integrationId,
    organizationId: inkeepBaseConfig.organizationId,
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

  return { baseSettings, aiChatSettings };
};

export default useInkeepSettings;
