import { motion } from 'motion/react';

export function SubscriptionsEmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 5 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 5 }}
        transition={{
          duration: 0.25,
          delay: 0.1,
          ease: [0.4, 0, 0.2, 1],
        }}
        className="flex flex-col items-center gap-6"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.2 }}
          className="relative"
        >
          <svg width="137" height="125" viewBox="0 0 137 125" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="135" height="45" rx="7.5" stroke="#CACFD8" strokeDasharray="5 3" />
            <rect x="5" y="5" width="127" height="37" rx="5.5" fill="white" />
            <rect x="5" y="5" width="127" height="37" rx="5.5" stroke="#F2F5F8" />
            <path
              d="M69.5498 24.6824V25.7796C69.0746 25.6117 68.5661 25.5601 68.0669 25.6294C67.5677 25.6987 67.0924 25.8867 66.6809 26.1777C66.2694 26.4687 65.9338 26.8542 65.7022 27.3018C65.4705 27.7495 65.3497 28.2461 65.3498 28.7501L64.2998 28.7496C64.2996 28.1085 64.4462 27.4759 64.7284 26.9002C65.0105 26.3245 65.4206 25.8211 65.9274 25.4284C66.4342 25.0358 67.0241 24.7644 67.652 24.635C68.2799 24.5056 68.9291 24.5216 69.5498 24.6819V24.6824ZM68.4998 24.0251C66.7594 24.0251 65.3498 22.6155 65.3498 20.8751C65.3498 19.1347 66.7594 17.7251 68.4998 17.7251C70.2402 17.7251 71.6498 19.1347 71.6498 20.8751C71.6498 22.6155 70.2402 24.0251 68.4998 24.0251ZM68.4998 22.9751C69.6601 22.9751 70.5998 22.0353 70.5998 20.8751C70.5998 19.7148 69.6601 18.7751 68.4998 18.7751C67.3396 18.7751 66.3998 19.7148 66.3998 20.8751C66.3998 22.0353 67.3396 22.9751 68.4998 22.9751ZM71.9575 26.1251L70.9972 25.1654L71.7401 24.4225L73.9672 26.6501L71.7401 28.8777L70.9972 28.1348L71.9575 27.1751H70.0748V26.1251H71.9575Z"
              fill="#CACFD8"
            />
            <rect x="1" y="79" width="135" height="45" rx="7.5" stroke="#CACFD8" />
            <rect x="5" y="83" width="127" height="37" rx="5.5" fill="white" />
            <rect x="5" y="83" width="127" height="37" rx="5.5" stroke="#F2F5F8" />
            <path
              d="M69.6999 107.8L68.0199 105.7H64.8999C64.7408 105.7 64.5882 105.637 64.4756 105.524C64.3631 105.412 64.2999 105.259 64.2999 105.1V98.5618C64.2999 98.4027 64.3631 98.2501 64.4756 98.1375C64.5882 98.025 64.7408 97.9618 64.8999 97.9618H74.4999C74.659 97.9618 74.8116 98.025 74.9242 98.1375C75.0367 98.2501 75.0999 98.4027 75.0999 98.5618V105.1C75.0999 105.259 75.0367 105.412 74.9242 105.524C74.8116 105.637 74.659 105.7 74.4999 105.7H71.3799L69.6999 107.8ZM70.8033 104.5H73.8999V99.1618H65.4999V104.5H68.5965L69.6999 105.879L70.8033 104.5ZM62.4999 95.5H72.6999V96.7H63.0999V103.3H61.8999V96.1C61.8999 95.9409 61.9631 95.7883 62.0756 95.6757C62.1882 95.5632 62.3408 95.5 62.4999 95.5V95.5Z"
              fill="#CACFD8"
            />
            <path d="M68.5 75.5V49.5" stroke="#E1E4EA" strokeLinejoin="bevel" />
          </svg>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.2,
            delay: 0.25,
          }}
          className="flex flex-col items-center gap-2 text-center"
        >
          <h2 className="text-text-sub text-md font-medium">This subscriber has no topic subscriptions</h2>
          <p className="text-text-soft max-w-md text-sm font-normal">
            Subscribers can be added to topics via the API or from the topic screen.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
