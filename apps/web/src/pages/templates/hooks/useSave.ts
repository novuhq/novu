import { useEffect, useState } from 'react';
import { useDocumentVisibility, useTimeout } from '@mantine/hooks';
import { hideNotification, showNotification } from '@mantine/notifications';
import { useBasePath } from './useBasePath';
import { useLocation } from 'react-router-dom';

export const useSave = (isDirty: boolean, onSave: () => Promise<any>) => {
  const { pathname } = useLocation();
  const [previousPath, setPreviousPath] = useState(pathname);

  useEffect(() => {
    return () => {
      save();
    };
  }, []);

  const { start, clear } = useTimeout(() => {
    showNotification({
      message: 'We are saving your changes...',
      color: 'blue',
      id: 'savingOnNavigation',
      autoClose: false,
    });
  }, 3000);

  const documentVisibility = useDocumentVisibility();

  const save = () => {
    const isTouring = localStorage.getItem('tour-digest') !== null;

    if (!isDirty || isTouring) {
      return;
    }
    start();
    onSave()
      .then((value) => {
        clear();
        hideNotification('savingOnNavigation');

        return value;
      })
      .catch(() => {
        clear();
        hideNotification('savingOnNavigation');
      });
  };

  useEffect(() => {
    window.addEventListener('beforeunload', save);

    return () => {
      window.removeEventListener('beforeunload', save);
    };
  }, []);

  useEffect(() => {
    if (documentVisibility === 'visible') {
      return;
    }
    save();
  }, [documentVisibility]);

  const basePath = useBasePath();

  useEffect(() => {
    if (previousPath === basePath && pathname.includes(basePath)) {
      setPreviousPath(pathname);

      return;
    }
    setPreviousPath(pathname);
    save();
  }, [pathname]);
};
