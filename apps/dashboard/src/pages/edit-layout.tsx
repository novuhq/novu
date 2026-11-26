import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FullPageLayout } from '@/components/full-page-layout';
import { LayoutBreadcrumbs } from '@/components/layouts/layout-breadcrumbs';
import { LayoutEditor } from '@/components/layouts/layout-editor';
import { LayoutEditorProvider } from '@/components/layouts/layout-editor-provider';
import { PageMeta } from '@/components/page-meta';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchLayout } from '@/hooks/use-fetch-layout';
import { buildRoute, ROUTES } from '@/utils/routes';
import { LayoutEditorSkeleton } from '../components/layouts/layout-editor-skeleton';

type SlugOrigin = { slug: string; environmentId: string; layoutId: string };

export const EditLayoutPage = () => {
  const { layoutSlug = '' } = useParams<{
    layoutSlug?: string;
  }>();
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const environmentId = currentEnvironment?._id;
  const environmentSlug = currentEnvironment?.slug;

  /*
   * The slug carries the layout's internal id, which is different in every environment.
   * After an environment switch the URL still holds the previous environment's slug,
   * so the layout is looked up by its identifier, which is the same everywhere.
   */
  const [slugOrigin, setSlugOrigin] = useState<SlugOrigin>();
  const isSlugFromOtherEnvironment =
    !!slugOrigin && !!environmentId && slugOrigin.slug === layoutSlug && slugOrigin.environmentId !== environmentId;

  const { layout, isPending, error } = useFetchLayout({
    layoutSlug: isSlugFromOtherEnvironment ? slugOrigin.layoutId : layoutSlug,
  });

  useEffect(() => {
    if (!layout || !environmentId || !environmentSlug) {
      return;
    }

    if (isSlugFromOtherEnvironment) {
      navigate(buildRoute(ROUTES.LAYOUTS_EDIT, { environmentSlug, layoutSlug: layout.slug }), { replace: true });

      return;
    }

    setSlugOrigin((current) =>
      current?.slug === layoutSlug && current.environmentId === environmentId
        ? current
        : { slug: layoutSlug, environmentId, layoutId: layout.layoutId }
    );
  }, [layout, layoutSlug, environmentId, environmentSlug, isSlugFromOtherEnvironment, navigate]);

  useEffect(() => {
    if (error && environmentSlug) {
      navigate(buildRoute(ROUTES.LAYOUTS, { environmentSlug }), { replace: true });
    }
  }, [error, environmentSlug, navigate]);

  if (!layout || isSlugFromOtherEnvironment) {
    return (
      <>
        <PageMeta title={`Edit Layout`} />
        <FullPageLayout headerStartItems={<LayoutBreadcrumbs />}>
          <LayoutEditorSkeleton />
        </FullPageLayout>
      </>
    );
  }

  return (
    <>
      <PageMeta title={`Edit ${layout?.name} Layout`} />
      <FullPageLayout headerStartItems={<LayoutBreadcrumbs layout={layout} />}>
        <LayoutEditorProvider layout={layout} layoutSlug={layoutSlug} isPending={isPending}>
          <LayoutEditor />
        </LayoutEditorProvider>
      </FullPageLayout>
    </>
  );
};
