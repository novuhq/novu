import React, { createContext } from 'react';
import DocPage from '@docusaurus/theme-common';
import { DocsSidebarProvider } from '@docusaurus/theme-common/internal';

export const SidebarContext = createContext([]);

export default function DocPageWrapper(props) {
  return (
    <DocsSidebarProvider>
      <SidebarContext.Provider value={props.versionMetadata.docsSidebars.tutorialSidebar}>
        <DocPage {...props} />
      </SidebarContext.Provider>
    </DocsSidebarProvider>
  );
}
