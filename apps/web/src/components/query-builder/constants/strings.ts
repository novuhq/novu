export interface Strings {
  group?: {
    not?: string;
    or?: string;
    and?: string;
    addRule?: string;
    addGroup?: string;
    delete?: string;
  };
  component?: {
    delete?: string;
  };
  form?: {
    selectYourValue?: string;
  };
  operators?: {
    LARGER?: string;
    SMALLER?: string;
    LARGER_EQUAL?: string;
    SMALLER_EQUAL?: string;
    EQUAL?: string;
    NOT_EQUAL?: string;
    ALL_IN?: string;
    ANY_IN?: string;
    NOT_IN?: string;
    BETWEEN?: string;
    NOT_BETWEEN?: string;
    LIKE?: string;
    NOT_LIKE?: string;
  };
}

export const strings: Strings = {
  group: {
    not: 'Not',
    or: 'Or',
    and: 'And',
    addRule: 'Add Filter',
    addGroup: 'Add Group',
    delete: 'Delete',
  },
  component: {
    delete: 'Delete',
  },
  form: {
    selectYourValue: 'Select your value',
  },
  operators: {
    LARGER: 'Larger',
    SMALLER: 'Smaller',
    LARGER_EQUAL: 'Larger or equal',
    SMALLER_EQUAL: 'Smaller or equal',
    EQUAL: 'Equal',
    NOT_EQUAL: 'Not equal',
    ALL_IN: 'All in',
    ANY_IN: 'Any in',
    NOT_IN: 'Not in',
    BETWEEN: 'Between',
    NOT_BETWEEN: 'Not between',
    LIKE: 'Like',
    NOT_LIKE: 'Not like',
  },
};
