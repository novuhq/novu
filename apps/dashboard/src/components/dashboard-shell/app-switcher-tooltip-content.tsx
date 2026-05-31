import { RiArrowRightUpLine, RiCheckLine } from 'react-icons/ri';

type AppSwitcherTooltipContentProps = {
  label: string;
  subtitle: string;
  features: string[];
};

export function AppSwitcherTooltipContent({ label, subtitle, features }: AppSwitcherTooltipContentProps) {
  return (
    <div className="flex w-[305px] flex-col overflow-hidden">
      <div className="border-stroke-weak bg-bg-weak flex items-start gap-1.5 border-b px-3 py-2">
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="text-text-sub text-label-sm font-medium leading-5">{label}</p>
          <p className="text-text-soft text-label-xs font-medium leading-4">{subtitle}</p>
        </div>
        <RiArrowRightUpLine className="text-text-soft size-3.5 shrink-0" aria-hidden />
      </div>

      <div className="bg-bg-white flex flex-col px-3 py-2">
        {features.map((feature) => (
          <div key={feature} className="flex min-h-6 items-center gap-2">
            <RiCheckLine className="text-text-soft size-3 shrink-0" aria-hidden />
            <p className="text-text-sub text-label-xs font-medium leading-4">{feature}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
