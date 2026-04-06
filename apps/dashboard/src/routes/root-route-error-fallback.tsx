import { BookOpen, Mail, RefreshCw } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useMemo } from 'react';
import { Button } from '@/components/primitives/button';
import { CopyButton } from '@/components/primitives/copy-button';
import { TooltipProvider } from '@/components/primitives/tooltip';
import { IS_SELF_HOSTED } from '@/config';
import { cn } from '@/utils/ui';

const SUPPORT_EMAIL = 'support@novu.co';

const SELF_HOSTED_DOCS_URL =
  'https://docs.novu.co/community/run-in-local-machine?utm_source=dashboard&utm_medium=app_error';

/** Matches legacy ErrorBoundary copy in root route (self-hosted ops). */
const SELF_HOSTED_ERROR_GUIDANCE =
  'Please check your application logs or try refreshing the page. If the issue persists, consider restarting your Novu services.';

/** Matches legacy ErrorBoundary copy in root route (cloud support). */
const CLOUD_ERROR_GUIDANCE =
  'Please try refreshing the page. If the problem continues, you can contact our support team with the event ID below for assistance.';

type RootRouteErrorFallbackProps = {
  error: unknown;
  eventId?: string;
};

const ONE_LINER_MAX = 140;

function errorOneLiner(error: unknown): string {
  if (error instanceof Error) {
    const line = error.message.split('\n')[0]?.trim();

    if (line) {
      return line.length > ONE_LINER_MAX ? `${line.slice(0, ONE_LINER_MAX)}…` : line;
    }

    return error.name || 'Error';
  }

  if (typeof error === 'string') {
    const line = error.trim();

    return line.length > ONE_LINER_MAX ? `${line.slice(0, ONE_LINER_MAX)}…` : line;
  }

  return 'Something threw outside of expected types.';
}

function currentLocationPath() {
  if (typeof window === 'undefined') {
    return '/';
  }

  return `${window.location.pathname}${window.location.search}` || '/';
}

function buildSupportSnippet(path: string, eventId: string | undefined, summary: string) {
  const payload: Record<string, string> = {
    path,
    message: summary,
  };

  if (eventId) {
    payload.eventId = eventId;
  }

  return JSON.stringify(payload, null, 2);
}

function buildSupportMailto(path: string, eventId: string | undefined, summary: string) {
  const lines = [
    'Dashboard client error',
    '',
    `path: ${path}`,
    eventId ? `eventId: ${eventId}` : null,
    `message: ${summary}`,
    '',
    '(attach anything else that helps reproduce)',
  ].filter((line): line is string => line != null);

  const subject = encodeURIComponent(`[dashboard] error at ${path}`);
  const body = encodeURIComponent(lines.join('\n'));

  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}

const easeOut = [0.22, 1, 0.36, 1] as const;

const sectionVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.24 + i * 0.11,
      duration: 0.48,
      ease: easeOut,
    },
  }),
};

const lineVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.04 + i * 0.055,
      duration: 0.42,
      ease: easeOut,
    },
  }),
};

export function RootRouteErrorFallback(props: RootRouteErrorFallbackProps) {
  const { error, eventId } = props;

  const prefersReducedMotion = useReducedMotion();

  const path = useMemo(() => currentLocationPath(), []);
  const summary = useMemo(() => errorOneLiner(error), [error]);
  const supportSnippet = useMemo(() => buildSupportSnippet(path, eventId, summary), [path, eventId, summary]);
  const mailtoHref = useMemo(() => buildSupportMailto(path, eventId, summary), [path, eventId, summary]);

  return (
    <TooltipProvider delayDuration={100}>
      <div
        className={cn(
          'text-text-strong relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-12',
          'bg-bg-weak',
          'bg-[radial-gradient(ellipse_150%_145%_at_50%_48%,hsl(var(--bg-weak))_0%,hsl(var(--bg-weak))_76%,hsl(var(--bg-white))_100%)]'
        )}
      >
        <div className="flex w-full max-w-lg flex-col gap-8">
          <motion.header className="space-y-2">
            <motion.p
              className="text-text-soft font-code text-[11px] font-medium tracking-wide uppercase"
              custom={0}
              variants={lineVariants}
              initial={prefersReducedMotion ? false : 'hidden'}
              animate={prefersReducedMotion ? undefined : 'visible'}
            >
              Client error
            </motion.p>
            <motion.h1
              className="text-text-strong text-xl font-medium tracking-tight sm:text-2xl"
              custom={1}
              variants={lineVariants}
              initial={prefersReducedMotion ? false : 'hidden'}
              animate={prefersReducedMotion ? undefined : 'visible'}
            >
              This is on us, not you.
            </motion.h1>
            <motion.p
              className="text-text-sub text-paragraph-sm max-w-prose leading-relaxed"
              custom={2}
              variants={lineVariants}
              initial={prefersReducedMotion ? false : 'hidden'}
              animate={prefersReducedMotion ? undefined : 'visible'}
            >
              {IS_SELF_HOSTED ? SELF_HOSTED_ERROR_GUIDANCE : CLOUD_ERROR_GUIDANCE}
            </motion.p>
            {IS_SELF_HOSTED ? (
              <motion.p
                className="text-text-soft text-paragraph-sm max-w-prose leading-relaxed"
                custom={3}
                variants={lineVariants}
                initial={prefersReducedMotion ? false : 'hidden'}
                animate={prefersReducedMotion ? undefined : 'visible'}
              >
                The JSON block includes path and error summary if you need them for logs or a ticket.
              </motion.p>
            ) : null}
          </motion.header>

          <motion.div
            className="border-stroke-soft overflow-hidden rounded-xl border bg-bg-white shadow-xs"
            custom={0}
            variants={sectionVariants}
            initial={prefersReducedMotion ? false : 'hidden'}
            animate={prefersReducedMotion ? undefined : 'visible'}
          >
            <div className="border-stroke-soft flex items-center justify-between gap-3 border-b bg-bg-weak px-2.5 py-2.5 sm:px-4">
              <span className="text-text-sub font-code min-w-0 truncate text-xs leading-snug" title={path}>
                {path}
              </span>
              <CopyButton
                valueToCopy={supportSnippet}
                size="xs"
                className="shrink-0 rounded-xl"
                aria-label="Copy JSON payload"
              />
            </div>
            <pre className="text-text-soft font-code m-0 max-h-48 overflow-auto px-4 py-4 text-[13px] leading-relaxed whitespace-pre-wrap break-all">
              {supportSnippet}
            </pre>
          </motion.div>

          <motion.div
            className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
            custom={1}
            variants={sectionVariants}
            initial={prefersReducedMotion ? false : 'hidden'}
            animate={prefersReducedMotion ? undefined : 'visible'}
          >
            <Button
              variant="secondary"
              mode="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
              Reload
            </Button>

            <Button
              variant="secondary"
              mode="ghost"
              size="sm"
              className="gap-2"
              title={SUPPORT_EMAIL}
              onClick={() => {
                window.location.assign(mailtoHref);
              }}
            >
              <Mail className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
              Email support
            </Button>

            {IS_SELF_HOSTED ? (
              <Button
                variant="secondary"
                mode="ghost"
                size="sm"
                className="text-text-sub gap-2"
                onClick={() => window.open(SELF_HOSTED_DOCS_URL, '_blank', 'noopener,noreferrer')}
              >
                <BookOpen className="size-4 shrink-0" aria-hidden="true" strokeWidth={1.75} />
                Self-host docs
              </Button>
            ) : null}
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  );
}
