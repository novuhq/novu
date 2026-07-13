import { RiArrowRightSLine, RiArrowRightUpLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import type { AgentResponse } from '@/api/agents';
import { AgentInboxCardRow, AgentInboxCardRowInfoTitle } from '@/components/agents/agent-inbox-card-row';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';

const CREATE_SUBSCRIBER_DOCS_URL = 'https://docs.novu.co/api-reference/subscribers/create-a-subscriber';

const quietLinkClassName =
  'text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 text-label-xs font-medium leading-4 transition-colors';

const AGENT_WIDE_SETTING_HINT =
  'This setting is agent-wide and managed via "Accept messages from anyone" under Agent behavior on the agent overview.';

type SubscriberAccessGuidanceRowProps = {
  channel: 'email' | 'whatsapp';
  agent: AgentResponse;
};

function getTitle(channel: 'email' | 'whatsapp'): string {
  if (channel === 'email') {
    return 'Who can email this agent';
  }

  return 'Who can message this agent';
}

function getInfoTooltip(channel: 'email' | 'whatsapp', isOpen: boolean): string {
  if (channel === 'email') {
    if (isOpen) {
      return `${AGENT_WIDE_SETTING_HINT} When on, unknown senders are auto-created as lightweight subscribers from the sender address.`;
    }

    return `${AGENT_WIDE_SETTING_HINT} When off, the agent only replies when subscriber.email matches the sender.`;
  }

  if (isOpen) {
    return `${AGENT_WIDE_SETTING_HINT} When on, unknown senders are auto-created as lightweight subscribers from the sender phone.`;
  }

  return `${AGENT_WIDE_SETTING_HINT} When off, the agent only replies to subscribers with an E.164 phone on subscriber.phone.`;
}

function getDescription(channel: 'email' | 'whatsapp', isOpen: boolean) {
  if (channel === 'email') {
    if (isOpen) {
      return (
        <>
          Anyone can email this agent; unknown senders are auto-created as lightweight subscribers. As a best practice,
          still store <code className="text-text-sub">subscriber.email</code> so conversations merge into the existing
          subscriber. {AGENT_WIDE_SETTING_HINT}
        </>
      );
    }

    return (
      <>
        This agent only replies to subscribers whose <code className="text-text-sub">subscriber.email</code> matches the
        sender. Store that address on the subscriber. {AGENT_WIDE_SETTING_HINT}
      </>
    );
  }

  if (isOpen) {
    return (
      <>
        Anyone can message this agent; unknown senders are auto-created as lightweight subscribers. As a best practice,
        still store <code className="text-text-sub">subscriber.phone</code> so conversations merge into the existing
        subscriber. {AGENT_WIDE_SETTING_HINT}
      </>
    );
  }

  return (
    <>
      This agent only replies to subscribers who have an E.164 phone on{' '}
      <code className="text-text-sub">subscriber.phone</code>. Store that number on the subscriber.{' '}
      {AGENT_WIDE_SETTING_HINT}
    </>
  );
}

export function SubscriberAccessGuidanceRow({ channel, agent }: SubscriberAccessGuidanceRowProps) {
  const { currentEnvironment } = useEnvironment();
  const isOpen = agent.behavior?.subscriberAccess === 'open';
  const subscribersPath = currentEnvironment?.slug
    ? buildRoute(ROUTES.SUBSCRIBERS, { environmentSlug: currentEnvironment.slug })
    : ROUTES.SUBSCRIBERS;

  return (
    <AgentInboxCardRow
      title={<AgentInboxCardRowInfoTitle label={getTitle(channel)} infoTooltip={getInfoTooltip(channel, isOpen)} />}
      description={getDescription(channel, isOpen)}
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
