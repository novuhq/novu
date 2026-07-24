import { InlineToast } from '@/components/primitives/inline-toast';
import { cn } from '@/utils/ui';

type ApexDomainMxWarningProps = {
  className?: string;
};

export function ApexDomainMxWarning({ className }: ApexDomainMxWarningProps) {
  return (
    <InlineToast
      className={cn(className)}
      variant="warning"
      title="Warning:"
      description="Adding an MX record at your root domain routes all inbound email to Novu. Other mail services (such as Google Workspace or Microsoft 365) will stop receiving email for this domain. Use a subdomain like inbound.example.com if you need both."
    />
  );
}
