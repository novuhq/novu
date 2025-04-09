import { createRoot } from 'react-dom/client';
import { LiquidVariable } from '../../../utils/parseStepVariables';
import { DigestCountSummaryPreview } from '@/components/variable/components/digest-count-summary-preview';
import { DigestSentenceSummaryPreview } from '@/components/variable/components/digest-sentence-summary-preview';

export const DIGEST_VARIABLES: LiquidVariable[] = [
  {
    label: 'step.digest.countSummary',
    // value: "{{step.digest.eventCount | pluralize: 'notification', 'notifications'}}",
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
    label: 'step.digest.sentenceSummary',
    // value: "{{step.digest.events | toSentence: '', 2, 'others'}}",
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

const createInfoPanel = ({ component }: { component: React.ReactNode }) => {
  const dom = document.createElement('div');
  createRoot(dom).render(component);
  return dom;
};

export const DIGEST_PREVIEW_MAP = {
  'step.digest.countSummary': <DigestCountSummaryPreview />,
  'step.digest.sentenceSummary': <DigestSentenceSummaryPreview />,
} as const;
