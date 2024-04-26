import { expect } from 'chai';

import {
  FieldLogicalOperatorEnum,
  FieldOperatorEnum,
  FilterPartTypeEnum,
} from '@novu/shared';

import { MessageFilter, NotificationStepVariantCommand } from '../../usecases';
import { isVariantEmpty } from './isVariantEmpty';

const testFilter: MessageFilter = {
  value: FieldLogicalOperatorEnum.AND,
  children: [
    {
      field: 'test',
      value: 'test',
      on: FilterPartTypeEnum.PAYLOAD,
      operator: FieldOperatorEnum.LARGER,
    },
  ],
};

describe('isVariantEmpty', () => {
  it('should return true for an empty variant', () => {
    const emptyVariant: NotificationStepVariantCommand = {};
    const result = isVariantEmpty(emptyVariant);
    expect(result).to.be.true;
  });

  it('should return true for a variant with empty filters', () => {
    const variantWithEmptyFilters: NotificationStepVariantCommand = {
      filters: [],
    };
    const result = isVariantEmpty(variantWithEmptyFilters);
    expect(result).to.be.true;
  });

  it('should return true for a variant with filters containing empty children', () => {
    const variantWithEmptyChildren: NotificationStepVariantCommand = {
      filters: [
        { children: [] },
        { children: [] },
      ] as unknown as MessageFilter[],
    };
    const result = isVariantEmpty(variantWithEmptyChildren);
    expect(result).to.be.true;
  });

  it('should return false for a variant with non-empty filters', () => {
    const nonEmptyVariant: NotificationStepVariantCommand = {
      filters: [testFilter],
    };
    const result = isVariantEmpty(nonEmptyVariant);
    expect(result).to.be.false;
  });

  it('should return false for a variant with one or more non-empty child in filters', () => {
    const variantWithNonEmptyChildren: NotificationStepVariantCommand = {
      filters: [testFilter, { children: [] } as unknown as MessageFilter],
    };
    const result = isVariantEmpty(variantWithNonEmptyChildren);
    expect(result).to.be.false;
  });

  it('should return true for a variant with undefined filters', () => {
    const variantWithUndefinedFilters: NotificationStepVariantCommand = {};
    const result = isVariantEmpty(variantWithUndefinedFilters);
    expect(result).to.be.true;
  });
});
