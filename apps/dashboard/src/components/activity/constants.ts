import { JobStatusEnum } from '@novu/shared';
import { IconType } from 'react-icons/lib';
import { RiCheckboxCircleFill, RiErrorWarningFill, RiForbidFill, RiLoader3Line, RiLoader4Fill } from 'react-icons/ri';
import { StatusBadgeProps } from '../primitives/status-badge';

export const STATUS_STYLES = {
  completed: 'border-[#99e3bb] bg-[#e9faf0] text-[#99e3bb]',
  failed: 'border-[#ec98a0] bg-[#ffebed] text-[#ec98a0]',
  delayed: 'border-[#F5A524] bg-[#FEF4E6] text-[#F8C16E]',
  default: 'border-[#e0e4ea] bg-[#fbfbfb] text-[#e0e4ea]',
} as const;

export const JOB_STATUS_CONFIG: Record<
  JobStatusEnum,
  {
    variant: StatusBadgeProps['status'];
    color: string;
    icon: IconType;
    label: string;
    animationClass?: string;
  }
> = {
  [JobStatusEnum.COMPLETED]: {
    variant: 'completed' as const,
    color: 'success',
    icon: RiCheckboxCircleFill,
    label: 'SUCCESS',
  },
  [JobStatusEnum.FAILED]: {
    variant: 'failed' as const,
    color: 'destructive',
    icon: RiErrorWarningFill,
    label: `ERROR`,
  },
  [JobStatusEnum.MERGED]: {
    variant: 'disabled' as const,
    color: 'success',
    icon: RiForbidFill,
    label: 'MERGED',
  },
  [JobStatusEnum.PENDING]: {
    variant: 'pending' as const,
    icon: RiLoader3Line,
    color: 'neutral-300',
    label: 'PENDING',
  },
  [JobStatusEnum.CANCELED]: {
    variant: 'disabled' as const,
    icon: RiLoader3Line,
    color: 'neutral-300',
    label: 'CANCELED',
  },
  [JobStatusEnum.SKIPPED]: {
    variant: 'disabled' as const,
    icon: RiLoader3Line,
    color: 'neutral-300',
    label: 'SKIPPED',
  },
  [JobStatusEnum.RUNNING]: {
    variant: 'pending' as const,
    icon: RiLoader3Line,
    color: 'warning',
    label: 'RUNNING',
  },
  [JobStatusEnum.DELAYED]: {
    variant: 'pending' as const,
    icon: RiLoader4Fill,
    label: 'DELAYED',
    color: 'warning',
    animationClass: 'animate-spin-slow',
  },
  [JobStatusEnum.QUEUED]: {
    variant: 'pending' as const,
    icon: RiLoader3Line,
    color: 'warning',
    label: 'QUEUED',
  },
};
