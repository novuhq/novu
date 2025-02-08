import { ToggleGroup, ToggleGroupItem } from '@/components/primitives/toggle-group';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useRef, useState } from 'react';
import { RiCloseFill } from 'react-icons/ri';
import { toast } from 'sonner';
import { CompactButton } from '../primitives/button-compact';
import { Card, CardContent } from '../primitives/card';

interface PromotionalBannerContent {
  emoji?: string;
  title: string;
  description: string;
  feedbackQuestion?: string;
  telemetryEvent: TelemetryEvent;
}

interface UsePromotionalBannerProps {
  onReactionSelect?: (reaction: Reaction) => void;
  onDismiss?: () => void;
  content: PromotionalBannerContent;
}

const REACTIONS = [
  { value: '100', emoji: '💯' },
  { value: 'ok', emoji: '👌' },
  { value: 'thinking', emoji: '🤔' },
  { value: 'thumbs_down', emoji: '👎' },
] as const;

const ANIMATION_CONFIG = {
  banner: {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 10, scale: 0.95 },
    transition: { duration: 0.2 },
  },
  content: {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 },
    transition: { delay: 0.1 },
  },
};

type Reaction = (typeof REACTIONS)[number]['value'];

interface UsePromotionalBannerResult {
  show: () => void;
  hide: () => void;
}

export function usePromotionalBanner(props: UsePromotionalBannerProps): UsePromotionalBannerResult {
  const toastId = useRef<string | number>();
  const track = useTelemetry();

  const hide = useCallback(() => {
    if (toastId.current) {
      track(('Banner Hidden ' + props.content.telemetryEvent) as TelemetryEvent, {
        title: props.content.title,
        question: props.content.feedbackQuestion,
      });

      toast.dismiss(toastId.current);
      toastId.current = undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const show = useCallback(() => {
    if (toastId.current) return;

    track(('Banner Viewed ' + props.content.telemetryEvent) as TelemetryEvent, {
      title: props.content.title,
      question: props.content.feedbackQuestion,
    });

    const id = toast.custom(
      (id) => (
        <PromotionalBannerContent
          onDismiss={() => {
            toast.dismiss(id);
            toastId.current = undefined;
            props.onDismiss?.();
          }}
          onReactionSelect={props.onReactionSelect}
          content={props.content}
        />
      ),
      {
        duration: Infinity,
        position: 'bottom-right',
      }
    );

    toastId.current = id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props]);

  return { show, hide };
}

function PromotionalBannerContent({ onDismiss, onReactionSelect, content }: UsePromotionalBannerProps) {
  const track = useTelemetry();
  const [showThankYou, setShowThankYou] = useState(false);

  const handleReactionSelect = (reaction: Reaction) => {
    track(content.telemetryEvent, {
      title: content.title,
      question: content.feedbackQuestion,
      reaction,
    });
    setShowThankYou(true);
    onReactionSelect?.(reaction);
    setTimeout(() => {
      onDismiss?.();
    }, 2000);
  };

  return (
    <motion.div
      {...ANIMATION_CONFIG.banner}
      className="flex flex-col gap-6 rounded-2xl border border-[#E6E9F0] bg-white p-3 shadow-lg"
    >
      <BannerHeader
        emoji={content.emoji}
        title={content.title}
        description={content.description}
        onDismiss={onDismiss}
      />

      <AnimatePresence mode="wait">
        {showThankYou ? (
          <ThankYouMessage />
        ) : (
          <FeedbackSection
            question={content.feedbackQuestion || "Sounds like a feature you'd need?"}
            onReactionSelect={handleReactionSelect}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function BannerHeader({
  emoji,
  title,
  description,
  onDismiss,
}: {
  emoji?: string;
  title: string;
  description: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="flex items-start justify-between">
      <motion.div {...ANIMATION_CONFIG.content} className="flex flex-col gap-2">
        <h3 className="text-foreground-950 flex items-center gap-2 text-xs font-semibold">
          {emoji && (
            <motion.span animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 0.5, delay: 0.2 }}>
              {emoji}
            </motion.span>
          )}
          {title}
        </h3>
        <p className="text-foreground-600 text-xs">{description}</p>
      </motion.div>
      {onDismiss && (
        <CompactButton
          variant="ghost"
          size="md"
          icon={RiCloseFill}
          className="absolute right-2.5 top-3 mt-[-3px] h-6 w-6 p-0 hover:bg-neutral-100"
          onClick={onDismiss}
        >
          <span className="sr-only">Close</span>
        </CompactButton>
      )}
    </div>
  );
}

function ThankYouMessage() {
  return (
    <motion.div
      key="thank-you"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-2 pb-3 text-center"
    >
      <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }} className="text-2xl">
        🙏
      </motion.span>
      <div className="space-y-1">
        <p className="text-foreground-950 text-sm font-medium">Thank you for your feedback!</p>
      </div>
    </motion.div>
  );
}

function FeedbackSection({
  question,
  onReactionSelect,
}: {
  question: string;
  onReactionSelect: (reaction: Reaction) => void;
}) {
  return (
    <motion.div
      key="feedback"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: 0.2 }}
      className="flex flex-col gap-3"
    >
      <h3 className="text-foreground-950 text-xs font-semibold">{question}</h3>
      <Card className="border-netural-200 overflow-hidden rounded-lg">
        <CardContent className="p-0">
          <ToggleGroup
            type="single"
            className="flex gap-0 [&>*:first-child]:rounded-l-lg [&>*:last-child]:rounded-r-lg"
            onValueChange={onReactionSelect}
          >
            {REACTIONS.map((reaction, index) => (
              <motion.div
                key={reaction.value}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                className="w-full rounded-none border-r-[1px] border-[#D1D5DB] transition-colors last:border-r-0 hover:bg-[#F8F9FB] data-[state=on]:bg-[#F8F9FB]"
                whileTap={{ scale: 0.95 }}
              >
                <ToggleGroupItem className="w-full py-2.5 text-xl transition-colors" value={reaction.value}>
                  {reaction.emoji}
                </ToggleGroupItem>
              </motion.div>
            ))}
          </ToggleGroup>
        </CardContent>
      </Card>
    </motion.div>
  );
}
