import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/utils/ui';

/**
 * Shared layout for the public, unauthenticated token-link pages (Slack setup,
 * Telegram mobile setup, WhatsApp signup): a centered single-column shell with
 * an entrance animation and a "Powered by Novu" footer.
 */
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-bg-weak flex min-h-dvh flex-col items-center justify-between px-4 py-8">
      {/* These pages carry a bearer token in the URL path. The app-wide
          Referrer-Policy (no-referrer-when-downgrade) would otherwise send the
          full tokenized URL to cross-origin destinations — e.g. the Facebook
          SDK and Embedded Signup dialogs on the WhatsApp page. `origin` keeps
          the token out of the Referer header while still identifying the site. */}
      <Helmet>
        <meta name="referrer" content="origin" />
      </Helmet>
      <div className="w-full max-w-md flex-1 pt-[max(env(safe-area-inset-top),0px)]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      </div>
      <PoweredByNovu />
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'border-stroke-soft bg-bg-white shadow-regular-xs flex w-full flex-col rounded-xl border p-5',
        className
      )}
    >
      {children}
    </div>
  );
}

function PoweredByNovu() {
  return (
    <a
      href="https://novu.co"
      target="_blank"
      rel="noopener noreferrer"
      className="text-text-soft hover:text-text-strong mt-8 inline-flex items-center gap-2 text-label-xs transition"
      aria-label="Powered by Novu"
    >
      <span>Powered by</span>
      <img src="/images/novu-logo-dark.svg" alt="Novu" className="h-3.5" />
    </a>
  );
}
