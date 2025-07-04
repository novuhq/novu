import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RiArrowLeftSLine } from 'react-icons/ri';

import { useEnvironment } from '@/context/environment/hooks';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../primitives/breadcrumb';
import { buildRoute, ROUTES } from '@/utils/routes';
import { CompactButton } from '../primitives/button-compact';
import { LayoutIcon } from '../icons/layout';
import TruncatedText from '../truncated-text';
import { useFetchLayout } from '@/hooks/use-fetch-layout';

type BreadcrumbData = {
  label: string;
  href?: string;
};

export const LayoutBreadcrumbs = () => {
  const { layoutSlug = '' } = useParams<{
    layoutSlug?: string;
  }>();
  const { currentEnvironment } = useEnvironment();
  const navigate = useNavigate();
  const { layout } = useFetchLayout({ layoutSlug });

  const layoutsRoute = buildRoute(ROUTES.LAYOUTS, {
    environmentSlug: currentEnvironment?.slug ?? '',
  });

  const breadcrumbs: BreadcrumbData[] = [
    {
      label: currentEnvironment?.name || '',
      href: layoutsRoute,
    },
    {
      label: 'Email Layouts',
      href: layoutsRoute,
    },
    {
      label: layout?.name ?? '',
    },
  ];

  const handleBackNavigation = () => navigate(layoutsRoute);

  return (
    <div className="flex items-center overflow-hidden">
      <CompactButton
        size="lg"
        className="mr-1"
        variant="ghost"
        icon={RiArrowLeftSLine}
        onClick={handleBackNavigation}
      />
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map(({ label, href }, index) => {
            const isLastItem = index === breadcrumbs.length - 1;

            return (
              <React.Fragment key={`${href}_${label}`}>
                <BreadcrumbItem className="flex items-center gap-1">
                  {isLastItem ? (
                    <BreadcrumbPage className="flex items-center gap-1">
                      <div className="flex items-center gap-1">
                        <LayoutIcon className="size-3.5" />
                        <div className="flex max-w-[32ch]">
                          <TruncatedText>{label}</TruncatedText>
                        </div>
                      </div>
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink to={href ?? ''}>
                      <div className="flex max-w-[32ch]">
                        <TruncatedText>{label}</TruncatedText>
                      </div>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLastItem && <BreadcrumbSeparator />}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};
