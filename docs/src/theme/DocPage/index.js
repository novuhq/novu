import React, { createContext } from 'react';
import DocPage from '@theme-original/DocPage';

export const SidebarContext = createContext('default');

export default function DocPageWrapper(props) {
  return (
    <SidebarContext.Provider value={props.versionMetadata.docsSidebars.tutorialSidebar}>
      <DocPage {...props} />
    </SidebarContext.Provider>
  );
}
