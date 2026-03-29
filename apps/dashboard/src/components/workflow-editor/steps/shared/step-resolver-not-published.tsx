import { FileCode2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import { RiCheckLine, RiCloseLine, RiFileCopyLine, RiLoaderLine } from 'react-icons/ri';
import { Badge } from '@/components/primitives/badge';
import { Skeleton } from '@/components/primitives/skeleton';
import { ExternalLink } from '@/components/shared/external-link';
import { useFetchApiKeys } from '@/hooks/use-fetch-api-keys';
import { apiHostnameManager } from '@/utils/api-hostname-manager';

const CLI_DEFAULT_API_URL = 'https://api.novu.co';

function maskSecretKey(key: string): string {
  return `nv_${'•'.repeat(20)}${key.slice(-4)}`;
}

function buildPublishCommand({
  secretKey,
  workflowId,
  stepId,
  apiUrl,
  multiline,
}: {
  secretKey: string;
  workflowId: string;
  stepId: string;
  apiUrl: string | null;
  multiline: boolean;
}): string {
  const maskedKey = maskSecretKey(secretKey);
  const apiUrlFlag = apiUrl ? `--api-url=${apiUrl}` : null;

  if (multiline) {
    const lines = [
      `npx novu step publish \\`,
      `  --workflow=${workflowId} \\`,
      `  --step=${stepId} \\`,
      `  --secret-key=${maskedKey}${apiUrlFlag ? ' \\' : ''}`,
      ...(apiUrlFlag ? [`  ${apiUrlFlag}`] : []),
    ];

    return lines.join('\n');
  }

  const flags = [
    `--workflow=${workflowId}`,
    `--step=${stepId}`,
    `--secret-key=${secretKey}`,
    ...(apiUrlFlag ? [apiUrlFlag] : []),
  ];

  return `npx novu step publish ${flags.join(' ')}`;
}

function CodeBlock({ displayCommand, copyCommand }: { displayCommand: string; copyCommand: string }) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyCommand);
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard write failed silently
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-lg shadow-[inset_0px_0px_0px_1px_#18181b,inset_0px_0px_0px_1.5px_rgba(255,255,255,0.1)]">
      <div className="flex items-center justify-between bg-[rgba(14,18,27,0.9)] px-4 py-1.5">
        <span className="text-label-xs text-[#99a0ae]">Terminal</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex size-6 items-center justify-center rounded p-1.5 transition-colors hover:bg-white/10"
        >
          {copied ? (
            <RiCheckLine className="size-3.5 text-[#99a0ae]" />
          ) : (
            <RiFileCopyLine className="size-3.5 text-[#99a0ae]" />
          )}
        </button>
      </div>
      <div className="bg-[rgba(14,18,27,0.9)] px-[5px] pb-[5px]">
        <div className="flex gap-4 rounded-md border border-[rgba(14,18,27,0.9)] bg-[rgba(14,18,27,0.9)] p-3">
          <span className="shrink-0 font-mono text-xs text-[#525866]">❯</span>
          <span className="whitespace-pre font-mono text-xs text-white">{displayCommand}</span>
        </div>
      </div>
    </div>
  );
}

function StepResolverIllustration() {
  const gid = useId();

  return (
    <svg
      width="100%"
      viewBox="0 0 544 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      opacity="0.8"
    >
      <defs>
        <linearGradient id={`${gid}-a`} x1="0" y1="0" x2="1" y2="0" gradientUnits="objectBoundingBox">
          <stop stopColor="#F1EFEF" />
          <stop offset="0.48" stopColor="#F9F8F8" />
          <stop offset="0.992" stopColor="#F9F8F8" stopOpacity="0.75" />
        </linearGradient>
      </defs>

      {/* ─── Card 1: Handler File ─── */}
      <rect x="0.5" y="0.5" width="158" height="95" rx="7.5" stroke="#CACFD8" />
      <rect x="4.5" y="4.5" width="150" height="87" rx="5.5" fill="white" stroke="#F2F5F8" />
      {/* File tab */}
      <rect x="8" y="9" width="142" height="19" rx="2.5" fill="#F8F8F8" stroke="#EFEFEF" strokeWidth="0.75" />
      {/* < / > icon */}
      <path
        d="M16 14.5L13.5 18L16 21.5"
        stroke="#C8C8C8"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 14.5L22.5 18L20 21.5"
        stroke="#C8C8C8"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Filename bar */}
      <rect x="27" y="16" width="38" height="4" rx="2" fill="#E8E8E8" />
      {/* Code skeleton */}
      <rect x="8" y="34" width="30" height="4" rx="2" fill={`url(#${gid}-a)`} />
      <rect x="42" y="34" width="46" height="4" rx="2" fill="#F3F4F6" />
      <rect x="14" y="43" width="70" height="4" rx="2" fill="#F3F4F6" />
      <rect x="14" y="52" width="44" height="4" rx="2" fill={`url(#${gid}-a)`} />
      <rect x="62" y="52" width="38" height="4" rx="2" fill="#F3F4F6" />
      <rect x="14" y="61" width="56" height="4" rx="2" fill="#F3F4F6" />
      <rect x="8" y="70" width="22" height="4" rx="2" fill="#F3F4F6" />
      {/* Label */}
      <text
        x="79"
        y="86"
        textAnchor="middle"
        fontFamily="ui-monospace,monospace"
        fontSize="6.5"
        fill="#C8C8C8"
        letterSpacing="0.6"
      >
        YOUR CODE
      </text>

      {/* ─── Connector 1 ─── */}
      <line x1="160" y1="48" x2="190" y2="48" stroke="#E1E4EA" strokeWidth="1" strokeDasharray="4 3" />
      <path d="M186 44L192 48L186 52Z" fill="#CACFD8" />

      {/* ─── Card 2: CLI Terminal ─── */}
      <rect x="193.5" y="0.5" width="157" height="95" rx="7.5" stroke="#CACFD8" />
      <rect x="197.5" y="4.5" width="149" height="87" rx="5.5" fill="#F8F8F8" stroke="#F2F5F8" />
      {/* Traffic dots */}
      <circle cx="208" cy="14" r="3" fill="#E2E2E2" />
      <circle cx="218" cy="14" r="3" fill="#E2E2E2" />
      <circle cx="228" cy="14" r="3" fill="#E2E2E2" />
      <line x1="197" y1="22" x2="350" y2="22" stroke="#EFEFEF" strokeWidth="1" />
      {/* Prompt */}
      <text x="207" y="35" fontFamily="ui-monospace,monospace" fontSize="8" fill="#C0C0C0">
        ❯
      </text>
      <text x="218" y="35" fontFamily="ui-monospace,monospace" fontSize="8" fill="#ABABAB">
        npx novu
      </text>
      <text x="218" y="46" fontFamily="ui-monospace,monospace" fontSize="8" fill="#C8C8C8">
        step publish
      </text>
      {/* Checkmark */}
      <path
        d="M208 56L211 59.5L217.5 53"
        stroke="#C0C0C0"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text x="221" y="59" fontFamily="ui-monospace,monospace" fontSize="8" fill="#C0C0C0">
        Published!
      </text>
      {/* Label */}
      <text
        x="272"
        y="86"
        textAnchor="middle"
        fontFamily="ui-monospace,monospace"
        fontSize="6.5"
        fill="#C8C8C8"
        letterSpacing="0.6"
      >
        CLI PUBLISH
      </text>

      {/* ─── Connector 2 ─── */}
      <line x1="352" y1="48" x2="382" y2="48" stroke="#E1E4EA" strokeWidth="1" strokeDasharray="4 3" />
      <path d="M378 44L384 48L378 52Z" fill="#CACFD8" />

      {/* ─── Card 3: Novu Cloud ─── */}
      <rect x="385.5" y="0.5" width="158" height="95" rx="7.5" stroke="#CACFD8" strokeDasharray="5 3" />
      <rect x="389.5" y="4.5" width="150" height="87" rx="5.5" fill="white" stroke="#F2F5F8" />
      {/* Novu logo (300×300 → 26px: scale≈0.0867, centered at x=464, top at y=16) */}
      <g transform="translate(451,16) scale(0.0867)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          fill="#D4D4D4"
          d="M231 120.241C231 128.307 221.208 132.301 215.567 126.536L100.084 8.50548C115.699 2.9969 132.5 0 150 0C179.836 0 207.638 8.711 231 23.7285V120.241ZM273 64.1228V120.241C273 165.946 217.51 188.577 185.546 155.908L61.3582 28.9807C24.1534 56.2779 0 100.318 0 150C0 181.941 9.98339 211.55 27 235.877V180.059C27 134.354 82.4899 111.723 114.454 144.392L238.471 271.145C275.773 243.857 300 199.758 300 150C300 118.059 290.017 88.45 273 64.1228ZM84.433 173.764L199.697 291.571C184.144 297.031 167.419 300 150 300C120.164 300 92.3624 291.289 69 276.272V180.059C69 171.993 78.7923 167.999 84.433 173.764Z"
        />
      </g>
      {/* Novu Cloud label */}
      <text
        x="464"
        y="54"
        textAnchor="middle"
        fontFamily="ui-monospace,monospace"
        fontSize="6.5"
        fill="#C8C8C8"
        letterSpacing="0.6"
      >
        NOVU CLOUD
      </text>
      {/* Serverless badge */}
      <rect x="432" y="59" width="64" height="14" rx="7" fill="#F4F5F6" stroke="#EFEFEF" strokeWidth="0.75" />
      <circle cx="442" cy="66" r="2.5" fill="#D4D4D4" />
      <text x="448" y="69.5" fontFamily="ui-monospace,monospace" fontSize="7" fill="#ABABAB">
        Serverless
      </text>
      {/* Bottom label */}
      <text
        x="464"
        y="86"
        textAnchor="middle"
        fontFamily="ui-monospace,monospace"
        fontSize="6.5"
        fill="#C8C8C8"
        letterSpacing="0.6"
      >
        DEPLOYED
      </text>
    </svg>
  );
}

const FEATURE_BULLETS = [
  'The CLI auto-scaffolds a handler file in your project — no manual setup needed.',
  'Write your step output in TypeScript using any library or template engine.',
  'Subscriber data, trigger payload, and dashboard controls are all available at runtime.',
  'Commit the file to your repo and re-publish to deploy updates at any time.',
];

type StepResolverNotPublishedProps = {
  workflowId: string;
  stepId: string;
};

const INFO_CARD_DISMISSED_KEY = 'novu:step-resolver-info-card-dismissed';

const BLOCK_TRANSITION = { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] };

function blockAnimation(delay: number) {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { ...BLOCK_TRANSITION, delay },
  };
}

export const StepResolverNotPublished = ({ workflowId, stepId }: StepResolverNotPublishedProps) => {
  const [infoCardDismissed, setInfoCardDismissed] = useState(
    () => localStorage.getItem(INFO_CARD_DISMISSED_KEY) === 'true'
  );

  const handleDismissInfoCard = () => {
    localStorage.setItem(INFO_CARD_DISMISSED_KEY, 'true');
    setInfoCardDismissed(true);
  };
  const apiKeysQuery = useFetchApiKeys();
  const secretKey = apiKeysQuery.data?.data?.[0]?.key;

  const currentApiUrl = apiHostnameManager.getHostname();
  const apiUrl = currentApiUrl !== CLI_DEFAULT_API_URL ? currentApiUrl : null;

  const fallbackDisplay = [
    `npx novu step publish \\`,
    `  --workflow=${workflowId} \\`,
    `  --step=${stepId} \\`,
    `  --secret-key=<your-secret-key>${apiUrl ? ' \\' : ''}`,
    ...(apiUrl ? [`  --api-url=${apiUrl}`] : []),
  ].join('\n');

  const fallbackCopy = `npx novu step publish --workflow=${workflowId} --step=${stepId} --secret-key=<your-secret-key>${apiUrl ? ` --api-url=${apiUrl}` : ''}`;

  return (
    <div className="h-full overflow-y-auto bg-[#fbfbfb]">
      <div className="mx-auto flex w-full max-w-[780px] flex-col p-6">
        <AnimatePresence>
          {!infoCardDismissed && (
            <motion.div
              className="relative mb-4 overflow-hidden rounded-[6px] border border-[#e1e4ea] bg-white shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]"
              initial={{ opacity: 0, y: -6, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {/* Novu logomark watermark — partially clipped at bottom-right */}
              <svg
                viewBox="0 0 300 300"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="pointer-events-none absolute size-[169px] opacity-[0.15]"
                style={{ bottom: -71, right: 19 }}
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M231 120.241C231 128.307 221.208 132.301 215.567 126.536L100.084 8.50548C115.699 2.9969 132.5 0 150 0C179.836 0 207.638 8.711 231 23.7285V120.241ZM273 64.1228V120.241C273 165.946 217.51 188.577 185.546 155.908L61.3582 28.9807C24.1534 56.2779 0 100.318 0 150C0 181.941 9.98339 211.55 27 235.877V180.059C27 134.354 82.4899 111.723 114.454 144.392L238.471 271.145C275.773 243.857 300 199.758 300 150C300 118.059 290.017 88.45 273 64.1228ZM84.433 173.764L199.697 291.571C184.144 297.031 167.419 300 150 300C120.164 300 92.3624 291.289 69 276.272V180.059C69 171.993 78.7923 167.999 84.433 173.764Z"
                  fill="#e1e4ea"
                />
              </svg>
              <button
                type="button"
                onClick={handleDismissInfoCard}
                className="absolute right-3 top-3 z-10 flex size-5 items-center justify-center rounded text-[#99a0ae] transition-colors hover:bg-[#f4f5f6] hover:text-[#525866]"
              >
                <RiCloseLine className="size-4" />
              </button>
              <div className="relative z-0 flex flex-col gap-3 p-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <FileCode2 className="size-[14px] shrink-0 text-[#525866]" strokeWidth={1.5} />
                    <span className="text-label-sm text-[#525866]">Resolve this step from your code</span>
                    <Badge variant="lighter" color="gray" size="sm">
                      BETA
                    </Badge>
                  </div>
                  <p className="text-label-xs text-[#99a0ae]">
                    Instead of defining content in the editor, your application generates the output for this step.
                  </p>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {FEATURE_BULLETS.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-1">
                      <RiCheckLine className="size-3 shrink-0 text-[#525866]" />
                      <span className="text-label-xs text-[#525866]">{bullet}</span>
                    </li>
                  ))}
                </ul>
                <div className="w-fit">
                  <ExternalLink
                    variant="documentation"
                    href="https://docs.novu.co/platform/workflow/add-and-configure-steps/code-steps"
                    underline={false}
                    className="cursor-pointer"
                  >
                    Read the docs
                  </ExternalLink>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div className="mb-4 py-3" {...blockAnimation(0.1)}>
          <StepResolverIllustration />
        </motion.div>

        <motion.div className="flex flex-col" {...blockAnimation(0.2)}>
          <div className="relative pl-8">
            <div
              className="absolute left-8 top-0 h-full w-px"
              style={{ background: 'linear-gradient(to bottom, transparent, #e1e4ea 32px, #e1e4ea 75%, transparent)' }}
            />
            <div className="absolute left-[22px] top-8 z-10 flex size-5 items-center justify-center rounded-full bg-[#f4f5f6] shadow-[0px_0px_0px_1px_white,0px_0px_0px_2px_#e1e4ea]">
              <span className="text-label-xs text-[#0e121b]">1</span>
            </div>
            <div className="flex max-w-[560px] flex-col gap-6 pb-8 pl-8 pt-8">
              <div className="flex flex-col gap-1.5">
                <p className="text-label-sm text-[#2f3037]">Publish your step handler</p>
                <p className="text-label-xs text-[#99a0ae]">
                  Run this from your project root. The CLI scaffolds{' '}
                  <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[10px] text-[#525866]">
                    novu/{workflowId}/{stepId}.step.tsx
                  </code>{' '}
                  if it doesn't exist yet — edit it with your logic and re-run to redeploy anytime.
                  <br />
                  <br />💡 Your handler is bundled and deployed to Novu's serverless infrastructure on every publish.
                </p>
              </div>
              {apiKeysQuery.isLoading ? (
                <Skeleton className="h-[120px] rounded-lg" />
              ) : (
                <CodeBlock
                  displayCommand={
                    secretKey
                      ? buildPublishCommand({ secretKey, workflowId, stepId, apiUrl, multiline: true })
                      : fallbackDisplay
                  }
                  copyCommand={
                    secretKey
                      ? buildPublishCommand({ secretKey, workflowId, stepId, apiUrl, multiline: false })
                      : fallbackCopy
                  }
                />
              )}
            </div>
          </div>

          <div className="flex gap-2 pb-8 pl-[26px]">
            <RiLoaderLine className="mt-0.5 size-4 shrink-0 animate-spin text-[#dd2476]" />
            <div className="flex flex-col gap-1.5">
              <span className="text-label-sm bg-gradient-to-r from-[#dd2476] to-[#ff512f] bg-clip-text text-transparent">
                Waiting for first deployment…
              </span>
              <p className="text-label-xs text-[#99a0ae]">
                Run the command above from your project to publish this step.
                <br />
                Once deployed, you'll be able to preview and trigger notifications here.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
