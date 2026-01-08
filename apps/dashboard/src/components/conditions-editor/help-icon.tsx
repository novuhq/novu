import { RiErrorWarningLine, RiInformation2Line } from 'react-icons/ri';
import type { HelpTextInfo } from '@/components/conditions-editor/field-type-editors';
import { Badge } from '@/components/primitives/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/primitives/hover-card';

type HelpIconProps = {
  hasError: boolean;
  errorMessage?: string;
  helpText?: HelpTextInfo | null;
  contentWidth?: string;
};

export function HelpIcon({ hasError, errorMessage, helpText, contentWidth = 'w-[240px]' }: HelpIconProps) {
  if (!helpText && !hasError) return null;

  const IconComponent = hasError ? RiErrorWarningLine : RiInformation2Line;
  const iconColor = hasError ? 'text-destructive' : 'text-foreground-400 hover:text-foreground-600';

  return (
    <HoverCard openDelay={100}>
      <HoverCardTrigger asChild>
        <div className="mr-1 flex cursor-help items-center justify-center" role="button" tabIndex={-1}>
          <IconComponent className={`size-4 ${iconColor}`} />
        </div>
      </HoverCardTrigger>
      <HoverCardContent className={`${contentWidth} p-2`}>
        <div>
          {/* Error content (shown above info when present) */}
          {hasError && errorMessage && (
            <>
              <div className="text-label-xs mb-1 font-medium text-red-600">{errorMessage}</div>
              {helpText && <div className="mb-1.5 border-t border-neutral-200" />}
            </>
          )}

          {helpText && (
            <>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div>
                    <Badge color="yellow" size="sm" variant="lighter" className="mr-1">
                      💡 TIP
                    </Badge>
                  </div>
                  <div className="text-label-xs mt-1 text-gray-600">{helpText.description}</div>
                </div>
              </div>
              <div className="mt-1 space-y-1 pl-1.5">
                {helpText.examples.map((example, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <div className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-400" />
                    <div className="text-label-xs text-gray-600">{example}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
