import React from 'react';
import DocPage from '@theme-original/DocPage';
import { createContext } from 'react';

export const SidebarContext = createContext('default');

export default function DocPageWrapper(props) {
  return (
    <SidebarContext.Provider value={props.versionMetadata.docsSidebars.tutorialSidebar}>
      <DocPage {...props} />
    </SidebarContext.Provider>
  );
}
