import React, { useEffect, useState } from 'react';
import type {
  InkeepAIChatSettings,
  InkeepWidgetBaseSettings,
  InkeepSearchBarProps,
  InkeepFloatingButtonProps,
} from '@inkeep/widgets';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useInkeepSettings from '../utils/useInkeepSettings';

export default function SearchBarWrapper() {
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

  const { baseSettings, aiChatSettings } = useInkeepSettings();

  const searchBarProps: InkeepSearchBarProps = {
    baseSettings,
    aiChatSettings,
  };

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
