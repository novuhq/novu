import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { TranslationDrawer } from '@/components/translations/translation-drawer/translation-drawer';
import { useEnvironment } from '@/context/environment/hooks';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';
import { LocalizationResourceEnum } from '@/types/translations';
import { buildRoute, ROUTES } from '@/utils/routes';

export const EditTranslationPage = () => {
  const { resourceType, resourceId, locale } = useParams<{
    resourceType: LocalizationResourceEnum;
    resourceId: string;
    locale: string;
  }>();
  const [open, setOpen] = useState(true);
  const [currentLocale, setCurrentLocale] = useState(locale);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentEnvironment } = useEnvironment();

  // Sync currentLocale with URL param when component mounts or URL changes
  useEffect(() => {
    setCurrentLocale(locale);
  }, [locale]);

  const navigateToTranslationsPage = () => {
    if (currentEnvironment?.slug) {
      const currentSearchParams = searchParams.toString();
      navigate(
        buildRoute(ROUTES.TRANSLATIONS, { environmentSlug: currentEnvironment.slug }) +
          (currentSearchParams ? '?' + currentSearchParams : '')
      );
    }
  };

  const handleLocaleChange = (newLocale: string) => {
    setCurrentLocale(newLocale);

    if (currentEnvironment?.slug && resourceType && resourceId) {
      // Update URL without triggering navigation/re-render
      const newUrl = buildRoute(ROUTES.TRANSLATIONS_EDIT, {
        environmentSlug: currentEnvironment.slug,
        resourceType,
        resourceId,
        locale: newLocale,
      });
      window.history.replaceState(null, '', newUrl);
    }
  };

  const { ref: unmountRef } = useOnElementUnmount({
    callback: navigateToTranslationsPage,
    condition: !open,
  });

  if (!resourceType || !resourceId || !locale) {
    return null;
  }

  return (
    <TranslationDrawer
      ref={unmountRef}
      isOpen={open}
      onOpenChange={setOpen}
      resourceType={resourceType}
      resourceId={resourceId}
      initialLocale={currentLocale}
      onLocaleChange={handleLocaleChange}
    />
  );
};
