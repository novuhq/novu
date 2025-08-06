import { RiLayout5Line, RiRouteFill, RiTranslate2 } from 'react-icons/ri';
import type { IResourceDiffResult } from '@/api/environments';
import { formatDateSimple } from '@/utils/format-date';

type ResourceRowProps = {
  resource: IResourceDiffResult;
};

export function ResourceRow({ resource }: ResourceRowProps) {
  const getResourceIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'workflow':
        return RiRouteFill;
      case 'layout':
        return RiLayout5Line;
      case 'translation':
        return RiTranslate2;
      default:
        return RiRouteFill;
    }
  };

  const getResourceIconColor = (resourceType: string) => {
    switch (resourceType) {
      case 'workflow':
        return 'text-feature';
      case 'layout':
        return 'text-feature';
      case 'translation':
        return 'text-feature';
      default:
        return 'text-feature';
    }
  };

  const getResourceDisplayName = (resource: IResourceDiffResult) => {
    return resource.targetResource?.name || resource.sourceResource?.name || 'Unnamed Resource';
  };

  const getResourceIdentifier = (resource: IResourceDiffResult) => {
    const name = getResourceDisplayName(resource);
    return name.toLowerCase().replace(/\s+/g, '-');
  };

  const getResourceUpdatedBy = (resource: IResourceDiffResult) => {
    const sourceUpdatedBy = resource.sourceResource?.updatedBy;
    const targetUpdatedBy = resource.targetResource?.updatedBy;
    return sourceUpdatedBy || targetUpdatedBy;
  };

  const getResourceUpdatedAt = (resource: IResourceDiffResult) => {
    const sourceUpdatedAt = resource.sourceResource?.updatedAt;
    const targetUpdatedAt = resource.targetResource?.updatedAt;
    return sourceUpdatedAt || targetUpdatedAt;
  };

  const IconComponent = getResourceIcon(resource.resourceType);
  const iconColor = getResourceIconColor(resource.resourceType);
  const displayName = getResourceDisplayName(resource);
  const identifier = getResourceIdentifier(resource);
  const updatedBy = getResourceUpdatedBy(resource);
  const updatedAt = getResourceUpdatedAt(resource);

  return (
    <div className="border-stroke-soft-100 flex items-center gap-1 border-b p-1 last:border-b-0">
      <div className="flex size-5 items-center justify-center">
        <IconComponent className={`size-3.5 ${iconColor}`} />
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
