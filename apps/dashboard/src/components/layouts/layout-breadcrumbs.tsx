import React from 'react';
import { RiArrowLeftSLine, RiLayout5Line } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';

import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Badge } from '../primitives/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../primitives/breadcrumb';
import { CompactButton } from '../primitives/button-compact';
import TruncatedText from '../truncated-text';
import { useLayoutEditor } from './layout-editor-provider';

type BreadcrumbData = {
  label: string;
  href?: string;
};

export const LayoutBreadcrumbs = () => {
  const { layout } = useLayoutEditor();
  const { currentEnvironment } = useEnvironment();
  const navigate = useNavigate();

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
                        <RiLayout5Line className="size-4" />
                        <div className="flex max-w-[32ch]">
                          <TruncatedText>{label}</TruncatedText>
                        </div>
                        {layout?.isDefault && (
                          <Badge variant="lighter" className="text-xs" size="md">
                            DEFAULT
                          </Badge>
                        )}
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
