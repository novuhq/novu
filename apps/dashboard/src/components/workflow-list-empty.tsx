import { PermissionsEnum } from '@novu/shared';
import { ComponentType, ReactNode, SVGProps } from 'react';
import {
  RiAddLine,
  RiArrowRightSLine,
  RiBookMarkedLine,
  RiBuildingLine,
  RiCellphoneFill,
  RiChatThreadFill,
  RiDiscussLine,
  RiRouteFill,
  RiTranslate2,
} from 'react-icons/ri';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LogoCircle } from '@/components/icons/logo-circle';
import { Mail3Fill } from '@/components/icons/mail-3-fill';
import { Notification5Fill } from '@/components/icons/notification-5-fill';
import { Sms } from '@/components/icons/sms';
import { VersionControlProd } from '@/components/icons/version-control-prod';
import { Button } from '@/components/primitives/button';
import { PermissionButton } from '@/components/primitives/permission-button';
import { useEnvironment } from '@/context/environment/hooks';
import { cn } from '@/utils/ui';
import { buildRoute, ROUTES } from '../utils/routes';
import { ListNoResults } from './list-no-results';
import { LinkButton } from './primitives/button-link';

interface WorkflowListEmptyProps {
  emptySearchResults?: boolean;
  onClearFilters?: () => void;
}

export const WorkflowListEmpty = ({ emptySearchResults, onClearFilters }: WorkflowListEmptyProps) => {
  const { currentEnvironment, switchEnvironment, oppositeEnvironment } = useEnvironment();

  if (emptySearchResults) {
    return (
      <ListNoResults
        title="No workflows found"
        description="We couldn't find any workflows that match your search criteria. Try adjusting your filters or create a new workflow."
        onClearFilters={onClearFilters}
      />
    );
  }

  const isProd = currentEnvironment?.name === 'Production';

  return isProd ? (
    <WorkflowListEmptyProd switchToDev={() => switchEnvironment(oppositeEnvironment?.slug)} />
  ) : (
    <WorkflowListEmptyDev />
  );
};

const WorkflowListEmptyProd = ({ switchToDev }: { switchToDev: () => void }) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-6">
    <VersionControlProd />
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="text-foreground-900 block font-medium">No workflows in production</span>
      <p className="text-foreground-400 max-w-[60ch] text-sm">
        To publish workflows to production, switch to Development and click 'Publish changes' , or use the Novu CLI for
        code-first workflows.
      </p>
    </div>

    <div className="flex items-center justify-center gap-6">
      <Link to={'https://docs.novu.co/platform/concepts/workflows'} target="_blank">
        <LinkButton trailingIcon={RiBookMarkedLine}>View docs</LinkButton>
      </Link>

      <Button variant="secondary" className="gap-2" onClick={switchToDev}>
        Switch to Development
      </Button>
    </div>
  </div>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 9 6.5" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M8.5 0.5L3 6L0.5 3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type EmptyStateTag = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  className?: string;
  rotate?: string;
};

const CHANNEL_TAGS: EmptyStateTag[] = [
  {
    label: 'In-app',
    icon: Notification5Fill,
    className: 'border-stable/10 bg-stable/10 text-stable/60',
    rotate: 'rotate-1',
  },
  {
    label: 'Email',
    icon: Mail3Fill,
    className: 'border-information/10 bg-information/10 text-information/60',
    rotate: '-rotate-1',
  },
  { label: 'Chat', icon: RiChatThreadFill, className: 'border-feature/10 bg-feature/10 text-feature/60' },
  {
    label: 'Push',
    icon: RiCellphoneFill,
    className: 'border-verified/10 bg-verified/10 text-verified/60',
    rotate: 'rotate-1',
  },
  {
    label: 'SMS',
    icon: Sms,
    className: 'border-error-base/10 bg-error-base/10 text-error-base/60',
    rotate: '-rotate-1',
  },
];

const SCALE_TAGS: EmptyStateTag[] = [
  { label: 'Translations', icon: RiTranslate2, rotate: 'rotate-1' },
  { label: 'Contexts', icon: RiBuildingLine, rotate: 'rotate-1' },
  { label: 'Topics', icon: RiDiscussLine, rotate: '-rotate-1' },
];

const ColoredTag = ({ label, icon: Icon, className, rotate }: EmptyStateTag) => (
  <span
    className={cn(
      'inline-flex items-center gap-0.5 rounded border px-1 py-0.5 text-label-xs leading-4',
      className,
      rotate
    )}
  >
    <Icon className="size-3.5 shrink-0" />
    {label}
  </span>
);

const NeutralTag = ({ label, icon: Icon, rotate }: EmptyStateTag) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded border border-stroke-soft bg-bg-weak px-1 py-0.5 text-label-xs leading-4 text-text-strong',
      rotate
    )}
  >
    <Icon className="size-3.5 shrink-0 text-text-sub" />
    {label}
  </span>
);

const EmptyListRow = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-6 items-center gap-1.5">
    <CheckIcon className="size-3 shrink-0 text-text-soft" />
    <div className="flex flex-wrap items-center gap-1 text-label-xs text-text-sub">{children}</div>
  </div>
);

const WorkflowsIllustration = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 136 125" {...props}>
      <rect width="135" height="45" x=".5" y="79.5" stroke="#cacfd8" strokeDasharray="5 3" rx="7.5" />
      <rect width="127" height="37" x="4.5" y="83.5" fill="#fff" rx="5.5" />
      <rect width="127" height="37" x="4.5" y="83.5" stroke="#f2f5f8" rx="5.5" />
      <path fill="#99a0ae" d="M67.625 101.625v-2.25h.75v2.25h2.25v.75h-2.25v2.25h-.75v-2.25h-2.25v-.75z" />
      <rect width="135" height="45" x=".5" y=".5" stroke="#dd2450" rx="7.5" />
      <rect width="128" height="38" x="4" y="4" fill="#fff" rx="6" />
      <rect width="127" height="37" x="4.5" y="4.5" stroke="#fb3748" strokeOpacity=".24" rx="5.5" />
      <path
        fill="#d82651"
        d="M63.2 24.802v-3.9a2.7 2.7 0 0 1 5.4 0v4.2a1.5 1.5 0 1 0 3 0V21.1a1.8 1.8 0 1 1 1.2 0v4.002a2.7 2.7 0 0 1-5.4 0v-4.2a1.5 1.5 0 1 0-3 0v3.9h1.8l-2.4 3-2.4-3z"
      />
      <path stroke="#cacfd8" strokeDasharray="5 3" strokeLinejoin="bevel" strokeWidth="1.33" d="M68 49.164v26.67" />
    </svg>
  );
};

const WorkflowListEmptyDev = () => {
  const navigate = useNavigate();
  const { environmentSlug } = useParams();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="flex flex-col gap-12">
        <WorkflowsIllustration className="w-34" />

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-text-strong text-label-md font-medium">
              Send transactional notifications with Workflows
            </p>
            <p className="text-text-soft max-w-[500px] text-label-sm font-medium">
              Trigger product events, orchestrate delivery across channels, and optionally connect notifications to your
              agents for follow-up conversations.
            </p>
          </div>

          <div className="flex flex-col gap-1 py-3">
            <EmptyListRow>
              <span>Send notifications across</span>
              {CHANNEL_TAGS.map((tag) => (
                <ColoredTag key={tag.label} {...tag} />
              ))}
              <span>with one API</span>
            </EmptyListRow>
            <EmptyListRow>
              <span>Orchestrate delivery with workflows (conditions, delays, digests, fallbacks)</span>
            </EmptyListRow>
            <EmptyListRow>
              <span>Scale notifications with</span>
              {SCALE_TAGS.map((tag) => (
                <NeutralTag key={tag.label} {...tag} />
              ))}
              <span>and a lot more.</span>
            </EmptyListRow>
            <EmptyListRow>
              <span>Embed</span>
              <span className="border-stroke-soft bg-bg-weak text-text-strong inline-flex items-center gap-0.5 rounded border px-1 py-0.5 text-label-xs leading-4">
                <LogoCircle className="size-4 shrink-0" />
                {'<Inbox />'}
              </span>
              <span>with preferences, notification history, and agent handoff</span>
            </EmptyListRow>
          </div>

          <div className="flex">
            <PermissionButton
              permission={PermissionsEnum.WORKFLOW_WRITE}
              variant="secondary"
              mode="gradient"
              size="xs"
              trailingIcon={RiArrowRightSLine}
              onClick={() => {
                navigate(buildRoute(ROUTES.WORKFLOWS_CREATE, { environmentSlug: environmentSlug || '' }));
              }}
            >
              Create your first workflow
            </PermissionButton>
          </div>
        </div>
      </div>
    </div>
  );
};
