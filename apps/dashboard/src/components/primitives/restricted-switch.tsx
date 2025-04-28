import { Switch } from './switch';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { ROUTES } from '../../utils/routes';

interface RestrictedSwitchProps {
  isFreePlan: boolean;
  IS_SELF_HOSTED: boolean;
  checked: boolean | undefined;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function RestrictedSwitch({
  isFreePlan,
  IS_SELF_HOSTED,
  checked,
  onChange,
  disabled = false,
}: RestrictedSwitchProps) {
  const isRestricted = IS_SELF_HOSTED || isFreePlan;
  const tooltipText = IS_SELF_HOSTED
    ? 'Remove Novu branding is only available on cloud plans.'
    : 'Remove Novu branding from your inbox by upgrading to our paid plans.';

  if (!isRestricted) {
    return <Switch checked={checked ?? false} onCheckedChange={onChange} disabled={isRestricted || disabled} />;
  }

  return (
    <div className="group relative isolate cursor-not-allowed">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="z-200 absolute inset-0" />
        </TooltipTrigger>
        <TooltipContent>
          <>
            <p>{tooltipText}</p>
            {IS_SELF_HOSTED ? (
              <a
                href="https://docs.novu.co/platform/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                view migration guide
              </a>
            ) : (
              <a
                href={ROUTES.SETTINGS_BILLING + '?utm_source=remove_branding_prompt'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                view migration guide
              </a>
            )}
          </>
        </TooltipContent>
      </Tooltip>
      <div>
        <Switch checked={checked ?? false} onCheckedChange={onChange} disabled={isRestricted || disabled} />
      </div>
    </div>
  );
}
