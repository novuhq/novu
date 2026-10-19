import { ApiServiceLevelEnum, StripeBillingIntervalEnum } from '@novu/shared';
import { Check } from 'lucide-react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { useRef } from 'react';
import { ActionType } from '@/components/billing/utils/action.button.constants.ts';
import { Badge } from '@/components/primitives/badge';
import { ContactSalesButton } from './contact-sales-button';
import { getPlanHighlightFeatures } from './features-config';
import { PlanActionButton } from './plan-action-button';

type DisplayedPlan =
  | ApiServiceLevelEnum.FREE
  | ApiServiceLevelEnum.PRO
  | ApiServiceLevelEnum.BUSINESS
  | ApiServiceLevelEnum.ENTERPRISE;

export interface PlanConfig {
  name: string;
  price: string;
  subtitle: string;
  actionType?: ActionType;
}

interface PlansRowProps {
  selectedBillingInterval: StripeBillingIntervalEnum;
  currentPlan?: ApiServiceLevelEnum;
  plans: Record<DisplayedPlan, PlanConfig>;
  isOnTrial?: boolean;
}

function PlanFeature({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2 text-label-xs text-text-sub">
      <Check className="h-3 w-3" />
      <span>{text}</span>
    </li>
  );
}

interface PlanHeaderProps {
  planKey: string;
  planConfig: PlanConfig;
  currentPlan?: ApiServiceLevelEnum;
  isOnTrial?: boolean;
}

function PlanHeader({ planKey, planConfig, currentPlan, isOnTrial }: PlanHeaderProps) {
  const isCurrentPlan = currentPlan === planKey;
  const isProPlan = planKey === ApiServiceLevelEnum.PRO;
  const isFreeOrTrial = currentPlan === ApiServiceLevelEnum.FREE || isOnTrial;

  const planName = planKey === ApiServiceLevelEnum.FREE ? 'Free forever' : planConfig.name;
  const showRecommended = isProPlan && isFreeOrTrial;
  const currentBadgeText = isOnTrial && isProPlan ? 'Current (Trial)' : 'Current';

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <h3 className="text-label-sm">{planName}</h3>
        {showRecommended && (
          <Badge variant="lighter" color="orange" size="sm" className="rounded-md">
            RECOMMENDED
          </Badge>
        )}
      </div>
      {isCurrentPlan && (
        <Badge variant="lighter" color="gray" size="md">
          {currentBadgeText}
        </Badge>
      )}
    </div>
  );
}

interface PlanPricingProps {
  planKey: string;
  planConfig: PlanConfig;
}

function PlanPricing({ planKey, planConfig }: PlanPricingProps) {
  const subtitle = planKey === ApiServiceLevelEnum.FREE ? 'Actually free - no strings attached.' : planConfig.subtitle;

  return (
    <>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold leading-8">{planConfig.price}</span>
      </div>
      <span className="text-label-xs text-text-soft">{subtitle}</span>
    </>
  );
}

interface PlanCardProps {
  planKey: string;
  planConfig: PlanConfig;
  selectedBillingInterval: StripeBillingIntervalEnum;
  currentPlan?: ApiServiceLevelEnum;
  isOnTrial?: boolean;
  isSticky: boolean;
}

function getCardStyles(planKey: string, currentPlan?: ApiServiceLevelEnum, isOnTrial?: boolean) {
  const isCurrentPlan = currentPlan === planKey;
  const isProPlan = planKey === ApiServiceLevelEnum.PRO;
  const isFreeOrTrial = currentPlan === ApiServiceLevelEnum.FREE || isOnTrial;
  const isPaidCurrent = isCurrentPlan && !isOnTrial && currentPlan !== ApiServiceLevelEnum.FREE;

  const shouldHighlight = (isProPlan && isFreeOrTrial) || isPaidCurrent;
  const useGradient = isProPlan && isFreeOrTrial;

  if (shouldHighlight) {
    if (useGradient) {
      return {
        className: 'border border-primary/10',
        style: {
          background:
            'radial-gradient(64% 62% at 16.2% 22.6%, rgba(251, 55, 72, 0.05) 0%, rgba(255, 255, 255, 0.00) 100%), #FFF',
          boxShadow:
            '0 0.602px 0.602px -1.25px rgba(251, 55, 72, 0.05), 0 2.289px 2.289px -2.5px rgba(251, 55, 72, 0.10), 0 10px 10px -3.75px rgba(251, 55, 72, 0.04), 0 20px 50px 0 rgba(251, 55, 72, 0.05)',
        },
      };
    }
    return {
      className: 'border border-primary/10',
      style: {
        background: '#FFF',
        boxShadow:
          '0 0.602px 0.602px -1.25px rgba(251, 55, 72, 0.05), 0 2.289px 2.289px -2.5px rgba(251, 55, 72, 0.10), 0 10px 10px -3.75px rgba(251, 55, 72, 0.04), 0 20px 50px 0 rgba(251, 55, 72, 0.05)',
      },
    };
  }

  return {
    className: 'border border-black/2 bg-white',
    style: {
      boxShadow:
        '0 0.602px 0.602px -1.25px rgba(0, 0, 0, 0.11), 0 2.289px 2.289px -2.5px rgba(0, 0, 0, 0.09), 0 10px 10px -3.75px rgba(0, 0, 0, 0.04)',
    },
  };
}

function PlanCard({ planKey, planConfig, selectedBillingInterval, currentPlan, isOnTrial, isSticky }: PlanCardProps) {
  const cardStyles = getCardStyles(planKey, currentPlan, isOnTrial);
  const features = getPlanHighlightFeatures(planKey as ApiServiceLevelEnum);

  return (
    <motion.div
      className={`flex flex-col items-start flex-1 rounded-xl p-4 ${cardStyles.className}`}
      style={cardStyles.style}
      layout
      animate={{ gap: isSticky ? '1rem' : '1.75rem' }}
      transition={{
        layout: { duration: 0.25, ease: [0.4, 0.0, 0.2, 1] },
        gap: { duration: 0.25, ease: [0.4, 0.0, 0.2, 1] },
      }}
    >
      <div className="flex flex-col items-start gap-0.5 self-stretch">
        <PlanHeader planKey={planKey} planConfig={planConfig} currentPlan={currentPlan} isOnTrial={isOnTrial} />
        <PlanPricing planKey={planKey} planConfig={planConfig} />
      </div>

      <div className="self-stretch">
        <AnimatePresence mode="wait">
          {!isSticky && (
            <motion.ul
              className="flex flex-col items-start gap-2 self-stretch overflow-hidden"
              initial={{ opacity: 0, height: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, height: 'auto', scale: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, scale: 0.9, y: -10 }}
              transition={{
                duration: 0.25,
                ease: [0.4, 0.0, 0.2, 1],
                height: { duration: 0.2 },
                opacity: { duration: 0.15 },
                scale: { duration: 0.2 },
                y: { duration: 0.2 },
              }}
            >
              {features.map((feature, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -5 }}
                  transition={{
                    delay: index * 0.02,
                    duration: 0.15,
                    ease: [0.4, 0.0, 0.2, 1],
                  }}
                >
                  <PlanFeature text={feature} />
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full">
        {planConfig.actionType === ActionType.BUTTON && (
          <PlanActionButton
            billingInterval={selectedBillingInterval}
            requestedServiceLevel={planKey as ApiServiceLevelEnum}
            size="2xs"
            className="w-full"
          />
        )}
        {planConfig.actionType === ActionType.CONTACT && <ContactSalesButton className="w-full" />}
      </div>
    </motion.div>
  );
}

export function PlansRow({ selectedBillingInterval, currentPlan, plans, isOnTrial }: PlansRowProps) {
  const triggerRef = useRef(null);

  // Use Motion's useInView to detect when the trigger element is out of view
  // When it's out of view (above the viewport), we collapse the cards
  const isInView = useInView(triggerRef, {
    margin: '-100px 0px 0px 0px', // Trigger when element is 100px above viewport
  });

  return (
    <>
      {/* Invisible trigger element positioned before the sticky container */}
      <div ref={triggerRef} className="h-1 -mb-1" />

      <div className="sticky top-[-10px] z-10 bg-background backdrop-blur-xs py-6 -my-6">
        <div className="grid grid-cols-4 gap-6">
          {Object.entries(plans).map(([planKey, planConfig]) => (
            <PlanCard
              key={planKey}
              planKey={planKey}
              planConfig={planConfig}
              selectedBillingInterval={selectedBillingInterval}
              currentPlan={currentPlan}
              isOnTrial={isOnTrial}
              isSticky={!isInView}
            />
          ))}
        </div>
      </div>
    </>
  );
}
