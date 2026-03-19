import { motion } from 'motion/react';

const SmsChatBubble = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    className="relative my-1 inline-block max-w-[90%] rounded-2xl bg-[#e9ecef] px-4 py-2 text-sm text-[#2b2b33] before:absolute before:bottom-0 before:left-[-7px] before:h-5 before:w-5 before:rounded-br-[15px] before:bg-[#e9ecef] before:content-[''] after:absolute after:bottom-0 after:left-[-10px] after:h-5 after:w-[10px] after:rounded-br-[10px] after:bg-white after:content-['']"
  >
    <div className="line-clamp-4 min-h-4 overflow-hidden whitespace-pre-wrap wrap-break-word text-xs">{children}</div>
  </motion.div>
);

const ErrorChatBubble = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    className="relative my-1 inline-block max-w-[90%] rounded-2xl bg-[#FEE4E2] px-4 py-2 text-sm text-[#D92D20] before:absolute before:bottom-0 before:left-[-7px] before:h-5 before:w-5 before:rounded-br-[15px] before:bg-[#FEE4E2] before:content-[''] after:absolute after:bottom-0 after:left-[-10px] after:h-5 after:w-[10px] after:rounded-br-[10px] after:bg-white after:content-['']"
  >
    <div className="line-clamp-4 overflow-hidden whitespace-pre-wrap wrap-break-word text-xs">{children}</div>
  </motion.div>
);

const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
    className="relative my-1 inline-block max-w-[90%] rounded-2xl bg-[#e9ecef] px-4 py-2 text-sm text-[#2b2b33]"
  >
    <div className="flex items-center space-x-1">
      <div className="h-2 w-2 animate-pulse rounded-full bg-[#6c757d]"></div>
      <div className="h-2 w-2 animate-pulse rounded-full bg-[#6c757d] delay-150"></div>
      <div className="h-2 w-2 animate-pulse rounded-full bg-[#6c757d] delay-300"></div>
    </div>
  </motion.div>
);

export const SmsPhone = ({
  smsBody,
  isLoading = false,
  error = false,
}: {
  smsBody: string;
  isLoading?: boolean;
  error?: boolean;
}) => (
  <div className="shadow-xs relative h-60 w-full max-w-72 overflow-hidden">
    <div className="absolute left-[25px] right-[15px] top-[110px]">
      {isLoading ? (
        <TypingIndicator />
      ) : error ? (
        <ErrorChatBubble>{smsBody}</ErrorChatBubble>
      ) : (
        <SmsChatBubble>{smsBody}</SmsChatBubble>
      )}
    </div>
    <img src="/images/phones/iphone-sms.svg" alt="SMS Phone" />
  </div>
);
