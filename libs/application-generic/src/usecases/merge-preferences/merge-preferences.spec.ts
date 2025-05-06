import {
  DEFAULT_WORKFLOW_PREFERENCES,
  PreferencesTypeEnum,
  WorkflowPreferences,
} from '@novu/shared';
import { describe, expect, it } from 'vitest';
import { MergePreferencesCommand } from './merge-preferences.command';
import { MergePreferences } from './merge-preferences.usecase';
import { PreferenceSet } from '../get-preferences/get-preferences.usecase';

/**
 * This test spec is used to test the merge preferences usecase.
 * It covers all the possible combinations of preferences types and readOnly flag.
 */

const MOCK_SUBSCRIBER_GLOBAL_PREFERENCE = {
  ...DEFAULT_WORKFLOW_PREFERENCES,
  channels: {
    ...DEFAULT_WORKFLOW_PREFERENCES.channels,
    email: { enabled: false },
    in_app: { enabled: true },
  },
};

const MOCK_SUBSCRIBER_WORKFLOW_PREFERENCE = {
  ...DEFAULT_WORKFLOW_PREFERENCES,
  channels: {
    ...DEFAULT_WORKFLOW_PREFERENCES.channels,
    email: { enabled: true },
    in_app: { enabled: true },
  },
};

type TestCase = {
  comment: string;
  types: PreferencesTypeEnum[];
  expectedType: PreferencesTypeEnum;
  readOnly: boolean;
};

const testCases: TestCase[] = [
  // readOnly false scenarios
  {
    comment: 'Workflow resource only',
    types: [PreferencesTypeEnum.WORKFLOW_RESOURCE],
    expectedType: PreferencesTypeEnum.WORKFLOW_RESOURCE,
    readOnly: false,
  },
  {
    comment: 'Subscriber global only',
    types: [PreferencesTypeEnum.SUBSCRIBER_GLOBAL],
    expectedType: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    readOnly: false,
  },
  {
    comment: 'Subscriber workflow overrides workflow resource',
    types: [
      PreferencesTypeEnum.WORKFLOW_RESOURCE,
      PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    ],
    expectedType: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    readOnly: false,
  },
  {
    comment: 'Subscriber global overrides workflow resource',
    types: [
      PreferencesTypeEnum.WORKFLOW_RESOURCE,
      PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    ],
    expectedType: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    readOnly: false,
  },
  {
    comment: 'Subscriber workflow overrides subscriber global',
    types: [
      PreferencesTypeEnum.WORKFLOW_RESOURCE,
      PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
      PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    ],
    expectedType: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    readOnly: false,
  },
  {
    comment: 'User workflow has priority over workflow resource',
    types: [
      PreferencesTypeEnum.WORKFLOW_RESOURCE,
      PreferencesTypeEnum.USER_WORKFLOW,
    ],
    expectedType: PreferencesTypeEnum.USER_WORKFLOW,
    readOnly: false,
  },
  {
    comment: 'User workflow overrides workflow resource',
    types: [
      PreferencesTypeEnum.WORKFLOW_RESOURCE,
      PreferencesTypeEnum.USER_WORKFLOW,
      PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    ],
    expectedType: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    readOnly: false,
  },
  {
    comment: 'Subscriber global overrides user workflow',
    types: [
      PreferencesTypeEnum.WORKFLOW_RESOURCE,
      PreferencesTypeEnum.USER_WORKFLOW,
      PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    ],
    expectedType: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    readOnly: false,
  },
  {
    comment: 'Subscriber workflow overrides user workflow',
    types: [
      PreferencesTypeEnum.WORKFLOW_RESOURCE,
      PreferencesTypeEnum.USER_WORKFLOW,
      PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
      PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    ],
    expectedType: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    readOnly: false,
  },
  // readOnly true scenarios
  {
    comment: 'Workflow resource readOnly flag has priority over subscriber',
    types: [PreferencesTypeEnum.WORKFLOW_RESOURCE],
    expectedType: PreferencesTypeEnum.WORKFLOW_RESOURCE,
    readOnly: true,
  },
  {
    comment:
      'Workflow resource readOnly flag has priority over subscriber workflow',
    types: [
      PreferencesTypeEnum.WORKFLOW_RESOURCE,
      PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    ],
    expectedType: PreferencesTypeEnum.WORKFLOW_RESOURCE,
    readOnly: true,
  },
  {
    comment:
      'Workflow resource readOnly flag has priority over subscriber global',
    types: [
      PreferencesTypeEnum.WORKFLOW_RESOURCE,
      PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    ],
    expectedType: PreferencesTypeEnum.WORKFLOW_RESOURCE,
    readOnly: true,
  },
  {
    comment: 'User workflow readOnly flag has priority over workflow resource',
    types: [
      PreferencesTypeEnum.WORKFLOW_RESOURCE,
      PreferencesTypeEnum.USER_WORKFLOW,
    ],
    expectedType: PreferencesTypeEnum.USER_WORKFLOW,
    readOnly: true,
  },
  // Subscriber overrides behavior with readOnly false
  {
    comment: 'Subscriber workflow overrides workflow resource',
    types: [
      PreferencesTypeEnum.WORKFLOW_RESOURCE,
      PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    ],
    expectedType: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    readOnly: false,
  },
  {
    comment: 'Subscriber global overrides workflow resource',
    types: [
      PreferencesTypeEnum.WORKFLOW_RESOURCE,
      PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    ],
    expectedType: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    readOnly: false,
  },
  {
    comment: 'Subscriber workflow overrides user workflow',
    types: [
      PreferencesTypeEnum.WORKFLOW_RESOURCE,
      PreferencesTypeEnum.USER_WORKFLOW,
      PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    ],
    expectedType: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    readOnly: false,
  },
  {
    comment: 'Subscriber global overrides user workflow',
    types: [
      PreferencesTypeEnum.WORKFLOW_RESOURCE,
      PreferencesTypeEnum.USER_WORKFLOW,
      PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    ],
    expectedType: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    readOnly: false,
  },
  {
    comment: 'Subscriber workflow overrides subscriber global',
    types: [
      PreferencesTypeEnum.WORKFLOW_RESOURCE,
      PreferencesTypeEnum.USER_WORKFLOW,
      PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
      PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    ],
    expectedType: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    readOnly: false,
  },
  // Subscriber overrides with readOnly true behavior
  {
    comment:
      'Subscriber workflow cannot override workflow resource when readOnly is true',
    types: [
      PreferencesTypeEnum.WORKFLOW_RESOURCE,
      PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    ],
    expectedType: PreferencesTypeEnum.WORKFLOW_RESOURCE,
    readOnly: true,
  },
  {
    comment:
      'Subscriber global cannot override workflow resource when readOnly is true',
    types: [
      PreferencesTypeEnum.WORKFLOW_RESOURCE,
      PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    ],
    expectedType: PreferencesTypeEnum.WORKFLOW_RESOURCE,
    readOnly: true,
  },
  {
    comment:
      'Subscriber workflow cannot override user workflow when readOnly is true',
    types: [
      PreferencesTypeEnum.WORKFLOW_RESOURCE,
      PreferencesTypeEnum.USER_WORKFLOW,
      PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    ],
    expectedType: PreferencesTypeEnum.USER_WORKFLOW,
    readOnly: true,
  },
  {
    comment:
      'Subscriber global cannot override user workflow when readOnly is true',
    types: [
      PreferencesTypeEnum.WORKFLOW_RESOURCE,
      PreferencesTypeEnum.USER_WORKFLOW,
      PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    ],
    expectedType: PreferencesTypeEnum.USER_WORKFLOW,
    readOnly: true,
  },
  {
    comment:
      'Subscriber global+workflow cannot override user workflow when readOnly is true',
    types: [
      PreferencesTypeEnum.WORKFLOW_RESOURCE,
      PreferencesTypeEnum.USER_WORKFLOW,
      PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
      PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    ],
    expectedType: PreferencesTypeEnum.USER_WORKFLOW,
    readOnly: true,
  },
];

describe('MergePreferences', () => {
  describe('merging readOnly and subscriberOverrides', () => {
    testCases.forEach(({ types, expectedType, readOnly, comment = '' }) => {
      it(`should merge preferences for types: ${types.join(', ')} with readOnly: ${readOnly}${comment ? ` (${comment})` : ''}`, () => {
        const preferenceSet = types.reduce((acc, type, index) => {
          const preference = {
            _id: `${index + 1}`,
            _organizationId: '1',
            _environmentId: '1',
            type,
            preferences: {
              // default
              ...DEFAULT_WORKFLOW_PREFERENCES,
              // readOnly
              all: { ...DEFAULT_WORKFLOW_PREFERENCES.all, readOnly },
              // subscriber overrides
              ...(PreferencesTypeEnum.SUBSCRIBER_GLOBAL === type
                ? MOCK_SUBSCRIBER_GLOBAL_PREFERENCE
                : {}),
              ...(PreferencesTypeEnum.SUBSCRIBER_WORKFLOW === type
                ? MOCK_SUBSCRIBER_WORKFLOW_PREFERENCE
                : {}),
            },
          };

          switch (type) {
            case PreferencesTypeEnum.WORKFLOW_RESOURCE:
              acc.workflowResourcePreference = preference;
              break;
            case PreferencesTypeEnum.USER_WORKFLOW:
              acc.workflowUserPreference = preference;
              break;
            case PreferencesTypeEnum.SUBSCRIBER_GLOBAL:
              acc.subscriberGlobalPreference = preference;
              break;
            case PreferencesTypeEnum.SUBSCRIBER_WORKFLOW:
              acc.subscriberWorkflowPreference = preference;
              break;
            default:
              throw new Error(`Unknown preference type: ${type}`);
          }

          return acc;
        }, {} as PreferenceSet);

        const command = MergePreferencesCommand.create(preferenceSet);

        const result = MergePreferences.execute(command);

        const hasSubscriberGlobalPreference =
          !!preferenceSet.subscriberGlobalPreference;
        const hasSubscriberWorkflowPreference =
          !!preferenceSet.subscriberWorkflowPreference;

        let expectedPreferences: WorkflowPreferences;

        if (!readOnly) {
          if (hasSubscriberWorkflowPreference) {
            expectedPreferences = MOCK_SUBSCRIBER_WORKFLOW_PREFERENCE;
          } else if (hasSubscriberGlobalPreference) {
            expectedPreferences = MOCK_SUBSCRIBER_GLOBAL_PREFERENCE;
          } else {
            expectedPreferences = DEFAULT_WORKFLOW_PREFERENCES;
          }
        } else {
          expectedPreferences = {
            ...DEFAULT_WORKFLOW_PREFERENCES,
            all: { ...DEFAULT_WORKFLOW_PREFERENCES.all, readOnly },
          };
        }

        expect(result).toEqual({
          preferences: expectedPreferences,
          type: expectedType,
          source: {
            [PreferencesTypeEnum.WORKFLOW_RESOURCE]: null,
            [PreferencesTypeEnum.USER_WORKFLOW]: null,
            [PreferencesTypeEnum.SUBSCRIBER_GLOBAL]: null,
            [PreferencesTypeEnum.SUBSCRIBER_WORKFLOW]: null,
            ...Object.entries(preferenceSet).reduce((acc, [key, pref]) => {
              if (pref) {
                acc[pref.type] = pref.preferences;
              }

              return acc;
            }, {}),
          },
        });
      });
    });
  });

  it('should have test cases for all combinations of PreferencesTypeEnum', () => {
    // Function to generate all subsets of an array, ensuring requiredTypes are included
    function generateSubsets(
      arr: PreferencesTypeEnum[],
      required: PreferencesTypeEnum[],
    ) {
      return arr
        .reduce(
          (subsets, value) =>
            subsets.concat(subsets.map((set) => [value, ...set])),
          [[]] as PreferencesTypeEnum[][],
        )
        .map((subset) => [...new Set([...required, ...subset])]);
    }

    const allTypes = Object.values(PreferencesTypeEnum);
    const requiredTypes = [PreferencesTypeEnum.WORKFLOW_RESOURCE];

    const allCombinations = generateSubsets(allTypes, requiredTypes).filter(
      (subset) => subset.length > 0,
    );

    const coveredCombinations = testCases.map((testCase) =>
      testCase.types.sort().join(','),
    );

    allCombinations.forEach((combination) => {
      const combinationKey = combination.sort().join(',');
      expect(
        coveredCombinations,
        `Combination ${combinationKey} is not covered`,
      ).toContain(combinationKey);
    });
  });
});
