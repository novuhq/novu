import { Inbox } from '@novu/nextjs';
import Title from '@/components/Title';

export default function KeylessPage() {
  return (
    <>
      <Title title="Keyless Inbox" />
      <p className="max-w-xl text-center text-sm text-muted-foreground">
        Renders <code className="text-foreground">&lt;Inbox /&gt;</code> with no{' '}
        <code className="text-foreground">applicationIdentifier</code> or{' '}
        <code className="text-foreground">subscriber</code>. Novu provisions a temporary demo environment (~24h).
        See{' '}
        <a
          className="underline"
          href="https://docs.novu.co/platform/inbox/setup-inbox#try-inbox-in-keyless-mode"
          rel="noopener noreferrer"
          target="_blank"
        >
          keyless mode docs
        </a>
        .
      </p>
      <div className="flex h-[600px] w-full max-w-md flex-col items-start justify-start">
        <Inbox />
      </div>
    </>
  );
}
