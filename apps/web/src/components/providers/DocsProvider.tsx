import React, { useContext, useEffect, useState } from 'react';
import { Drawer } from '@mantine/core';
import { useLocation } from 'react-router-dom';
import { Docs } from '../docs';

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
      {children}
      <Drawer
        opened={open}
        onClose={() => {
          setOpen(false);
        }}
        position="right"
        size="50%"
        styles={{
          drawer: {
            overflow: 'scroll',
          },
          header: {
            display: 'none',
          },
        }}
      >
        <Docs path={path} />
      </Drawer>
    </DocsContext.Provider>
  );
};
