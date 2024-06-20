import { useState } from 'react';
import { DocsModal } from './DocsModal';

export const useDocsModal = () => {
  const [docsOpen, setDocsOpen] = useState<boolean>(false);
  const [path, setPath] = useState<string>('');

  const toggleDocs = () => {
    setDocsOpen((prevOpen) => !prevOpen);
  };

  return {
    toggle: toggleDocs,
    setPath,
    Component: () => <DocsModal open={docsOpen} toggle={toggleDocs} path={path} />,
  };
};
