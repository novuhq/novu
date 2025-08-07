import { SeverityLevelEnum } from '@novu/shared';
import React from 'react';
import { capitalize } from '@/utils/string';
import { Badge, BadgeRootProps } from '../primitives/badge';
import { SelectItem } from '../primitives/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '../primitives/tooltip';

const TOOLTIP_CONTENT_LOOKUP: Record<SeverityLevelEnum, string> = {
  [SeverityLevelEnum.HIGH]:
    'Applies a red hue to the notification and the <Bell />.  Respects preferences. Use Critical Workflow to force delivery.',
  [SeverityLevelEnum.MEDIUM]:
    'Applies an orange hue to the notification and <Bell />. Respects preferences. Use Critical Workflow to force delivery.',
  [SeverityLevelEnum.LOW]: 'No hue by default, but styling can be customized via API. Respects user preferences.',
  [SeverityLevelEnum.NONE]: '',
};

const TOOLTIP_IMAGE_LOOKUP: Record<SeverityLevelEnum, React.ReactNode> = {
  [SeverityLevelEnum.HIGH]: <img src="/images/severity/high.webp" alt="high severity" />,
  [SeverityLevelEnum.MEDIUM]: <img src="/images/severity/medium.webp" alt="medium severity" />,
  [SeverityLevelEnum.LOW]: <img src="/images/severity/low.webp" alt="low severity" />,
  [SeverityLevelEnum.NONE]: <React.Fragment />,
};

const TOOLTIP_BADGE_CONTENT_LOOKUP: Record<SeverityLevelEnum, string> = {
  [SeverityLevelEnum.HIGH]: 'HIGH SEVERITY',
  [SeverityLevelEnum.MEDIUM]: 'MEDIUM SEVERITY',
  [SeverityLevelEnum.LOW]: 'LOW SEVERITY',
  [SeverityLevelEnum.NONE]: '',
};

const TOOLTIP_BADGE_COLOR_LOOKUP: Record<SeverityLevelEnum, BadgeRootProps['color']> = {
  [SeverityLevelEnum.HIGH]: 'red',
  [SeverityLevelEnum.MEDIUM]: 'orange',
  [SeverityLevelEnum.LOW]: 'yellow',
  [SeverityLevelEnum.NONE]: 'gray',
};

export const SeveritySelectItem = ({ severity }: { severity: SeverityLevelEnum }) => {
  if (severity === SeverityLevelEnum.NONE) {
    return (
      <SelectItem key={severity} value={severity}>
        {capitalize(severity)}
      </SelectItem>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        type="button"
        className="w-full"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <SelectItem key={severity} value={severity}>
          {capitalize(severity)}
        </SelectItem>
      </TooltipTrigger>
      <TooltipContent className={'bg-background max-w-48 rounded-lg shadow-md whitespace-pre-wrap p-1'} side="left">
        <div className="flex flex-col gap-1">
          <div className="border rounded-sm border-bg-soft">{TOOLTIP_IMAGE_LOOKUP[severity]}</div>
          <div className="flex flex-col gap-2 p-[2px] items-start">
            <Badge
              variant="lighter"
              color={TOOLTIP_BADGE_COLOR_LOOKUP[severity]}
              size="sm"
              className="py-[2px] text-[8px]"
            >
              {TOOLTIP_BADGE_CONTENT_LOOKUP[severity]}
            </Badge>
            <span className="text-text-sub text-2xs">{TOOLTIP_CONTENT_LOOKUP[severity]}</span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
