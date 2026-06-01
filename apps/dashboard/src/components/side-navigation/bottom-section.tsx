import { RiChat1Line, RiUserAddLine } from 'react-icons/ri';
import { usePlainChat } from '@/hooks/use-plain-chat';
import { useTelemetry } from '@/hooks/use-telemetry';
import { cn } from '@/utils/ui';
import { TelemetryEvent } from '@/utils/telemetry';
import { IS_SELF_HOSTED } from '../../config';
import { ROUTES } from '../../utils/routes';
import { NavigationGroup } from './navigation-group';
import { NavigationLink } from './navigation-link';

// TODO: restore FreeTrialCard / UsageCard once Connect has its own billing flow.
export function BottomSection() {
  const { showPlainLiveChat, isLiveChatVisible } = usePlainChat();
  const track = useTelemetry();

  if (IS_SELF_HOSTED) {
    return null;
  }

  function handleShareFeedback() {
    track(TelemetryEvent.SHARE_FEEDBACK_LINK_CLICKED);
    showPlainLiveChat();
  }

  return (
    <div className="relative mt-auto gap-8 pt-4">
      <NavigationGroup>
        {isLiveChatVisible && (
          <button
            type="button"
            onClick={handleShareFeedback}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm',
              'text-foreground-600/95 transition duration-300 ease-out hover:bg-accent',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            <RiChat1Line className="size-4" />
            <span>Share feedback</span>
          </button>
        )}
        <NavigationLink to={ROUTES.SETTINGS_TEAM}>
          <RiUserAddLine className="size-4" />
          <span>Invite teammates</span>
        </NavigationLink>
      </NavigationGroup>
    </div>
  );
}
