import { RiArrowRightSLine, RiBookMarkedLine, RiSparkling2Line } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchLayouts } from '@/hooks/use-fetch-layouts';
import { formatDateSimple } from '@/utils/format-date';
import { buildRoute, ROUTES } from '@/utils/routes';
import { openInNewTab } from '@/utils/url';
import { IS_SELF_HOSTED, SELF_HOSTED_UPGRADE_REDIRECT_URL } from '../../config';
import { useTelemetry } from '../../hooks/use-telemetry';
import { TelemetryEvent } from '../../utils/telemetry';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';
import { LinkButton } from '../primitives/button-link';
import { CopyButton } from '../primitives/copy-button';
import { Separator } from '../primitives/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../primitives/table';
import { TimeDisplayHoverCard } from '../time-display-hover-card';
import TruncatedText from '../truncated-text';
import { EmptyLayoutsIllustration } from './empty-layouts-illustration';
import { useLayoutsUrlState } from './hooks/use-layouts-url-state';

export const LayoutsListUpgradeCta = () => {
  const track = useTelemetry();
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const { filterValues } = useLayoutsUrlState();

  const { data } = useFetchLayouts({
    limit: filterValues.limit,
    offset: filterValues.offset,
    orderBy: filterValues.orderBy,
    orderDirection: filterValues.orderDirection,
    query: filterValues.query,
  });

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 px-4">
      <div className="flex w-full max-w-[700px] flex-col items-center gap-6 text-center">
        <div className="flex w-full flex-col items-center gap-6">
          <EmptyLayoutsIllustration />
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-foreground-900 text-label-md">Need more layouts?</h2>
            <p className="text-text-soft text-label-xs max-w-[300px]">
              You’ve got a default layout to start fast. Create custom ones to scale across use cases — and plug
              anywhere — your emails (and teammates) will love you for it.
            </p>
          </div>
          <div className="flex w-full flex-col items-center justify-center px-5">
            <Separator variant="line-text" className="mb-3">
              YOUR LAYOUTS
            </Separator>
            <Table>
              <TableHeader className="w-full">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Identifier</TableHead>
                  <TableHead>Last updated</TableHead>
                  <TableHead className="px-0"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.layouts.map((layout) => (
                  <TableRow key={layout._id} className="group relative isolate">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <TruncatedText className="max-w-[32ch]">{layout.name}</TruncatedText>
                          {layout.isDefault && (
                            <Badge variant="lighter" className="text-xs" size="md">
                              DEFAULT
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 transition-opacity duration-200">
                        <TruncatedText className="text-foreground-400 font-code block text-xs">
                          {layout.layoutId}
                        </TruncatedText>
                        <CopyButton
                          className="z-10 flex size-2 p-0 px-1 opacity-0 group-hover:opacity-100"
                          valueToCopy={layout.layoutId}
                          size="2xs"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 transition-opacity duration-200">
                        <TimeDisplayHoverCard date={new Date(layout.updatedAt)}>
                          {formatDateSimple(layout.updatedAt)}
                        </TimeDisplayHoverCard>
                      </div>
                    </TableCell>
                    <TableCell className="px-0">
                      <Button
                        variant="secondary"
                        mode="ghost"
                        size="sm"
                        leadingIcon={RiArrowRightSLine}
                        onClick={() => {
                          navigate(
                            buildRoute(ROUTES.LAYOUTS_EDIT, {
                              environmentSlug: currentEnvironment?.slug ?? '',
                              layoutSlug: layout.slug,
                            })
                          );
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Button
              variant="primary"
              mode="gradient"
              size="xs"
              className="mb-3"
              onClick={() => {
                track(TelemetryEvent.UPGRADE_TO_TEAM_TIER_CLICK, {
                  source: 'layouts-page',
                });

                if (IS_SELF_HOSTED) {
                  openInNewTab(SELF_HOSTED_UPGRADE_REDIRECT_URL + '?utm_campaign=custom_layouts');
                } else {
                  navigate(ROUTES.SETTINGS_BILLING);
                }
              }}
              leadingIcon={RiSparkling2Line}
            >
              {IS_SELF_HOSTED ? 'Contact Sales' : 'Upgrade plan'}
            </Button>
            <Link
              to={'https://docs.novu.co/platform/workflow/layouts'}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Learn more about layouts"
            >
              <LinkButton size="sm" leadingIcon={RiBookMarkedLine}>
                <span className="underline">How does this help?</span>
              </LinkButton>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
