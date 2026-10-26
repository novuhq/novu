import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useId } from 'react';
import { RiInformation2Line } from 'react-icons/ri';
import { Label } from '@/components/primitives/label';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';

const COLLAPSE_TRANSITION = { duration: 0.2, ease: 'easeInOut' } as const;

export function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger type="button" className="inline-flex size-5 items-center justify-center text-text-soft">
        <RiInformation2Line className="size-[15px]" />
      </TooltipTrigger>
      <TooltipContent className="max-w-56">{content}</TooltipContent>
    </Tooltip>
  );
}

type SettingCardProps = {
  label: string;
  tooltip: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children?: ReactNode;
};

export function SettingCard({ label, tooltip, description, checked, onCheckedChange, children }: SettingCardProps) {
  const switchId = useId();

  return (
    <div className="flex flex-col rounded-8 bg-bg-weak p-1">
      <div className="flex items-start justify-between gap-5 px-1.5 py-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-px">
            <Label htmlFor={switchId}>{label}</Label>
            <InfoTooltip content={tooltip} />
          </div>
          <AnimatePresence initial={false}>
            {description && (
              <motion.div
                key="description"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={COLLAPSE_TRANSITION}
                className="overflow-hidden"
              >
                <p className="pt-0.5 text-label-xs text-text-soft">{description}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <Switch id={switchId} className="m-0.5" checked={checked} onCheckedChange={onCheckedChange} />
      </div>
      <AnimatePresence initial={false}>
        {children && (
          // Clipping is only needed while the height animates; left on, it would cut off the content's shadow.
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
            animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={COLLAPSE_TRANSITION}
          >
            <div className="pt-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
