import React, { useContext, useEffect, useState } from 'react';
import { ActionIcon, Drawer } from '@mantine/core';
import { useLocation } from 'react-router-dom';
import { Docs } from '../docs';
import { IconClose } from '@novu/design-system';

interface IDocsContext {
  setPath: (path: string) => void;
  toggle: () => void;
  enabled: boolean;
}

const DocsContext = React.createContext<IDocsContext>({
  setPath: () => {},
  toggle: () => {},
  enabled: false,
});

export const useDocsContext = (): IDocsContext => useContext(DocsContext);

export const useSetDocs = (path: string) => {
  const { setPath } = useDocsContext();
  useEffect(() => {
    setPath(path);
  }, [path, setPath]);
};

export const DocsProvider = ({ children }) => {
  const [path, setPath] = useState<string>('');
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    return () => {
      setPath('');
    };
  }, [pathname]);

  const toggle = () => {
    setOpen(!open);
  };

  return (
    <DocsContext.Provider
      value={{
        setPath,
        toggle,
        enabled: path.length > 0,
      }}
    >
      <Drawer
        opened={open}
        onClose={() => {
          setOpen(false);
        }}
        position="right"
        size="100%"
        styles={{
          root: {
            zIndex: 10002,
          },
          drawer: {
            overflow: 'scroll',
          },
          header: {
            display: 'none',
          },
        }}
      >
        <Docs path={path}>
          <ActionIcon variant="transparent" onClick={() => toggle()}>
            <IconClose />
          </ActionIcon>
        </Docs>
      </Drawer>
      {children}
    </DocsContext.Provider>
  );
};
