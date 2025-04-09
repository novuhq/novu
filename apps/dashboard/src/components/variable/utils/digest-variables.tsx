import { createRoot } from 'react-dom/client';
import { LiquidVariable } from '../../../utils/parseStepVariables';
import { DigestCountSummaryPreview } from '@/components/variable/components/digest-count-summary-preview';
import { DigestSentenceSummaryPreview } from '@/components/variable/components/digest-sentence-summary-preview';

enum DIGEST_VARIABLES_ENUM {
  COUNT_SUMMARY = 'step.digest.countSummary',
  SENTENCE_SUMMARY = 'step.digest.sentenceSummary',
}

export const DIGEST_VARIABLES: LiquidVariable[] = [
  {
    label: DIGEST_VARIABLES_ENUM.COUNT_SUMMARY,
    type: 'digest',
    boost: 99,
    info: () => {
      const dom = createInfoPanel({ component: <DigestCountSummaryPreview /> });
      return {
        dom,
        destroy: () => {
          dom.remove();
        },
      };
    },
  },
  {
    label: DIGEST_VARIABLES_ENUM.SENTENCE_SUMMARY,
    type: 'digest',
    boost: 98,
    info: () => {
      const dom = createInfoPanel({ component: <DigestSentenceSummaryPreview /> });
      return {
        dom,
        destroy: () => {
          dom.remove();
        },
      };
    },
  },
];

/**
 * Create a DOM element to render the info panel in Codemirror.
 */
const createInfoPanel = ({ component }: { component: React.ReactNode }) => {
  const dom = document.createElement('div');
  createRoot(dom).render(component);
  return dom;
};

export const DIGEST_PREVIEW_MAP = {
  [DIGEST_VARIABLES_ENUM.COUNT_SUMMARY]: <DigestCountSummaryPreview />,
  [DIGEST_VARIABLES_ENUM.SENTENCE_SUMMARY]: <DigestSentenceSummaryPreview />,
} as const;

export const DIGEST_VARIABLES_VALUE_ROOT_PATHS = ['step.digest.eventCount', 'step.digest.events'] as const;
export const DIGEST_VARIABLES_VALUE_MAP = {
  [DIGEST_VARIABLES_ENUM.COUNT_SUMMARY]: 'step.digest.eventCount | pluralize: "notification", "notifications"',
  [DIGEST_VARIABLES_ENUM.SENTENCE_SUMMARY]: 'step.digest.events | toSentence: "", 2, "others"',
} as const;
