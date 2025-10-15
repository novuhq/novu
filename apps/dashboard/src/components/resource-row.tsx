import { RiLayout5Line, RiRouteFill, RiTranslate2 } from 'react-icons/ri';
import type { IResourceDiffResult } from '@/api/environments';
import { formatDateSimple } from '@/utils/format-date';

type ResourceRowProps = {
  resource: IResourceDiffResult;
};

const RESOURCE_ICONS = {
  workflow: RiRouteFill,
  layout: RiLayout5Line,
  translation: RiTranslate2,
} as const;
const DEFAULT_RESOURCE_ICON = RiRouteFill;
const DEFAULT_RESOURCE_NAME = 'Unnamed Resource';
const DEFAULT_ICON_COLOR = 'text-feature';

export function ResourceRow({ resource }: ResourceRowProps) {
  const IconComponent =
    RESOURCE_ICONS[resource.resourceType as keyof typeof RESOURCE_ICONS] ?? DEFAULT_RESOURCE_ICON;
  const displayName =
    resource.targetResource?.name ?? resource.sourceResource?.name ?? DEFAULT_RESOURCE_NAME;
  const identifier = displayName.toLowerCase().replace(/\s+/g, '-');
  const updatedBy = resource.sourceResource?.updatedBy ?? resource.targetResource?.updatedBy;
  const updatedAt = resource.sourceResource?.updatedAt ?? resource.targetResource?.updatedAt;

  return (
    <div className="border-stroke-soft-100 flex items-center gap-1 border-b p-1 last:border-b-0">
      <div className="flex size-5 items-center justify-center">
        <IconComponent className={`size-3.5 ${DEFAULT_ICON_COLOR}`} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-label-xs text-text-strong truncate">{displayName}</div>
        <div className="text-paragraph-2xs text-text-soft font-mono tracking-tight">{identifier}</div>
      </div>

      <div className="text-right">
        <div className="text-paragraph-2xs text-text-soft font-medium">
          {updatedBy?.firstName && updatedBy?.lastName ? 'Last updated by' : 'Last updated'}
        </div>
        <div className="flex items-center gap-1">
          {updatedBy?.firstName && updatedBy?.lastName && (
            <>
              <span className="text-paragraph-2xs text-text-sub font-medium capitalize">{updatedBy?.firstName}</span>
              <div className="size-0.5 rounded-full bg-neutral-400" />
            </>
          )}
          <span className="text-paragraph-2xs text-text-sub font-medium">
            {updatedAt ? formatDateSimple(updatedAt) : 'Unknown'}
          </span>
        </div>
      </div>
    </div>
  );
}
