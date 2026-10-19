import { createRoot } from 'react-dom/client';
import { DigestCountSummaryPreview } from '@/components/variable/components/digest-count-summary-preview';
import { DigestSentenceSummaryPreview } from '@/components/variable/components/digest-sentence-summary-preview';
import { LiquidVariable } from '../../../utils/parseStepVariables';

export enum DIGEST_VARIABLES_ENUM {
  COUNT_SUMMARY = 'countSummary',
  SENTENCE_SUMMARY = 'sentenceSummary',
}

const DIGEST_VARIABLE_TO_NAME_MAP = {
  [DIGEST_VARIABLES_ENUM.COUNT_SUMMARY]: '.eventCount',
  [DIGEST_VARIABLES_ENUM.SENTENCE_SUMMARY]: '.events',
} as const;

export const DIGEST_VARIABLES: LiquidVariable[] = [
  {
    /**
     * When displayLabel is available this is treated as a value
     * In this array this has a placeholder value
     * The value is then overwritten to the correct dynamic value
     * in parseStepVariables.ts
     */
    name: DIGEST_VARIABLES_ENUM.COUNT_SUMMARY,
    /**
     * DisplayLabel is used to show the variable name in the Codemirror.
     */
    displayLabel: DIGEST_VARIABLES_ENUM.COUNT_SUMMARY,
    type: 'digest',
    /**
     * Boost is used to rank the variable in the Codemirror.
     * The higher the boost, the higher the rank.
     */
    boost: 99,
    /**
     * This is used to show the info panel when the user hovers over the variable in Codemirror.
     * ref: https://codemirror.net/docs/ref/#autocomplete.Completion.info
     */
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
    name: DIGEST_VARIABLES_ENUM.SENTENCE_SUMMARY,
    displayLabel: DIGEST_VARIABLES_ENUM.SENTENCE_SUMMARY,
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

/**
 * Preview used for Email editor (maily)
 */
export const DIGEST_PREVIEW_MAP = {
  [DIGEST_VARIABLES_ENUM.COUNT_SUMMARY]: <DigestCountSummaryPreview />,
  [DIGEST_VARIABLES_ENUM.SENTENCE_SUMMARY]: <DigestSentenceSummaryPreview />,
} as const;

export const DIGEST_VARIABLES_FILTER_MAP = {
  [DIGEST_VARIABLES_ENUM.COUNT_SUMMARY]: "| pluralize: 'notification', 'notifications'",
  [DIGEST_VARIABLES_ENUM.SENTENCE_SUMMARY]: "| toSentence: 'payload.name', 2, 'other'",
} as const;

const applyDigestVariableValue = ({
  digestStepName,
  type,
}: {
  type: DIGEST_VARIABLES_ENUM;
  digestStepName?: string;
}) => {
  if (!digestStepName) {
    return '';
  }

  const digestFilterValue = DIGEST_VARIABLES_FILTER_MAP[type];
  const variableName = DIGEST_VARIABLE_TO_NAME_MAP[type];
  const finalValueWithFilter = 'steps.' + digestStepName + variableName + ' ' + digestFilterValue;

  return finalValueWithFilter;
};

const applyDigestVariableName = ({
  digestStepName,
  type,
}: {
  type: DIGEST_VARIABLES_ENUM;
  digestStepName?: string;
}) => {
  if (!digestStepName) {
    return '';
  }

  const variableName = 'steps.' + digestStepName + '.' + type;

  return variableName;
};

export const getDynamicDigestVariable = ({
  digestStepName,
  type,
}: {
  type: DIGEST_VARIABLES_ENUM;
  digestStepName?: string;
}) => {
  if (!digestStepName) {
    return {
      value: '',
      label: '',
    };
  }

  return {
    value: applyDigestVariableValue({
      digestStepName,
      type,
    }),
    label: applyDigestVariableName({
      digestStepName,
      type,
    }),
  };
};
