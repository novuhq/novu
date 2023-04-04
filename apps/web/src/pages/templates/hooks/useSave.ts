import { useEffect, useState, useCallback, useRef } from 'react';
import { useDocumentVisibility, useTimeout } from '@mantine/hooks';
import { hideNotification, showNotification } from '@mantine/notifications';
import { useBasePath } from './useBasePath';
import { useLocation } from 'react-router-dom';
import { useTourStorage } from './useTourStorage';
import { useParams } from 'react-router-dom';

export const useSave = (isDirty: boolean, isValid: boolean, onSave: () => Promise<any>) => {
  const { pathname } = useLocation();
  const [previousPath, setPreviousPath] = useState(pathname);
  const tourStorage = useTourStorage();
  const { templateId = '' } = useParams<{ templateId: string }>();
  const isTouring = tourStorage.getCurrentTour('digest', templateId) > -1;
  const saveRef = useRef<any>();

  saveRef.current = () => {
    if (!isDirty || isTouring || !isValid) {
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

  const { start, clear } = useTimeout(() => {
    showNotification({
      message: 'We are saving your changes...',
      color: 'blue',
      id: 'savingOnNavigation',
      autoClose: false,
    });
  }, 3000);

  const documentVisibility = useDocumentVisibility();

  useEffect(() => {
    return () => {
      saveRef.current();
    };
  }, []);

  useEffect(() => {
    window.addEventListener('beforeunload', saveRef.current);

    return () => {
      window.removeEventListener('beforeunload', saveRef.current);
    };
  }, []);

  useEffect(() => {
    if (documentVisibility === 'visible') {
      return;
    }
    saveRef.current();
  }, [documentVisibility]);

  const basePath = useBasePath();

  useEffect(() => {
    if (previousPath === basePath && pathname.includes(basePath)) {
      setPreviousPath(pathname);

      return;
    }
    setPreviousPath(pathname);
    saveRef.current();
  }, [pathname]);
};
