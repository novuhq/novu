import React, { createContext } from 'react';
import DocPage from '@theme-original/DocPage';
import { DocsSidebarProvider } from '@docusaurus/theme-common/internal';

export const SidebarContext = createContext('default');

export default function DocPageWrapper(props) {
  return (
    <DocsSidebarProvider>
      <SidebarContext.Provider value={props.versionMetadata.docsSidebars.tutorialSidebar}>
        <DocPage {...props} />
      </SidebarContext.Provider>
    </DocsSidebarProvider>
  );
}
