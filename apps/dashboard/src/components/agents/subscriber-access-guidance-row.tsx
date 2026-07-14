import type { ReactNode } from 'react';
import { RiArrowRightSLine, RiArrowRightUpLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import type { AgentResponse } from '@/api/agents';
import { AgentInboxCardRow, AgentInboxCardRowInfoTitle } from '@/components/agents/agent-inbox-card-row';
import { isManagedAgentRuntime, SUBSCRIBER_ACCESS_SETTING_LABEL } from '@/components/agents/subscriber-access-copy';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';

const CREATE_SUBSCRIBER_DOCS_URL = 'https://docs.novu.co/api-reference/subscribers/create-a-subscriber';

const quietLinkClassName =
  'text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 text-label-xs font-medium leading-4 transition-colors';

const AGENT_WIDE_SETTING_HINT = `Agent-wide setting: change under "${SUBSCRIBER_ACCESS_SETTING_LABEL}" on Agent behavior.`;

type GuidanceChannel = 'email' | 'whatsapp';

type ChannelWording = {
  title: string;
  /** Verb used in the section description, e.g. "email" / "message". */
  verb: string;
  /** Identifier field displayed inline as code, e.g. "subscriber.email". */
  identifierField: string;
  /** Extra qualifier printed after the identifier field in the restricted description. */
  identifierQualifier?: string;
};

const CHANNEL_WORDING: Record<GuidanceChannel, ChannelWording> = {
  email: {
    title: 'Who can email this agent',
    verb: 'email',
    identifierField: 'subscriber.email',
  },
  whatsapp: {
    title: 'Who can message this agent',
    verb: 'message',
    identifierField: 'subscriber.phone',
    identifierQualifier: ' (E.164)',
  },
};

type OpenCopy = {
  description: ReactNode;
  tooltipDetail: string;
};

/**
 * Open-access wording is forked by runtime because the agent runtime is fixed
 * at creation: at this stage the user cannot flip between managed and
 * self-hosted, so surfacing the "other" case would only add noise. The section
 * description stays a single short sentence; the mechanic detail + identifier
 * hint live on the info tooltip so we do not duplicate them.
 */
function buildOpenCopy(channel: GuidanceChannel, isManaged: boolean): OpenCopy {
  const wording = CHANNEL_WORDING[channel];

  if (isManaged) {
    return {
      description: <>Anyone can {wording.verb} this agent — new senders are auto-created as lightweight subscribers.</>,
      tooltipDetail: `Save ${wording.identifierField} on your existing subscribers so their next ${wording.verb} merges into their profile instead of creating another anonymous one. ${AGENT_WIDE_SETTING_HINT}`,
    };
  }

  return {
    description: (
      <>Anyone can {wording.verb} this agent — unknown senders are forwarded to your bridge with a null subscriber.</>
    ),
    tooltipDetail: `Your bridge decides what to do — auto-provision, deny, or escalate. Save ${wording.identifierField} on existing subscribers so their next ${wording.verb} merges into their profile. ${AGENT_WIDE_SETTING_HINT}`,
  };
}

type RestrictedCopy = {
  description: ReactNode;
  tooltipDetail: string;
};

function buildRestrictedCopy(channel: GuidanceChannel): RestrictedCopy {
  const wording = CHANNEL_WORDING[channel];
  const identifierCode = <code className="text-text-sub">{wording.identifierField}</code>;

  return {
    description: (
      <>
        Only replies to subscribers whose {identifierCode}
        {wording.identifierQualifier ?? ''} matches the sender.
      </>
    ),
    tooltipDetail: `Anonymous senders receive a short denial reply. ${AGENT_WIDE_SETTING_HINT}`,
  };
}

type SubscriberAccessGuidanceRowProps = {
  channel: GuidanceChannel;
  agent: AgentResponse;
};

export function SubscriberAccessGuidanceRow({ channel, agent }: SubscriberAccessGuidanceRowProps) {
  const { currentEnvironment } = useEnvironment();
  const isOpen = agent.behavior?.subscriberAccess === 'open';
  const isManaged = isManagedAgentRuntime(agent.runtime);
  const wording = CHANNEL_WORDING[channel];
  const { description, tooltipDetail } = isOpen ? buildOpenCopy(channel, isManaged) : buildRestrictedCopy(channel);
  const subscribersPath = buildRoute(ROUTES.SUBSCRIBERS, {
    environmentSlug: currentEnvironment?.slug ?? '',
  });

  return (
    <AgentInboxCardRow
      title={<AgentInboxCardRowInfoTitle label={wording.title} infoTooltip={tooltipDetail} />}
      description={description}
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
