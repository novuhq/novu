import {
  INBOX_LABELS,
  INBOX_SECTION,
  type InboxAgent,
  type InboxMessage,
  type InboxTag,
  type InboxThread,
  inboxAssets,
} from '@/data/sapien-inbox';

import { cn } from '@/lib/utils';

import { Artwork } from './artwork';

/**
 * Illustrative, non-interactive mock of the agentinbox web app for one agent.
 * Below `lg` the sidebar collapses to its identity row; below `md` the inbox
 * list is hidden so only the open conversation remains.
 */
export function InboxDashboard({ agent }: { agent: InboxAgent }) {
  const unreadCount = agent.threads.filter((thread) => thread.unread).length;

  return (
    <div className="flex h-full flex-col bg-border/62 lg:flex-row">
      <div className="flex shrink-0 flex-col overflow-clip lg:w-55">
        <AgentIdentity agent={agent} />
        <div className="hidden lg:block">
          <ul className="flex flex-col gap-0.5 px-3 pt-1">
            <li className="flex h-7.5 items-center justify-between rounded-[7px] bg-sapien-foreground/8 px-2">
              <span className="text-[13px] leading-4 font-medium tracking-[-0.01em]">{INBOX_LABELS.inbox}</span>
              <span className="font-mono text-[11px] leading-3.5 text-sapien-foreground/50">
                {unreadCount}
                <span className="sr-only"> {INBOX_LABELS.unreadCount}</span>
              </span>
            </li>
            <li className="flex h-7.5 items-center px-2 text-[13px] leading-4 tracking-[-0.01em] text-sapien-foreground/70">
              {INBOX_LABELS.contacts}
            </li>
          </ul>
          <div className="pt-5 pr-3 pl-5">
            <p className="flex h-6 items-center text-[11px] leading-3.5 tracking-[-0.01em] text-sapien-foreground/50">
              {INBOX_LABELS.channels}
            </p>
            <ul>
              {agent.channels.map((channel) => (
                <li key={channel.name} className="flex h-7 items-center justify-between pr-2">
                  <span
                    className={cn(
                      'flex items-center gap-2.5 text-[13px] leading-4 tracking-[-0.01em]',
                      channel.soon ? 'text-sapien-foreground/36' : 'text-sapien-foreground/70'
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-1.5 rounded-full',
                        channel.soon ? 'border border-sapien-foreground/36' : 'bg-sapien-foreground/90'
                      )}
                    />
                    {channel.name}
                  </span>
                  {channel.soon ? (
                    <span className="font-mono text-[10px] leading-3 text-sapien-foreground/36">
                      {INBOX_LABELS.soon}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
          <FrameworkTile />
        </div>
      </div>

      {/* Figma's inside stroke overlays the panel instead of insetting its columns. */}
      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-clip rounded-t-xl bg-black shadow-[-2px_4px_10px_rgba(0,0,0,0.4)] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:border after:border-sapien-foreground/7 lg:rounded-tr-none">
        <div className="hidden w-62 shrink-0 flex-col border-r border-sapien-foreground/7 bg-border/30 md:flex lg:w-70">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-sapien-foreground/7 px-5 whitespace-nowrap">
            <p className="text-sm leading-4.5 font-medium tracking-[-0.01em]">{INBOX_LABELS.inbox}</p>
            <p className="text-xs leading-4 tracking-[-0.01em] text-sapien-foreground/50">
              {INBOX_LABELS.unreadFilter}
            </p>
          </div>
          <ul aria-label={INBOX_LABELS.threadList} className="flex flex-col gap-0.5 p-2">
            {agent.threads.map((thread) => (
              <ThreadItem key={thread.sender} thread={thread} />
            ))}
          </ul>
        </div>

        <Conversation agent={agent} />
      </div>
    </div>
  );
}

function FrameworkTile() {
  const { framework } = INBOX_SECTION;
  return (
    <div className="mt-7.5 mr-3 ml-4 flex gap-2 rounded-lg bg-sapien-surface p-2 text-white">
      <Artwork asset={inboxAssets.hermes} className="h-[86px] w-[60px]" />
      <div className="flex flex-col justify-between leading-[1.1]">
        <p className="text-[15px] font-medium tracking-tight">
          {framework.name[0]}
          <br />
          {framework.name[1]}
        </p>
        <p className="text-xs leading-[1.1] tracking-tight opacity-50">{framework.maker}</p>
      </div>
    </div>
  );
}

function AgentIdentity({ agent }: { agent: InboxAgent }) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2 pr-3 pl-5">
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-accent text-[13px] leading-4 font-medium text-black"
      >
        {agent.initial}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-px whitespace-nowrap">
        <p className="truncate text-[13px] leading-4 font-medium tracking-[-0.01em]">{agent.handle}</p>
        <p className="truncate font-mono text-[10px] leading-3.5 tracking-tight text-sapien-foreground/50">
          {agent.email}
        </p>
      </div>
    </div>
  );
}

function ThreadItem({ thread }: { thread: InboxThread }) {
  return (
    <li className={cn('flex flex-col rounded-lg p-3', thread.selected && 'bg-sapien-foreground/7')}>
      <div className="flex flex-col gap-0.75">
        <div className="flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1.75 text-[13px] leading-4 font-medium tracking-[-0.01em]">
            {thread.unread ? <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" /> : null}
            {thread.unread ? <span className="sr-only">{INBOX_LABELS.unreadThread}: </span> : null}
            <span className="truncate">{thread.sender}</span>
          </p>
          <p className="shrink-0 font-mono text-[10px] leading-3 text-sapien-foreground/50">{thread.time}</p>
        </div>
        <p
          className={cn(
            'truncate text-[13px] leading-4.5 tracking-[-0.01em]',
            thread.unread ? 'text-sapien-foreground/70' : 'text-sapien-foreground/50'
          )}
        >
          {thread.preview}
        </p>
      </div>
      <div className="flex gap-1 pt-2.5">
        {thread.tags.map((tag) => (
          <Tag key={tag.label} tag={tag} />
        ))}
      </div>
    </li>
  );
}

function Tag({ tag }: { tag: InboxTag }) {
  return (
    <span
      className={cn(
        'flex h-4.5 items-center rounded-sm px-1.5 font-mono text-[10px] leading-3',
        tag.outline
          ? 'border border-sapien-foreground/14 text-sapien-foreground/36'
          : 'bg-sapien-foreground/8 text-sapien-foreground/50'
      )}
    >
      {tag.label}
    </span>
  );
}

function Conversation({ agent }: { agent: InboxAgent }) {
  const { conversation } = agent;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex min-h-14 shrink-0 items-center border-b border-sapien-foreground/7 px-5 py-2">
        <p className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <span className="text-sm leading-4.5 font-medium tracking-[-0.01em]">{conversation.contact}</span>
          <span className="text-xs leading-4 tracking-[-0.01em] text-sapien-foreground/50">{conversation.meta}</span>
        </p>
      </div>
      <ol
        aria-label={INBOX_LABELS.messageList}
        // Below lg the bottom padding keeps the last message clear of the badge.
        className="flex flex-col gap-6 px-5 pt-5 pb-26.5 lg:pb-5"
      >
        {conversation.messages.map((message, index) => (
          <Message key={index} agent={agent} message={message} />
        ))}
      </ol>
    </div>
  );
}

function Message({ agent, message }: { agent: InboxAgent; message: InboxMessage }) {
  const isAgent = message.from === 'agent';

  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className={cn(
          'flex size-8 shrink-0 items-center justify-center font-medium',
          isAgent
            ? 'rounded-lg bg-accent/30 text-[13px] leading-4 text-white'
            : 'rounded-full bg-sapien-foreground/10 text-[11px] leading-3.5 text-sapien-foreground/70'
        )}
      >
        {isAgent ? agent.initial : agent.conversation.initials}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-[13px] leading-4 font-medium tracking-[-0.01em]">
            {isAgent ? agent.handle : agent.conversation.contact}
          </span>
          <span className="truncate text-[11px] leading-3.5 tracking-[-0.01em] text-sapien-foreground/50">
            via {message.via}
          </span>
        </p>
        {message.text ? <p className="text-[13px] leading-4.5 tracking-[-0.01em]">{message.text}</p> : null}
        {message.approval ? (
          <div className="pt-2">
            <div className="rounded-[10px] border border-sapien-foreground/9 bg-sapien-foreground/4">
              <div className="flex flex-col gap-1 px-3.5 py-3 text-[13px] tracking-[-0.01em]">
                <p className="leading-4 font-medium">{message.approval.title}</p>
                <p className="leading-4.5 text-sapien-foreground/70">{message.approval.description}</p>
              </div>
              <p className="flex min-h-8.5 items-center gap-1.5 border-t border-sapien-foreground/9 px-3.5 py-2 text-xs leading-4 tracking-[-0.01em] text-accent">
                <Artwork asset={inboxAssets.imgIconCheck} className="size-3" />
                {message.approval.status}
              </p>
            </div>
          </div>
        ) : null}
        {message.attachment ? (
          <div className="flex pt-2">
            <p className="flex h-7 min-w-0 items-center gap-1.5 rounded-[7px] border border-sapien-foreground/9 bg-sapien-foreground/4 pr-2.5 pl-2 font-mono text-[11px] leading-3.5 text-sapien-foreground/70">
              <Artwork asset={inboxAssets.imgIconFile} className="size-3 shrink-0" />
              <span className="sr-only">{INBOX_LABELS.attachment} </span>
              <span className="truncate">{message.attachment}</span>
            </p>
          </div>
        ) : null}
      </div>
    </li>
  );
}
