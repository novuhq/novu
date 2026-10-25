import { AGENT_DOMAIN } from '@/lib/onboarding';

/** The line under a public card that leads its visitors to the product: "Give your agent an inbox too". */
export function GetAnInbox() {
  return (
    <p className="flex items-center gap-1.5 text-xs leading-4 text-muted">
      Give your agent an inbox too
      <a
        href={`https://${AGENT_DOMAIN}`}
        className="rounded-sm font-mono text-default transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
      >
        {AGENT_DOMAIN} →
      </a>
    </p>
  );
}
