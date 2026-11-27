import type { ReactNode } from 'react';
import { RiArrowRightSLine, RiArrowRightUpLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import type { AgentResponse, AgentSubscriberAccess } from '@/api/agents';
import { AgentInboxCardRow, AgentInboxCardRowInfoTitle } from '@/components/agents/agent-inbox-card-row';
import { getSubscriberAccess } from '@/components/agents/subscriber-access-copy';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';

const CREATE_SUBSCRIBER_DOCS_URL = 'https://docs.novu.co/api-reference/subscribers/create-a-subscriber';

const quietLinkClassName =
  'text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 text-label-xs font-medium leading-4 transition-colors';

const AGENT_WIDE_SETTING_HINT = 'This setting is agent-wide and managed under Agent behavior on the agent overview.';

type GuidanceChannel = 'email' | 'whatsapp';

type AccessGuidance = { tooltip: string; description: ReactNode };

type ChannelCopy = {
  title: string;
  access: Record<AgentSubscriberAccess, AccessGuidance>;
};

const RULE_TOOLTIP = `The agent replies only to known subscribers who match the access rule; everyone else gets a short denial reply. ${AGENT_WIDE_SETTING_HINT}`;

const CHANNEL_COPY: Record<GuidanceChannel, ChannelCopy> = {
  email: {
    title: 'Who can email this agent',
    access: {
      open: {
        tooltip: `When on for managed agents, anonymous senders are auto-created as lightweight subscribers from the sender address; custom-code agents forward with a null subscriber. Storing subscriber.email merges conversations into the existing subscriber. ${AGENT_WIDE_SETTING_HINT}`,
        description: (
          <>
            Anonymous senders can email this agent (managed: auto-create subscriber; custom code: null subscriber on the
            bridge). Store <code className="text-text-sub">subscriber.email</code> so conversations merge into the
            existing subscriber.
          </>
        ),
      },
      restricted: {
        tooltip: AGENT_WIDE_SETTING_HINT,
        description: (
          <>
            Only replies when <code className="text-text-sub">subscriber.email</code> matches the sender. Store that
            address on the subscriber.
          </>
        ),
      },
      rule: {
        tooltip: RULE_TOOLTIP,
        description: (
          <>
            Only replies when <code className="text-text-sub">subscriber.email</code> matches the sender and that
            subscriber matches the access rule.
          </>
        ),
      },
    },
  },
  whatsapp: {
    title: 'Who can message this agent',
    access: {
      open: {
        tooltip: `When on for managed agents, anonymous senders are auto-created as lightweight subscribers from the sender phone; custom-code agents forward with a null subscriber. Storing subscriber.phone merges conversations into the existing subscriber. ${AGENT_WIDE_SETTING_HINT}`,
        description: (
          <>
            Anonymous senders can message this agent (managed: auto-create subscriber; custom code: null subscriber on
            the bridge). Store <code className="text-text-sub">subscriber.phone</code> so conversations merge into the
            existing subscriber.
          </>
        ),
      },
      restricted: {
        tooltip: AGENT_WIDE_SETTING_HINT,
        description: (
          <>
            Only replies to subscribers with an E.164 phone on <code className="text-text-sub">subscriber.phone</code>.
            Store that number on the subscriber.
          </>
        ),
      },
      rule: {
        tooltip: RULE_TOOLTIP,
        description: (
          <>
            Only replies to subscribers with an E.164 phone on <code className="text-text-sub">subscriber.phone</code>{' '}
            who match the access rule.
          </>
        ),
      },
    },
  },
};

type SubscriberAccessGuidanceRowProps = {
  channel: GuidanceChannel;
  agent: AgentResponse;
};

export function SubscriberAccessGuidanceRow({ channel, agent }: SubscriberAccessGuidanceRowProps) {
  const { currentEnvironment } = useEnvironment();
  const copy = CHANNEL_COPY[channel];
  const guidance = copy.access[getSubscriberAccess(agent)];
  const subscribersPath = buildRoute(ROUTES.SUBSCRIBERS, {
    environmentSlug: currentEnvironment?.slug ?? '',
  });

  return (
    <AgentInboxCardRow
      title={<AgentInboxCardRowInfoTitle label={copy.title} infoTooltip={guidance.tooltip} />}
      description={guidance.description}
      divider={false}
      footer={
        <div className="flex items-center gap-3">
          <Link to={subscribersPath} className={quietLinkClassName}>
            <span>Add subscribers manually</span>
            <RiArrowRightSLine className="size-3.5" aria-hidden />
          </Link>
          <a href={CREATE_SUBSCRIBER_DOCS_URL} target="_blank" rel="noopener noreferrer" className={quietLinkClassName}>
            <span>Create via SDK</span>
            <RiArrowRightUpLine className="size-3.5" aria-hidden />
          </a>
        </div>
      }
    />
  );
}
