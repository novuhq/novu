import { useState } from 'react';
import { RiRefreshLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { IS_CLOUD } from '@/config';
import { DataSourcesEarlyAccessDialog } from './data-sources-early-access-dialog';

const DATA_SOURCES_DOCS_URL = 'https://docs.novu.co/platform/concepts/subscribers';
const TILE_SHADOW = 'shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_8px_16px_0_rgba(0,0,0,0.08)]';

/** Data sources tab before the feature ships: what it does, plus a way to ask for early access. */
export function DataSourcesEmptyState() {
  const [isRequestOpen, setIsRequestOpen] = useState(false);

  return (
    <div className="flex flex-col items-center px-4 pt-[60px] antialiased [font-feature-settings:'cv09'_1,'ss11'_1,'calt'_0,'liga'_0]">
      <DataSourcesHero />

      <div className="flex flex-col items-center gap-1.5 pt-5 text-center">
        <h2 className="text-text-strong text-[18px] font-medium leading-6 tracking-[-0.27px]">
          Bring customer data into your workflows
        </h2>
        <p className="text-text-soft text-[14px] leading-5 tracking-[-0.084px]">
          Sync subscriber traits and trigger workflows from the tools your team already uses.
        </p>
        <div className="flex items-start gap-2 pt-3.5">
          {/* Requests go to the Novu team, so only Cloud can send them. */}
          {IS_CLOUD && (
            <Button variant="primary" mode="gradient" size="xs" onClick={() => setIsRequestOpen(true)}>
              Request early access
            </Button>
          )}
          <Button
            variant="secondary"
            mode="outline"
            size="xs"
            onClick={() => window.open(DATA_SOURCES_DOCS_URL, '_blank', 'noopener,noreferrer')}
          >
            Read the docs
          </Button>
        </div>
      </div>

      {IS_CLOUD && <DataSourcesEarlyAccessDialog open={isRequestOpen} onOpenChange={setIsRequestOpen} />}
    </div>
  );
}

/** A data source tile syncing into Novu over a dashed line, on a dot grid that fades out at the edges. */
function DataSourcesHero() {
  return (
    <div
      className="bg-bg-weak relative h-32 w-full max-w-[520px] shrink-0 overflow-hidden rounded-2xl"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] bg-[size:12px_12px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--bg-weak))_100%)]" />

      <div className="absolute left-1/2 top-1/2 h-12 w-60 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute left-[60px] top-[23px] h-0 w-[120px] border-t-[1.5px] border-dashed border-[#a1a1aa]" />
        <span className="bg-bg-white text-text-sub absolute left-[108px] top-3 flex size-6 items-center justify-center rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.08)]">
          <RiRefreshLine className="size-3.5" />
        </span>
        <span
          className={`absolute left-0 top-0 flex size-12 items-center justify-center rounded-xl bg-white ${TILE_SHADOW}`}
        >
          <img src="/images/data-sources/segment.png" alt="" className="size-[29px]" />
        </span>
        <span
          className={`absolute left-[192px] top-0 flex size-12 items-center justify-center rounded-[10px] bg-white ${TILE_SHADOW}`}
        >
          <img src="/images/data-sources/novu.svg" alt="" className="size-6" />
        </span>
      </div>
    </div>
  );
}
