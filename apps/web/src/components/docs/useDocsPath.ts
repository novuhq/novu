import { useEffect, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { DocsPathsEnum } from './docs.const';

export type DocsPaths = { [key in ROUTES]?: DocsPathsEnum };

export const useDocsPath = (paths: DocsPaths) => {
  const [path, setPath] = useState<string>('');
  const { pathname } = useLocation();

  useEffect(() => {
    for (const route in paths) {
      if (matchPath(route, pathname) !== null) {
        setPath(paths[route]);
        break;
      }
    }

    return () => {
      setPath('');
    };
  }, [pathname, paths]);

  return path;
};
