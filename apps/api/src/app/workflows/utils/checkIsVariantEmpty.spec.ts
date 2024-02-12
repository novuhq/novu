import { expect } from 'chai';
import { MessageFilter, NotificationStepVariant } from '../usecases/create-notification-template';
import { checkIsVariantEmpty } from './checkIsVariantEmpty';
import { FieldLogicalOperatorEnum, FieldOperatorEnum, FilterPartTypeEnum } from '@novu/shared';

const testFilter: MessageFilter = {
  value: FieldLogicalOperatorEnum.AND,
  children: [{ field: 'test', value: 'test', on: FilterPartTypeEnum.PAYLOAD, operator: FieldOperatorEnum.LARGER }],
};

describe('checkIsVariantEmpty', () => {
  it('should return true for an empty variant', () => {
    const emptyVariant: NotificationStepVariant = {};
    const result = checkIsVariantEmpty(emptyVariant);
    expect(result).to.be.true;
  });

  it('should return true for a variant with empty filters', () => {
    const variantWithEmptyFilters: NotificationStepVariant = { filters: [] };
    const result = checkIsVariantEmpty(variantWithEmptyFilters);
    expect(result).to.be.true;
  });

  it('should return true for a variant with filters containing empty children', () => {
    const variantWithEmptyChildren: NotificationStepVariant = {
      filters: [{ children: [] }, { children: [] }] as unknown as MessageFilter[],
    };
    const result = checkIsVariantEmpty(variantWithEmptyChildren);
    expect(result).to.be.true;
  });

  it('should return false for a variant with non-empty filters', () => {
    const nonEmptyVariant: NotificationStepVariant = {
      filters: [testFilter],
    };
    const result = checkIsVariantEmpty(nonEmptyVariant);
    expect(result).to.be.false;
  });

  it('should return false for a variant with one or more non-empty child in filters', () => {
    const variantWithNonEmptyChildren: NotificationStepVariant = {
      filters: [testFilter, { children: [] } as unknown as MessageFilter],
    };
    const result = checkIsVariantEmpty(variantWithNonEmptyChildren);
    expect(result).to.be.false;
  });

  it('should return true for a variant with undefined filters', () => {
    const variantWithUndefinedFilters: NotificationStepVariant = {};
    const result = checkIsVariantEmpty(variantWithUndefinedFilters);
    expect(result).to.be.true;
  });
});
