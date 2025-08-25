import { ChannelTypeEnum } from '@novu/shared';
import { Card, CardContent } from '../primitives/card';
import { StepIndicator } from './shared';
import { Usecase } from './usecases-list.utils';

interface UsecaseSelectOnboardingProps {
  onHover: (id: ChannelTypeEnum | null) => void;
  onClick: (id: ChannelTypeEnum) => void;
  selectedUseCases: ChannelTypeEnum[];
  channelOptions: Usecase[];
}

export function UsecaseSelectOnboarding({
  onHover,
  onClick,
  selectedUseCases,
  channelOptions,
}: UsecaseSelectOnboardingProps) {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-8">
      <div className="flex w-full flex-col items-start gap-1">
        <div>
          <StepIndicator step={3} />
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium text-[#232529]">How do you plan to use Novu?</h2>
          <p className="text-xs text-[#717784]">
            You can route notifications across channels intelligently with Novu's powerful workflows, among the channels
            below.
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3" role="listbox" aria-label="Select use cases">
        {channelOptions.map((option, index) => {
          const isSelected = selectedUseCases.includes(option.id);

          return (
            <div
              key={index}
              role="option"
              aria-selected={isSelected}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick(option.id);
                }
              }}
              onFocus={() => onHover(option.id)}
              onBlur={() => onHover(null)}
            >
              <Card
                className={`rounded-xl ${isSelected ? 'shadow-sm' : ''} shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)] transition-all duration-300 hover:shadow-sm`}
                onMouseEnter={() => onHover(option.id)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onClick(option.id)}
              >
                <CardContent
                  className={`rounded-[11px] p-[2.5px] hover:cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-tr from-[hsla(310,100%,45%,1)] to-[hsla(20,100%,65%,1)]'
                      : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3.5 rounded-[9px] bg-[#ffffff] p-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center opacity-40`}
                      style={{ color: `hsl(var(--${option.color}))` }}
                    >
                      <option.icon className={`h-8 w-8 fill-${option.color} stroke-${option.color}`} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-sm font-medium text-[#232529]">{option.title}</h3>
                      <p className="text-xs text-[#717784]">{option.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
