import { useId } from 'react';
import { RiCheckLine } from 'react-icons/ri';
import { AwsIcon } from '@/components/icons/aws';
import { ClaudeIcon } from '@/components/icons/claude';

function SubscriberAvatar() {
  const clipId = useId();

  return (
    <svg className="size-4 shrink-0" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0 8C0 3.58172 3.58172 0 8 0C12.4183 0 16 3.58172 16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8Z"
        fill="#E1E4EA"
      />
      <g clipPath={`url(#${clipId})`}>
        <ellipse cx="8" cy="15.6" rx="6.4" ry="4.8" fill="white" fillOpacity="0.72" />
        <circle opacity="0.9" cx="8" cy="6.4" r="3.2" fill="white" />
      </g>
      <defs>
        <clipPath id={clipId}>
          <rect width="16" height="16" rx="8" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}

function Pill({ icon, children, rotate = 0 }: { icon?: React.ReactNode; children: React.ReactNode; rotate?: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded border border-[#e8ebef] bg-[#f8f9fa] px-1 py-0.5 align-middle text-xs font-medium text-[#3a3f47]"
      style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      {icon}
      {children}
    </span>
  );
}

/** Bullets shown under the agent illustration on the Conversations onboarding screens. */
export function AgentPreviewFeatureList() {
  return (
    <div className="flex flex-col gap-1 px-4 text-xs font-medium text-[#525866]">
      <div className="flex min-h-6 items-center gap-1.5">
        <RiCheckLine className="size-3 shrink-0 text-[#b0b8c4]" />
        <span className="flex flex-wrap items-center gap-1">
          Cross-channel conversations across
          <Pill icon={<img src="/images/providers/light/square/slack.svg" alt="" className="size-4" />} rotate={-1}>
            Slack
          </Pill>
          <Pill
            icon={<img src="/images/providers/light/square/whatsapp-business.svg" alt="" className="size-4" />}
            rotate={1}
          >
            Whatsapp
          </Pill>
          and a lot more.
        </span>
      </div>
      <div className="flex min-h-6 items-center gap-1.5">
        <RiCheckLine className="size-3 shrink-0 text-[#b0b8c4]" />
        <span className="flex flex-wrap items-center gap-1">
          Bring agents from
          <Pill icon={<ClaudeIcon className="size-4" />} rotate={-1}>
            Claude
          </Pill>
          <Pill icon={<AwsIcon className="size-4" />} rotate={-1}>
            Bedrock
          </Pill>
          or custom agents via agent() handler.
        </span>
      </div>
      <div className="flex min-h-6 items-center gap-1.5">
        <RiCheckLine className="size-3 shrink-0 text-[#b0b8c4]" />
        <span className="flex flex-wrap items-center gap-1">
          Provider identities resolved →
          <Pill icon={<SubscriberAvatar />} rotate={1}>
            Subscriber
          </Pill>
          mapping.
        </span>
      </div>
    </div>
  );
}
