import { SiteFrame } from '@/components/site/site-frame';
import { buttonClassName } from '@/components/ui/button';

/** Placeholder until the gethuman.md landing page moves into this app. */
export default function HomePage() {
  return (
    <SiteFrame className="justify-center px-4 py-20 md:px-8">
      <section className="max-w-120">
        <p className="font-mono text-sm tracking-tight text-foreground/50">the human API for agents</p>
        <h1 className="mt-3 text-3xl leading-[1.125] tracking-[-0.04em] md:text-[40px]">
          Let your agents <em className="font-display tracking-tight text-accent">ask you</em> before they act
        </h1>
        <p className="mt-3.5 text-[15px] leading-[1.375] tracking-tight text-foreground/70">
          Human is a tiny CLI that lets AI agents reach you on Telegram, Slack or email when they need a decision.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <a href="https://www.npmjs.com/package/@novu/human" className={buttonClassName('primary')}>
            Get @novu/human
          </a>
          <a href="/sign-in" className={buttonClassName('text')}>
            Sign in
          </a>
        </div>
      </section>
    </SiteFrame>
  );
}
