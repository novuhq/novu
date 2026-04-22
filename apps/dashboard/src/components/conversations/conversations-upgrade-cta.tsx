import { RiBookMarkedLine, RiChat3Line, RiSparkling2Line } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { LinkButton } from '@/components/primitives/button-link';
import { IS_SELF_HOSTED, SELF_HOSTED_UPGRADE_REDIRECT_URL } from '@/config';
import { useTelemetry } from '@/hooks/use-telemetry';
import { ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { cn } from '@/utils/ui';
import { openInNewTab } from '@/utils/url';
import { Button } from '../primitives/button';

type ConversationsUpgradeCtaProps = {
  source: string;
  variant?: 'default' | 'compact';
  className?: string;
};

const COPY = {
  default: {
    title: 'Bring your agents to life with Conversations',
    description:
      'Unlock real-time chat across Slack, WhatsApp, and more. See every message your agent sends and receives, right here.',
  },
  compact: {
    title: 'Conversations is part of Novu Enterprise',
    description:
      'Upgrade to see every message your agent sends and receives across Slack, WhatsApp, and more — live, in one place.',
  },
} as const;

export function ConversationsUpgradeCta({ source, variant = 'default', className }: ConversationsUpgradeCtaProps) {
  const track = useTelemetry();
  const navigate = useNavigate();
  const copy = COPY[variant];

  const handleUpgradeClick = () => {
    track(TelemetryEvent.UPGRADE_TO_TEAM_TIER_CLICK, { source });

    if (IS_SELF_HOSTED) {
      openInNewTab(`${SELF_HOSTED_UPGRADE_REDIRECT_URL}?utm_campaign=conversations`);
    } else {
      navigate(ROUTES.SETTINGS_BILLING);
    }
  };

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center gap-6 px-4 text-center',
        variant === 'compact' && 'gap-4',
        className
      )}
    >
      <ConversationsUpgradeIllustration variant={variant} />

      <div className="flex flex-col items-center gap-2">
        <span
          className={cn('text-text-sub block font-medium', variant === 'compact' ? 'text-label-sm' : 'text-label-md')}
        >
          {copy.title}
        </span>
        <p
          className={cn(
            'text-text-soft max-w-[48ch]',
            variant === 'compact' ? 'text-label-xs leading-4' : 'text-paragraph-sm'
          )}
        >
          {copy.description}
        </p>
      </div>

      <div className="flex flex-col items-center gap-1">
        <Button
          variant="primary"
          mode="gradient"
          size="xs"
          className={variant === 'compact' ? 'mb-1.5' : 'mb-3.5'}
          onClick={handleUpgradeClick}
          leadingIcon={RiSparkling2Line}
        >
          {IS_SELF_HOSTED ? 'Contact Sales' : 'Upgrade now'}
        </Button>
        <LinkButton asChild size="sm" leadingIcon={RiBookMarkedLine}>
          <a href="https://docs.novu.co/agents/overview" target="_blank" rel="noreferrer noopener">
            How does this help?
          </a>
        </LinkButton>
      </div>
    </div>
  );
}

function ConversationsUpgradeIllustration({ variant }: { variant: 'default' | 'compact' }) {
  const sizeClass = variant === 'compact' ? 'size-10' : 'size-12';
  const iconClass = variant === 'compact' ? 'size-5' : 'size-6';

  return (
    <div className={cn('flex items-center justify-center rounded-xl border border-neutral-200 bg-white', sizeClass)}>
      <RiChat3Line className={cn('text-neutral-400', iconClass)} />
    </div>
  );
}
