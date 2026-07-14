import { motion } from 'motion/react';
import { useId } from 'react';

function EmptyChannelsIllustration() {
  const uid = useId();
  const shadowId = `${uid}-shadow`;

  return (
    <svg aria-hidden xmlns="http://www.w3.org/2000/svg" width="220" height="140" viewBox="0 0 220 140" fill="none">
      <defs>
        <filter id={shadowId} x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0b1220" floodOpacity="0.05" />
        </filter>
      </defs>

      <path
        d="M55 42 C 90 42, 90 96, 125 96"
        stroke="#e1e4ea"
        strokeWidth="1"
        strokeDasharray="3 3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M165 42 C 130 42, 130 96, 95 96"
        stroke="#e1e4ea"
        strokeWidth="1"
        strokeDasharray="3 3"
        strokeLinecap="round"
        fill="none"
      />

      <g filter={`url(#${shadowId})`}>
        <rect x="20" y="24" width="70" height="36" rx="7" fill="#ffffff" stroke="#e1e4ea" />
        <rect x="28" y="34" width="16" height="16" rx="4" fill="#f4f5f6" />
        <rect x="50" y="36" width="30" height="4" rx="2" fill="#e1e4ea" />
        <rect x="50" y="44" width="22" height="4" rx="2" fill="#f1efef" />
      </g>

      <g filter={`url(#${shadowId})`}>
        <rect x="130" y="24" width="70" height="36" rx="7" fill="#ffffff" stroke="#e1e4ea" />
        <rect x="138" y="34" width="16" height="16" rx="4" fill="#f4f5f6" />
        <rect x="160" y="36" width="30" height="4" rx="2" fill="#e1e4ea" />
        <rect x="160" y="44" width="22" height="4" rx="2" fill="#f1efef" />
      </g>

      <g filter={`url(#${shadowId})`}>
        <rect x="75" y="82" width="70" height="36" rx="7" fill="#ffffff" stroke="#e1e4ea" />
        <rect x="83" y="92" width="16" height="16" rx="4" fill="#f4f5f6" />
        <rect x="105" y="94" width="30" height="4" rx="2" fill="#e1e4ea" />
        <rect x="105" y="102" width="22" height="4" rx="2" fill="#f1efef" />
      </g>

      <circle cx="55" cy="42" r="2.5" fill="#ffffff" stroke="#cacfd8" />
      <circle cx="165" cy="42" r="2.5" fill="#ffffff" stroke="#cacfd8" />
      <circle cx="110" cy="100" r="2.5" fill="#ffffff" stroke="#cacfd8" />
    </svg>
  );
}

export function AgentChannelsEmptyState() {
  return (
    <motion.div
      className="bg-bg-weak/30 flex min-h-[320px] w-full flex-col items-center justify-center rounded-xl px-6 py-16 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05, ease: [0.4, 0, 0.2, 1] }}
        className="flex flex-col items-center gap-5"
      >
        <EmptyChannelsIllustration />

        <div className="flex flex-col items-center gap-1">
          <p className="text-text-strong text-label-md font-medium">No channel selected</p>
          <p className="text-text-soft text-label-sm max-w-sm leading-5">
            Select a channel to view details, or add a new one.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
