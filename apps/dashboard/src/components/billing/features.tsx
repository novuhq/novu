import {
  ApiServiceLevelEnum,
  FeatureNameEnum,
  getFeatureForTier,
  getFeatureForTierAsText,
  isDetailedPriceListItem,
} from '@novu/shared';
import { Check, Minus } from 'lucide-react';
import { FEATURE_SECTIONS } from './features-config';

const PLAN_ORDER: ApiServiceLevelEnum[] = [
  ApiServiceLevelEnum.FREE,
  ApiServiceLevelEnum.PRO,
  ApiServiceLevelEnum.BUSINESS,
  ApiServiceLevelEnum.ENTERPRISE,
];

// Get feature display info for a specific plan
function getFeatureDisplay(featureName: FeatureNameEnum, plan: ApiServiceLevelEnum) {
  const rawFeature = getFeatureForTier(featureName, plan);
  const textValue = getFeatureForTierAsText(featureName, plan);

  // Disabled if value is null or empty text
  const isDisabled =
    (isDetailedPriceListItem(rawFeature) && !rawFeature.value) || textValue === '-' || textValue === '';

  return {
    content: textValue,
    disabled: isDisabled,
  };
}

// Individual feature row component
function FeatureItem({ featureName, plan }: { featureName: FeatureNameEnum; plan: ApiServiceLevelEnum }) {
  const { content, disabled } = getFeatureDisplay(featureName, plan);

  return (
    <div className={`flex items-center gap-2 text-label-xs ${disabled ? 'text-text-disabled' : 'text-text-sub'}`}>
      {typeof content === 'string' ? (
        <>
          {disabled ? <Minus className="h-3 w-3" /> : <Check className="h-3 w-3" />}
          {content !== '-' && content !== '' && <span>{content}</span>}
        </>
      ) : (
        content
      )}
    </div>
  );
}

// Main features component
export function Features() {
  return (
    <div className="flex flex-col">
      {FEATURE_SECTIONS.map((section) => (
        <div
          key={section.title}
          className="flex flex-col items-start gap-6 self-stretch p-6 border-t border-stroke-weak"
        >
          <h3 className="text-text-sub text-sm font-medium">{section.title}</h3>

          <div className="grid grid-cols-4 gap-6 self-stretch">
            {PLAN_ORDER.map((plan) => (
              <div key={plan} className="flex flex-col gap-2">
                {section.features.map((featureName) => (
                  <FeatureItem key={featureName} featureName={featureName} plan={plan} />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
